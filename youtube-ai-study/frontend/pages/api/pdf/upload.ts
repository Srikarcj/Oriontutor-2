import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm } from "formidable";
import fs from "fs";
import { Blob } from "buffer";
import { getAuth } from "@clerk/nextjs/server";
import { applyRateLimit } from "../../../lib/server/rate-limit";
import { readRequired, serverEnv } from "../../../lib/server/env";

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_PDF_BYTES = 25 * 1024 * 1024;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const limit = applyRateLimit(req, res, { windowMs: 60_000, max: 10, keyPrefix: "pdf-upload" });
  if (!limit.allowed) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const form = new IncomingForm({
    keepExtensions: true,
    multiples: false,
    maxFiles: 1,
    maxFileSize: MAX_PDF_BYTES,
    maxTotalFileSize: MAX_PDF_BYTES,
    filter: (part) =>
      part.mimetype === "application/pdf" ||
      (part.mimetype === "application/octet-stream" && part.originalFilename?.toLowerCase().endsWith(".pdf")),
  });

  await new Promise<void>((resolve) => {
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          res.status(400).json({ error: err.message || "Upload failed" });
          return resolve();
        }
        const courseSlug = typeof fields.course_slug === "string" ? fields.course_slug : "";
        const file = Array.isArray(files.file) ? files.file[0] : files.file;
        if (!file || !file.filepath) {
          res.status(400).json({ error: "File is required" });
          return resolve();
        }
        const originalName = file.originalFilename || "document.pdf";
        const isPdf =
          file.mimetype === "application/pdf" ||
          (file.mimetype === "application/octet-stream" && originalName.toLowerCase().endsWith(".pdf"));
        if (!isPdf) {
          res.status(400).json({ error: "Only PDF files are allowed" });
          return resolve();
        }
        if (typeof file.size === "number" && file.size > MAX_PDF_BYTES) {
          res.status(413).json({ error: "File too large" });
          return resolve();
        }

        const buffer = await fs.promises.readFile(file.filepath);
        if (buffer.length > MAX_PDF_BYTES) {
          res.status(413).json({ error: "File too large" });
          return resolve();
        }

        const backendUrl = readRequired("BACKEND_URL");
        const formData = new FormData();
        formData.append("file", new Blob([buffer], { type: "application/pdf" }), originalName);
        if (courseSlug) formData.append("course_slug", courseSlug);

        const upstream = await fetch(`${backendUrl}/api/pdf/upload`, {
          method: "POST",
          headers: {
            "X-User-Id": userId,
            ...(serverEnv.backendApiKey ? { "X-Internal-API-Key": serverEnv.backendApiKey } : {}),
          },
          body: formData as any,
        });

        const text = await upstream.text();
        if (!upstream.ok) {
          res.status(upstream.status).json({ error: text || "PDF upload failed" });
          return resolve();
        }
        res.status(200).json(JSON.parse(text));
        return resolve();
      } catch (error: any) {
        res.status(500).json({ error: error?.message || "Upload failed" });
        return resolve();
      }
    });
  });
}

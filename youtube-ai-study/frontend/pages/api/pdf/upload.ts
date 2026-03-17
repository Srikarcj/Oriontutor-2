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

const MAX_PDF_BYTES = 8 * 1024 * 1024;

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
    filter: (part) => part.mimetype === "application/pdf",
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: "Upload failed" });
    }
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file || !file.filepath) {
      return res.status(400).json({ error: "File is required" });
    }
    if (file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Only PDF files are allowed" });
    }
    if (typeof file.size === "number" && file.size > MAX_PDF_BYTES) {
      return res.status(413).json({ error: "File too large" });
    }

    const buffer = await fs.promises.readFile(file.filepath);
    if (buffer.length > MAX_PDF_BYTES) {
      return res.status(413).json({ error: "File too large" });
    }

    const backendUrl = readRequired("BACKEND_URL");
    const formData = new FormData();
    formData.append("file", new Blob([buffer], { type: "application/pdf" }), file.originalFilename || "document.pdf");

    const upstream = await fetch(`${backendUrl}/api/pdf/upload`, {
      method: "POST",
      headers: {
        "X-User-Id": userId,
        ...(serverEnv.backendApiKey ? { "X-Internal-API-Key": serverEnv.backendApiKey } : {}),
      },
      body: formData as any,
    });

    const text = await upstream.text();
    if (!upstream.ok) return res.status(upstream.status).json({ error: text || "PDF upload failed" });
    return res.status(200).json(JSON.parse(text));
  });
}

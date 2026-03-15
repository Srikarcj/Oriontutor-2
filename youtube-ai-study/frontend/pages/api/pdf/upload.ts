import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm } from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../../lib/server/db";

export const config = {
  api: {
    bodyParser: false,
  },
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function chunkText(text: string, size = 800) {
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buffer = "";
  for (const para of paragraphs) {
    if ((buffer + " " + para).length > size) {
      if (buffer) chunks.push(buffer);
      buffer = para;
    } else {
      buffer = buffer ? `${buffer} ${para}` : para;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const form = new IncomingForm({ keepExtensions: true, multiples: false });
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: "Upload failed" });
    }
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file || !file.filepath) {
      return res.status(400).json({ error: "File is required" });
    }
    const buffer = fs.readFileSync(file.filepath);
    const parsed = await pdfParse(buffer);
    const db = getDb();
    const { data, error } = await db
      .from("pdf_documents")
      .insert({ user_id: userId, name: file.originalFilename || "document", text: parsed.text || "" })
      .select("id")
      .single();

    if (error || !data?.id) {
      return res.status(500).json({ error: "Failed to save document" });
    }

    const chunks = chunkText(parsed.text || "");
    const payload = chunks.map((chunk) => {
      const tokens = tokenize(chunk);
      const freq: Record<string, number> = {};
      tokens.forEach((t) => {
        freq[t] = (freq[t] || 0) + 1;
      });
      return { document_id: data.id, chunk, tokens: freq };
    });

    if (payload.length) {
      await db.from("pdf_chunks").insert(payload);
    }

    await db.from("user_library_items").insert({
      user_id: userId,
      item_type: "uploaded_pdf",
      title: file.originalFilename || "document",
      ref_id: data.id,
      metadata: { summary: (parsed.text || "").slice(0, 220) },
    });

    return res.status(200).json({ id: data.id, name: file.originalFilename || "document" });
  });
}

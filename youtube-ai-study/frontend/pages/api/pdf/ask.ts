import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { readRequired } from "../../../lib/server/env";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { id, question } = req.body || {};
  if (!id || !question) return res.status(400).json({ error: "id and question are required" });

  const backendUrl = readRequired("BACKEND_URL");
  const upstream = await fetch(`${backendUrl}/api/pdf/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: id, question }),
  });

  const text = await upstream.text();
  if (!upstream.ok) return res.status(upstream.status).json({ error: text || "PDF QA failed" });
  return res.status(200).json(JSON.parse(text));
}

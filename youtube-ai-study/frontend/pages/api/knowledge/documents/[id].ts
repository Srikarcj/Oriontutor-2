import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { readRequired, serverEnv } from "../../../../lib/server/env";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) return res.status(400).json({ error: "Document id required" });

  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const backendUrl = readRequired("BACKEND_URL");
  const upstream = await fetch(`${backendUrl}/api/knowledge/documents/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      "X-User-Id": userId,
      ...(serverEnv.backendApiKey ? { "X-Internal-API-Key": serverEnv.backendApiKey } : {}),
    },
  });
  const text = await upstream.text();
  if (!upstream.ok) return res.status(upstream.status).json({ error: text || "Delete failed" });
  return res.status(200).json(JSON.parse(text));
}

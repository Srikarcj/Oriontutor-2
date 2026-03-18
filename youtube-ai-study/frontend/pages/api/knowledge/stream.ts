import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { readRequired, serverEnv } from "../../../lib/server/env";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).end("Unauthorized");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method not allowed");
  }

  const backendUrl = readRequired("BACKEND_URL");
  const url = new URL(`${backendUrl}/api/knowledge/stream`);
  Object.entries(req.query).forEach(([key, value]) => {
    if (typeof value === "string") url.searchParams.set(key, value);
  });

  const upstream = await fetch(url.toString(), {
    headers: {
      "X-User-Id": userId,
      ...(serverEnv.backendApiKey ? { "X-Internal-API-Key": serverEnv.backendApiKey } : {}),
    },
  });

  res.writeHead(upstream.status, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  if (!upstream.body) {
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) res.write(decoder.decode(value));
  }
  res.end();
}

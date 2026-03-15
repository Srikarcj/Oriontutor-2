import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";

export function requireApiUser(req: NextApiRequest, res: NextApiResponse): string | null {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ detail: "Unauthorized" });
    return null;
  }

  return userId;
}

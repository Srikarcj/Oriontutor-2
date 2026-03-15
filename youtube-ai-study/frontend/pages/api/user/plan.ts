import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getUserPlanUsage, getUserByClerkId, upsertUser } from "../../../lib/server/data";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ detail: "Method not allowed" });
    }

    const auth = getAuth(req);
    if (!auth.userId) {
      return res.status(401).json({ detail: "Unauthorized" });
    }

    const email = String((auth.sessionClaims?.email as string) || `${auth.userId}@unknown.local`);
    await upsertUser({ clerk_user_id: auth.userId, email });

    const user = await getUserByClerkId(auth.userId);
    const usage = await getUserPlanUsage(auth.userId);

    return res.status(200).json({
      user: {
        clerk_user_id: auth.userId,
        email: (user as any)?.email || email,
        plan: usage.plan,
      },
      usage,
    });
  } catch (error: any) {
    return res.status(500).json({ detail: error?.message || "Failed to load user plan." });
  }
}

import type { NextApiRequest, NextApiResponse } from "next";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function applyRateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  options: { windowMs: number; max: number; keyPrefix?: string }
) {
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";
  const key = `${options.keyPrefix || req.url || "global"}:${ip}`;
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true };
  }

  if (existing.count >= options.max) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    return { allowed: false };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return { allowed: true };
}

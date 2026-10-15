import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { getRedis } from "./redis";

let ratelimitInstance: Ratelimit | null = null;
const memoryRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkMemoryRateLimit(identifier: string, limit = 30, windowMs = 10000): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = memoryRateLimits.get(identifier);

  if (!entry || now > entry.resetAt) {
    memoryRateLimits.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count += 1;
  return { success: true, remaining: limit - entry.count };
}

export async function rateLimit(
  req: NextRequest,
  guestId?: string
): Promise<{ success: boolean; remaining: number }> {
  // Extract client IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  const identifier = `ratelimit:${ip}:${guestId || "anon"}`;
  const redis = getRedis();

  if (redis instanceof Redis) {
    try {
      if (!ratelimitInstance) {
        ratelimitInstance = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(30, "10 s"),
          analytics: false,
        });
      }
      const result = await ratelimitInstance.limit(identifier);
      return { success: result.success, remaining: result.remaining };
    } catch {
      // Fallback to local memory limiter on transient Redis error
      return checkMemoryRateLimit(identifier);
    }
  }

  return checkMemoryRateLimit(identifier);
}

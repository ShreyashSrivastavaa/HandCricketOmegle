import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { getRedis } from "./redis";

let generalLimiter: Ratelimit | null = null;
let queueLimiter: Ratelimit | null = null;
let reportLimiter: Ratelimit | null = null;
let adminLimiter: Ratelimit | null = null;

const memoryRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkMemoryRateLimit(
  identifier: string,
  limit = 30,
  windowMs = 10000
): { success: boolean; remaining: number } {
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

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

/**
 * Standard API rate limiter (30 requests per 10 seconds).
 */
export async function rateLimit(
  req: NextRequest,
  guestId?: string
): Promise<{ success: boolean; remaining: number }> {
  const ip = getClientIp(req);
  const identifier = `ratelimit:general:${ip}:${guestId || "anon"}`;
  const redis = getRedis();

  if (redis instanceof Redis) {
    try {
      if (!generalLimiter) {
        generalLimiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(30, "10 s"),
          analytics: false,
        });
      }
      const result = await generalLimiter.limit(identifier);
      return { success: result.success, remaining: result.remaining };
    } catch {
      return checkMemoryRateLimit(identifier, 30, 10000);
    }
  }

  return checkMemoryRateLimit(identifier, 30, 10000);
}

/**
 * Queue & Matchmaking loop limiter (6 join/leave requests per 10s).
 * Prevents rapid skip spam and join/leave churn attacks.
 */
export async function rateLimitQueue(
  req: NextRequest,
  guestId?: string
): Promise<{ success: boolean; remaining: number }> {
  const ip = getClientIp(req);
  const identifier = `ratelimit:queue:${ip}:${guestId || "anon"}`;
  const redis = getRedis();

  if (redis instanceof Redis) {
    try {
      if (!queueLimiter) {
        queueLimiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(6, "10 s"),
          analytics: false,
        });
      }
      const result = await queueLimiter.limit(identifier);
      return { success: result.success, remaining: result.remaining };
    } catch {
      return checkMemoryRateLimit(identifier, 6, 10000);
    }
  }

  return checkMemoryRateLimit(identifier, 6, 10000);
}

/**
 * Report limiter (5 reports per 60 seconds).
 */
export async function rateLimitReport(
  req: NextRequest,
  guestId?: string
): Promise<{ success: boolean; remaining: number }> {
  const ip = getClientIp(req);
  const identifier = `ratelimit:report:${ip}:${guestId || "anon"}`;
  const redis = getRedis();

  if (redis instanceof Redis) {
    try {
      if (!reportLimiter) {
        reportLimiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(5, "60 s"),
          analytics: false,
        });
      }
      const result = await reportLimiter.limit(identifier);
      return { success: result.success, remaining: result.remaining };
    } catch {
      return checkMemoryRateLimit(identifier, 5, 60000);
    }
  }

  return checkMemoryRateLimit(identifier, 5, 60000);
}

/**
 * Admin authentication attempt limiter (5 attempts per 60 seconds).
 */
export async function rateLimitAdmin(
  req: NextRequest
): Promise<{ success: boolean; remaining: number }> {
  const ip = getClientIp(req);
  const identifier = `ratelimit:admin:${ip}`;
  const redis = getRedis();

  if (redis instanceof Redis) {
    try {
      if (!adminLimiter) {
        adminLimiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(5, "60 s"),
          analytics: false,
        });
      }
      const result = await adminLimiter.limit(identifier);
      return { success: result.success, remaining: result.remaining };
    } catch {
      return checkMemoryRateLimit(identifier, 5, 60000);
    }
  }

  return checkMemoryRateLimit(identifier, 5, 60000);
}

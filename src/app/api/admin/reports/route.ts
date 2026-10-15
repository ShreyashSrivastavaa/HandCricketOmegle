import { NextRequest, NextResponse } from "next/server";
import { rateLimitAdmin } from "@/lib/server/ratelimit";
import { listReports } from "@/lib/server/safety";
import crypto from "crypto";

export const runtime = "nodejs";

const ADMIN_SECRET =
  process.env.ADMIN_SECRET_TOKEN ||
  process.env.ADMIN_SECRET ||
  process.env.ADMIN_KEY ||
  process.env.ADMIN_PASSWORD ||
  "handcricket_admin_2026";

/**
 * Validates admin authorization via Bearer JWT (Supabase claims) or Secret key.
 * Uses timing-safe string comparison to prevent timing attacks.
 */
function verifyAdminAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const adminKeyHeader = req.headers.get("x-admin-key") || req.headers.get("x-admin-password");

  const providedToken =
    authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : adminKeyHeader?.trim();

  if (!providedToken) return false;

  // 1. Direct Secret key verification (timing-safe)
  try {
    const providedBuffer = Buffer.from(providedToken);
    const expectedBuffer = Buffer.from(ADMIN_SECRET);
    if (
      providedBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      return true;
    }
  } catch {}

  // 2. Supabase JWT inspection if token looks like JWT (3 parts)
  if (providedToken.split(".").length === 3) {
    try {
      const payloadBase64 = providedToken.split(".")[1];
      const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf-8");
      const claims = JSON.parse(payloadJson);
      const role =
        claims?.role ||
        claims?.app_metadata?.role ||
        claims?.user_metadata?.role;

      if (role === "admin" || claims?.is_admin === true) {
        return true;
      }
    } catch {}
  }

  return false;
}

export async function GET(req: NextRequest) {
  // 1. Rate limit login and query attempts
  const rl = await rateLimitAdmin(req);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many admin requests. Please wait a moment." },
      { status: 429 }
    );
  }

  // 2. Authorize admin
  if (!verifyAdminAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized. Admin privileges required." },
      { status: 401 }
    );
  }

  // 3. Return reports and statistics
  const reports = await listReports(100);
  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return NextResponse.json({
    reports,
    stats: {
      totalReports: reports.length,
      pendingReports: pendingCount,
      activeBans: 0,
    },
  });
}

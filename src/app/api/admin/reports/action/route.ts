import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitAdmin } from "@/lib/server/ratelimit";
import { handleReportAction } from "@/lib/server/safety";
import crypto from "crypto";

export const runtime = "nodejs";

const ADMIN_SECRET =
  process.env.ADMIN_SECRET_TOKEN ||
  process.env.ADMIN_SECRET ||
  process.env.ADMIN_KEY ||
  process.env.ADMIN_PASSWORD ||
  "handcricket_admin_2026";

function verifyAdminAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const adminKeyHeader = req.headers.get("x-admin-key") || req.headers.get("x-admin-password");

  const providedToken =
    authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : adminKeyHeader?.trim();

  if (!providedToken) return false;

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

const actionSchema = z.object({
  reportId: z.string().min(1),
  action: z.enum(["dismiss", "ban24h", "banPermanent"]),
});

export async function POST(req: NextRequest) {
  const rl = await rateLimitAdmin(req);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many admin requests. Please wait a moment." },
      { status: 429 }
    );
  }

  if (!verifyAdminAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized. Admin privileges required." },
      { status: 401 }
    );
  }

  const json = await req.json().catch(() => ({}));
  const parsed = actionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid action payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { reportId, action } = parsed.data;

  try {
    const result = await handleReportAction(reportId, action);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[Admin Report Action API] Error:", err);
    return NextResponse.json({ error: "Action execution failed" }, { status: 500 });
  }
}

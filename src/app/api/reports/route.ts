import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateGuestSession } from "@/lib/server/session";
import { recordReport } from "@/lib/server/safety";
import { rateLimitReport } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const reportSchema = z.object({
  reportedGuestId: z.string().min(1).max(100),
  roomId: z.string().min(1).max(100).default("direct"),
  reason: z.string().min(1).max(500).default("Inappropriate behavior or violation of community standards"),
  blockOpponent: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const { session } = getOrCreateGuestSession(req);

  const rl = await rateLimitReport(req, session.guestId);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many reports submitted. Please wait a moment." },
      { status: 429 }
    );
  }

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  const json = await req.json().catch(() => ({}));
  const parsed = reportSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid report data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { reportedGuestId, roomId, reason, blockOpponent } = parsed.data;

  try {
    const result = await recordReport({
      reporterGuestId: session.guestId,
      reportedGuestId,
      roomId,
      reason,
      ip: clientIp,
      blockOpponent,
    });

    return NextResponse.json({
      success: true,
      autoBanned: result.autoBanned,
      message: result.autoBanned
        ? "Report submitted. Target has been suspended due to community reports."
        : "Report submitted. Thank you for keeping HandCricketOmegle safe.",
    });
  } catch (err: any) {
    console.error("[General Reports API] Error:", err);
    return NextResponse.json({ error: "Failed to record report" }, { status: 500 });
  }
}

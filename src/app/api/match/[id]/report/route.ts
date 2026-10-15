import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateGuestSession } from "@/lib/server/session";
import { handleReport } from "@/lib/server/match";
import { rateLimitReport } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const reportSchema = z.object({
  reason: z.string().min(1).max(500).default("Inappropriate behavior or stalling"),
  blockOpponent: z.boolean().default(false),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session } = getOrCreateGuestSession(req);
  const { id: matchId } = await params;

  const rl = await rateLimitReport(req, session.guestId);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many reports submitted. Please wait a moment." },
      { status: 429 }
    );
  }

  const json = await req.json().catch(() => ({}));
  const parsed = reportSchema.safeParse(json);
  const reason = parsed.success ? parsed.data.reason : "Reported by user";
  const blockOpponent = parsed.success ? parsed.data.blockOpponent : false;

  try {
    const result = await handleReport(matchId, session.guestId, reason, blockOpponent);
    return NextResponse.json({
      success: true,
      autoBanned: result.autoBanned,
      message: result.autoBanned
        ? "Report logged. Opponent has been temporarily suspended."
        : "Opponent reported. Thank you for keeping HandCricketOmegle fair.",
    });
  } catch (err: any) {
    console.error("[Report API] Error:", err);
    return NextResponse.json({ error: "Failed to record report" }, { status: 500 });
  }
}

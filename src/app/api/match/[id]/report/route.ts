import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateGuestSession } from "@/lib/server/session";
import { handleReport } from "@/lib/server/match";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const reportSchema = z.object({
  reason: z.string().min(1).max(500).default("Inappropriate behavior or stalling"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session } = getOrCreateGuestSession(req);
  const { id: matchId } = await params;

  const rl = await rateLimit(req, session.guestId);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = reportSchema.safeParse(json);
  const reason = parsed.success ? parsed.data.reason : "Reported by user";

  try {
    await handleReport(matchId, session.guestId, reason);
    return NextResponse.json({ success: true, message: "Opponent reported. Thank you." });
  } catch (err: any) {
    console.error("[Report API] Error:", err);
    return NextResponse.json({ error: "Failed to record report" }, { status: 500 });
  }
}

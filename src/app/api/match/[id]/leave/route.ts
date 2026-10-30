import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateGuestSession } from "@/lib/server/session";
import { handleForfeit } from "@/lib/server/match";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const leaveSchema = z.object({
  reason: z.string().optional().default("Opponent conceded the match"),
  guestId: z.string().optional(),
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
  const parsed = leaveSchema.safeParse(json);
  const reason = parsed.success ? parsed.data.reason : "Opponent left the match";
  // Same as the move route: the per-tab guestId identifies the player, the cookie is shared by tabs
  const clientGuestId = parsed.success ? parsed.data.guestId?.trim() : undefined;
  if (clientGuestId && clientGuestId.length > 3) {
    session.guestId = clientGuestId;
  }

  try {
    const result = await handleForfeit(matchId, session.guestId, reason);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error(`[Match Leave API] Error:`, err);
    return NextResponse.json({ error: err.message || "Failed to leave match" }, { status: 400 });
  }
}

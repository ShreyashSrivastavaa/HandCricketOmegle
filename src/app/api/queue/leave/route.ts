import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateGuestSession } from "@/lib/server/session";
import { leaveMatchmakingQueue } from "@/lib/server/match";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const leaveQueueSchema = z.object({
  mode: z.enum(["sudden_death", "classic", "endless"]).default("sudden_death"),
  guestId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { session } = getOrCreateGuestSession(req);

  const rl = await rateLimit(req, session.guestId);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const json = await req.json().catch(() => ({}));
  const parseResult = leaveQueueSchema.safeParse(json);
  const mode = parseResult.success ? parseResult.data.mode : "sudden_death";
  // The queue entry is keyed by the per-tab guestId the client joined with
  const clientGuestId = parseResult.success ? parseResult.data.guestId?.trim() : undefined;
  const guestId = clientGuestId && clientGuestId.length > 3 ? clientGuestId : session.guestId;

  try {
    await leaveMatchmakingQueue(guestId, mode);
    return NextResponse.json({ success: true, message: "Left matchmaking queue" });
  } catch (err: any) {
    console.error("[Queue Leave API] Error:", err);
    return NextResponse.json({ error: "Failed to leave queue" }, { status: 500 });
  }
}

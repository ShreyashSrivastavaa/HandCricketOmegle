import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateGuestSession, attachSessionCookies } from "@/lib/server/session";
import { joinMatchmakingQueue, createBotMatch } from "@/lib/server/match";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const joinQueueSchema = z.object({
  mode: z.enum(["sudden_death", "classic"]).default("sudden_death"),
  playVsBot: z.boolean().default(false),
  guestName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { session } = getOrCreateGuestSession(req);

  const rl = await rateLimit(req, session.guestId);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const json = await req.json().catch(() => ({}));
  const parseResult = joinQueueSchema.safeParse(json);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid queue parameters", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { mode, playVsBot, guestName } = parseResult.data;
  const effectiveName = guestName?.trim() || session.guestName;

  try {
    if (playVsBot) {
      // User opted for fallback bot match
      const botMatch = await createBotMatch(session.guestId, effectiveName, mode);
      const res = NextResponse.json({
        status: "matched",
        matchId: botMatch.matchId,
        role: botMatch.role,
        opponentName: botMatch.opponentName,
        isBot: true,
      });
      attachSessionCookies(res, session);
      return res;
    }

    // Join online matchmaking queue
    const result = await joinMatchmakingQueue(session.guestId, effectiveName, mode);
    const res = NextResponse.json(result);
    attachSessionCookies(res, session);
    return res;
  } catch (err: any) {
    console.error("[Queue Join API] Matchmaking error:", err);
    return NextResponse.json(
      { error: "Matchmaking failed. Please try again." },
      { status: 500 }
    );
  }
}

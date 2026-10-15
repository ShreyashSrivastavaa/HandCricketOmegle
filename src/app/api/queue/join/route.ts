import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateGuestSession, attachSessionCookies } from "@/lib/server/session";
import { joinMatchmakingQueue, createBotMatch } from "@/lib/server/match";
import { rateLimitQueue } from "@/lib/server/ratelimit";
import { isGuestBanned } from "@/lib/server/safety";

export const runtime = "nodejs";

const joinQueueSchema = z.object({
  mode: z.enum(["sudden_death", "classic"]).default("sudden_death"),
  playVsBot: z.boolean().default(false),
  guestName: z.string().optional(),
  guestId: z.string().optional(),
  ageConfirmed: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const { session } = getOrCreateGuestSession(req);

  const json = await req.json().catch(() => ({}));
  const parseResult = joinQueueSchema.safeParse(json);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid queue parameters", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { mode, playVsBot, guestName, guestId, ageConfirmed } = parseResult.data;
  if (guestId && guestId.trim().length > 3) {
    session.guestId = guestId.trim();
  }
  const effectiveName = guestName?.trim() || session.guestName;
  session.guestName = effectiveName;

  // 1. Churn & Skip spam rate limiting (6 join/leave requests per 10s)
  const rl = await rateLimitQueue(req, session.guestId);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many matchmaking requests. Please wait a moment before searching again." },
      { status: 429 }
    );
  }

  // 2. Client IP extraction for security checks
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  // 3. Ban check (active suspension)
  const banStatus = await isGuestBanned(session.guestId, clientIp);
  if (banStatus.banned) {
    return NextResponse.json(
      {
        error: "Access Suspended: Your access has been temporarily suspended due to community reports.",
        code: "SUSPENDED",
        reason: banStatus.ban?.reason,
        expiresAt: banStatus.ban?.expiresAt,
      },
      { status: 403 }
    );
  }

  // 4. Update age verification if provided in payload
  if (ageConfirmed === true) {
    session.ageVerified = true;
  }

  // 5. 18+ Verification required for stranger matchmaking
  if (!playVsBot && !session.ageVerified) {
    const res = NextResponse.json(
      {
        error: "18+ age verification is required for stranger matchmaking.",
        code: "AGE_VERIFICATION_REQUIRED",
      },
      { status: 403 }
    );
    attachSessionCookies(res, session);
    return res;
  }

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
      { error: err.message || "Matchmaking failed. Please try again." },
      { status: 500 }
    );
  }
}

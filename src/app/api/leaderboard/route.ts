import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRedis } from "@/lib/server/redis";
import { getOrCreateGuestSession } from "@/lib/server/session";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const submitScoreSchema = z.object({
  score: z.number().int().min(0).max(10000),
  balls: z.number().int().min(0).max(10000),
  streak: z.number().int().min(0).max(1000).optional(),
  name: z.string().min(1).max(20).optional(),
  variant: z.enum(["standard", "pro"]).default("standard"),
});

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  balls?: number;
  streak?: number;
  date?: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") === "daily" ? "daily" : "all_time";
    const variant = searchParams.get("variant") === "pro" ? "pro" : "standard";

    const redis = getRedis();
    const today = new Date().toISOString().slice(0, 10);
    const key =
      type === "daily"
        ? `leaderboard:endless:${variant}:daily:${today}`
        : `leaderboard:endless:${variant}:all_time`;

    const anyRedis = redis as any;
    const raw = typeof anyRedis.zrange === "function"
      ? await anyRedis.zrange(key, 0, 9, { rev: true, withScores: true })
      : typeof anyRedis.zrevrange === "function"
      ? await anyRedis.zrevrange(key, 0, 9, { withScores: true })
      : [];
    const entries: LeaderboardEntry[] = [];

    // Upstash zrevrange withScores returns [member, score, member, score, ...] or [{ member, score }]
    if (Array.isArray(raw)) {
      for (let i = 0; i < raw.length; i += 2) {
        const item = raw[i];
        const score = typeof raw[i + 1] === "number" ? raw[i + 1] : Number(raw[i + 1]);
        if (item !== undefined && !isNaN(score)) {
          let name = String(item);
          let balls = 0;
          let streak = 0;
          try {
            const parsed = JSON.parse(String(item));
            if (parsed && parsed.name) {
              name = parsed.name;
              balls = parsed.balls || 0;
              streak = parsed.streak || 0;
            }
          } catch {}

          entries.push({
            rank: entries.length + 1,
            name,
            score,
            balls,
            streak,
          });
        }
      }
    }

    return NextResponse.json({
      type,
      variant,
      entries,
    });
  } catch (err: any) {
    console.error("[Leaderboard GET] Error:", err);
    return NextResponse.json({ type: "all_time", entries: [] });
  }
}

export async function POST(req: NextRequest) {
  const { session } = getOrCreateGuestSession(req);

  const rl = await rateLimit(req, session.guestId);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const json = await req.json().catch(() => ({}));
  const parseResult = submitScoreSchema.safeParse(json);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid score data", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { score, balls, streak, name, variant } = parseResult.data;
  const effectiveName = (name || session.guestName || "Player").slice(0, 16);

  try {
    const redis = getRedis();
    const today = new Date().toISOString().slice(0, 10);
    const allTimeKey = `leaderboard:endless:${variant}:all_time`;
    const dailyKey = `leaderboard:endless:${variant}:daily:${today}`;

    const memberPayload = JSON.stringify({
      id: session.guestId,
      name: effectiveName,
      balls,
      streak: streak || 0,
      timestamp: Date.now(),
    });

    await Promise.all([
      redis.zadd(allTimeKey, { score, member: memberPayload }),
      redis.zadd(dailyKey, { score, member: memberPayload }),
    ]);

    // Expire daily leaderboard in 48 hours
    if (typeof redis.expire === "function") {
      redis.expire(dailyKey, 172800).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      name: effectiveName,
      score,
      variant,
    });
  } catch (err: any) {
    console.error("[Leaderboard POST] Error:", err);
    return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
  }
}

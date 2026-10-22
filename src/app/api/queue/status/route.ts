import { NextRequest, NextResponse } from "next/server";
import { getOrCreateGuestSession } from "@/lib/server/session";
import { getRedis } from "@/lib/server/redis";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { session } = getOrCreateGuestSession(req);
  const clientGuestId = req.nextUrl.searchParams.get("guestId") || session.guestId;

  const redis = getRedis();
  const raw = await redis.get(`user_match:${clientGuestId}`);

  if (raw) {
    // Consume match notification
    await redis.del(`user_match:${clientGuestId}`);
    const matchData = typeof raw === "string" ? JSON.parse(raw) : raw;
    return NextResponse.json({
      status: "matched",
      ...matchData,
    });
  }

  return NextResponse.json({ status: "queued" });
}

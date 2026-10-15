import { NextRequest, NextResponse } from "next/server";
import { getOrCreateGuestSession, attachSessionCookies } from "@/lib/server/session";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { session, isNew } = getOrCreateGuestSession(req);

  const rl = await rateLimit(req, session.guestId);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const res = NextResponse.json({
    guestId: session.guestId,
    guestName: session.guestName,
    isNew,
  });

  attachSessionCookies(res, session);
  return res;
}

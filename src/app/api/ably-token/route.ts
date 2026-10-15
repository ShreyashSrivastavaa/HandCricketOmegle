import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateGuestSession, attachSessionCookies } from "@/lib/server/session";
import { createAblyTokenRequest } from "@/lib/server/ably";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const ablyTokenBodySchema = z.object({
  matchId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { session } = getOrCreateGuestSession(req);

  const rl = await rateLimit(req, session.guestId);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let matchId: string | undefined;
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = ablyTokenBodySchema.safeParse(json);
    if (parsed.success) {
      matchId = parsed.data.matchId;
    }
  } catch {
    // optional body
  }

  try {
    const tokenRequest = await createAblyTokenRequest(session.guestId, matchId);
    const res = NextResponse.json(tokenRequest);
    attachSessionCookies(res, session);
    return res;
  } catch (err: any) {
    console.error("[Ably Token API] Error generating token request:", err);
    return NextResponse.json(
      { error: "Failed to generate realtime token" },
      { status: 500 }
    );
  }
}

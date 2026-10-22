import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateGuestSession, attachSessionCookies } from "@/lib/server/session";
import { rateLimit } from "@/lib/server/ratelimit";
import { getAblyRest } from "@/lib/server/ably";

export const runtime = "nodejs";

const updateSessionSchema = z.object({
  ageConfirmed: z.boolean().optional(),
  guestName: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_\- ]{3,20}$/, "Invalid player name")
    .optional(),
});

export async function GET(req: NextRequest) {
  const { session, isNew } = getOrCreateGuestSession(req);

  const rl = await rateLimit(req, session.guestId);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const res = NextResponse.json({
    guestId: session.guestId,
    guestName: session.guestName,
    ageVerified: Boolean(session.ageVerified),
    isNew,
    isMockRealtime: !getAblyRest(),
  });

  attachSessionCookies(res, session);
  return res;
}

export async function POST(req: NextRequest) {
  const { session } = getOrCreateGuestSession(req);

  const rl = await rateLimit(req, session.guestId);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const json = await req.json().catch(() => ({}));
  const parseResult = updateSessionSchema.safeParse(json);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid session payload", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { ageConfirmed, guestName } = parseResult.data;

  if (ageConfirmed === true) {
    session.ageVerified = true;
  }
  if (guestName) {
    session.guestName = guestName;
  }

  const res = NextResponse.json({
    success: true,
    guestId: session.guestId,
    guestName: session.guestName,
    ageVerified: Boolean(session.ageVerified),
  });

  attachSessionCookies(res, session);
  return res;
}

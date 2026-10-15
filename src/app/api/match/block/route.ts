import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateGuestSession } from "@/lib/server/session";
import { blockGuest } from "@/lib/server/safety";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const blockSchema = z.object({
  blockedGuestId: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  const { session } = getOrCreateGuestSession(req);

  const rl = await rateLimit(req, session.guestId);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = blockSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid block payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { blockedGuestId } = parsed.data;

  try {
    await blockGuest(session.guestId, blockedGuestId);
    return NextResponse.json({
      success: true,
      message: "Player blocked. You will not be matched with them again.",
    });
  } catch (err: any) {
    console.error("[Block API] Error:", err);
    return NextResponse.json({ error: "Failed to block opponent" }, { status: 500 });
  }
}

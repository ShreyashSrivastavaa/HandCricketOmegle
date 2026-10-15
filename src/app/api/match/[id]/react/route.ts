import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateGuestSession } from "@/lib/server/session";
import { publishToAbly } from "@/lib/server/ably";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

// Fixed set of 6 allowed cricket reactions
const ALLOWED_EMOJIS = ["🏏", "🔥", "😮", "😂", "👏", "💔"] as const;

const reactSchema = z.object({
  emoji: z.enum(ALLOWED_EMOJIS),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session } = getOrCreateGuestSession(req);
  const { id: matchId } = await params;

  const rl = await rateLimit(req, session.guestId);
  if (!rl.success) {
    return NextResponse.json({ error: "Reaction rate limit reached" }, { status: 429 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = reactSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid emoji reaction" }, { status: 400 });
  }

  await publishToAbly(`match:${matchId}`, "reaction", {
    senderGuestId: session.guestId,
    emoji: parsed.data.emoji,
    timestamp: Date.now(),
  });

  return NextResponse.json({ success: true, emoji: parsed.data.emoji });
}

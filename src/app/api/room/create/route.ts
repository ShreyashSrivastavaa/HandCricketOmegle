import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateGuestSession, attachSessionCookies } from "@/lib/server/session";
import { createFriendRoomServerless } from "@/lib/server/friendRoom";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const createRoomSchema = z.object({
  guestId: z.string().optional(),
  name: z.string().optional(),
  mode: z.enum(["video", "game_only"]).default("game_only"),
  format: z
    .object({
      mode: z.enum(["sudden_death", "classic"]).optional(),
      maxWickets: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
      maxOvers: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
    })
    .default({ maxWickets: 1, maxOvers: 1 }),
});

export async function POST(req: NextRequest) {
  const { session } = getOrCreateGuestSession(req);

  const json = await req.json().catch(() => ({}));
  const parseResult = createRoomSchema.safeParse(json);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid room creation payload", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { guestId, name, mode, format } = parseResult.data;
  if (guestId && guestId.trim().length > 3) {
    session.guestId = guestId.trim();
  }
  const effectiveName = name?.trim() || session.guestName;
  session.guestName = effectiveName;

  const rl = await rateLimit(req, session.guestId);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const room = await createFriendRoomServerless({
      guestId: session.guestId,
      name: effectiveName,
      mode,
      format,
    });

    const res = NextResponse.json({
      success: true,
      code: room.code,
      roomId: room.roomId,
      room,
    });
    attachSessionCookies(res, session);
    return res;
  } catch (err: any) {
    console.error("[Room Create API] Error creating room:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create room." },
      { status: 500 }
    );
  }
}

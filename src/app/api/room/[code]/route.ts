import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateGuestSession, attachSessionCookies } from "@/lib/server/session";
import {
  getFriendRoomByCode,
  saveFriendRoom,
  broadcastFriendRoomState,
} from "@/lib/server/friendRoom";
import { getRedis } from "@/lib/server/redis";
import { publishToAbly } from "@/lib/server/ably";
import { createInitialGameState } from "@/lib/game/engine";
import { MATCH_TTL_SECONDS, type RedisMatch } from "@/lib/server/match";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const formatSchema = z.object({
  mode: z.enum(["sudden_death", "classic", "endless"]).optional(),
  maxWickets: z.number().int().min(1).max(10).default(1),
  maxOvers: z.number().int().min(0).max(50).default(1),
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("join"),
    guestId: z.string().optional(),
    name: z.string().optional(),
    ageConfirmed: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("ready"),
    ready: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("format"),
    format: formatSchema,
  }),
  z.object({
    action: z.literal("kick"),
    targetGuestId: z.string(),
  }),
  z.object({
    action: z.literal("leave"),
  }),
  z.object({
    action: z.literal("rematch"),
  }),
]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { session } = getOrCreateGuestSession(req);
  const { code: rawCode } = await params;

  const room = await getFriendRoomByCode(rawCode);
  if (!room) {
    return NextResponse.json({ error: "Room not found or expired." }, { status: 404 });
  }

  const res = NextResponse.json({ success: true, room });
  attachSessionCookies(res, session);
  return res;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { session } = getOrCreateGuestSession(req);
  const { code: rawCode } = await params;

  const json = await req.json().catch(() => ({}));
  const parseResult = actionSchema.safeParse(json);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid action payload", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parseResult.data;
  if ("guestId" in payload && payload.guestId && payload.guestId.length > 3) {
    session.guestId = payload.guestId;
  }
  if ("name" in payload && payload.name) {
    session.guestName = payload.name;
  }

  const room = await getFriendRoomByCode(rawCode);
  if (!room) {
    return NextResponse.json({ error: "Room not found or expired." }, { status: 404 });
  }

  const guestId = session.guestId;
  const isHost = room.host.guestId === guestId;
  const isGuest = room.guest?.guestId === guestId;

  // Handle actions
  if (payload.action === "join") {
    if (isHost) {
      // Host re-joining/syncing
      room.host.name = session.guestName || room.host.name;
      room.host.disconnected = false;
    } else if (isGuest) {
      // Guest re-joining/syncing
      room.guest!.name = session.guestName || room.guest!.name;
      room.guest!.disconnected = false;
    } else if (!room.guest) {
      // New guest joining
      room.guest = {
        guestId,
        name: session.guestName || "Friend",
        ready: false,
      };
      room.status = "lobby";
      if (!room.seriesScore[guestId]) {
        room.seriesScore[guestId] = 0;
      }
    } else {
      return NextResponse.json(
        { error: "Room is currently full with 2 players." },
        { status: 403 }
      );
    }

    await saveFriendRoom(room);
    await broadcastFriendRoomState(room);

    const res = NextResponse.json({ success: true, room });
    attachSessionCookies(res, session);
    return res;
  }

  if (payload.action === "format") {
    if (!isHost) {
      return NextResponse.json({ error: "Only the host can modify format." }, { status: 403 });
    }
    room.format = payload.format;
    await saveFriendRoom(room);
    await broadcastFriendRoomState(room);

    const res = NextResponse.json({ success: true, room });
    attachSessionCookies(res, session);
    return res;
  }

  if (payload.action === "ready") {
    const nextReady = payload.ready !== undefined ? payload.ready : (isHost ? !room.host.ready : !room.guest?.ready);
    if (isHost) {
      room.host.ready = nextReady;
    } else if (isGuest && room.guest) {
      room.guest.ready = nextReady;
    } else {
      return NextResponse.json({ error: "You are not a member of this room." }, { status: 403 });
    }

    // Check if both players are ready
    if (room.host.ready && room.guest?.ready) {
      room.status = "playing";

      // Create Redis match so the existing game engine routes (/api/match/[id]/move) work!
      const matchId = `match_friend_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
      room.matchId = matchId;

      const p1 = { guestId: room.host.guestId, name: room.host.name };
      const p2 = { guestId: room.guest.guestId, name: room.guest.name };
      const gameState = createInitialGameState(room.format, p1.name, p2.name, "p1");

      const redis = getRedis();
      const matchData: RedisMatch = {
        id: matchId,
        format: room.format,
        player1: p1,
        player2: p2,
        gameState,
        isBot: false,
        currentBallMoves: {},
        currentBallIndex: 0,
        tossPicks: {},
        seriesScore: room.seriesScore,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await redis.set(`match:${matchId}`, JSON.stringify(matchData), {
        ex: MATCH_TTL_SECONDS,
      });

      await saveFriendRoom(room);
      await broadcastFriendRoomState(room);

      // Publish match:found on room channel
      await publishToAbly(`room:${room.code}`, "match:found", {
        roomId: room.roomId,
        matchId,
        mode: room.mode,
        format: room.format,
        hostId: room.host.guestId,
        guestId: room.guest.guestId,
        p1,
        p2,
      });

      const res = NextResponse.json({ success: true, room, matchId });
      attachSessionCookies(res, session);
      return res;
    }

    await saveFriendRoom(room);
    await broadcastFriendRoomState(room);

    const res = NextResponse.json({ success: true, room });
    attachSessionCookies(res, session);
    return res;
  }

  if (payload.action === "kick") {
    if (!isHost) {
      return NextResponse.json({ error: "Only the host can kick players." }, { status: 403 });
    }
    if (room.guest && room.guest.guestId === payload.targetGuestId) {
      room.guest = null;
      room.status = "waiting";
      room.host.ready = false;
      await saveFriendRoom(room);
      await broadcastFriendRoomState(room);
      await publishToAbly(`room:${room.code}`, "friend:kicked", {
        targetGuestId: payload.targetGuestId,
        message: "You were removed from the room by the host.",
      });
    }
    return NextResponse.json({ success: true, room });
  }

  if (payload.action === "leave") {
    if (isHost) {
      room.host.disconnected = true;
    } else if (isGuest && room.guest) {
      room.guest = null;
      room.status = "waiting";
      room.host.ready = false;
    }
    await saveFriendRoom(room);
    await broadcastFriendRoomState(room);
    return NextResponse.json({ success: true, room });
  }

  return NextResponse.json({ success: true, room });
}

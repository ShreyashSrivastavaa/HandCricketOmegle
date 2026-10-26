import { getRedis } from "./redis";
import { publishToAbly } from "./ably";
import type { MatchFormat } from "../game/types";
import { DEFAULT_SUDDEN_DEATH_FORMAT } from "../game/engine";

export const FRIEND_ROOM_TTL_SECONDS = 1800; // 30 minutes

export interface ServerlessFriendRoom {
  roomId: string;
  code: string; // e.g. "7K9P2X"
  type: "friend";
  mode: "video" | "game_only";
  format: MatchFormat;
  status: "waiting" | "lobby" | "playing" | "ended";
  host: {
    guestId: string;
    name: string;
    ready: boolean;
    disconnected?: boolean;
  };
  guest: {
    guestId: string;
    name: string;
    ready: boolean;
    disconnected?: boolean;
  } | null;
  seriesScore: { [guestId: string]: number };
  matchId?: string;
  createdAt: number;
  updatedAt: number;
}

const CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * CODE_CHARACTERS.length);
    code += CODE_CHARACTERS[idx];
  }
  return code;
}

export function normalizeRoomCode(input: string): string {
  const upper = input.trim().toUpperCase();
  if (upper.startsWith("HC-")) return upper.slice(3);
  if (upper.startsWith("HC") && upper.length > 6) return upper.slice(2);
  return upper;
}

export async function createFriendRoomServerless({
  guestId,
  name,
  mode = "game_only",
  format = DEFAULT_SUDDEN_DEATH_FORMAT,
}: {
  guestId: string;
  name: string;
  mode?: "video" | "game_only";
  format?: MatchFormat;
}): Promise<ServerlessFriendRoom> {
  const redis = getRedis();

  let code = generateRoomCode();
  // Ensure uniqueness
  for (let i = 0; i < 10; i++) {
    const existing = await redis.get(`friend_room:${code}`);
    if (!existing) break;
    code = generateRoomCode();
  }

  const roomId = `room_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;

  const room: ServerlessFriendRoom = {
    roomId,
    code,
    type: "friend",
    mode,
    format,
    status: "waiting",
    host: {
      guestId,
      name,
      ready: false,
    },
    guest: null,
    seriesScore: {
      [guestId]: 0,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await redis.set(`friend_room:${code}`, JSON.stringify(room), {
    ex: FRIEND_ROOM_TTL_SECONDS,
  });
  await redis.set(`friend_room_id:${roomId}`, code, {
    ex: FRIEND_ROOM_TTL_SECONDS,
  });

  // Register in in-memory roomStore if running in Node/Express environment
  try {
    const { roomStore } = await import("@/server/roomStore");
    roomStore.registerExistingRoom({
      roomId: room.roomId,
      code: room.code,
      hostGuestId: room.host.guestId,
      hostName: room.host.name,
      mode: room.mode,
      format: room.format,
    });
  } catch {
    // Non-fatal in edge/serverless runtimes
  }

  return room;
}

export async function getFriendRoomByCode(
  rawCode: string
): Promise<ServerlessFriendRoom | null> {
  const code = normalizeRoomCode(rawCode);
  const redis = getRedis();
  let raw = await redis.get<ServerlessFriendRoom | string>(`friend_room:${code}`);
  if (!raw) {
    // If exact code not found, try common character visual substitutions (e.g. 7 <-> Z, 2 <-> Z, B <-> 8)
    const variations: string[] = [];
    if (code.includes("7")) variations.push(code.replace(/7/g, "Z"));
    if (code.includes("Z")) variations.push(code.replace(/Z/g, "7"));
    if (code.includes("2")) variations.push(code.replace(/2/g, "Z"));
    if (code.includes("B")) variations.push(code.replace(/B/g, "8"));
    if (code.includes("8")) variations.push(code.replace(/8/g, "B"));

    for (const alt of variations) {
      raw = await redis.get<ServerlessFriendRoom | string>(`friend_room:${alt}`);
      if (raw) break;
    }
  }
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export async function saveFriendRoom(room: ServerlessFriendRoom): Promise<void> {
  const redis = getRedis();
  room.updatedAt = Date.now();
  await redis.set(`friend_room:${room.code}`, JSON.stringify(room), {
    ex: FRIEND_ROOM_TTL_SECONDS,
  });
  await redis.set(`friend_room_id:${room.roomId}`, room.code, {
    ex: FRIEND_ROOM_TTL_SECONDS,
  });
}

export async function broadcastFriendRoomState(room: ServerlessFriendRoom): Promise<void> {
  await publishToAbly(`room:${room.code}`, "friend:state", room);
}

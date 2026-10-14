import { z } from "zod";

// Match format validation (wickets 1-3, overs 1-3)
export const matchFormatSchema = z.object({
  maxWickets: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  maxOvers: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

// 1. Random Matchmaking Queue
export const joinQueueSchema = z.object({
  guestId: z.string().min(1).max(64),
  queueType: z.enum(["video", "game_only"]),
  ageConfirmed: z.boolean(),
  blockedGuestIds: z.array(z.string()).optional().default([]),
  name: z.string().min(1).max(32).optional(),
});

// 2. Friend Room Creation
export const friendCreateSchema = z.object({
  guestId: z.string().min(1).max(64),
  name: z.string().min(1).max(32),
  mode: z.enum(["video", "game_only"]),
  format: matchFormatSchema,
});

// 3. Friend Room Join
export const friendJoinSchema = z.object({
  code: z.string().min(4).max(10).transform((c) => c.trim().toUpperCase()),
  guestId: z.string().min(1).max(64),
  name: z.string().min(1).max(32),
  ageConfirmed: z.boolean().optional(),
});

// 4. Friend Room Ready Toggle
export const friendReadySchema = z.object({
  ready: z.boolean(),
});

// 5. Friend Format Update
export const friendFormatUpdateSchema = z.object({
  format: matchFormatSchema,
});

// 6. Friend Kick
export const friendKickSchema = z.object({
  targetGuestId: z.string().min(1).max(64),
});

// 7. Friend Reconnect
export const friendReconnectSchema = z.object({
  code: z.string().min(4).max(10).transform((c) => c.trim().toUpperCase()),
  guestId: z.string().min(1).max(64),
});

// 8. Game Toss & Ball Events
export const tossCallSchema = z.object({
  call: z.enum(["odd", "even"]),
});

export const tossPickSchema = z.object({
  pick: z.number().int().min(1).max(6),
});

export const tossDecisionSchema = z.object({
  role: z.enum(["bat", "bowl"]),
});

export const ballPickSchema = z.object({
  pick: z.number().int().min(1).max(6),
  ballIndex: z.number().int().min(0),
});

export const emoteSchema = z.object({
  emote: z.string().min(1).max(10),
});

// 9. WebRTC Signaling Relays
export const rtcSignalSchema = z.object({
  sdp: z.any().optional(),
  candidate: z.any().optional(),
  enabled: z.boolean().optional(),
});

export type JoinQueueInput = z.infer<typeof joinQueueSchema>;
export type FriendCreateInput = z.infer<typeof friendCreateSchema>;
export type FriendJoinInput = z.infer<typeof friendJoinSchema>;
export type FriendReadyInput = z.infer<typeof friendReadySchema>;
export type FriendFormatUpdateInput = z.infer<typeof friendFormatUpdateSchema>;
export type BallPickInput = z.infer<typeof ballPickSchema>;

import { z } from "zod";

/**
 * Valid numbers in Hand Cricket: 1 to 6 (or 0 for closed fist in gesture mode)
 */
export const handPickSchema = z.number().int().min(1).max(6);

/**
 * Extended pick schema including 0
 */
export const extendedPickSchema = z.number().int().min(0).max(6);

/**
 * Player identifier
 */
export const playerIdSchema = z.enum(["p1", "p2"]);

/**
 * Toss Call (Odd or Even)
 */
export const tossCallSchema = z.enum(["odd", "even"]);

/**
 * Toss Decision (Bat or Bowl)
 */
export const tossDecisionSchema = z.enum(["bat", "bowl"]);

/**
 * Match modes
 */
export const matchModeSchema = z.enum(["sudden_death", "classic"]);

/**
 * Validated Toss Action message
 */
export const tossActionMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("call"),
    value: tossCallSchema,
  }),
  z.object({
    type: z.literal("pick"),
    value: handPickSchema,
  }),
  z.object({
    type: z.literal("decision"),
    value: tossDecisionSchema,
  }),
]);

/**
 * Validated Ball Move submission message
 */
export const ballMoveMessageSchema = z.object({
  kind: z.literal("ball"),
  ballIndex: z.number().int().min(0),
  pick: handPickSchema,
  seq: z.number().int().min(0).optional(),
});

/**
 * Validated Toss submission message
 */
export const tossMoveMessageSchema = z.object({
  kind: z.literal("toss"),
  action: tossActionMessageSchema,
  seq: z.number().int().min(0).optional(),
});

/**
 * Validated Innings 2 start message
 */
export const startInnings2MessageSchema = z.object({
  kind: z.literal("start_innings_2"),
  seq: z.number().int().min(0).optional(),
});

/**
 * Combined API / Data Channel Match Move Schema
 */
export const matchMovePayloadSchema = z.discriminatedUnion("kind", [
  ballMoveMessageSchema,
  tossMoveMessageSchema,
  startInnings2MessageSchema,
]);

/**
 * Validated In-Match Reaction message (fixed 6 safe emojis)
 */
export const ALLOWED_EMOJIS = ["🏏", "🔥", "😮", "😂", "👏", "💔"] as const;
export const emoteMessageSchema = z.object({
  emoji: z.enum(ALLOWED_EMOJIS),
  seq: z.number().int().min(0).optional(),
});

/**
 * Validated Ready Check message
 */
export const readyCheckMessageSchema = z.object({
  ready: z.boolean(),
  guestId: z.string().min(1).max(100),
  timestamp: z.number().optional(),
});

/**
 * Validated Forfeit / Leave message
 */
export const forfeitMessageSchema = z.object({
  reason: z.string().max(200).optional(),
  seq: z.number().int().min(0).optional(),
});

/**
 * WebRTC Signaling message schema (Offer, Answer, Candidate)
 */
export const rtcSignalMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("offer"),
    sdp: z.string().min(1),
  }),
  z.object({
    type: z.literal("answer"),
    sdp: z.string().min(1),
  }),
  z.object({
    type: z.literal("candidate"),
    candidate: z.object({
      candidate: z.string(),
      sdpMid: z.string().nullable().optional(),
      sdpMLineIndex: z.number().nullable().optional(),
      usernameFragment: z.string().nullable().optional(),
    }),
  }),
]);

/**
 * Helper to safely validate incoming JSON message crossing boundaries
 */
export function validateMessage<T>(schema: z.ZodType<T>, raw: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

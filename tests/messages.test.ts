import { describe, it, expect } from "vitest";
import {
  matchMovePayloadSchema,
  tossActionMessageSchema,
  emoteMessageSchema,
  readyCheckMessageSchema,
  forfeitMessageSchema,
  rtcSignalMessageSchema,
  validateMessage,
  ALLOWED_EMOJIS,
} from "../src/lib/messages";
import { getEnv } from "../src/lib/env";

describe("Message Validation & Sequence Ordering (lib/messages.ts)", () => {
  describe("Ball Move Validation", () => {
    it("validates legitimate ball move within bounds 1-6", () => {
      const validMove = {
        kind: "ball",
        ballIndex: 0,
        pick: 4,
        seq: 1,
      };
      const res = validateMessage(matchMovePayloadSchema, validMove);
      expect(res.success).toBe(true);
    });

    it("rejects illegal pick out of range (e.g. 7 or negative)", () => {
      const invalidMove = {
        kind: "ball",
        ballIndex: 1,
        pick: 7,
      };
      const res = validateMessage(matchMovePayloadSchema, invalidMove);
      expect(res.success).toBe(false);
    });

    it("rejects non-integer float picks (e.g. 3.5)", () => {
      const floatMove = {
        kind: "ball",
        ballIndex: 2,
        pick: 3.5,
      };
      const res = validateMessage(matchMovePayloadSchema, floatMove);
      expect(res.success).toBe(false);
    });
  });

  describe("Toss Action Validation", () => {
    it("validates toss call 'odd' and 'even'", () => {
      expect(tossActionMessageSchema.safeParse({ type: "call", value: "odd" }).success).toBe(true);
      expect(tossActionMessageSchema.safeParse({ type: "call", value: "even" }).success).toBe(true);
      expect(tossActionMessageSchema.safeParse({ type: "call", value: "tails" }).success).toBe(false);
    });

    it("validates toss pick 1-6", () => {
      expect(tossActionMessageSchema.safeParse({ type: "pick", value: 6 }).success).toBe(true);
      expect(tossActionMessageSchema.safeParse({ type: "pick", value: 0 }).success).toBe(false);
    });

    it("validates toss decision 'bat' and 'bowl'", () => {
      expect(tossActionMessageSchema.safeParse({ type: "decision", value: "bat" }).success).toBe(true);
      expect(tossActionMessageSchema.safeParse({ type: "decision", value: "bowl" }).success).toBe(true);
      expect(tossActionMessageSchema.safeParse({ type: "decision", value: "field" }).success).toBe(false);
    });
  });

  describe("Reaction Emotes & Ready Check", () => {
    it("accepts allowed emoji reactions", () => {
      for (const emoji of ALLOWED_EMOJIS) {
        const res = emoteMessageSchema.safeParse({ emoji });
        expect(res.success).toBe(true);
      }
    });

    it("rejects arbitrary text or unapproved emojis to prevent abuse", () => {
      const textAttack = { emoji: "Free text chat attack" };
      expect(emoteMessageSchema.safeParse(textAttack).success).toBe(false);

      const unapprovedEmoji = { emoji: "🖕" };
      expect(emoteMessageSchema.safeParse(unapprovedEmoji).success).toBe(false);
    });

    it("validates ready check payload", () => {
      const readyMsg = {
        ready: true,
        guestId: "guest_12345",
        timestamp: Date.now(),
      };
      expect(readyCheckMessageSchema.safeParse(readyMsg).success).toBe(true);
    });
  });

  describe("Sequence Ordering and Duplicate Detection", () => {
    it("tracks monotonically increasing sequence numbers and flags duplicates", () => {
      const processedSeqs = new Set<number>();
      let lastSeq = -1;

      const incomingMessages = [
        { kind: "ball", ballIndex: 0, pick: 2, seq: 1 },
        { kind: "ball", ballIndex: 0, pick: 2, seq: 1 }, // duplicate
        { kind: "ball", ballIndex: 1, pick: 4, seq: 2 },
        { kind: "ball", ballIndex: 0, pick: 3, seq: 0 }, // out-of-order stale
      ];

      const results: { accepted: boolean; reason?: string }[] = [];

      for (const msg of incomingMessages) {
        const parsed = matchMovePayloadSchema.safeParse(msg);
        if (!parsed.success) {
          results.push({ accepted: false, reason: "invalid_schema" });
          continue;
        }

        const seq = parsed.data.seq ?? 0;
        if (processedSeqs.has(seq)) {
          results.push({ accepted: false, reason: "duplicate_seq" });
          continue;
        }
        if (seq <= lastSeq) {
          results.push({ accepted: false, reason: "out_of_order" });
          continue;
        }

        processedSeqs.add(seq);
        lastSeq = seq;
        results.push({ accepted: true });
      }

      expect(results[0].accepted).toBe(true);
      expect(results[1]).toEqual({ accepted: false, reason: "duplicate_seq" });
      expect(results[2].accepted).toBe(true);
      expect(results[3]).toEqual({ accepted: false, reason: "out_of_order" });
    });
  });

  describe("Environment Variable Validation at Startup", () => {
    it("validates env vars through Zod schema in getEnv()", () => {
      const env = getEnv();
      expect(env).toBeDefined();
      expect(env.ABLY_API_KEY).toBeDefined();
      expect(env.UPSTASH_REDIS_REST_URL).toBeDefined();
    });
  });
});

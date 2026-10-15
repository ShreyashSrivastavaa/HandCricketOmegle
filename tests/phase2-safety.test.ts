import { describe, it, expect, beforeEach } from "vitest";
import {
  recordReport,
  isGuestBanned,
  banGuest,
  blockGuest,
  isOpponentBlocked,
  hashIp,
} from "../src/lib/server/safety";
import { getRedis } from "../src/lib/server/redis";

describe("Phase 2 — Safety, Moderation & Privacy Hardening", () => {
  beforeEach(async () => {
    // Clear test keys in in-memory redis
    const redis = getRedis();
    await (redis as any).flushall?.();
  });

  describe("Zero Video Storage & Report Metadata", () => {
    it("records report metadata without snapshots and logs properly", async () => {
      const result = await recordReport({
        reporterGuestId: "guest_alice",
        reportedGuestId: "guest_bob",
        roomId: "match_xyz123",
        reason: "Unsportsmanlike stalling",
        ip: "192.0.2.1",
      });

      expect(result.success).toBe(true);
      expect(result.autoBanned).toBe(false);
      expect(result.reportId).toMatch(/^rep_\d+_/);
    });

    it("auto-bans player when receiving 3 distinct reports within 24 hours", async () => {
      const reported = "bad_actor_99";

      // Report 1
      const rep1 = await recordReport({
        reporterGuestId: "user_1",
        reportedGuestId: reported,
        roomId: "match_1",
        reason: "Misconduct",
        ip: "192.0.2.10",
      });
      expect(rep1.autoBanned).toBe(false);
      expect((await isGuestBanned(reported)).banned).toBe(false);

      // Report 2
      const rep2 = await recordReport({
        reporterGuestId: "user_2",
        reportedGuestId: reported,
        roomId: "match_2",
        reason: "Misconduct",
        ip: "192.0.2.11",
      });
      expect(rep2.autoBanned).toBe(false);
      expect((await isGuestBanned(reported)).banned).toBe(false);

      // Duplicate report from user_2 does not increment distinct count
      const rep2Dup = await recordReport({
        reporterGuestId: "user_2",
        reportedGuestId: reported,
        roomId: "match_2_dup",
        reason: "Duplicate",
      });
      expect(rep2Dup.autoBanned).toBe(false);

      // Report 3 from distinct reporter triggers 24h temp suspension
      const rep3 = await recordReport({
        reporterGuestId: "user_3",
        reportedGuestId: reported,
        roomId: "match_3",
        reason: "Misconduct",
        ip: "192.0.2.12",
      });
      expect(rep3.autoBanned).toBe(true);

      const banCheck = await isGuestBanned(reported);
      expect(banCheck.banned).toBe(true);
      expect(banCheck.ban?.type).toBe("temp_24h");
      expect(banCheck.ban?.reason).toContain("3 community reports");
    });
  });

  describe("Blocking & Pairwise Isolation", () => {
    it("correctly identifies blocked pairs bidirectionally", async () => {
      const userA = "player_a";
      const userB = "player_b";
      const userC = "player_c";

      expect(await isOpponentBlocked(userA, userB)).toBe(false);

      // userA blocks userB
      await blockGuest(userA, userB);

      // Neither can match with each other
      expect(await isOpponentBlocked(userA, userB)).toBe(true);
      expect(await isOpponentBlocked(userB, userA)).toBe(true);

      // Unrelated userC is not blocked
      expect(await isOpponentBlocked(userA, userC)).toBe(false);
    });

    it("can block directly via recordReport blockOpponent flag", async () => {
      const reporter = "caller_1";
      const target = "spammer_2";

      await recordReport({
        reporterGuestId: reporter,
        reportedGuestId: target,
        roomId: "match_test",
        reason: "Offensive name",
        blockOpponent: true,
      });

      expect(await isOpponentBlocked(reporter, target)).toBe(true);
    });
  });

  describe("Hashed IP Anonymization", () => {
    it("hashes IP with SHA-256 and never returns plain IP", () => {
      const rawIp = "203.0.113.45";
      const hashed = hashIp(rawIp);

      expect(hashed).toHaveLength(64);
      expect(hashed).not.toContain(rawIp);
      // Consistent hash
      expect(hashIp(rawIp)).toBe(hashed);
    });
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getRedis } from "../src/lib/server/redis";
import {
  joinMatchmakingQueue,
  pollMatchmakingQueue,
  leaveMatchmakingQueue,
  handleBallMove,
  handleTossAction,
  handleStartSecondInnings,
  popCandidateAtomically,
  getMatch,
  type RedisMatch,
} from "../src/lib/server/match";
import { createInitialGameState, DEFAULT_SUDDEN_DEATH_FORMAT } from "../src/lib/game/engine";
import { blockGuest } from "../src/lib/server/safety";
import { webrtcManager } from "../src/lib/webrtc/webrtcManager";

// Mock ably publish to avoid external network calls in unit tests
vi.mock("../src/lib/server/ably", () => ({
  publishToAbly: vi.fn().mockResolvedValue(undefined),
  createAblyTokenRequest: vi.fn().mockResolvedValue({ token: "mock_token" }),
}));

describe("Phase 3 — Server-Authoritative Matchmaking & Moves", () => {
  beforeEach(async () => {
    const redis = getRedis();
    await (redis as any).flushall?.();
    vi.clearAllMocks();
  });

  describe("Pillar 1: Ephemeral ICE / TURN Fetching (SEC-01)", () => {
    it("fetches STUN/TURN servers without reading NEXT_PUBLIC_* variables", async () => {
      const originalFetch = global.fetch;
      global.fetch = async (url: any, init?: any) => {
        if (typeof url === "string" && url.endsWith("/api/ice")) {
          return {
            ok: true,
            json: async () => ({
              iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "turn:relay.handcricket.io:3478", username: "ephemeral_user", credential: "hmac_secret" },
              ],
              expiresAt: Date.now() + 3600 * 1000,
            }),
          } as any;
        }
        return originalFetch(url, init);
      };

      try {
        const servers = await webrtcManager.getOrFetchIceServers();
        expect(servers).toBeDefined();
        expect(servers.length).toBeGreaterThan(0);
        expect(servers[0].urls).toBe("stun:stun.l.google.com:19302");
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("Pillar 2: Server-Authoritative Commit-Reveal Protocol (SEC-03)", () => {
    it("holds first player move secretly and resolves authoritatively once both picks are locked", async () => {
      const redis = getRedis();
      const matchId = "match_auth_test_1";

      const p1 = { guestId: "guest_batter", name: "Striker" };
      const p2 = { guestId: "guest_bowler", name: "Spinner" };
      const gameState = createInitialGameState(DEFAULT_SUDDEN_DEATH_FORMAT, p1.name, p2.name, "p1");

      // Advance toss to innings_1 with p1 batting
      gameState.phase = "innings_1";
      gameState.innings1.battingPlayer = "p1";
      gameState.innings1.bowlingPlayer = "p2";

      const matchData: RedisMatch = {
        id: matchId,
        format: DEFAULT_SUDDEN_DEATH_FORMAT,
        player1: p1,
        player2: p2,
        gameState,
        isBot: false,
        currentBallMoves: {},
        currentBallIndex: 0,
        lastSequenceNumbers: {},
        tossPicks: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await redis.set(`match:${matchId}`, JSON.stringify(matchData));

      // Player 1 (Batter) picks 4 with seq: 1
      const p1Result = await handleBallMove(matchId, p1.guestId, 0, 4, 1);
      expect(p1Result.status).toBe("waiting_opponent");
      expect(p1Result.outcome).toBeUndefined();

      // Verify match state holds P1's pick secretly without resolving
      const midMatch = await getMatch(matchId);
      expect(midMatch?.currentBallMoves[p1.guestId]).toBe(4);
      expect(midMatch?.currentBallMoves[p2.guestId]).toBeUndefined();

      // Player 2 (Bowler) picks 4 (WICKET!) with seq: 1
      const p2Result = await handleBallMove(matchId, p2.guestId, 0, 4, 1);
      expect(p2Result.status).toBe("resolved");
      expect(p2Result.outcome).toBeDefined();
      expect(p2Result.outcome?.isWicket).toBe(true);
      expect(p2Result.outcome?.runsScored).toBe(0);

      // Verify ball moves were cleared for next ball and index incremented
      const resolvedMatch = await getMatch(matchId);
      expect(resolvedMatch?.currentBallMoves).toEqual({});
      expect(resolvedMatch?.currentBallIndex).toBe(1);
    });

    it("handles innings transition authoritatively via handleStartSecondInnings", async () => {
      const redis = getRedis();
      const matchId = "match_innings_break_test";

      const p1 = { guestId: "p1_id", name: "Player 1" };
      const p2 = { guestId: "p2_id", name: "Player 2" };
      const gameState = createInitialGameState(DEFAULT_SUDDEN_DEATH_FORMAT, p1.name, p2.name, "p1");

      gameState.phase = "innings_break";
      gameState.innings1.score = 18;
      gameState.innings1.wickets = 1;
      gameState.innings2 = {
        battingPlayer: "p2",
        bowlingPlayer: "p1",
        score: 0,
        wickets: 0,
        balls: 0,
        overHistory: [],
        currentOver: [],
        target: 19,
      };

      const matchData: RedisMatch = {
        id: matchId,
        format: DEFAULT_SUDDEN_DEATH_FORMAT,
        player1: p1,
        player2: p2,
        gameState,
        isBot: false,
        currentBallMoves: {},
        currentBallIndex: 2,
        tossPicks: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await redis.set(`match:${matchId}`, JSON.stringify(matchData));

      const result = await handleStartSecondInnings(matchId, p1.guestId);
      expect(result.success).toBe(true);
      expect(result.gameState.phase).toBe("innings_2");
      expect(result.gameState.currentInnings).toBe(2);
    });
  });

  describe("Pillar 3: Sequence Number Monotonicity Check", () => {
    it("accepts strictly increasing sequence numbers and rejects duplicates or replayed moves", async () => {
      const redis = getRedis();
      const matchId = "match_seq_test";

      const p1 = { guestId: "guest_seq_1", name: "Player 1" };
      const p2 = { guestId: "guest_seq_2", name: "Player 2" };
      const gameState = createInitialGameState(DEFAULT_SUDDEN_DEATH_FORMAT, p1.name, p2.name, "p1");
      gameState.phase = "innings_1";

      const matchData: RedisMatch = {
        id: matchId,
        format: DEFAULT_SUDDEN_DEATH_FORMAT,
        player1: p1,
        player2: p2,
        gameState,
        isBot: false,
        currentBallMoves: {},
        currentBallIndex: 0,
        lastSequenceNumbers: {},
        tossPicks: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await redis.set(`match:${matchId}`, JSON.stringify(matchData));

      // Move 1 with seq 1 -> succeeds
      await expect(handleBallMove(matchId, p1.guestId, 0, 3, 1)).resolves.toBeDefined();

      // Duplicate move with same seq 1 -> rejects
      await expect(handleBallMove(matchId, p1.guestId, 0, 4, 1)).rejects.toThrow(
        /Duplicate or out-of-order sequence number/
      );

      // Stale move with seq 0 -> rejects
      await expect(handleBallMove(matchId, p1.guestId, 0, 5, 0)).rejects.toThrow(
        /Duplicate or out-of-order sequence number/
      );

      // Increasing seq 2 -> succeeds
      await expect(handleBallMove(matchId, p1.guestId, 0, 6, 2)).resolves.toBeDefined();
    });

    it("resolves the ball when both players lock their picks at the same moment", async () => {
      const redis = getRedis();
      const matchId = "match_race_test";
      const p1 = { guestId: "guest_race_1", name: "Player 1" };
      const p2 = { guestId: "guest_race_2", name: "Player 2" };
      const gameState = createInitialGameState(DEFAULT_SUDDEN_DEATH_FORMAT, p1.name, p2.name, "p1");
      gameState.phase = "innings_1";

      const matchData: RedisMatch = {
        id: matchId,
        format: DEFAULT_SUDDEN_DEATH_FORMAT,
        player1: p1,
        player2: p2,
        gameState,
        isBot: false,
        currentBallMoves: {},
        currentBallIndex: 0,
        tossPicks: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await redis.set(`match:${matchId}`, JSON.stringify(matchData));

      // Both requests in flight together, e.g. both auto-locking as the turn clock hits 0
      const results = await Promise.all([
        handleBallMove(matchId, p1.guestId, 0, 3),
        handleBallMove(matchId, p2.guestId, 0, 5),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual(["resolved", "waiting_opponent"]);
      const saved = await getMatch(matchId);
      expect(saved?.currentBallIndex).toBe(1);
      expect(saved?.currentBallMoves).toEqual({});
    });
  });

  describe("Pillar 4: Atomic Matchmaking Queue & Race Prevention", () => {
    it("atomically pops candidates, prevents double-pairing, and skips blocked users", async () => {
      const redis = getRedis();
      const queueKey = "queue:hand_cricket:sudden_death";

      // 1. Enqueue user A
      await redis.rpush(
        queueKey,
        JSON.stringify({
          guestId: "user_a",
          guestName: "Alice",
          mode: "sudden_death",
          joinedAt: Date.now(),
        })
      );

      // 2. Candidate pop by user B succeeds and removes user A atomically
      const candidate1 = await popCandidateAtomically(redis, queueKey, "user_b");
      expect(candidate1).toBeDefined();
      expect(candidate1?.guestId).toBe("user_a");

      // 3. Second pop by user C on now-empty queue returns null (prevents double-pairing!)
      const candidate2 = await popCandidateAtomically(redis, queueKey, "user_c");
      expect(candidate2).toBeNull();
    });

    it("skips self-match candidate and skips expired candidate (> 25s)", async () => {
      const redis = getRedis();
      const queueKey = "queue:hand_cricket:sudden_death";

      // Enqueue expired entry
      await redis.rpush(
        queueKey,
        JSON.stringify({
          guestId: "old_user",
          guestName: "Old",
          mode: "sudden_death",
          joinedAt: Date.now() - 30000, // 30s ago
        })
      );

      // Enqueue self-match entry
      await redis.rpush(
        queueKey,
        JSON.stringify({
          guestId: "user_me",
          guestName: "Me",
          mode: "sudden_death",
          joinedAt: Date.now(),
        })
      );

      // Enqueue valid partner
      await redis.rpush(
        queueKey,
        JSON.stringify({
          guestId: "valid_partner",
          guestName: "Valid",
          mode: "sudden_death",
          joinedAt: Date.now(),
        })
      );

      // user_me requests partner: skips expired old_user and self user_me, finds valid_partner
      const candidate = await popCandidateAtomically(redis, queueKey, "user_me");
      expect(candidate).toBeDefined();
      expect(candidate?.guestId).toBe("valid_partner");
    });

    it("prevents matching with blocked opponent during queue join", async () => {
      const blocker = "player_blocker";
      const target = "player_annoying";

      // Block target
      await blockGuest(blocker, target);

      // Target is in queue
      const redis = getRedis();
      const queueKey = "queue:hand_cricket:sudden_death";
      await redis.rpush(
        queueKey,
        JSON.stringify({
          guestId: target,
          guestName: "Annoying",
          mode: "sudden_death",
          joinedAt: Date.now(),
        })
      );

      // Blocker joins: must NOT match with target, should queue blocker instead
      const result = await joinMatchmakingQueue(blocker, "Blocker", "sudden_death");
      expect(result.status).toBe("queued");
      expect(result.matchId).toBeUndefined();
    });

    it("keeps a blocked candidate in the queue for other players", async () => {
      await blockGuest("blocker_x", "target_x");
      await joinMatchmakingQueue("target_x", "Target", "sudden_death");
      await joinMatchmakingQueue("blocker_x", "Blocker", "sudden_death");

      const third = await joinMatchmakingQueue("third_x", "Third", "sudden_death");
      expect(third.status).toBe("matched");
      expect(third.opponentName).toBe("Target");
    });

    it("pairs two players who both queued at the same time once one of them polls", async () => {
      const [a, b] = await Promise.all([
        joinMatchmakingQueue("sim_a", "Alice", "sudden_death"),
        joinMatchmakingQueue("sim_b", "Bob", "sudden_death"),
      ]);
      // Whichever way the race went, polling must leave both players with the same match
      const resultA = a.status === "matched" ? a : await pollMatchmakingQueue("sim_a", "Alice", "sudden_death");
      const resultB = b.status === "matched" ? b : await pollMatchmakingQueue("sim_b", "Bob", "sudden_death");
      expect(resultA.status).toBe("matched");
      expect(resultB.status).toBe("matched");
      expect(resultA.matchId).toBe(resultB.matchId);
    });

    it("does not match with a player who stopped polling, and keeps waiting players matchable past 25s", async () => {
      const redis = getRedis();
      const queueKey = "queue:hand_cricket:sudden_death";
      const longAgo = Date.now() - 60000;

      // Ghost: joined a minute ago and never polled since (closed tab / switched to bot)
      await redis.rpush(queueKey, JSON.stringify({ guestId: "ghost", guestName: "Ghost", mode: "sudden_death", joinedAt: longAgo }));
      // Patient: joined a minute ago but is still polling
      await redis.rpush(queueKey, JSON.stringify({ guestId: "patient", guestName: "Patient", mode: "sudden_death", joinedAt: longAgo }));
      await redis.set("queue_alive:patient", Date.now(), { ex: 30 });

      const result = await joinMatchmakingQueue("newcomer", "New", "sudden_death");
      expect(result.status).toBe("matched");
      expect(result.opponentName).toBe("Patient");

      const patientPoll = await pollMatchmakingQueue("patient", "Patient", "sudden_death");
      expect(patientPoll.status).toBe("matched");
      expect(patientPoll.matchId).toBe(result.matchId);
    });

    it("never puts a player in two matches when both players' polls pair at the same time", async () => {
      const redis = getRedis();
      const queueKey = "queue:hand_cricket:sudden_death";
      for (const [id, name] of [["race_a", "Alice"], ["race_b", "Bob"]]) {
        await redis.rpush(queueKey, JSON.stringify({ guestId: id, guestName: name, mode: "sudden_death", joinedAt: Date.now() }));
      }

      const seen: Record<string, { matchId?: string; role?: string }> = {};
      for (let round = 0; round < 5 && Object.keys(seen).length < 2; round++) {
        const [a, b] = await Promise.all([
          pollMatchmakingQueue("race_a", "Alice", "sudden_death"),
          pollMatchmakingQueue("race_b", "Bob", "sudden_death"),
        ]);
        if (a.status === "matched" && !seen.race_a) seen.race_a = a;
        if (b.status === "matched" && !seen.race_b) seen.race_b = b;
      }

      expect(seen.race_a?.matchId).toBeDefined();
      expect(seen.race_a?.matchId).toBe(seen.race_b?.matchId);
      expect([seen.race_a?.role, seen.race_b?.role].sort()).toEqual(["p1", "p2"]);
    });

    it("removes a player from the queue on leave", async () => {
      await joinMatchmakingQueue("leaver", "Leaver", "sudden_death");
      await leaveMatchmakingQueue("leaver", "sudden_death");
      const result = await joinMatchmakingQueue("joiner", "Joiner", "sudden_death");
      expect(result.status).toBe("queued");
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { io as ClientIO, Socket as ClientSocket } from "socket.io-client";
import { matchmaker } from "../src/server/matchmaker";
import { roomStore } from "../src/server/roomStore";
import { safetyStore } from "../src/server/safetyStore";
import { registerSocketHandlers } from "../src/server/socketHandler";
import {
  handleReadyConfirm,
  handleRematch,
  createBotMatch,
  getMatch,
  saveMatch,
  type RedisMatch,
} from "../src/lib/server/match";
import { createInitialGameState, submitTossCall, submitTossPick, submitTossDecision } from "../src/lib/game/engine";

// Mock Ably so tests run without network API keys
vi.mock("../src/lib/server/ably", () => ({
  publishToAbly: vi.fn().mockResolvedValue(true),
}));

describe("Phase 4 — Unlimited Search, Endless Series & Bridge Conversions", () => {
  let httpServer: http.Server;
  let ioServer: SocketIOServer;
  let port: number;

  beforeEach(async () => {
    matchmaker.clear();
    roomStore.clear();
    safetyStore.clear();

    httpServer = http.createServer();
    ioServer = new SocketIOServer(httpServer);
    registerSocketHandlers(ioServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        if (typeof addr === "object" && addr) {
          port = addr.port;
        }
        resolve();
      });
    });
  });

  afterEach(async () => {
    ioServer?.close();
    httpServer?.close();
  });

  // =========================================================================
  // Pillar 1: Mutual 5-Second Ready Check (REL-02)
  // =========================================================================
  describe("Pillar 1: Mutual 5-Second Ready Check", () => {
    it("serverless handleReadyConfirm tracks mutual readiness accurately", async () => {
      const matchId = `match_ready_${Date.now()}`;
      const initialGame = createInitialGameState({ maxWickets: 2, maxOvers: 2 }, "Alice", "Bob", "p1");
      const matchData: RedisMatch = {
        id: matchId,
        format: { maxWickets: 2, maxOvers: 2 },
        player1: { guestId: "g_alice", name: "Alice" },
        player2: { guestId: "g_bob", name: "Bob" },
        gameState: initialGame,
        isBot: false,
        currentBallMoves: {},
        currentBallIndex: 0,
        tossPicks: {},
        readyPlayers: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveMatch(matchData);

      // Alice confirms ready
      const res1 = await handleReadyConfirm(matchId, "g_alice");
      expect(res1.success).toBe(true);
      expect(res1.bothReady).toBe(false);

      // Bob confirms ready -> both ready!
      const res2 = await handleReadyConfirm(matchId, "g_bob");
      expect(res2.success).toBe(true);
      expect(res2.bothReady).toBe(true);
    });

    it("socket match:ready_confirm emits match:ready_success when both players confirm", async () => {
      const client1: ClientSocket = ClientIO(`http://localhost:${port}`);
      const client2: ClientSocket = ClientIO(`http://localhost:${port}`);

      await Promise.all([
        new Promise<void>((res) => client1.on("connect", () => res())),
        new Promise<void>((res) => client2.on("connect", () => res())),
      ]);

      const m1Promise = new Promise<any>((res) => client1.on("match:found", res));
      const m2Promise = new Promise<any>((res) => client2.on("match:found", res));

      client1.emit("queue:join", {
        guestId: "user_p1",
        queueType: "video",
        ageConfirmed: true,
        name: "Alice",
      });
      client2.emit("queue:join", {
        guestId: "user_p2",
        queueType: "video",
        ageConfirmed: true,
        name: "Bob",
      });

      await Promise.all([m1Promise, m2Promise]);

      // Client 1 confirms ready
      const partnerReadyPromise = new Promise<void>((res) => {
        client2.on("match:partner_ready", () => res());
      });
      client1.emit("match:ready_confirm");
      await partnerReadyPromise;

      // Client 2 confirms ready -> triggers match:ready_success for both!
      const successPromise1 = new Promise<any>((res) => client1.on("match:ready_success", res));
      const successPromise2 = new Promise<any>((res) => client2.on("match:ready_success", res));

      client2.emit("match:ready_confirm");
      const [succ1, succ2] = await Promise.all([successPromise1, successPromise2]);

      expect(succ1.roomId).toBeDefined();
      expect(succ2.roomId).toBe(succ1.roomId);

      client1.disconnect();
      client2.disconnect();
    });

    it("socket match:ready_decline notifies partner and closes room", async () => {
      const client1: ClientSocket = ClientIO(`http://localhost:${port}`);
      const client2: ClientSocket = ClientIO(`http://localhost:${port}`);

      await Promise.all([
        new Promise<void>((res) => client1.on("connect", () => res())),
        new Promise<void>((res) => client2.on("connect", () => res())),
      ]);

      const m1Promise = new Promise<any>((res) => client1.on("match:found", res));
      const m2Promise = new Promise<any>((res) => client2.on("match:found", res));

      client1.emit("queue:join", {
        guestId: "decline_p1",
        queueType: "game_only",
        ageConfirmed: true,
        name: "Charlie",
      });
      client2.emit("queue:join", {
        guestId: "decline_p2",
        queueType: "game_only",
        ageConfirmed: true,
        name: "Dave",
      });

      const [m1] = await Promise.all([m1Promise, m2Promise]);

      const cancelPromise = new Promise<any>((res) => client1.on("match:ready_cancelled", res));
      // Client 2 declines ready check
      client2.emit("match:ready_decline");

      const cancelData = await cancelPromise;
      expect(cancelData.message).toContain("declined");

      // Verify room was closed
      expect(roomStore.getRoom(m1.roomId)).toBeUndefined();

      client1.disconnect();
      client2.disconnect();
    });
  });

  // =========================================================================
  // Pillar 2: Endless Series & Role Alternation
  // =========================================================================
  describe("Pillar 2: Endless Series & Role Alternation", () => {
    it("alternates toss caller role between Game 1 (p1) and Game 2 (p2)", async () => {
      const matchId = `match_series_${Date.now()}`;
      let gameState = createInitialGameState({ maxWickets: 2, maxOvers: 2 }, "Player1", "Player2", "p1");
      // Simulate ended game with Player1 winning
      gameState.phase = "match_ended";
      gameState.winner = "p1";

      const matchData: RedisMatch = {
        id: matchId,
        format: { maxWickets: 2, maxOvers: 2 },
        player1: { guestId: "g_p1", name: "Player1" },
        player2: { guestId: "g_p2", name: "Player2" },
        gameState,
        isBot: false,
        currentBallMoves: {},
        currentBallIndex: 0,
        tossPicks: {},
        gameNumber: 1,
        seriesScore: { g_p1: 0, g_p2: 0 },
        playAgainVotes: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveMatch(matchData);

      // Player 1 votes rematch
      const res1 = await handleRematch(matchId, "g_p1");
      expect(res1.rematchStarted).toBe(false);

      // Player 2 votes rematch -> triggers Game 2 with role alternation!
      const res2 = await handleRematch(matchId, "g_p2");
      expect(res2.rematchStarted).toBe(true);
      expect(res2.gameNumber).toBe(2);
      expect(res2.seriesScore["g_p1"]).toBe(1); // Player 1 won game 1
      expect(res2.gameState?.phase).toBe("toss_call");
      expect(res2.gameState?.tossCaller).toBe("p2"); // Role alternated to p2!
    });

    it("socket friend:rematch alternates isInitiator between p1 and p2", async () => {
      const client1: ClientSocket = ClientIO(`http://localhost:${port}`);
      const client2: ClientSocket = ClientIO(`http://localhost:${port}`);

      await Promise.all([
        new Promise<void>((res) => client1.on("connect", () => res())),
        new Promise<void>((res) => client2.on("connect", () => res())),
      ]);

      // Create friend room
      const createdPromise = new Promise<any>((res) => client1.on("friend:created", res));
      client1.emit("friend:create", {
        guestId: "series_host",
        name: "HostPlayer",
        mode: "game_only",
        format: { maxWickets: 2, maxOvers: 2 },
      });
      const created = await createdPromise;

      // Join
      const joinedPromise = new Promise<any>((res) => client2.on("friend:joined", res));
      client2.emit("friend:join", {
        code: created.code,
        guestId: "series_guest",
        name: "GuestPlayer",
        ageConfirmed: true,
      });
      await joinedPromise;

      // Both ready -> match starts (Game 1)
      const m1Promise = new Promise<any>((res) => client1.on("match:found", res));
      const m2Promise = new Promise<any>((res) => client2.on("match:found", res));
      client1.emit("friend:ready", { ready: true });
      client2.emit("friend:ready", { ready: true });
      const [m1, m2] = await Promise.all([m1Promise, m2Promise]);

      expect(m1.isInitiator).toBe(true); // p1 is initiator in Game 1
      expect(m2.isInitiator).toBe(false);

      // Record match end
      client1.emit("game:match_complete", { winnerGuestId: "series_host" });
      await new Promise((r) => setTimeout(r, 50));

      // Both tap Rematch for Game 2
      const rematchPromise1 = new Promise<any>((res) => client1.on("game:rematch_start", res));
      const rematchPromise2 = new Promise<any>((res) => client2.on("game:rematch_start", res));

      client1.emit("friend:rematch");
      client2.emit("friend:rematch");

      const [r1, r2] = await Promise.all([rematchPromise1, rematchPromise2]);

      // In Game 2: Initiator role has swapped!
      expect(r1.isInitiator).toBe(false); // p1 is now non-initiator
      expect(r2.isInitiator).toBe(true);  // p2 is now initiator
      expect(r1.gameNumber).toBe(2);
      expect(r1.seriesScore["series_host"]).toBe(1);

      client1.disconnect();
      client2.disconnect();
    });
  });

  // =========================================================================
  // Pillar 3: Stranger-to-Friend Bridge ("Play again with this player")
  // =========================================================================
  describe("Pillar 3: Stranger-to-Friend Bridge Conversion", () => {
    it("preserves active session, creates 6-char code, and starts series scoreboard", async () => {
      const client1: ClientSocket = ClientIO(`http://localhost:${port}`);
      const client2: ClientSocket = ClientIO(`http://localhost:${port}`);

      await Promise.all([
        new Promise<void>((res) => client1.on("connect", () => res())),
        new Promise<void>((res) => client2.on("connect", () => res())),
      ]);

      const m1Promise = new Promise<any>((res) => client1.on("match:found", res));
      const m2Promise = new Promise<any>((res) => client2.on("match:found", res));

      client1.emit("queue:join", {
        guestId: "bridge_p1",
        queueType: "video",
        ageConfirmed: true,
        name: "StrangerA",
      });
      client2.emit("queue:join", {
        guestId: "bridge_p2",
        queueType: "video",
        ageConfirmed: true,
        name: "StrangerB",
      });

      const [match] = await Promise.all([m1Promise, m2Promise]);

      // Simulate match 1 complete (Stranger B wins)
      client2.emit("game:match_complete", { winnerGuestId: "bridge_p2" });
      await new Promise((r) => setTimeout(r, 50));

      // Both vote play_again
      const convPromise1 = new Promise<any>((res) => client1.on("match:converted_to_friend", res));
      const convPromise2 = new Promise<any>((res) => client2.on("match:converted_to_friend", res));

      client1.emit("match:play_again");
      client2.emit("match:play_again");

      const [c1, c2] = await Promise.all([convPromise1, convPromise2]);
      expect(c1.code).toBeDefined();
      expect(c1.code.length).toBe(6);
      expect(c2.code).toBe(c1.code);
      expect(c1.seriesScore["bridge_p2"]).toBe(1);

      // Verify code looks up the converted room
      const room = roomStore.getRoomByCode(c1.code);
      expect(room).toBeDefined();
      expect(room?.type).toBe("friend");
      expect(room?.visibility).toBe("private");

      client1.disconnect();
      client2.disconnect();
    });
  });
});

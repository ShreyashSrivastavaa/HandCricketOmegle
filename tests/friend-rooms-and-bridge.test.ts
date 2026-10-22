import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { io as ClientIO, Socket as ClientSocket } from "socket.io-client";
import { matchmaker } from "../src/server/matchmaker";
import { roomStore } from "../src/server/roomStore";
import { safetyStore } from "../src/server/safetyStore";
import { registerSocketHandlers } from "../src/server/socketHandler";

describe("Friend Rooms, Random Matchmaking, and Bridge Tests", () => {
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

  // 1. Create room -> second client joins by code -> both ready -> match starts
  it("Create room -> second client joins by code -> both ready -> match starts", async () => {
    const client1: ClientSocket = ClientIO(`http://localhost:${port}`);
    const client2: ClientSocket = ClientIO(`http://localhost:${port}`);

    await Promise.all([
      new Promise<void>((res) => client1.on("connect", () => res())),
      new Promise<void>((res) => client2.on("connect", () => res())),
    ]);

    // Host creates friend room
    const createdPromise = new Promise<any>((resolve) => {
      client1.on("friend:created", resolve);
    });

    client1.emit("friend:create", {
      guestId: "host_guest_1",
      name: "Rohit",
      mode: "video",
      format: { maxWickets: 2, maxOvers: 2 },
    });

    const createdData = await createdPromise;
    expect(createdData.code).toBeDefined();
    expect(createdData.code.length).toBe(6);
    expect(createdData.mode).toBe("video");

    // Client 2 joins with code
    const joinedPromise = new Promise<any>((resolve) => {
      client2.on("friend:joined", resolve);
    });

    client2.emit("friend:join", {
      code: createdData.code,
      guestId: "friend_guest_2",
      name: "Virat",
      ageConfirmed: true,
    });

    const joinedData = await joinedPromise;
    expect(joinedData.code).toBe(createdData.code);

    // Both players toggle ready
    const matchStartPromise1 = new Promise<any>((resolve) => {
      client1.on("match:found", resolve);
    });
    const matchStartPromise2 = new Promise<any>((resolve) => {
      client2.on("match:found", resolve);
    });

    client1.emit("friend:ready", { ready: true });
    client2.emit("friend:ready", { ready: true });

    const [m1, m2] = await Promise.all([matchStartPromise1, matchStartPromise2]);
    expect(m1.roomId).toBe(m2.roomId);
    expect(m1.isInitiator).toBe(true);
    expect(m2.isInitiator).toBe(false);
    expect(m1.opponent.name).toBe("Virat");
    expect(m2.opponent.name).toBe("Rohit");
    expect(m1.type).toBe("friend");

    client1.disconnect();
    client2.disconnect();
  });

  // 2. Join errors: wrong code, full room, expired room, started match
  it("handles join errors correctly (wrong code, full room, expired room, started match)", async () => {
    const client1: ClientSocket = ClientIO(`http://localhost:${port}`);
    const client2: ClientSocket = ClientIO(`http://localhost:${port}`);
    const client3: ClientSocket = ClientIO(`http://localhost:${port}`);

    await Promise.all([
      new Promise<void>((res) => client1.on("connect", () => res())),
      new Promise<void>((res) => client2.on("connect", () => res())),
      new Promise<void>((res) => client3.on("connect", () => res())),
    ]);

    // Test 2a: Wrong code
    const wrongCodePromise = new Promise<any>((resolve) => {
      client2.on("friend:error", resolve);
    });
    client2.emit("friend:join", {
      code: "ZZZZZZ",
      guestId: "user_wrong",
      name: "Tester",
    });
    const wrongCodeErr = await wrongCodePromise;
    expect(wrongCodeErr.message).toBe("Room not found");

    // Create a real room with client1
    const createdPromise = new Promise<any>((resolve) => {
      client1.on("friend:created", resolve);
    });
    client1.emit("friend:create", {
      guestId: "host_guest_3",
      name: "HostUser",
      mode: "game_only",
      format: { maxWickets: 1, maxOvers: 1 },
    });
    const { code, roomId } = await createdPromise;

    // Test 2b: Expired room
    const activeRoom = roomStore.getRoom(roomId);
    expect(activeRoom).toBeDefined();
    activeRoom!.expiresAt = Date.now() - 1000; // Force expired

    const expiredPromise = new Promise<any>((resolve) => {
      client2.on("friend:error", resolve);
    });
    client2.emit("friend:join", {
      code,
      guestId: "user_expired_test",
      name: "LateJoiner",
    });
    const expiredErr = await expiredPromise;
    expect(expiredErr.message).toBe("Room expired");

    // Recreate a fresh room for Full Room & Started Match tests
    const freshPromise = new Promise<any>((resolve) => {
      client1.on("friend:created", resolve);
    });
    client1.emit("friend:create", {
      guestId: "host_guest_fresh",
      name: "HostFresh",
      mode: "game_only",
      format: { maxWickets: 1, maxOvers: 1 },
    });
    const freshRoom = await freshPromise;

    // Client2 joins fresh room
    const c2JoinPromise = new Promise<any>((resolve) => {
      client2.on("friend:joined", resolve);
    });
    client2.emit("friend:join", {
      code: freshRoom.code,
      guestId: "guest_joined_fresh",
      name: "JoinedUser",
    });
    await c2JoinPromise;

    // Test 2c: Full room (Client3 tries to join the 2-player room)
    const fullRoomPromise = new Promise<any>((resolve) => {
      client3.on("friend:error", resolve);
    });
    client3.emit("friend:join", {
      code: freshRoom.code,
      guestId: "third_party",
      name: "ThirdWheel",
    });
    const fullRoomErr = await fullRoomPromise;
    expect(fullRoomErr.message).toBe("Room is full");

    // Test 2d: Match already started (both ready up, then new player tries to join)
    client1.emit("friend:ready", { ready: true });
    client2.emit("friend:ready", { ready: true });

    // Wait for match to start
    await new Promise((r) => setTimeout(r, 100));

    const startedMatchPromise = new Promise<any>((resolve) => {
      client3.on("friend:error", resolve);
    });
    client3.emit("friend:join", {
      code: freshRoom.code,
      guestId: "late_intruder",
      name: "Intruder",
    });
    const startedMatchErr = await startedMatchPromise;
    expect(startedMatchErr.message).toBe("Room is full");

    client1.disconnect();
    client2.disconnect();
    client3.disconnect();
  });

  // 3. Brute force protection triggers after repeated wrong codes
  it("triggers brute force protection (rate limit and lockout) after repeated wrong codes", async () => {
    const client: ClientSocket = ClientIO(`http://localhost:${port}`);
    await new Promise<void>((res) => client.on("connect", () => res()));

    const guestId = "brute_forcer";

    // Perform 10 failed join attempts
    for (let i = 0; i < 9; i++) {
      const errPromise = new Promise<any>((resolve) => {
        client.once("friend:error", resolve);
      });
      client.emit("friend:join", {
        code: `BAD${i}99`,
        guestId,
        name: "Attacker",
      });
      const err = await errPromise;
      expect(err.message).toBe("Room not found");
    }

    // 10th failed attempt triggers 5-min lockout or rate-limit
    const tenthErrPromise = new Promise<any>((resolve) => {
      client.once("friend:error", resolve);
    });
    client.emit("friend:join", {
      code: "BAD109",
      guestId,
      name: "Attacker",
    });
    const tenthErr = await tenthErrPromise;
    expect(tenthErr.message).toBe("Room not found");

    // 11th attempt must be locked out
    const lockedPromise = new Promise<any>((resolve) => {
      client.once("friend:error", resolve);
    });
    client.emit("friend:join", {
      code: "BAD110",
      guestId,
      name: "Attacker",
    });
    const lockedErr = await lockedPromise;
    expect(lockedErr.message).toContain("Locked out due to repeated invalid codes");

    client.disconnect();
  });

  // 4. Friend room never appears in or leaks into the random queue, and vice versa
  it("guarantees friend room never leaks into random queue and vice versa", async () => {
    const friendHost: ClientSocket = ClientIO(`http://localhost:${port}`);
    const queueClient: ClientSocket = ClientIO(`http://localhost:${port}`);

    await Promise.all([
      new Promise<void>((res) => friendHost.on("connect", () => res())),
      new Promise<void>((res) => queueClient.on("connect", () => res())),
    ]);

    // Friend host creates a room
    friendHost.emit("friend:create", {
      guestId: "isolated_host",
      name: "PrivateHost",
      mode: "video",
      format: { maxWickets: 2, maxOvers: 2 },
    });

    await new Promise((r) => setTimeout(r, 100));

    // Random player enters queue
    let queueMatched = false;
    queueClient.on("match:found", () => {
      queueMatched = true;
    });

    queueClient.emit("queue:join", {
      guestId: "random_seeker",
      queueType: "video",
      ageConfirmed: true,
    });

    // Wait a brief moment to ensure random seeker does NOT match with private friend room
    await new Promise((r) => setTimeout(r, 200));

    expect(queueMatched).toBe(false);

    friendHost.disconnect();
    queueClient.disconnect();
  });

  // 5. Random match -> both tap "Play again" -> converts to friend room with series score
  it("Random match -> both tap 'Play again' -> converts to friend room with series score", async () => {
    const client1: ClientSocket = ClientIO(`http://localhost:${port}`);
    const client2: ClientSocket = ClientIO(`http://localhost:${port}`);

    await Promise.all([
      new Promise<void>((res) => client1.on("connect", () => res())),
      new Promise<void>((res) => client2.on("connect", () => res())),
    ]);

    const m1Promise = new Promise<any>((res) => client1.on("match:found", res));
    const m2Promise = new Promise<any>((res) => client2.on("match:found", res));

    client1.emit("queue:join", {
      guestId: "rand_p1",
      queueType: "game_only",
      ageConfirmed: true,
      name: "PlayerOne",
    });
    client2.emit("queue:join", {
      guestId: "rand_p2",
      queueType: "game_only",
      ageConfirmed: true,
      name: "PlayerTwo",
    });

    const [match1] = await Promise.all([m1Promise, m2Promise]);
    expect(match1.type).toBe("random");

    // Simulate match completion (p1 wins)
    client1.emit("game:match_complete", { winnerGuestId: "rand_p1" });
    await new Promise((r) => setTimeout(r, 50));

    // Player 1 taps "Play again"
    const p1WaitingPromise = new Promise<any>((res) => client1.on("match:play_again_waiting", res));
    client1.emit("match:play_again");
    const p1Wait = await p1WaitingPromise;
    expect(p1Wait.waiting).toBe(true);

    // Player 2 taps "Play again" -> Triggers bridge conversion to friend room!
    const convertPromise1 = new Promise<any>((res) => client1.on("match:converted_to_friend", res));
    const convertPromise2 = new Promise<any>((res) => client2.on("match:converted_to_friend", res));

    client2.emit("match:play_again");

    const [conv1, conv2] = await Promise.all([convertPromise1, convertPromise2]);
    expect(conv1.code).toBeDefined();
    expect(conv2.code).toBe(conv1.code);
    expect(conv1.seriesScore["rand_p1"]).toBe(1);

    const room = roomStore.getRoom(match1.roomId);
    expect(room?.type).toBe("friend");
    expect(room?.visibility).toBe("private");

    client1.disconnect();
    client2.disconnect();
  });

  // 6. Reconnect resumes in both modes
  it("allows disconnected player to reconnect within 60s grace period and resume state", async () => {
    let host: ClientSocket = ClientIO(`http://localhost:${port}`);
    const guest: ClientSocket = ClientIO(`http://localhost:${port}`);

    await Promise.all([
      new Promise<void>((res) => host.on("connect", () => res())),
      new Promise<void>((res) => guest.on("connect", () => res())),
    ]);

    // Create room
    const createPromise = new Promise<any>((res) => host.on("friend:created", res));
    host.emit("friend:create", {
      guestId: "host_reconnect_user",
      name: "HostRecon",
      mode: "game_only",
      format: { maxWickets: 2, maxOvers: 2 },
    });
    const { code } = await createPromise;

    // Guest joins
    const guestJoinPromise = new Promise<any>((res) => guest.on("friend:joined", res));
    guest.emit("friend:join", {
      code,
      guestId: "guest_recon",
      name: "GuestRecon",
    });
    await guestJoinPromise;

    // Disconnect partner notice
    const partnerDcPromise = new Promise<any>((res) => guest.on("match:partner_disconnected", res));

    // Host disconnects
    host.disconnect();

    const dcNotice = await partnerDcPromise;
    expect(dcNotice.graceSeconds).toBe(60);

    // Reconnect host using a new socket with same guestId within 60s
    const reconnectedHost: ClientSocket = ClientIO(`http://localhost:${port}`);
    await new Promise<void>((res) => reconnectedHost.on("connect", () => res()));

    const reconSuccessPromise = new Promise<any>((res) => reconnectedHost.on("friend:reconnected", res));

    reconnectedHost.emit("friend:join", {
      code,
      guestId: "host_reconnect_user",
      name: "HostRecon",
    });

    const reconSuccess = await reconSuccessPromise;
    expect(reconSuccess.isHost).toBe(true);

    const room = roomStore.getRoomByCode(code);
    expect(room?.p1.disconnected).toBe(false);

    reconnectedHost.disconnect();
    guest.disconnect();
  });

  // 7. Hydrates REST/Redis created friend room on Socket.IO friend:join
  it("Hydrates REST/Redis created friend room on Socket.IO friend:join", async () => {
    const { getRedis } = await import("../src/lib/server/redis");
    const redis = getRedis();

    const code = "TST123";
    const redisRoom = {
      roomId: "room_rest_test_1",
      code,
      type: "friend",
      mode: "game_only",
      format: { maxWickets: 1, maxOvers: 1 },
      status: "waiting",
      host: { guestId: "host_rest_1", name: "HostFromREST", ready: false },
      guest: null,
      seriesScore: { host_rest_1: 0 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await redis.set(`friend_room:${code}`, JSON.stringify(redisRoom));

    // Connect host socket and join
    const hostSocket: ClientSocket = ClientIO(`http://localhost:${port}`);
    await new Promise<void>((res) => hostSocket.on("connect", () => res()));

    const statePromise = new Promise<any>((resolve) => {
      hostSocket.on("friend:state", resolve);
    });

    hostSocket.emit("friend:join", {
      code,
      guestId: "host_rest_1",
      name: "HostFromREST",
      ageConfirmed: true,
    });

    const state = await statePromise;
    expect(state.code).toBe(code);
    expect(state.host.guestId).toBe("host_rest_1");
    expect(state.status).toBe("waiting");

    // Connect friend socket and join
    const friendSocket: ClientSocket = ClientIO(`http://localhost:${port}`);
    await new Promise<void>((res) => friendSocket.on("connect", () => res()));

    const friendJoinedPromise = new Promise<any>((resolve) => {
      friendSocket.on("friend:joined", resolve);
    });

    friendSocket.emit("friend:join", {
      code,
      guestId: "friend_rest_2",
      name: "FriendFromREST",
      ageConfirmed: true,
    });

    const joined = await friendJoinedPromise;
    expect(joined.code).toBe(code);

    hostSocket.disconnect();
    friendSocket.disconnect();
  });

  // 8. Full Coin Toss flow: toss call -> both pick with pickerId -> toss decision received cleanly
  it("Full Coin Toss flow: toss call -> both pick with pickerId -> toss decision received cleanly", async () => {
    const client1: ClientSocket = ClientIO(`http://localhost:${port}`);
    const client2: ClientSocket = ClientIO(`http://localhost:${port}`);

    await Promise.all([
      new Promise<void>((res) => client1.on("connect", () => res())),
      new Promise<void>((res) => client2.on("connect", () => res())),
    ]);

    const createdPromise = new Promise<any>((resolve) => client1.on("friend:created", resolve));
    client1.emit("friend:create", {
      guestId: "host_toss_1",
      name: "TossHost",
      mode: "game_only",
      format: { maxWickets: 1, maxOvers: 1 },
    });
    const { code } = await createdPromise;

    const joinedPromise = new Promise<any>((resolve) => client2.on("friend:joined", resolve));
    client2.emit("friend:join", {
      code,
      guestId: "guest_toss_2",
      name: "TossGuest",
      ageConfirmed: true,
    });
    await joinedPromise;

    // Both ready
    const matchStart1 = new Promise<any>((res) => client1.on("match:found", res));
    const matchStart2 = new Promise<any>((res) => client2.on("match:found", res));
    client1.emit("friend:ready", { ready: true });
    client2.emit("friend:ready", { ready: true });
    const [m1, m2] = await Promise.all([matchStart1, matchStart2]);

    expect(m1.isInitiator).toBe(true);
    expect(m2.isInitiator).toBe(false);

    // Toss Call: p1 calls odd
    const callPromise = new Promise<any>((res) => client2.on("game:toss_call", res));
    client1.emit("game:toss_call", { call: "odd" });
    const callData = await callPromise;
    expect(callData.call).toBe("odd");

    // Toss Picks: p1 picks 3, p2 picks 4 -> sum 7 (odd) -> p1 caller wins!
    const pickForClient2 = new Promise<any>((res) => client2.on("game:toss_pick", res));
    const pickForClient1 = new Promise<any>((res) => client1.on("game:toss_pick", res));

    client1.emit("game:toss_pick", { pick: 3, pickerId: "p1" });
    client2.emit("game:toss_pick", { pick: 4, pickerId: "p2" });

    const [p1Recv, p2Recv] = await Promise.all([pickForClient1, pickForClient2]);
    expect(p1Recv.pick).toBe(4);
    expect(p1Recv.pickerId).toBe("p2");
    expect(p2Recv.pick).toBe(3);
    expect(p2Recv.pickerId).toBe("p1");

    // Toss Decision: p1 (winner) chooses bat
    const decisionPromise = new Promise<any>((res) => client2.on("game:toss_decision", res));
    client1.emit("game:toss_decision", { role: "bat", winner: "p1" });
    const decision = await decisionPromise;
    expect(decision.role).toBe("bat");
    expect(decision.winner).toBe("p1");

    client1.disconnect();
    client2.disconnect();
  });
});

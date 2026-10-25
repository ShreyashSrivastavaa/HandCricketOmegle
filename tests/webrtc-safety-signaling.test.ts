import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { io as ClientIO, Socket as ClientSocket } from "socket.io-client";
import { matchmaker } from "../src/server/matchmaker";
import { safetyStore, hashIp } from "../src/server/safetyStore";
import { registerSocketHandlers } from "../src/server/socketHandler";
import { WebRTCManager } from "../src/lib/webrtc/webrtcManager";

describe("WebRTC Signaling, Safety Store, and Matchmaker Tests", () => {
  beforeEach(() => {
    matchmaker.clear();
    safetyStore.clear();
  });

  // 1. AGE GATE REQUIREMENT
  describe("Age Gate Enforcement", () => {
    it("blocks video queue for unconfirmed guests", () => {
      const result = matchmaker.enqueue({
        socketId: "sock_1",
        guestId: "guest_minor",
        ip: "192.168.1.1",
        queueType: "video",
        ageConfirmed: false,
        blockedGuestIds: [],
        enqueuedAt: Date.now(),
      });

      expect(result.room).toBeNull();
      expect(result.error).toContain("Age Gate Required");
    });

    it("permits video queue for confirmed 18+ guests", () => {
      const result = matchmaker.enqueue({
        socketId: "sock_1",
        guestId: "guest_adult",
        ip: "192.168.1.1",
        queueType: "video",
        ageConfirmed: true,
        blockedGuestIds: [],
        enqueuedAt: Date.now(),
      });

      expect(result.error).toBeUndefined();
    });

    it("permits game-only queue without age confirmation", () => {
      const result = matchmaker.enqueue({
        socketId: "sock_1",
        guestId: "guest_player",
        ip: "192.168.1.1",
        queueType: "game_only",
        ageConfirmed: false,
        blockedGuestIds: [],
        enqueuedAt: Date.now(),
      });

      expect(result.error).toBeUndefined();
    });
  });

  // 2. BAN ENFORCEMENT & REPORTING
  describe("Safety Reporting & Ban System", () => {
    it("creates a report record with snapshot and hashed IP", () => {
      const { report, autoBanned } = safetyStore.addReport({
        reporterGuestId: "rep_user",
        reportedGuestId: "bad_actor_1",
        roomId: "room_123",
        reason: "Nudity or sexual content",
        snapshotBase64: "data:image/jpeg;base64,mockframe123",
        ip: "203.0.113.195",
      });

      expect(report.id).toBeDefined();
      expect(report.reportedGuestId).toBe("bad_actor_1");
      expect(report.snapshotBase64).toBe("data:image/jpeg;base64,mockframe123");
      expect(report.hashedIp).toBe(hashIp("203.0.113.195"));
      expect(report.hashedIp).not.toBe("203.0.113.195"); // Plain IP never stored
      expect(autoBanned).toBe(false); // First report does not auto-ban
    });

    it("triggers automatic 24h ban upon 3 distinct reports within 24h", () => {
      const target = "spammer_guest";

      // Report 1
      safetyStore.addReport({
        reporterGuestId: "user_a",
        reportedGuestId: target,
        roomId: "room_1",
        reason: "Harassment",
        ip: "10.0.0.1",
      });

      // Report 2
      safetyStore.addReport({
        reporterGuestId: "user_b",
        reportedGuestId: target,
        roomId: "room_2",
        reason: "Harassment",
        ip: "10.0.0.2",
      });

      expect(safetyStore.isBanned(target).banned).toBe(false);

      // Report 3 from distinct reporter
      const { autoBanned } = safetyStore.addReport({
        reporterGuestId: "user_c",
        reportedGuestId: target,
        roomId: "room_3",
        reason: "Harassment",
        ip: "10.0.0.3",
      });

      expect(autoBanned).toBe(true);
      const banCheck = safetyStore.isBanned(target);
      expect(banCheck.banned).toBe(true);
      expect(banCheck.ban?.type).toBe("temp_24h");
    });

    it("banned guest cannot enter the matchmaking queue", () => {
      safetyStore.banGuest("banned_guest", "temp_24h", "Violated rules", hashIp("198.51.100.5"));

      const result = matchmaker.enqueue({
        socketId: "sock_banned",
        guestId: "banned_guest",
        ip: "198.51.100.5",
        queueType: "video",
        ageConfirmed: true,
        blockedGuestIds: [],
        enqueuedAt: Date.now(),
      });

      expect(result.room).toBeNull();
      expect(result.error).toContain("Access Denied: You are suspended");
    });
  });

  // 3. TRACK RELEASE & WEBRTC CLEANUP
  describe("WebRTC Track Cleanup", () => {
    it("releases all media tracks and closes connection fully on cleanup", () => {
      const manager = new WebRTCManager();

      let videoTrackStopped = false;
      let audioTrackStopped = false;

      // Mock MediaStream
      const mockVideoTrack = {
        kind: "video",
        stop: () => {
          videoTrackStopped = true;
        },
        enabled: true,
      };

      const mockAudioTrack = {
        kind: "audio",
        stop: () => {
          audioTrackStopped = true;
        },
        enabled: true,
      };

      const mockStream = {
        getTracks: () => [mockVideoTrack, mockAudioTrack],
        getVideoTracks: () => [mockVideoTrack],
        getAudioTracks: () => [mockAudioTrack],
      } as unknown as MediaStream;

      // Inject mock local stream
      (manager as any).localStream = mockStream;

      expect(manager.getLocalStream()).toBe(mockStream);

      // Trigger Next Opponent / match cleanup
      manager.cleanup();

      expect(videoTrackStopped).toBe(true);
      expect(audioTrackStopped).toBe(true);
      expect(manager.getLocalStream()).toBeNull();
      expect(manager.getState()).toBe("closed");
    });
  });

  // 4. SOCKET.IO SIGNALING FLOW (Offer / Answer / ICE relay)
  describe("Socket.IO Signaling & Partner Isolation", () => {
    let httpServer: http.Server;
    let ioServer: SocketIOServer;
    let port: number;

    let client1: ClientSocket;
    let client2: ClientSocket;
    let client3: ClientSocket;

    beforeEach(async () => {
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
      client1?.disconnect();
      client2?.disconnect();
      client3?.disconnect();
      ioServer?.close();
      httpServer?.close();
    });

    it("relays offer, answer, and ice ONLY between paired peers, rejecting non-peers", async () => {
      // Connect Client 1 & Client 2
      client1 = ClientIO(`http://localhost:${port}`);
      client2 = ClientIO(`http://localhost:${port}`);
      client3 = ClientIO(`http://localhost:${port}`); // Unpaired spectator

      await Promise.all([
        new Promise<void>((res) => client1.on("connect", () => res())),
        new Promise<void>((res) => client2.on("connect", () => res())),
        new Promise<void>((res) => client3.on("connect", () => res())),
      ]);

      // Enqueue Client 1 & Client 2 in video queue
      const matchFoundPromise1 = new Promise<any>((resolve) => {
        client1.on("match:found", resolve);
      });
      const matchFoundPromise2 = new Promise<any>((resolve) => {
        client2.on("match:found", resolve);
      });

      const client1WaitingPromise = new Promise<void>((resolve) => {
        client1.once("queue:waiting", () => resolve());
      });

      client1.emit("queue:join", {
        guestId: "user_1",
        queueType: "video",
        ageConfirmed: true,
      });

      await client1WaitingPromise;

      client2.emit("queue:join", {
        guestId: "user_2",
        queueType: "video",
        ageConfirmed: true,
      });

      const [m1, m2] = await Promise.all([matchFoundPromise1, matchFoundPromise2]);

      expect(m1.roomId).toBe(m2.roomId);
      expect(m1.isInitiator).toBe(true);
      expect(m2.isInitiator).toBe(false);

      // Verify Offer Relay: Client 1 emits rtc:offer -> Client 2 receives, Client 3 receives nothing
      let client3ReceivedOffer = false;
      client3.on("rtc:offer", () => {
        client3ReceivedOffer = true;
      });

      const offerReceivedPromise = new Promise<any>((resolve) => {
        client2.on("rtc:offer", resolve);
      });

      client1.emit("rtc:offer", { sdp: { type: "offer", sdp: "v=0 mock_sdp" } });

      const receivedOffer = await offerReceivedPromise;
      expect(receivedOffer.sdp.sdp).toBe("v=0 mock_sdp");
      expect(client3ReceivedOffer).toBe(false);

      // Verify Answer Relay: Client 2 emits rtc:answer -> Client 1 receives
      const answerReceivedPromise = new Promise<any>((resolve) => {
        client1.on("rtc:answer", resolve);
      });

      client2.emit("rtc:answer", { sdp: { type: "answer", sdp: "v=0 mock_answer" } });

      const receivedAnswer = await answerReceivedPromise;
      expect(receivedAnswer.sdp.sdp).toBe("v=0 mock_answer");

      // Verify ICE Candidate Relay: Client 1 emits rtc:ice -> Client 2 receives
      const iceReceivedPromise = new Promise<any>((resolve) => {
        client2.on("rtc:ice", resolve);
      });

      client1.emit("rtc:ice", { candidate: { candidate: "candidate:1234", sdpMid: "0" } });

      const receivedIce = await iceReceivedPromise;
      expect(receivedIce.candidate.candidate).toBe("candidate:1234");

      // Verify Unpaired Client 3 cannot send signals to anyone
      let client1ReceivedSpoof = false;
      client1.on("rtc:ice", () => {
        client1ReceivedSpoof = true;
      });

      client3.emit("rtc:ice", { candidate: { candidate: "candidate:malicious" } });

      // Wait a moment to ensure no signals leak
      await new Promise((r) => setTimeout(r, 100));
      expect(client1ReceivedSpoof).toBe(false);
    });
  });
});

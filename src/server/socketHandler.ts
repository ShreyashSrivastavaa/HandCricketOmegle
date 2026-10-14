import type { Server, Socket } from "socket.io";
import { matchmaker, type MatchQueueType, type ActiveRoom } from "./matchmaker";
import { safetyStore } from "./safetyStore";

interface JoinQueuePayload {
  guestId: string;
  queueType: MatchQueueType;
  ageConfirmed: boolean;
  blockedGuestIds?: string[];
}

interface RTCSignalPayload {
  sdp?: any;
  candidate?: any;
  enabled?: boolean;
}

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    const clientIp =
      (socket.handshake.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      socket.handshake.address ||
      "127.0.0.1";

    // 1. Join matchmaking queue
    socket.on("queue:join", (payload: JoinQueuePayload) => {
      const { guestId, queueType, ageConfirmed, blockedGuestIds = [] } = payload;

      const result = matchmaker.enqueue({
        socketId: socket.id,
        guestId,
        ip: clientIp,
        queueType: queueType || "video",
        ageConfirmed: !!ageConfirmed,
        blockedGuestIds,
        enqueuedAt: Date.now(),
      });

      if (result.error) {
        socket.emit("queue:error", { message: result.error });
        return;
      }

      if (result.room) {
        const room = result.room;
        // Join both to socket room
        const p1Socket = io.sockets.sockets.get(room.p1.socketId);
        const p2Socket = io.sockets.sockets.get(room.p2.socketId);

        p1Socket?.join(room.roomId);
        p2Socket?.join(room.roomId);

        // p1 is initiator for WebRTC offer
        p1Socket?.emit("match:found", {
          roomId: room.roomId,
          mode: room.mode,
          isInitiator: true,
          opponent: {
            guestId: room.p2.guestId,
            name: `Player ${room.p2.guestId.substring(0, 4)}`,
          },
        });

        p2Socket?.emit("match:found", {
          roomId: room.roomId,
          mode: room.mode,
          isInitiator: false,
          opponent: {
            guestId: room.p1.guestId,
            name: `Player ${room.p1.guestId.substring(0, 4)}`,
          },
        });
      } else {
        socket.emit("queue:waiting", { queueType });
      }
    });

    // 2. Leave matchmaking queue
    socket.on("queue:leave", () => {
      matchmaker.dequeue(socket.id);
      socket.emit("queue:left");
    });

    // Helper: get partner in active room
    const getPartnerSocketId = (): { partnerId?: string; room?: ActiveRoom } => {
      const room = matchmaker.getRoomBySocket(socket.id);
      if (!room) return {};
      const partnerId = room.p1.socketId === socket.id ? room.p2.socketId : room.p1.socketId;
      return { partnerId, room };
    };

    // 3. WebRTC Signaling (strictly peer-to-peer relay, rejected for non-peers)
    socket.on("rtc:ready", () => {
      const { partnerId } = getPartnerSocketId();
      if (!partnerId) return;
      io.to(partnerId).emit("rtc:ready");
    });

    socket.on("rtc:offer", (payload: RTCSignalPayload) => {
      const { partnerId } = getPartnerSocketId();
      if (!partnerId) return;
      io.to(partnerId).emit("rtc:offer", payload);
    });

    socket.on("rtc:answer", (payload: RTCSignalPayload) => {
      const { partnerId } = getPartnerSocketId();
      if (!partnerId) return;
      io.to(partnerId).emit("rtc:answer", payload);
    });

    socket.on("rtc:ice", (payload: RTCSignalPayload) => {
      const { partnerId } = getPartnerSocketId();
      if (!partnerId) return;
      io.to(partnerId).emit("rtc:ice", payload);
    });

    socket.on("rtc:camera_toggle", (payload: { enabled: boolean }) => {
      const { partnerId } = getPartnerSocketId();
      if (!partnerId) return;
      io.to(partnerId).emit("rtc:camera_toggle", payload);
    });

    socket.on("rtc:mic_toggle", (payload: { enabled: boolean }) => {
      const { partnerId } = getPartnerSocketId();
      if (!partnerId) return;
      io.to(partnerId).emit("rtc:mic_toggle", payload);
    });

    // 4. "Next Opponent" (< 1s teardown)
    socket.on("match:next", () => {
      const room = matchmaker.getRoomBySocket(socket.id);
      if (room) {
        const { partnerSocketId } = matchmaker.closeRoom(room.roomId, socket.id);
        if (partnerSocketId) {
          io.to(partnerSocketId).emit("match:ended", {
            reason: "opponent_left",
            message: "Opponent moved to next match.",
          });
        }
      }
      socket.emit("match:closed");
    });

    // 5. Game relay events
    socket.on("game:toss_call", (payload: { call: "odd" | "even" }) => {
      const { partnerId } = getPartnerSocketId();
      if (!partnerId) return;
      io.to(partnerId).emit("game:toss_call", payload);
    });

    socket.on("game:toss_pick", (payload: { pick: number }) => {
      const { partnerId } = getPartnerSocketId();
      if (!partnerId) return;
      io.to(partnerId).emit("game:toss_pick", payload);
    });

    socket.on("game:toss_decision", (payload: { role: "bat" | "bowl" }) => {
      const { partnerId } = getPartnerSocketId();
      if (!partnerId) return;
      io.to(partnerId).emit("game:toss_decision", payload);
    });

    socket.on("game:ball_pick", (payload: { pick: number; ballIndex: number }) => {
      const { partnerId, room } = getPartnerSocketId();
      if (!partnerId || !room) return;

      if (!room.currentBall) {
        room.currentBall = {};
      }

      const isP1 = room.p1.socketId === socket.id;
      if (isP1) {
        room.currentBall.p1Pick = payload.pick;
      } else {
        room.currentBall.p2Pick = payload.pick;
      }

      // Notify opponent that choice is locked (without revealing the number)
      io.to(partnerId).emit("game:opponent_locked");

      // Check if both players picked
      if (room.currentBall.p1Pick !== undefined && room.currentBall.p2Pick !== undefined) {
        const p1Pick = room.currentBall.p1Pick;
        const p2Pick = room.currentBall.p2Pick;
        room.currentBall = {}; // Reset for next ball

        io.to(room.roomId).emit("game:ball_reveal", {
          p1Pick,
          p2Pick,
          ballIndex: payload.ballIndex,
        });
      }
    });

    socket.on("game:emote", (payload: { emote: string }) => {
      const { partnerId } = getPartnerSocketId();
      if (!partnerId) return;
      // Allow only the 4 preset emotes
      const ALLOWED_EMOTES = ["👏", "🔥", "😅", "🏏"];
      if (ALLOWED_EMOTES.includes(payload.emote)) {
        io.to(partnerId).emit("game:emote", { emote: payload.emote });
      }
    });

    socket.on("game:rematch_request", () => {
      const { partnerId } = getPartnerSocketId();
      if (!partnerId) return;
      io.to(partnerId).emit("game:rematch_request");
    });

    socket.on("game:rematch_accept", () => {
      const { partnerId, room } = getPartnerSocketId();
      if (!partnerId || !room) return;
      io.to(room.roomId).emit("game:rematch_start");
    });

    // 6. Disconnect handling
    socket.on("disconnect", () => {
      matchmaker.dequeue(socket.id);
      const room = matchmaker.getRoomBySocket(socket.id);
      if (room) {
        const { partnerSocketId } = matchmaker.closeRoom(room.roomId, socket.id);
        if (partnerSocketId) {
          io.to(partnerSocketId).emit("match:ended", {
            reason: "opponent_disconnected",
            message: "Opponent disconnected.",
          });
        }
      }
    });
  });
}

import type { Server, Socket } from "socket.io";
import { matchmaker } from "./matchmaker.ts";
import { roomStore, type ActiveRoom } from "./roomStore.ts";
import { getRedis } from "../lib/server/redis.ts";
import {
  joinQueueSchema,
  friendCreateSchema,
  friendJoinSchema,
  friendReadySchema,
  friendFormatUpdateSchema,
  friendKickSchema,
  tossCallSchema,
  tossPickSchema,
  tossDecisionSchema,
  ballPickSchema,
  emoteSchema,
  rtcSignalSchema,
} from "../lib/validations/socketSchemas.ts";

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    const clientIp =
      (socket.handshake.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      socket.handshake.address ||
      "127.0.0.1";

    const getPartnerInfo = (): { partnerId?: string; room?: ActiveRoom; isP1?: boolean } => {
      const room = roomStore.getRoomBySocket(socket.id);
      if (!room) return {};
      const isP1 = room.p1.socketId === socket.id;
      const partnerId = isP1 ? room.p2?.socketId : room.p1.socketId;
      return { partnerId, room, isP1 };
    };

    const emitFriendState = (room: ActiveRoom) => {
      io.to(room.roomId).emit("friend:state", {
        roomId: room.roomId,
        code: room.code,
        type: room.type,
        mode: room.mode,
        format: room.format,
        status: room.status,
        host: {
          guestId: room.p1.guestId,
          name: room.p1.name,
          ready: room.p1Ready,
          disconnected: !!room.p1.disconnected,
        },
        guest: room.p2
          ? {
              guestId: room.p2.guestId,
              name: room.p2.name,
              ready: room.p2Ready,
              disconnected: !!room.p2.disconnected,
            }
          : null,
        seriesScore: room.seriesScore,
      });
    };

    // =========================================================================
    // 1. MODE B: RANDOM MATCHMAKING QUEUE (queue:*)
    // =========================================================================
    socket.on("queue:join", (rawPayload: unknown) => {
      const parsed = joinQueueSchema.safeParse(rawPayload);
      if (!parsed.success) {
        socket.emit("queue:error", { message: "Invalid matchmaking request format." });
        return;
      }

      const { guestId, queueType, ageConfirmed, blockedGuestIds, name } = parsed.data;

      const result = matchmaker.enqueue({
        socketId: socket.id,
        guestId,
        ip: clientIp,
        queueType,
        ageConfirmed,
        blockedGuestIds,
        enqueuedAt: Date.now(),
        name,
      });

      if (result.error) {
        socket.emit("queue:error", { message: result.error });
        return;
      }

      if (result.room) {
        const room = result.room;
        const p1Socket = io.sockets.sockets.get(room.p1.socketId);
        const p2Socket = io.sockets.sockets.get(room.p2!.socketId);

        p1Socket?.join(room.roomId);
        p2Socket?.join(room.roomId);

        // Notify p1 (initiator)
        p1Socket?.emit("match:found", {
          roomId: room.roomId,
          mode: room.mode,
          format: room.format,
          isInitiator: true,
          type: "random",
          opponent: {
            guestId: room.p2!.guestId,
            name: room.p2!.name,
          },
          seriesScore: room.seriesScore,
        });

        // Notify p2 (non-initiator)
        p2Socket?.emit("match:found", {
          roomId: room.roomId,
          mode: room.mode,
          format: room.format,
          isInitiator: false,
          type: "random",
          opponent: {
            guestId: room.p1.guestId,
            name: room.p1.name,
          },
          seriesScore: room.seriesScore,
        });
      } else {
        socket.emit("queue:waiting", { queueType });
      }
    });

    socket.on("queue:leave", () => {
      matchmaker.dequeue(socket.id);
      socket.emit("queue:left");
    });

    // =========================================================================
    // 2. MODE A: FRIEND ROOM (friend:*)
    // =========================================================================
    socket.on("friend:create", (rawPayload: unknown) => {
      const parsed = friendCreateSchema.safeParse(rawPayload);
      if (!parsed.success) {
        socket.emit("friend:error", { message: "Invalid room creation payload." });
        return;
      }

      const { guestId, name, mode, format } = parsed.data;

      const result = roomStore.createFriendRoom({
        guestId,
        name,
        ip: clientIp,
        socketId: socket.id,
        mode,
        format,
      });

      if (result.error || !result.room) {
        socket.emit("friend:error", { message: result.error || "Failed to create room." });
        return;
      }

      socket.join(result.room.roomId);
      socket.emit("friend:created", {
        roomId: result.room.roomId,
        code: result.room.code,
        format: result.room.format,
        mode: result.room.mode,
        host: { guestId: result.room.p1.guestId, name: result.room.p1.name },
      });

      emitFriendState(result.room);
    });

    socket.on("friend:join", async (rawPayload: unknown) => {
      const parsed = friendJoinSchema.safeParse(rawPayload);
      if (!parsed.success) {
        socket.emit("friend:error", { message: "Invalid room join code or name." });
        return;
      }

      const { code, guestId, name, ageConfirmed } = parsed.data;

      // Hydrate from Redis if room was created via REST route
      let existingRoom = roomStore.getRoomByCode(code);
      if (!existingRoom) {
        try {
          const rawCode = code.trim().toUpperCase();
          const cleanCode = rawCode.startsWith("HC-")
            ? rawCode.slice(3)
            : rawCode.startsWith("HC") && rawCode.length > 6
            ? rawCode.slice(2)
            : rawCode;
          const redis = getRedis();
          const redisRoomRaw = await redis.get(`friend_room:${cleanCode}`);
          if (redisRoomRaw) {
            const redisRoom =
              typeof redisRoomRaw === "string" ? JSON.parse(redisRoomRaw) : redisRoomRaw;
            if (redisRoom && redisRoom.roomId && redisRoom.host) {
              roomStore.registerExistingRoom({
                roomId: redisRoom.roomId,
                code: cleanCode,
                hostGuestId: redisRoom.host.guestId,
                hostName: redisRoom.host.name,
                mode: redisRoom.mode || "game_only",
                format: redisRoom.format || { maxWickets: 1, maxOvers: 1 },
              });
            }
          }
        } catch (e) {
          console.warn("[socketHandler] Error hydrating room from Redis:", e);
        }
      }

      const result = roomStore.joinFriendRoom({
        code,
        guestId,
        name,
        ip: clientIp,
        socketId: socket.id,
        ageConfirmed,
      });

      if (result.error || !result.room) {
        socket.emit("friend:error", { message: result.error || "Could not join room." });
        return;
      }

      const room = result.room;
      socket.join(room.roomId);

      if (result.isReconnect) {
        // Player reconnected within 60s
        socket.emit("friend:reconnected", {
          roomId: room.roomId,
          code: room.code,
          isHost: room.p1.guestId === guestId,
        });

        // If match was already active, restart WebRTC if video
        if (room.status === "playing" && room.mode === "video") {
          const isP1 = room.p1.guestId === guestId;
          socket.emit("match:resume", {
            roomId: room.roomId,
            isInitiator: isP1,
            mode: room.mode,
            format: room.format,
            opponent: {
              guestId: isP1 ? room.p2!.guestId : room.p1.guestId,
              name: isP1 ? room.p2!.name : room.p1.name,
            },
            seriesScore: room.seriesScore,
          });
        }
      } else {
        socket.emit("friend:joined", {
          roomId: room.roomId,
          code: room.code,
          format: room.format,
          mode: room.mode,
        });
      }

      emitFriendState(room);
    });

    socket.on("friend:ready", async (rawPayload: unknown) => {
      const parsed = friendReadySchema.safeParse(rawPayload);
      if (!parsed.success) return;

      const { room } = getPartnerInfo();
      if (!room) return;

      const guestId =
        parsed.data.guestId ||
        (room.p1.socketId === socket.id ? room.p1.guestId : room.p2?.guestId);
      if (!guestId) return;

      const result = roomStore.setReady(room.roomId, guestId, parsed.data.ready);
      if (result.room) {
        emitFriendState(result.room);

        // Keep Redis friend room in sync
        try {
          const redis = getRedis();
          const cleanCode = result.room.code;
          if (cleanCode) {
            const raw = await redis.get(`friend_room:${cleanCode}`);
            if (raw) {
              const parsedRoom = typeof raw === "string" ? JSON.parse(raw) : raw;
              if (parsedRoom && parsedRoom.host) {
                parsedRoom.host.ready = result.room.p1Ready;
                if (parsedRoom.guest) parsedRoom.guest.ready = result.room.p2Ready;
                if (result.bothReady) parsedRoom.status = "playing";
                await redis.set(`friend_room:${cleanCode}`, JSON.stringify(parsedRoom));
              }
            }
          }
        } catch (e) {
          console.warn("[socketHandler] Error syncing ready state to Redis:", e);
        }

        // When both players are ready, start the match!
        if (result.bothReady && result.room.p2) {
          const p1Socket = io.sockets.sockets.get(result.room.p1.socketId);
          const p2Socket = io.sockets.sockets.get(result.room.p2.socketId);

          p1Socket?.emit("match:found", {
            roomId: result.room.roomId,
            code: result.room.code,
            mode: result.room.mode,
            format: result.room.format,
            isInitiator: true,
            type: "friend",
            opponent: {
              guestId: result.room.p2.guestId,
              name: result.room.p2.name,
            },
            seriesScore: result.room.seriesScore,
          });

          p2Socket?.emit("match:found", {
            roomId: result.room.roomId,
            code: result.room.code,
            mode: result.room.mode,
            format: result.room.format,
            isInitiator: false,
            type: "friend",
            opponent: {
              guestId: result.room.p1.guestId,
              name: result.room.p1.name,
            },
            seriesScore: result.room.seriesScore,
          });
        }
      }
    });

    socket.on("friend:format:update", (rawPayload: unknown) => {
      const parsed = friendFormatUpdateSchema.safeParse(rawPayload);
      if (!parsed.success) return;

      const { room, isP1 } = getPartnerInfo();
      if (!room || !isP1) return;

      const result = roomStore.updateFormat(room.roomId, room.p1.guestId, parsed.data.format);
      if (result.room) {
        emitFriendState(result.room);
      }
    });

    socket.on("friend:kick", (rawPayload: unknown) => {
      const parsed = friendKickSchema.safeParse(rawPayload);
      if (!parsed.success) return;

      const { room, isP1 } = getPartnerInfo();
      if (!room || !isP1) return;

      const result = roomStore.kickGuest(room.roomId, room.p1.guestId, parsed.data.targetGuestId);
      if (result.kickedSocketId) {
        const kickedSocket = io.sockets.sockets.get(result.kickedSocketId);
        kickedSocket?.leave(room.roomId);
        kickedSocket?.emit("friend:kicked", { message: "You were kicked by the host." });
      }

      if (result.room) {
        emitFriendState(result.room);
      }
    });

    socket.on("friend:rematch", () => {
      const { room } = getPartnerInfo();
      if (!room) return;

      const guestId = room.p1.socketId === socket.id ? room.p1.guestId : room.p2?.guestId;
      if (!guestId) return;

      const result = roomStore.voteRematch(room.roomId, guestId);
      if (result.startRematch && result.room && result.room.p2) {
        const p1Socket = io.sockets.sockets.get(result.room.p1.socketId);
        const p2Socket = io.sockets.sockets.get(result.room.p2.socketId);

        // Reset game state and trigger new match start with role alternation
        const gameNum = result.room.gameNumber || 1;
        const isP1Initiator = gameNum % 2 !== 0;

        p1Socket?.emit("game:rematch_start", {
          roomId: result.room.roomId,
          seriesScore: result.room.seriesScore,
          isInitiator: isP1Initiator,
          gameNumber: gameNum,
        });

        p2Socket?.emit("game:rematch_start", {
          roomId: result.room.roomId,
          seriesScore: result.room.seriesScore,
          isInitiator: !isP1Initiator,
          gameNumber: gameNum,
        });
      } else {
        const { partnerId } = getPartnerInfo();
        if (partnerId) {
          io.to(partnerId).emit("friend:rematch_requested");
        }
      }
    });

    socket.on("friend:change_format", () => {
      const { room, isP1 } = getPartnerInfo();
      if (!room || !isP1) return;

      room.status = "lobby";
      room.p1Ready = false;
      room.p2Ready = false;
      emitFriendState(room);
    });

    socket.on("friend:leave", () => {
      const { room, partnerId } = getPartnerInfo();
      if (room) {
        roomStore.closeRoom(room.roomId, socket.id);
        if (partnerId) {
          io.to(partnerId).emit("friend:partner_left", { message: "Partner left the room." });
        }
      }
    });

    // =========================================================================
    // 3. BRIDGE BETWEEN MODES: "Play again with this player" (match:play_again)
    // =========================================================================
    socket.on("match:play_again", () => {
      const { room } = getPartnerInfo();
      if (!room) return;

      const guestId = room.p1.socketId === socket.id ? room.p1.guestId : room.p2?.guestId;
      if (!guestId) return;

      const result = roomStore.votePlayAgain(room.roomId, guestId);
      if (result.convertedToFriend && result.room && result.room.p2) {
        // Both players agreed -> convert to friend room, skipping queue!
        io.to(result.room.roomId).emit("match:converted_to_friend", {
          roomId: result.room.roomId,
          code: result.room.code,
          seriesScore: result.room.seriesScore,
          message: "Matched! Room converted to Private Duel. Running series score started.",
        });

        // Trigger rematch immediately inside the converted room
        const p1Socket = io.sockets.sockets.get(result.room.p1.socketId);
        const p2Socket = io.sockets.sockets.get(result.room.p2.socketId);

        const gameNum = result.room.gameNumber || 1;
        const isP1Initiator = gameNum % 2 !== 0;

        p1Socket?.emit("game:rematch_start", {
          roomId: result.room.roomId,
          seriesScore: result.room.seriesScore,
          isInitiator: isP1Initiator,
          gameNumber: gameNum,
        });
        p2Socket?.emit("game:rematch_start", {
          roomId: result.room.roomId,
          seriesScore: result.room.seriesScore,
          isInitiator: !isP1Initiator,
          gameNumber: gameNum,
        });
      } else {
        // One-sided: shows waiting without pressuring opponent
        socket.emit("match:play_again_waiting", { waiting: true });
      }
    });

    // =========================================================================
    // 3.5 MUTUAL READY CHECK (REL-02)
    // =========================================================================
    socket.on("match:ready_confirm", () => {
      const { room, isP1, partnerId } = getPartnerInfo();
      if (!room) return;

      if (isP1) {
        room.p1Ready = true;
      } else {
        room.p2Ready = true;
      }

      if (partnerId) {
        io.to(partnerId).emit("match:partner_ready");
      }

      if (room.p1Ready && room.p2Ready) {
        io.to(room.roomId).emit("match:ready_success", {
          roomId: room.roomId,
          message: "Both players confirmed ready! Starting match...",
        });
      }
    });

    socket.on("match:ready_decline", () => {
      const { room, partnerId } = getPartnerInfo();
      if (!room) return;

      roomStore.closeRoom(room.roomId, socket.id);
      if (partnerId) {
        io.to(partnerId).emit("match:ready_cancelled", {
          message: "Opponent was not ready or declined. Re-queuing you...",
        });
      }
    });

    // =========================================================================
    // 4. WEBRTC SIGNALING (rtc:*) - strictly peer-to-peer relay
    // =========================================================================
    socket.on("rtc:ready", () => {
      const { partnerId } = getPartnerInfo();
      if (!partnerId) return;
      io.to(partnerId).emit("rtc:ready");
    });

    socket.on("rtc:offer", (payload: unknown) => {
      const parsed = rtcSignalSchema.safeParse(payload);
      if (!parsed.success) return;
      const { partnerId } = getPartnerInfo();
      if (!partnerId) return;
      io.to(partnerId).emit("rtc:offer", parsed.data);
    });

    socket.on("rtc:answer", (payload: unknown) => {
      const parsed = rtcSignalSchema.safeParse(payload);
      if (!parsed.success) return;
      const { partnerId } = getPartnerInfo();
      if (!partnerId) return;
      io.to(partnerId).emit("rtc:answer", parsed.data);
    });

    socket.on("rtc:ice", (payload: unknown) => {
      const parsed = rtcSignalSchema.safeParse(payload);
      if (!parsed.success) return;
      const { partnerId } = getPartnerInfo();
      if (!partnerId) return;
      io.to(partnerId).emit("rtc:ice", parsed.data);
    });

    socket.on("rtc:camera_toggle", (payload: { enabled: boolean }) => {
      const { partnerId } = getPartnerInfo();
      if (!partnerId) return;
      io.to(partnerId).emit("rtc:camera_toggle", payload);
    });

    socket.on("rtc:mic_toggle", (payload: { enabled: boolean }) => {
      const { partnerId } = getPartnerInfo();
      if (!partnerId) return;
      io.to(partnerId).emit("rtc:mic_toggle", payload);
    });

    socket.on("rtc:gesture_toggle", (payload: { enabled: boolean }) => {
      const { partnerId } = getPartnerInfo();
      if (!partnerId) return;
      io.to(partnerId).emit("rtc:gesture_toggle", payload);
    });

    // Helper to start server-enforced 8s ball pick timer
    const startServerBallTimer = (room: ActiveRoom, ballIndex: number = 0) => {
      if (room.currentBall?.timerTimeout) {
        clearTimeout(room.currentBall.timerTimeout);
      }
      if (!room.currentBall) {
        room.currentBall = {};
      }
      room.currentBall.ballStartTime = Date.now();

      // 8.5s fallback server enforcement if either player fails to pick
      room.currentBall.timerTimeout = setTimeout(() => {
        if (!room.currentBall) return;
        let p1Pick = room.currentBall.p1Pick;
        let p2Pick = room.currentBall.p2Pick;

        if (p1Pick === undefined) {
          p1Pick = Math.floor(Math.random() * 6) + 1;
          room.currentBall.p1Pick = p1Pick;
          const p1Socket = io.sockets.sockets.get(room.p1.socketId);
          p1Socket?.emit("game:auto_picked", { pick: p1Pick });
          if (room.p2) io.to(room.p2.socketId).emit("game:opponent_locked");
        }

        if (p2Pick === undefined) {
          p2Pick = Math.floor(Math.random() * 6) + 1;
          room.currentBall.p2Pick = p2Pick;
          if (room.p2) {
            const p2Socket = io.sockets.sockets.get(room.p2.socketId);
            p2Socket?.emit("game:auto_picked", { pick: p2Pick });
          }
          io.to(room.p1.socketId).emit("game:opponent_locked");
        }

        // Trigger 5s reveal countdown
        startRevealCountdown(room, p1Pick, p2Pick, ballIndex);
      }, 8500);
    };

    // Helper to run 5s reveal countdown (5-4-3-2-1) before broadcasting picks together
    const startRevealCountdown = (
      room: ActiveRoom,
      p1Pick: number,
      p2Pick: number,
      ballIndex: number
    ) => {
      if (room.currentBall?.timerTimeout) {
        clearTimeout(room.currentBall.timerTimeout);
        room.currentBall.timerTimeout = undefined;
      }
      if (room.currentBall?.countdownInterval) {
        clearInterval(room.currentBall.countdownInterval);
        room.currentBall.countdownInterval = undefined;
      }

      let secondsLeft = 5;
      io.to(room.roomId).emit("game:ball_countdown", { seconds: secondsLeft });

      if (!room.currentBall) room.currentBall = {};
      room.currentBall.countdownInterval = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft > 0) {
          io.to(room.roomId).emit("game:ball_countdown", { seconds: secondsLeft });
        } else {
          if (room.currentBall?.countdownInterval) {
            clearInterval(room.currentBall.countdownInterval);
            room.currentBall.countdownInterval = undefined;
          }
          room.currentBall = {};

          // Reveal: broadcast both picks simultaneously
          io.to(room.roomId).emit("game:ball_reveal", {
            p1Pick,
            p2Pick,
            ballIndex,
          });
        }
      }, 1000);
    };

    // =========================================================================
    // 5. GAME EVENTS (game:*)
    // =========================================================================
    socket.on("game:toss_call", (payload: unknown) => {
      const parsed = tossCallSchema.safeParse(payload);
      if (!parsed.success) return;
      const { partnerId } = getPartnerInfo();
      if (!partnerId) return;
      io.to(partnerId).emit("game:toss_call", parsed.data);
    });

    socket.on("game:toss_pick", (payload: unknown) => {
      const parsed = tossPickSchema.safeParse(payload);
      if (!parsed.success) return;
      const { partnerId, isP1 } = getPartnerInfo();
      if (!partnerId) return;
      const senderRole: "p1" | "p2" = isP1 ? "p1" : "p2";
      io.to(partnerId).emit("game:toss_pick", {
        pick: parsed.data.pick,
        pickerId: parsed.data.pickerId || senderRole,
      });
    });

    socket.on("game:toss_decision", (payload: unknown) => {
      const parsed = tossDecisionSchema.safeParse(payload);
      if (!parsed.success) return;
      const { partnerId, room, isP1 } = getPartnerInfo();
      if (!partnerId) return;
      const senderRole: "p1" | "p2" = isP1 ? "p1" : "p2";
      io.to(partnerId).emit("game:toss_decision", {
        role: parsed.data.role,
        winner: parsed.data.winner || senderRole,
      });
      if (room) {
        startServerBallTimer(room, 0);
      }
    });

    socket.on("game:ball_start", (payload: { ballIndex?: number }) => {
      const { room } = getPartnerInfo();
      if (!room) return;
      if (!room.currentBall?.ballStartTime) {
        startServerBallTimer(room, payload?.ballIndex || 0);
      }
    });

    socket.on("game:ball_pick", (payload: unknown) => {
      const parsed = ballPickSchema.safeParse(payload);
      if (!parsed.success) return;

      const { partnerId, room } = getPartnerInfo();
      if (!partnerId || !room) return;

      if (!room.currentBall) {
        room.currentBall = {};
      }

      const isP1 = room.p1.socketId === socket.id;
      if (isP1) {
        room.currentBall.p1Pick = parsed.data.pick;
      } else {
        room.currentBall.p2Pick = parsed.data.pick;
      }

      io.to(partnerId).emit("game:opponent_locked");

      // Both players locked: start server 5s reveal countdown (5-4-3-2-1)
      if (room.currentBall.p1Pick !== undefined && room.currentBall.p2Pick !== undefined) {
        const p1Pick = room.currentBall.p1Pick;
        const p2Pick = room.currentBall.p2Pick;
        startRevealCountdown(room, p1Pick, p2Pick, parsed.data.ballIndex);
      }
    });

    socket.on("game:match_complete", (payload: { winnerGuestId?: string }) => {
      const { room } = getPartnerInfo();
      if (!room) return;

      const result = roomStore.recordMatchResult(room.roomId, payload?.winnerGuestId);
      io.to(room.roomId).emit("game:series_update", {
        seriesScore: result.seriesScore,
      });
    });

    socket.on("game:emote", (payload: unknown) => {
      const parsed = emoteSchema.safeParse(payload);
      if (!parsed.success) return;

      const { partnerId } = getPartnerInfo();
      if (!partnerId) return;

      const ALLOWED_EMOTES = ["👏", "🔥", "😅", "🏏"];
      if (ALLOWED_EMOTES.includes(parsed.data.emote)) {
        io.to(partnerId).emit("game:emote", { emote: parsed.data.emote });
      }
    });

    // "Next Opponent" in random mode
    socket.on("match:next", () => {
      const room = roomStore.getRoomBySocket(socket.id);
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

    // =========================================================================
    // 6. DISCONNECTION & 60s RECONNECTION GRACE
    // =========================================================================
    socket.on("disconnect", () => {
      matchmaker.dequeue(socket.id);

      const room = roomStore.getRoomBySocket(socket.id);
      if (room) {
        // Start 60-second grace timer
        const { partnerSocketId, disconnectedGuestId } = roomStore.startDisconnectGrace(
          socket.id,
          (roomId, finalPartnerSocketId) => {
            // Grace period expired (60s passed without reconnection)
            roomStore.closeRoom(roomId);
            if (finalPartnerSocketId) {
              io.to(finalPartnerSocketId).emit("match:ended", {
                reason: "opponent_disconnected",
                message: "Opponent failed to reconnect within 60s.",
              });
            }
          }
        );

        if (partnerSocketId) {
          io.to(partnerSocketId).emit("match:partner_disconnected", {
            guestId: disconnectedGuestId,
            graceSeconds: 60,
            message: "Opponent disconnected. 60s grace period started.",
          });
          emitFriendState(room);
        }
      }
    });
  });
}

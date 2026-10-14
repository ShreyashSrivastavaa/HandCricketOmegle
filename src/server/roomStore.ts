import type { MatchFormat } from "../lib/game-core/types";
import { safetyStore } from "./safetyStore.ts";

export type MatchQueueType = "video" | "game_only";
export type RoomType = "friend" | "random" | "bot";
export type RoomVisibility = "public" | "private";
export type RoomStatus = "waiting" | "lobby" | "playing" | "ended";

export interface RoomUser {
  socketId: string;
  guestId: string;
  name: string;
  ip: string;
  queueType: MatchQueueType;
  ageConfirmed: boolean;
  blockedGuestIds?: string[];
  enqueuedAt?: number;
  disconnected?: boolean;
}

export interface ActiveRoom {
  roomId: string;
  code?: string;
  type: RoomType;
  visibility: RoomVisibility;
  mode: MatchQueueType;
  format: MatchFormat;
  p1: RoomUser; // Host in friend rooms
  p2?: RoomUser; // Guest in friend rooms
  p1Ready: boolean;
  p2Ready: boolean;
  status: RoomStatus;
  createdAt: number;
  expiresAt: number;
  seriesScore: {
    [guestId: string]: number;
  };
  rematchVotes: Set<string>;
  playAgainVotes: Set<string>;
  disconnectTimers: Map<string, NodeJS.Timeout>;
  currentBall?: {
    p1Pick?: number;
    p2Pick?: number;
    timerTimeout?: NodeJS.Timeout;
    countdownInterval?: NodeJS.Timeout;
    ballStartTime?: number;
  };
}

// Allowed 32 characters: uppercase letters A-Z (excluding I and O), digits 2-9 (excluding 0 and 1)
const CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

interface GuestRateLimitState {
  attempts: number[]; // Timestamps of join attempts
  wrongCodesCount: number; // Consecutive failed code attempts
  lockedUntil?: number; // Lockout expiration timestamp
}

export class RoomStore {
  private rooms: Map<string, ActiveRoom> = new Map(); // roomId -> ActiveRoom
  private codeToRoomId: Map<string, string> = new Map(); // code -> roomId
  private userToRoom: Map<string, string> = new Map(); // socketId -> roomId
  private guestToRoom: Map<string, string> = new Map(); // guestId -> roomId
  private retiredCodes: Map<string, number> = new Map(); // code -> retiredAt timestamp

  // Rate limiting per guestId for brute-force protection
  private guestRateLimits: Map<string, GuestRateLimitState> = new Map();

  /**
   * Generates a 6-character unique code avoiding active and recently retired codes (1 hour window).
   */
  public generateCode(): string {
    this.cleanExpiredRetiredCodes();

    let code = "";
    let attempts = 0;
    while (attempts < 1000) {
      code = "";
      for (let i = 0; i < 6; i++) {
        const idx = Math.floor(Math.random() * CODE_CHARACTERS.length);
        code += CODE_CHARACTERS[idx];
      }
      if (!this.codeToRoomId.has(code) && !this.retiredCodes.has(code)) {
        return code;
      }
      attempts++;
    }

    // Fallback: append timestamp slice if congested
    return `HC${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }

  /**
   * Removes retired codes older than 1 hour (3600000ms).
   */
  private cleanExpiredRetiredCodes(): void {
    const now = Date.now();
    for (const [code, retiredAt] of this.retiredCodes.entries()) {
      if (now - retiredAt > 3600 * 1000) {
        this.retiredCodes.delete(code);
      }
    }
  }

  /**
   * Validates rate limits and brute force protection for join attempts.
   */
  public checkJoinRateLimit(guestId: string): { allowed: boolean; error?: string } {
    const now = Date.now();
    let state = this.guestRateLimits.get(guestId);

    if (!state) {
      state = { attempts: [], wrongCodesCount: 0 };
      this.guestRateLimits.set(guestId, state);
    }

    // 1. Check lockout (5 minutes)
    if (state.lockedUntil && state.lockedUntil > now) {
      const remainingMinutes = Math.ceil((state.lockedUntil - now) / 60000);
      return {
        allowed: false,
        error: `Locked out due to repeated invalid codes. Try again in ${remainingMinutes} minute(s).`,
      };
    } else if (state.lockedUntil && state.lockedUntil <= now) {
      // Lockout expired, reset counters
      state.lockedUntil = undefined;
      state.wrongCodesCount = 0;
      state.attempts = [];
    }

    // 2. Filter attempts in last 60 seconds
    state.attempts = state.attempts.filter((ts) => now - ts < 60000);

    // Rate limit: 10 attempts per minute
    if (state.attempts.length >= 10) {
      return {
        allowed: false,
        error: "Too many join attempts. Please wait 1 minute before trying again.",
      };
    }

    state.attempts.push(now);
    return { allowed: true };
  }

  /**
   * Record a failed join attempt (wrong code).
   * After 10 consecutive wrong codes, locks out for 5 minutes.
   */
  public recordFailedCodeAttempt(guestId: string): void {
    let state = this.guestRateLimits.get(guestId);
    if (!state) {
      state = { attempts: [Date.now()], wrongCodesCount: 0 };
      this.guestRateLimits.set(guestId, state);
    }

    state.wrongCodesCount += 1;
    if (state.wrongCodesCount >= 10) {
      state.lockedUntil = Date.now() + 5 * 60 * 1000; // 5 min lockout
    }
  }

  /**
   * Clear failure count on successful join.
   */
  public clearFailedCodeAttempt(guestId: string): void {
    const state = this.guestRateLimits.get(guestId);
    if (state) {
      state.wrongCodesCount = 0;
    }
  }

  /**
   * Create a private friend room (Mode A).
   */
  public createFriendRoom(params: {
    guestId: string;
    name: string;
    ip: string;
    socketId: string;
    mode: MatchQueueType;
    format: MatchFormat;
  }): { room?: ActiveRoom; error?: string } {
    // Check ban
    const banCheck = safetyStore.isBanned(params.guestId, params.ip);
    if (banCheck.banned) {
      return { error: `Suspended from multiplayer: ${banCheck.ban?.reason || "Policy violation"}` };
    }

    // If user already in a room, close it
    this.leaveRoomBySocket(params.socketId);

    const roomId = `room_friend_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const code = this.generateCode();

    const host: RoomUser = {
      socketId: params.socketId,
      guestId: params.guestId,
      name: params.name,
      ip: params.ip,
      queueType: params.mode,
      ageConfirmed: true,
    };

    const room: ActiveRoom = {
      roomId,
      code,
      type: "friend",
      visibility: "private",
      mode: params.mode,
      format: params.format,
      p1: host,
      p2: undefined,
      p1Ready: false,
      p2Ready: false,
      status: "waiting", // Waiting for friend
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry if nobody joins
      seriesScore: {
        [params.guestId]: 0,
      },
      rematchVotes: new Set(),
      playAgainVotes: new Set(),
      disconnectTimers: new Map(),
    };

    this.rooms.set(roomId, room);
    this.codeToRoomId.set(code, roomId);
    this.userToRoom.set(params.socketId, roomId);
    this.guestToRoom.set(params.guestId, roomId);

    return { room };
  }

  /**
   * Join an existing friend room by code.
   */
  public joinFriendRoom(params: {
    code: string;
    guestId: string;
    name: string;
    ip: string;
    socketId: string;
    ageConfirmed?: boolean;
  }): { room?: ActiveRoom; isReconnect?: boolean; error?: string } {
    const code = params.code.trim().toUpperCase();

    // 1. Rate limit check
    const rateCheck = this.checkJoinRateLimit(params.guestId);
    if (!rateCheck.allowed) {
      return { error: rateCheck.error };
    }

    // 2. Ban check
    const banCheck = safetyStore.isBanned(params.guestId, params.ip);
    if (banCheck.banned) {
      return { error: `Suspended from multiplayer: ${banCheck.ban?.reason || "Policy violation"}` };
    }

    // 3. Find room by code
    const roomId = this.codeToRoomId.get(code);
    if (!roomId) {
      this.recordFailedCodeAttempt(params.guestId);
      return { error: "Room not found" };
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      this.recordFailedCodeAttempt(params.guestId);
      return { error: "Room not found" };
    }

    // 4. Check room expiration
    if (Date.now() > room.expiresAt) {
      this.closeRoom(roomId);
      return { error: "Room expired" };
    }

    // 5. Check if this is a reconnecting host or guest
    const isP1 = room.p1.guestId === params.guestId;
    const isP2 = room.p2?.guestId === params.guestId;

    if (isP1) {
      // Reconnecting host
      this.cancelDisconnectTimer(room, params.guestId);
      this.userToRoom.delete(room.p1.socketId);
      room.p1.socketId = params.socketId;
      room.p1.name = params.name || room.p1.name;
      room.p1.disconnected = false;
      this.userToRoom.set(params.socketId, roomId);
      this.guestToRoom.set(params.guestId, roomId);
      this.clearFailedCodeAttempt(params.guestId);
      return { room, isReconnect: true };
    }

    if (isP2) {
      // Reconnecting guest
      this.cancelDisconnectTimer(room, params.guestId);
      if (room.p2) {
        this.userToRoom.delete(room.p2.socketId);
        room.p2.socketId = params.socketId;
        room.p2.name = params.name || room.p2.name;
        room.p2.disconnected = false;
      }
      this.userToRoom.set(params.socketId, roomId);
      this.guestToRoom.set(params.guestId, roomId);
      this.clearFailedCodeAttempt(params.guestId);
      return { room, isReconnect: true };
    }

    // 6. Check if room is full
    if (room.p2 && room.p2.guestId !== params.guestId) {
      return { error: "Room is full" };
    }

    // 7. Check if match already started
    if (room.status === "playing") {
      return { error: "Match already started" };
    }

    // Successful join as guest
    this.clearFailedCodeAttempt(params.guestId);

    const guest: RoomUser = {
      socketId: params.socketId,
      guestId: params.guestId,
      name: params.name,
      ip: params.ip,
      queueType: room.mode,
      ageConfirmed: !!params.ageConfirmed,
    };

    room.p2 = guest;
    room.status = "lobby";
    if (room.seriesScore[params.guestId] === undefined) {
      room.seriesScore[params.guestId] = 0;
    }

    this.userToRoom.set(params.socketId, roomId);
    this.guestToRoom.set(params.guestId, roomId);

    return { room, isReconnect: false };
  }

  /**
   * Toggle player ready status in pre-game lobby.
   */
  public setReady(
    roomId: string,
    guestId: string,
    ready: boolean
  ): { room?: ActiveRoom; bothReady: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { bothReady: false, error: "Room not found" };

    if (room.p1.guestId === guestId) {
      room.p1Ready = ready;
    } else if (room.p2?.guestId === guestId) {
      room.p2Ready = ready;
    } else {
      return { bothReady: false, error: "Player not in room" };
    }

    const bothReady = !!(room.p1 && room.p2 && room.p1Ready && room.p2Ready);
    if (bothReady) {
      room.status = "playing";
    }

    return { room, bothReady };
  }

  /**
   * Host updates format before match starts.
   */
  public updateFormat(
    roomId: string,
    hostGuestId: string,
    format: MatchFormat
  ): { room?: ActiveRoom; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Room not found" };

    if (room.p1.guestId !== hostGuestId) {
      return { error: "Only the host can modify the match format" };
    }

    if (room.status === "playing") {
      return { error: "Cannot change format while match is in progress" };
    }

    room.format = format;
    // Reset ready status when format changes
    room.p1Ready = false;
    room.p2Ready = false;

    return { room };
  }

  /**
   * Host kicks joined guest.
   */
  public kickGuest(
    roomId: string,
    hostGuestId: string,
    targetGuestId: string
  ): { room?: ActiveRoom; kickedSocketId?: string; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Room not found" };

    if (room.p1.guestId !== hostGuestId) {
      return { error: "Only the host can kick players" };
    }

    if (!room.p2 || room.p2.guestId !== targetGuestId) {
      return { error: "Target player not in room" };
    }

    const kickedSocketId = room.p2.socketId;
    this.userToRoom.delete(kickedSocketId);
    this.guestToRoom.delete(targetGuestId);

    room.p2 = undefined;
    room.p2Ready = false;
    room.status = "waiting";
    // Extend expiry by 10 mins again for next friend
    room.expiresAt = Date.now() + 10 * 60 * 1000;

    return { room, kickedSocketId };
  }

  /**
   * Convert a random match into a private friend room (Bridge).
   */
  public convertRandomToFriend(roomId: string): { room?: ActiveRoom; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Room not found" };

    room.type = "friend";
    room.visibility = "private";
    if (!room.code) {
      room.code = this.generateCode();
      this.codeToRoomId.set(room.code, roomId);
    }
    room.expiresAt = Date.now() + 5 * 60 * 1000; // 5 min persistence
    return { room };
  }

  /**
   * Records match winner and updates running series score.
   */
  public recordMatchResult(
    roomId: string,
    winnerGuestId?: string
  ): { room?: ActiveRoom; seriesScore: { [guestId: string]: number } } {
    const room = this.rooms.get(roomId);
    if (!room) return { seriesScore: {} };

    room.status = "ended";
    room.expiresAt = Date.now() + 5 * 60 * 1000; // Room stays alive for 5 min after match
    room.rematchVotes.clear();

    if (winnerGuestId && room.seriesScore[winnerGuestId] !== undefined) {
      room.seriesScore[winnerGuestId] += 1;
    }

    return { room, seriesScore: { ...room.seriesScore } };
  }

  /**
   * Handles rematch vote in friend room. Both must vote to restart.
   */
  public voteRematch(
    roomId: string,
    guestId: string
  ): { room?: ActiveRoom; startRematch: boolean } {
    const room = this.rooms.get(roomId);
    if (!room) return { startRematch: false };

    room.rematchVotes.add(guestId);

    const bothVoted =
      room.p1 &&
      room.p2 &&
      room.rematchVotes.has(room.p1.guestId) &&
      room.rematchVotes.has(room.p2.guestId);

    if (bothVoted) {
      room.rematchVotes.clear();
      room.p1Ready = true;
      room.p2Ready = true;
      room.status = "playing";
      room.currentBall = undefined;
      return { room, startRematch: true };
    }

    return { room, startRematch: false };
  }

  /**
   * Handles "Play again with this player" vote for random match bridge.
   */
  public votePlayAgain(
    roomId: string,
    guestId: string
  ): { room?: ActiveRoom; convertedToFriend: boolean } {
    const room = this.rooms.get(roomId);
    if (!room) return { convertedToFriend: false };

    room.playAgainVotes.add(guestId);

    const bothVoted =
      room.p1 &&
      room.p2 &&
      room.playAgainVotes.has(room.p1.guestId) &&
      room.playAgainVotes.has(room.p2.guestId);

    if (bothVoted) {
      room.playAgainVotes.clear();
      this.convertRandomToFriend(roomId);
      return { room, convertedToFriend: true };
    }

    return { room, convertedToFriend: false };
  }

  /**
   * Start 60-second grace timer when a player disconnects.
   */
  public startDisconnectGrace(
    socketId: string,
    onExpire: (roomId: string, partnerSocketId?: string) => void
  ): { room?: ActiveRoom; partnerSocketId?: string; disconnectedGuestId?: string } {
    const room = this.getRoomBySocket(socketId);
    if (!room) return {};

    const isP1 = room.p1.socketId === socketId;
    const disconnectedUser = isP1 ? room.p1 : room.p2;
    const partnerUser = isP1 ? room.p2 : room.p1;

    if (!disconnectedUser) return { room };

    disconnectedUser.disconnected = true;
    const guestId = disconnectedUser.guestId;

    // Clear existing timer if any
    const existing = room.disconnectTimers.get(guestId);
    if (existing) clearTimeout(existing);

    // 60 second grace period
    const timer = setTimeout(() => {
      room.disconnectTimers.delete(guestId);
      onExpire(room.roomId, partnerUser?.socketId);
    }, 60000);

    room.disconnectTimers.set(guestId, timer);

    return {
      room,
      partnerSocketId: partnerUser?.socketId,
      disconnectedGuestId: guestId,
    };
  }

  /**
   * Cancel disconnect timer on successful reconnect.
   */
  public cancelDisconnectTimer(room: ActiveRoom, guestId: string): void {
    const timer = room.disconnectTimers.get(guestId);
    if (timer) {
      clearTimeout(timer);
      room.disconnectTimers.delete(guestId);
    }
  }

  /**
   * Registers a random match room created by the matchmaker.
   */
  public registerRandomRoom(room: ActiveRoom): void {
    this.rooms.set(room.roomId, room);
    this.userToRoom.set(room.p1.socketId, room.roomId);
    this.guestToRoom.set(room.p1.guestId, room.roomId);
    if (room.p2) {
      this.userToRoom.set(room.p2.socketId, room.roomId);
      this.guestToRoom.set(room.p2.guestId, room.roomId);
    }
  }

  public getRoom(roomId: string): ActiveRoom | undefined {
    return this.rooms.get(roomId);
  }

  public getRoomByCode(code: string): ActiveRoom | undefined {
    const roomId = this.codeToRoomId.get(code.toUpperCase());
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  public getRoomBySocket(socketId: string): ActiveRoom | undefined {
    const roomId = this.userToRoom.get(socketId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  public getRoomByGuest(guestId: string): ActiveRoom | undefined {
    const roomId = this.guestToRoom.get(guestId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  /**
   * Close and delete a room, retiring its code for 1 hour.
   */
  public closeRoom(
    roomId: string,
    leavingSocketId?: string
  ): { partnerSocketId?: string; code?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return {};

    let partnerSocketId: string | undefined;
    if (leavingSocketId) {
      partnerSocketId = room.p1.socketId === leavingSocketId ? room.p2?.socketId : room.p1.socketId;
    }

    // Cancel all disconnect timers
    for (const timer of room.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    room.disconnectTimers.clear();

    if (room.currentBall?.timerTimeout) {
      clearTimeout(room.currentBall.timerTimeout);
    }
    if (room.currentBall?.countdownInterval) {
      clearInterval(room.currentBall.countdownInterval);
    }

    if (room.code) {
      this.retiredCodes.set(room.code, Date.now());
      this.codeToRoomId.delete(room.code);
    }

    this.userToRoom.delete(room.p1.socketId);
    this.guestToRoom.delete(room.p1.guestId);

    if (room.p2) {
      this.userToRoom.delete(room.p2.socketId);
      this.guestToRoom.delete(room.p2.guestId);
    }

    this.rooms.delete(roomId);
    return { partnerSocketId, code: room.code };
  }

  public leaveRoomBySocket(socketId: string): { roomId?: string; partnerSocketId?: string } {
    const room = this.getRoomBySocket(socketId);
    if (!room) return {};
    const { partnerSocketId } = this.closeRoom(room.roomId, socketId);
    return { roomId: room.roomId, partnerSocketId };
  }

  /**
   * Clear all rooms and limits (used in testing).
   */
  public clear(): void {
    for (const room of this.rooms.values()) {
      for (const timer of room.disconnectTimers.values()) {
        clearTimeout(timer);
      }
    }
    this.rooms.clear();
    this.codeToRoomId.clear();
    this.userToRoom.clear();
    this.guestToRoom.clear();
    this.retiredCodes.clear();
    this.guestRateLimits.clear();
  }
}

export const roomStore = new RoomStore();

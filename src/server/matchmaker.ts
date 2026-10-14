import { safetyStore } from "./safetyStore";

export type MatchQueueType = "video" | "game_only";

export interface QueueUser {
  socketId: string;
  guestId: string;
  ip: string;
  queueType: MatchQueueType;
  ageConfirmed: boolean;
  blockedGuestIds: string[];
  enqueuedAt: number;
}

export interface ActiveRoom {
  roomId: string;
  mode: MatchQueueType;
  p1: QueueUser;
  p2: QueueUser;
  createdAt: number;
  // Game turn picks
  currentBall?: {
    p1Pick?: number;
    p2Pick?: number;
    timerTimeout?: NodeJS.Timeout;
  };
}

class Matchmaker {
  private videoQueue: QueueUser[] = [];
  private gameOnlyQueue: QueueUser[] = [];
  private rooms: Map<string, ActiveRoom> = new Map();
  private userToRoom: Map<string, string> = new Map(); // socketId -> roomId
  private leavePenalties: Map<string, number> = new Map(); // guestId -> cooldownExpiresAt

  /**
   * Enqueue a user for matchmaking.
   * Returns newly formed ActiveRoom if matched, or null if waiting.
   */
  public enqueue(user: QueueUser): { room: ActiveRoom | null; error?: string } {
    // 1. Check bans
    const banCheck = safetyStore.isBanned(user.guestId, user.ip);
    if (banCheck.banned) {
      return {
        room: null,
        error: `Access Denied: You are suspended from matchmaking (${banCheck.ban?.reason || "Policy violation"}).`,
      };
    }

    // 2. Age Gate requirement for Video mode
    if (user.queueType === "video" && !user.ageConfirmed) {
      return {
        room: null,
        error: "Age Gate Required: You must confirm you are 18+ to enter video matchmaking.",
      };
    }

    // 3. Rate limit / leave penalty check
    const penaltyExpires = this.leavePenalties.get(user.guestId);
    if (penaltyExpires && penaltyExpires > Date.now()) {
      const remainingSeconds = Math.ceil((penaltyExpires - Date.now()) / 1000);
      return {
        room: null,
        error: `Please wait ${remainingSeconds}s before searching again.`,
      };
    }

    // Remove any previous queue entry for this socket or guest
    this.dequeue(user.socketId);

    const queue = user.queueType === "video" ? this.videoQueue : this.gameOnlyQueue;

    // Search for compatible partner (must not be blocked by either party)
    const partnerIdx = queue.findIndex(
      (other) =>
        other.guestId !== user.guestId &&
        !user.blockedGuestIds.includes(other.guestId) &&
        !other.blockedGuestIds.includes(user.guestId)
    );

    if (partnerIdx !== -1) {
      const partner = queue.splice(partnerIdx, 1)[0];
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const room: ActiveRoom = {
        roomId,
        mode: user.queueType,
        p1: partner, // Partner was waiting first
        p2: user,
        createdAt: Date.now(),
      };

      this.rooms.set(roomId, room);
      this.userToRoom.set(partner.socketId, roomId);
      this.userToRoom.set(user.socketId, roomId);

      return { room, error: undefined };
    }

    // No immediate partner found: add to queue
    queue.push(user);
    return { room: null, error: undefined };
  }

  /**
   * Remove user from queues
   */
  public dequeue(socketId: string): void {
    this.videoQueue = this.videoQueue.filter((u) => u.socketId !== socketId);
    this.gameOnlyQueue = this.gameOnlyQueue.filter((u) => u.socketId !== socketId);
  }

  /**
   * Find room by ID
   */
  public getRoom(roomId: string): ActiveRoom | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Find room by socket ID
   */
  public getRoomBySocket(socketId: string): ActiveRoom | undefined {
    const roomId = this.userToRoom.get(socketId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  /**
   * Close a room (called on Next Opponent or disconnect). Takes < 1s.
   * If match is abandoned within 10s of starting, records a short leave penalty.
   */
  public closeRoom(roomId: string, leavingSocketId?: string): { partnerSocketId?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return {};

    let partnerSocketId: string | undefined;
    if (leavingSocketId) {
      partnerSocketId = room.p1.socketId === leavingSocketId ? room.p2.socketId : room.p1.socketId;

      // Leave penalty: rapid leaves (< 8 seconds from pairing)
      if (Date.now() - room.createdAt < 8000) {
        const leavingGuest = room.p1.socketId === leavingSocketId ? room.p1.guestId : room.p2.guestId;
        this.leavePenalties.set(leavingGuest, Date.now() + 15000); // 15s cooldown
      }
    }

    // Clear timers
    if (room.currentBall?.timerTimeout) {
      clearTimeout(room.currentBall.timerTimeout);
    }

    this.userToRoom.delete(room.p1.socketId);
    this.userToRoom.delete(room.p2.socketId);
    this.rooms.delete(roomId);

    return { partnerSocketId };
  }

  /**
   * Clear state for unit testing
   */
  public clear(): void {
    this.videoQueue = [];
    this.gameOnlyQueue = [];
    this.rooms.clear();
    this.userToRoom.clear();
    this.leavePenalties.clear();
  }
}

export const matchmaker = new Matchmaker();

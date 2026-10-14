import { safetyStore } from "./safetyStore";
import { roomStore, type ActiveRoom, type MatchQueueType, type RoomUser } from "./roomStore";

export type { MatchQueueType, ActiveRoom, RoomUser };

export interface QueueUser {
  socketId: string;
  guestId: string;
  ip: string;
  queueType: MatchQueueType;
  ageConfirmed: boolean;
  blockedGuestIds: string[];
  enqueuedAt: number;
  name?: string;
}

class Matchmaker {
  private videoQueue: QueueUser[] = [];
  private gameOnlyQueue: QueueUser[] = [];
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

    // Search for compatible partner (FIFO; must not be blocked by either party; no self-match)
    const partnerIdx = queue.findIndex(
      (other) =>
        other.guestId !== user.guestId &&
        !user.blockedGuestIds.includes(other.guestId) &&
        !other.blockedGuestIds.includes(user.guestId)
    );

    if (partnerIdx !== -1) {
      const partner = queue.splice(partnerIdx, 1)[0];
      const roomId = `room_random_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const p1User: RoomUser = {
        socketId: partner.socketId,
        guestId: partner.guestId,
        name: partner.name || `Player ${partner.guestId.substring(0, 4)}`,
        ip: partner.ip,
        queueType: partner.queueType,
        ageConfirmed: partner.ageConfirmed,
        blockedGuestIds: partner.blockedGuestIds,
      };

      const p2User: RoomUser = {
        socketId: user.socketId,
        guestId: user.guestId,
        name: user.name || `Player ${user.guestId.substring(0, 4)}`,
        ip: user.ip,
        queueType: user.queueType,
        ageConfirmed: user.ageConfirmed,
        blockedGuestIds: user.blockedGuestIds,
      };

      const room: ActiveRoom = {
        roomId,
        type: "random",
        visibility: "public",
        mode: user.queueType,
        format: { maxWickets: 2, maxOvers: 2 },
        p1: p1User,
        p2: p2User,
        p1Ready: true,
        p2Ready: true,
        status: "playing",
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000,
        seriesScore: {
          [partner.guestId]: 0,
          [user.guestId]: 0,
        },
        rematchVotes: new Set(),
        playAgainVotes: new Set(),
        disconnectTimers: new Map(),
      };

      roomStore.registerRandomRoom(room);

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
    return roomStore.getRoom(roomId);
  }

  /**
   * Find room by socket ID
   */
  public getRoomBySocket(socketId: string): ActiveRoom | undefined {
    return roomStore.getRoomBySocket(socketId);
  }

  /**
   * Close a room. If match is abandoned within 8s of starting, records a short leave penalty.
   */
  public closeRoom(roomId: string, leavingSocketId?: string): { partnerSocketId?: string } {
    const room = roomStore.getRoom(roomId);
    if (!room) return {};

    if (leavingSocketId) {
      // Leave penalty: rapid leaves (< 8 seconds from pairing)
      if (Date.now() - room.createdAt < 8000) {
        const leavingGuest = room.p1.socketId === leavingSocketId ? room.p1.guestId : room.p2?.guestId;
        if (leavingGuest) {
          this.leavePenalties.set(leavingGuest, Date.now() + 15000); // 15s cooldown
        }
      }
    }

    return roomStore.closeRoom(roomId, leavingSocketId);
  }

  /**
   * Clear state for unit testing
   */
  public clear(): void {
    this.videoQueue = [];
    this.gameOnlyQueue = [];
    this.leavePenalties.clear();
    roomStore.clear();
  }
}

export const matchmaker = new Matchmaker();

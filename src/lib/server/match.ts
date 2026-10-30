import { getRedis } from "./redis";
import { publishToAbly } from "./ably";
import { isGuestBanned, isOpponentBlocked, recordReport } from "./safety";
import type { GameState, MatchFormat, BallOutcome } from "../game/types";
import {
  createInitialGameState,
  applyBall,
  submitTossCall,
  submitTossPick,
  submitTossDecision,
  startSecondInnings,
  forfeitMatch as engineForfeitMatch,
  DEFAULT_SUDDEN_DEATH_FORMAT,
  CLASSIC_FORMAT,
  DEFAULT_ENDLESS_FORMAT,
  applySuperOverBall,
} from "../game/engine";
import {
  getBotBallPick,
  getBotTossCall,
  getBotTossPick,
  getBotTossDecision,
} from "../game/bot";

export const MATCH_TTL_SECONDS = 1800; // 30 minutes

export interface RedisMatch {
  id: string;
  format: MatchFormat;
  player1: { guestId: string; name: string };
  player2: { guestId: string; name: string };
  gameState: GameState;
  isBot: boolean;
  currentBallMoves: { [guestId: string]: number };
  currentBallIndex: number;
  lastSequenceNumbers?: { [guestId: string]: number };
  tossPicks: { [guestId: string]: number };
  seriesScore?: { [guestId: string]: number };
  gameNumber?: number;
  readyPlayers?: { [guestId: string]: boolean };
  playAgainVotes?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface WaitingQueueEntry {
  guestId: string;
  guestName: string;
  mode: "sudden_death" | "classic" | "endless";
  joinedAt: number;
}

type QueueMode = "sudden_death" | "classic" | "endless";

/**
 * Returns the queue key for a match mode.
 */
function getQueueKey(mode: QueueMode): string {
  return `queue:hand_cricket:${mode}`;
}

/** A queued player counts as gone once neither their join nor a status poll is this recent. */
export const QUEUE_STALE_MS = 10000;

function getHeartbeatKey(guestId: string): string {
  return `queue_alive:${guestId}`;
}

function getClaimedKey(guestId: string): string {
  return `queue_claimed:${guestId}`;
}

/**
 * Records that a queued player is still on the searching screen (refreshed by every status poll).
 */
export async function touchQueueHeartbeat(guestId: string): Promise<void> {
  await getRedis().set(getHeartbeatKey(guestId), Date.now(), { ex: 30 });
}

function parseQueueEntry(item: unknown): WaitingQueueEntry | null {
  try {
    const parsed = typeof item === "string" ? JSON.parse(item) : item;
    return parsed && typeof (parsed as any).guestId === "string" ? (parsed as WaitingQueueEntry) : null;
  } catch {
    return null;
  }
}

/**
 * Pops the first live candidate from the queue. LPOP is atomic, so no two concurrent
 * requests can ever receive the same candidate (prevents double-pairing).
 * Self entries and players who stopped polling (closed tab, went to bot, etc.) are discarded.
 */
export async function popCandidateAtomically(
  redis: any,
  queueKey: string,
  currentGuestId: string,
  maxIdleMs = QUEUE_STALE_MS
): Promise<WaitingQueueEntry | null> {
  while (true) {
    const item = await redis.lpop(queueKey);
    if (!item) return null;
    const parsed = parseQueueEntry(item);
    if (!parsed || parsed.guestId === currentGuestId) continue;

    const heartbeat = Number(await redis.get(getHeartbeatKey(parsed.guestId))) || 0;
    const lastSeen = Math.max(parsed.joinedAt || 0, heartbeat);
    if (Date.now() - lastSeen <= maxIdleMs) return parsed;
  }
}

/**
 * Removes every queue entry belonging to a guest. Returns the removed entry (if any).
 */
async function removeFromQueue(
  redis: any,
  queueKey: string,
  guestId: string
): Promise<WaitingQueueEntry | null> {
  const items: unknown[] = await redis.lrange(queueKey, 0, -1);
  let removed: WaitingQueueEntry | null = null;
  for (const item of items) {
    const parsed = parseQueueEntry(item);
    if (parsed?.guestId !== guestId) continue;
    const count = await redis.lrem(queueKey, 0, typeof item === "string" ? item : JSON.stringify(item));
    if (count > 0) removed = parsed;
  }
  return removed;
}

type QueueResult = {
  status: "matched" | "queued";
  matchId?: string;
  role?: "p1" | "p2";
  opponentName?: string;
  isBot?: boolean;
};

/**
 * Starts a fresh search: clears leftovers from any previous search, then pairs or queues.
 */
export async function joinMatchmakingQueue(
  guestId: string,
  guestName: string,
  mode: QueueMode = "sudden_death"
): Promise<QueueResult> {
  const redis = getRedis();
  const queueKey = getQueueKey(mode);

  // Ban check and cleanup of any old entry of ours (re-search after cancel / bot match, so we
  // never sit in the queue twice) are independent, so they share one round of Redis calls
  const [banStatus] = await Promise.all([
    isGuestBanned(guestId),
    removeFromQueue(redis, queueKey, guestId),
    redis.del(getClaimedKey(guestId)),
    redis.del(`user_match:${guestId}`),
  ]);
  if (banStatus.banned) {
    throw new Error("Access suspended: Your account is temporarily suspended due to community reports.");
  }

  return pairOrEnqueue(guestId, guestName, mode);
}

/**
 * Pairs the guest with a live waiting player, or queues them if there is none.
 *
 * The guest's own queue entry stays put while it looks for a partner, and a candidate is taken
 * with LREM (only one request can remove a given entry). Both players are then claimed with
 * SET NX, lower guestId first so two requests pairing at once can't each grab one claim and
 * stall. Before claims existed, A's and B's polls could each pick the other and create two
 * matches with each player as "p2" in one of them, so both screens waited for the other to
 * call the toss.
 */
async function pairOrEnqueue(
  guestId: string,
  guestName: string,
  mode: QueueMode
): Promise<QueueResult> {
  const redis = getRedis();
  const queueKey = getQueueKey(mode);
  const matchId = `match_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const claim = (id: string) => redis.set(getClaimedKey(id), matchId, { nx: true, ex: 30 });

  const items: unknown[] = await redis.lrange(queueKey, 0, -1);
  let selfQueued = false;
  let waitingPlayer: WaitingQueueEntry | null = null;
  const skipped: WaitingQueueEntry[] = [];
  let pairedByOther = false;
  let attempts = 0;

  // Fetch every candidate's heartbeat in one batch instead of one round-trip per candidate
  const heartbeats = new Map<string, number>();
  const candidateIds = items
    .map((item) => parseQueueEntry(item)?.guestId)
    .filter((id): id is string => !!id && id !== guestId)
    .slice(0, 10);
  await Promise.all(
    candidateIds.map(async (id) => {
      heartbeats.set(id, Number(await redis.get(getHeartbeatKey(id))) || 0);
    })
  );

  for (const item of items) {
    const candidate = parseQueueEntry(item);
    if (!candidate) continue;
    if (candidate.guestId === guestId) {
      selfQueued = true;
      continue;
    }
    if (attempts >= 5) continue;

    const raw = typeof item === "string" ? item : JSON.stringify(item);
    const heartbeat =
      heartbeats.get(candidate.guestId) ?? (Number(await redis.get(getHeartbeatKey(candidate.guestId))) || 0);
    if (Date.now() - Math.max(candidate.joinedAt || 0, heartbeat) > QUEUE_STALE_MS) {
      await redis.lrem(queueKey, 0, raw); // left the search screen without leaving the queue
      continue;
    }
    // Take the candidate out of the queue; 0 means another request took it first
    if (!(await redis.lrem(queueKey, 1, raw))) continue;
    attempts++;

    const [isBlocked, candidateBan] = await Promise.all([
      isOpponentBlocked(guestId, candidate.guestId),
      isGuestBanned(candidate.guestId),
    ]);
    if (candidateBan.banned) continue;
    if (isBlocked) {
      skipped.push(candidate);
      continue;
    }

    const [first, second] = [guestId, candidate.guestId].sort();
    if (!(await claim(first))) {
      if (first === guestId) {
        // Someone else just paired us; their match reaches us through user_match
        skipped.push(candidate);
        pairedByOther = true;
        break;
      }
      continue; // candidate is already in another match: drop its entry
    }
    if (!(await claim(second))) {
      await redis.del(getClaimedKey(first));
      if (second === guestId) {
        skipped.push(candidate);
        pairedByOther = true;
        break;
      }
      continue;
    }
    waitingPlayer = candidate;
    break;
  }
  if (skipped.length > 0) {
    await redis.lpush(queueKey, ...skipped.map((s) => JSON.stringify(s)));
  }
  if (pairedByOther) return { status: "queued" };

  if (waitingPlayer && selfQueued) {
    await removeFromQueue(redis, queueKey, guestId);
  }

  if (waitingPlayer) {
    // Found a match! Pair guest with waitingPlayer
    const format =
      mode === "endless"
        ? DEFAULT_ENDLESS_FORMAT
        : mode === "classic"
        ? CLASSIC_FORMAT
        : DEFAULT_SUDDEN_DEATH_FORMAT;

    // p1 is waiting player, p2 is newly joined player
    const p1 = { guestId: waitingPlayer.guestId, name: waitingPlayer.guestName };
    const p2 = { guestId, name: guestName };

    const gameState = createInitialGameState(format, p1.name, p2.name, "p1");

    const matchData: RedisMatch = {
      id: matchId,
      format,
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

    const p1Found = { matchId, role: "p1", opponentName: p2.name, isBot: false, mode };
    const p2Found = { matchId, role: "p2", opponentName: p1.name, isBot: false, mode };

    // Store the match (30 min TTL) and the quick match-found lookups for the polling fallback
    await Promise.all([
      redis.set(`match:${matchId}`, JSON.stringify(matchData), {
        ex: MATCH_TTL_SECONDS,
      }),
      redis.set(`user_match:${p1.guestId}`, JSON.stringify(p1Found), { ex: 60 }),
      redis.set(`user_match:${p2.guestId}`, JSON.stringify(p2Found), { ex: 60 }),
    ]);

    // Notify both players on their private channels
    await Promise.all([
      publishToAbly(`user:${p1.guestId}`, "match-found", p1Found),
      publishToAbly(`user:${p2.guestId}`, "match-found", p2Found),
    ]);

    return {
      status: "matched",
      matchId,
      role: "p2",
      opponentName: p1.name,
      isBot: false,
    };
  }

  // No waiting player found: add current guest to the queue
  const queueEntry: WaitingQueueEntry = {
    guestId,
    guestName,
    mode,
    joinedAt: Date.now(),
  };

  await Promise.all([
    selfQueued ? Promise.resolve() : redis.rpush(queueKey, JSON.stringify(queueEntry)),
    touchQueueHeartbeat(guestId),
  ]);

  return {
    status: "queued",
  };
}

/**
 * Called by a queued client's status poll. Returns a pending match if one was made for the
 * guest; otherwise refreshes their heartbeat and retries pairing, so two players who queued
 * at the same moment (both saw an empty queue) still find each other.
 */
export async function pollMatchmakingQueue(
  guestId: string,
  guestName: string,
  mode: QueueMode = "sudden_death"
): Promise<QueueResult> {
  const redis = getRedis();
  const queueKey = getQueueKey(mode);

  const consumeMatch = async () => {
    const raw = await redis.get(`user_match:${guestId}`);
    if (!raw) return null;
    await redis.del(`user_match:${guestId}`);
    return { status: "matched" as const, ...(typeof raw === "string" ? JSON.parse(raw) : raw) };
  };

  // One batch: pending match, heartbeat refresh, claim and queue head
  const [pending, , claimed, queueHead] = await Promise.all([
    consumeMatch(),
    touchQueueHeartbeat(guestId),
    redis.get(getClaimedKey(guestId)),
    redis.lrange(queueKey, 0, 1),
  ]);
  if (pending) return pending;

  // Another player claimed us and is creating the match right now: just wait for it
  if (claimed) {
    return (await consumeMatch()) || { status: "queued" };
  }

  // Alone in the queue: nothing to pair with, keep idle polls cheap
  if (queueHead.length === 1 && parseQueueEntry(queueHead[0])?.guestId === guestId) {
    return { status: "queued" };
  }

  // Pair with someone, or re-queue if our entry was dropped (e.g. a network stall made us look stale)
  const result = await pairOrEnqueue(guestId, guestName, mode);
  if (result.status === "queued") return (await consumeMatch()) || result;
  return result;
}

/**
 * Removes a player from the matchmaking queue.
 */
export async function leaveMatchmakingQueue(
  guestId: string,
  mode: QueueMode = "sudden_death"
): Promise<void> {
  const redis = getRedis();
  await Promise.all([
    removeFromQueue(redis, getQueueKey(mode), guestId),
    redis.del(getHeartbeatKey(guestId)),
  ]);
}

/**
 * Creates a server-side bot match for fallback.
 */
export async function createBotMatch(
  guestId: string,
  guestName: string,
  mode: "sudden_death" | "classic" | "endless" = "sudden_death"
): Promise<{
  matchId: string;
  role: "p1";
  opponentName: string;
  isBot: boolean;
}> {
  const redis = getRedis();
  const matchId = `match_bot_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const format =
    mode === "endless"
      ? DEFAULT_ENDLESS_FORMAT
      : mode === "classic"
      ? CLASSIC_FORMAT
      : DEFAULT_SUDDEN_DEATH_FORMAT;


  const botNames = ["BotStriker", "RoboSpinner", "CricketAI", "CyberBowler", "BotBlitz"];
  const botName = botNames[Math.floor(Math.random() * botNames.length)];

  const p1 = { guestId, name: guestName };
  const p2 = { guestId: `bot_${crypto.randomUUID().slice(0, 6)}`, name: botName };

  const gameState = createInitialGameState(format, p1.name, p2.name, "p1");

  const matchData: RedisMatch = {
    id: matchId,
    format,
    player1: p1,
    player2: p2,
    gameState,
    isBot: true,
    currentBallMoves: {},
    currentBallIndex: 0,
    tossPicks: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await redis.set(`match:${matchId}`, JSON.stringify(matchData), {
    ex: MATCH_TTL_SECONDS,
  });

  return {
    matchId,
    role: "p1",
    opponentName: p2.name,
    isBot: true,
  };
}

/**
 * Retrieves match data from Redis.
 */
export async function getMatch(matchId: string): Promise<RedisMatch | null> {
  const redis = getRedis();
  const raw = await redis.get<RedisMatch | string>(`match:${matchId}`);
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

const MATCH_LOCK_TTL_MS = 5000;
const MATCH_LOCK_WAIT_MS = 8000;

/**
 * Runs a match update while holding a per-match Redis lock. Every handler reads the whole
 * match, changes it and writes it back, so two requests at the same moment (both players
 * locking a pick as the turn clock hits 0) would otherwise overwrite each other's pick and
 * the ball would never resolve.
 */
async function withMatchLock<T>(matchId: string, fn: () => Promise<T>): Promise<T> {
  const redis = getRedis();
  const lockKey = `lock:match:${matchId}`;
  const token = crypto.randomUUID();
  const deadline = Date.now() + MATCH_LOCK_WAIT_MS;

  while (!(await redis.set(lockKey, token, { nx: true, px: MATCH_LOCK_TTL_MS }))) {
    if (Date.now() > deadline) throw new Error("Match is busy, please retry");
    await new Promise((resolve) => setTimeout(resolve, 25 + Math.random() * 50));
  }

  try {
    return await fn();
  } finally {
    // Only release our own lock (it may have expired and been taken by another request)
    if ((await redis.get(lockKey)) === token) await redis.del(lockKey);
  }
}

function lockedByMatch<A extends [string, ...any[]], R>(
  fn: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
  return (...args: A) => withMatchLock(args[0], () => fn(...args));
}

export const handleTossAction = lockedByMatch(handleTossActionUnlocked);
export const handleStartSecondInnings = lockedByMatch(handleStartSecondInningsUnlocked);
export const handleBallMove = lockedByMatch(handleBallMoveUnlocked);
export const handleForfeit = lockedByMatch(handleForfeitUnlocked);
export const handleReadyConfirm = lockedByMatch(handleReadyConfirmUnlocked);
export const handleRematch = lockedByMatch(handleRematchUnlocked);

/**
 * Saves updated match data to Redis with TTL refresh.
 */
export async function saveMatch(match: RedisMatch): Promise<void> {
  const redis = getRedis();
  match.updatedAt = Date.now();
  await redis.set(`match:${match.id}`, JSON.stringify(match), {
    ex: MATCH_TTL_SECONDS,
  });
}

/**
 * Submits a toss action (call, pick, or decision) and resolves authoritatively.
 */
async function handleTossActionUnlocked(
  matchId: string,
  guestId: string,
  action:
    | { type: "call"; value: "odd" | "even" }
    | { type: "pick"; value: number }
    | { type: "decision"; value: "bat" | "bowl" },
  seq?: number
): Promise<{ success: boolean; gameState: GameState }> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");

  const isP1 = match.player1.guestId === guestId;
  const isP2 = match.player2.guestId === guestId;
  if (!isP1 && !isP2) throw new Error("Unauthorized guest for match");

  // Monotonic sequence verification (reject duplicate or out-of-order moves)
  if (seq !== undefined) {
    if (!match.lastSequenceNumbers) match.lastSequenceNumbers = {};
    const prevSeq = match.lastSequenceNumbers[guestId] ?? -1;
    if (seq <= prevSeq) {
      throw new Error(`Duplicate or out-of-order sequence number: ${seq} <= ${prevSeq}`);
    }
    match.lastSequenceNumbers[guestId] = seq;
  }

  const playerId = isP1 ? "p1" : "p2";
  let state = match.gameState;

  if (action.type === "call") {
    if (state.tossCaller !== playerId) {
      throw new Error("Only toss caller can call odd/even");
    }
    state = submitTossCall(state, action.value);

    // If opponent is a bot, bot pre-picks toss number
    if (match.isBot) {
      const botPick = getBotTossPick();
      match.tossPicks[match.player2.guestId] = botPick;
    }

    match.gameState = state;
    await saveMatch(match);

    await publishToAbly(`match:${matchId}`, "toss-call-submitted", {
      call: action.value,
      gameState: state,
    });

    return { success: true, gameState: state };
  }

  if (action.type === "pick") {
    // Record pick
    match.tossPicks[guestId] = action.value;
    state = submitTossPick(state, playerId, action.value);

    // If bot opponent, submit bot's toss pick to game state if not already in state
    if (match.isBot && state.tossPicks["p2"] === undefined) {
      const botPick = match.tossPicks[match.player2.guestId] ?? getBotTossPick();
      match.tossPicks[match.player2.guestId] = botPick;
      state = submitTossPick(state, "p2", botPick);
    }

    // If both picks are submitted and bot won toss, bot makes decision
    if (state.phase === "toss_decision" && match.isBot && state.tossWinner === "p2") {
      const botDecision = getBotTossDecision();
      state = submitTossDecision(state, botDecision);
    }

    match.gameState = state;
    await saveMatch(match);

    await publishToAbly(`match:${matchId}`, "toss-pick-submitted", {
      phase: state.phase,
      tossWinner: state.tossWinner,
      tossDecision: state.tossDecision,
      tossPicks: state.phase === "toss_decision" || state.phase === "innings_1" ? match.tossPicks : undefined,
      gameState: state,
    });

    return { success: true, gameState: state };
  }

  if (action.type === "decision") {
    if (state.tossWinner !== playerId) {
      throw new Error("Only toss winner can decide bat/bowl");
    }
    state = submitTossDecision(state, action.value);
    match.gameState = state;
    await saveMatch(match);

    await publishToAbly(`match:${matchId}`, "toss-decision-submitted", {
      decision: action.value,
      gameState: state,
    });

    return { success: true, gameState: state };
  }

  return { success: false, gameState: state };
}

/**
 * Starts second innings from innings_break.
 */
async function handleStartSecondInningsUnlocked(
  matchId: string,
  guestId: string
): Promise<{ success: boolean; gameState: GameState }> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");

  if (match.gameState.phase !== "innings_break") {
    return { success: true, gameState: match.gameState };
  }

  const nextState = startSecondInnings(match.gameState);
  match.gameState = nextState;
  await saveMatch(match);

  await publishToAbly(`match:${matchId}`, "second-innings-started", {
    gameState: nextState,
  });

  return { success: true, gameState: nextState };
}

/**
 * Submits a secret ball delivery pick (1-6) and resolves when both picks are in.
 */
async function handleBallMoveUnlocked(
  matchId: string,
  guestId: string,
  ballIndex: number,
  pick: number,
  seq?: number
): Promise<{
  status: "waiting_opponent" | "resolved";
  outcome?: BallOutcome;
  gameState: GameState;
  p1Pick?: number;
  p2Pick?: number;
}> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");

  const state = match.gameState;
  if (state.phase !== "innings_1" && state.phase !== "innings_2" && state.phase !== "super_over") {
    throw new Error(`Cannot submit ball move in phase ${state.phase}`);
  }

  const isP1 = match.player1.guestId === guestId;
  const isP2 = match.player2.guestId === guestId;
  if (!isP1 && !isP2) throw new Error("Unauthorized guest for match");

  // Monotonic sequence verification (reject duplicate or out-of-order moves)
  if (seq !== undefined) {
    if (!match.lastSequenceNumbers) match.lastSequenceNumbers = {};
    const prevSeq = match.lastSequenceNumbers[guestId] ?? -1;
    if (seq <= prevSeq) {
      throw new Error(`Duplicate or out-of-order sequence number: ${seq} <= ${prevSeq}`);
    }
    match.lastSequenceNumbers[guestId] = seq;
  }

  // Idempotency check: ignore duplicate submission for the same ball
  if (match.currentBallIndex === ballIndex && match.currentBallMoves[guestId] !== undefined) {
    return {
      status: "waiting_opponent",
      gameState: state,
    };
  }

  // Store player's pick
  match.currentBallMoves[guestId] = pick;

  // If playing vs Bot, bot immediately makes pick server-side
  if (match.isBot) {
    const botPick = getBotBallPick(state);
    match.currentBallMoves[match.player2.guestId] = botPick;
  }

  const p1Pick = match.currentBallMoves[match.player1.guestId];
  const p2Pick = match.currentBallMoves[match.player2.guestId];

  // If both players have picked, resolve authoritative ball delivery!
  if (p1Pick !== undefined && p2Pick !== undefined) {
    let nextState: GameState;
    let outcome: BallOutcome;

    if (state.phase === "super_over") {
      const res = applySuperOverBall(state, p1Pick, p2Pick);
      nextState = res.nextState;
      outcome = res.outcome;
    } else {
      const activeInnings = state.currentInnings === 1 ? state.innings1 : state.innings2!;
      const isP1Batting = activeInnings.battingPlayer === "p1";

      const batterPick = isP1Batting ? p1Pick : p2Pick;
      const bowlerPick = isP1Batting ? p2Pick : p1Pick;

      const res = applyBall(state, batterPick, bowlerPick);
      nextState = res.nextState;
      outcome = res.outcome;
    }

    // Reset ball moves and increment index
    match.currentBallMoves = {};
    match.currentBallIndex += 1;
    match.gameState = nextState;

    await saveMatch(match);

    const activeInnings = state.currentInnings === 1 ? state.innings1 : (state.innings2 || state.innings1);
    const isP1Batting = activeInnings.battingPlayer === "p1";

    // Broadcast authoritative outcome & revealed picks to both players
    await publishToAbly(`match:${matchId}`, "ball-resolved", {
      ballIndex,
      p1Pick,
      p2Pick,
      batterPick: state.phase === "super_over" ? p1Pick : isP1Batting ? p1Pick : p2Pick,
      bowlerPick: state.phase === "super_over" ? p2Pick : isP1Batting ? p2Pick : p1Pick,
      outcome,
      gameState: nextState,
    });

    return {
      status: "resolved",
      p1Pick,
      p2Pick,
      outcome,
      gameState: nextState,
    };
  }

  // Only one pick in: save state & broadcast locked indicator (WITHOUT revealing pick)
  await saveMatch(match);

  await publishToAbly(`match:${matchId}`, "player-locked", {
    lockedGuestId: guestId,
    ballIndex,
  });

  return {
    status: "waiting_opponent",
    gameState: state,
  };
}

/**
 * Handles match forfeit (disconnect, rage quit, or manual forfeit).
 */
async function handleForfeitUnlocked(
  matchId: string,
  forfeitingGuestId: string,
  reason: string = "Opponent left the match"
): Promise<{ success: boolean; gameState: GameState }> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");

  if (match.gameState.phase === "match_ended") {
    return { success: true, gameState: match.gameState };
  }

  const isP1 = match.player1.guestId === forfeitingGuestId;
  const forfeitingPlayerId = isP1 ? "p1" : "p2";

  const nextState = engineForfeitMatch(match.gameState, forfeitingPlayerId, reason);
  match.gameState = nextState;
  await saveMatch(match);

  await publishToAbly(`match:${matchId}`, "match-forfeited", {
    forfeitingGuestId,
    reason,
    gameState: nextState,
  });

  return { success: true, gameState: nextState };
}

/**
 * Handles report submission.
 * Strictly metadata-only (zero video/snapshot storage).
 * Checks 3-report 24h threshold for auto-ban and supports optional opponent blocking.
 */
export async function handleReport(
  matchId: string,
  reporterGuestId: string,
  reason: string,
  blockOpponent = false
): Promise<{ success: boolean; autoBanned: boolean }> {
  let reportedGuestId = "unknown";
  try {
    const match = await getMatch(matchId);
    if (match) {
      reportedGuestId =
        match.player1.guestId === reporterGuestId
          ? match.player2.guestId
          : match.player1.guestId;
    }
  } catch {}

  const result = await recordReport({
    reporterGuestId,
    reportedGuestId,
    roomId: matchId,
    reason,
    blockOpponent,
  });

  return { success: true, autoBanned: result.autoBanned };
}

/**
 * Mutual 5-second Ready-Check confirmation.
 */
async function handleReadyConfirmUnlocked(
  matchId: string,
  guestId: string
): Promise<{ success: boolean; bothReady: boolean }> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");

  if (!match.readyPlayers) match.readyPlayers = {};
  match.readyPlayers[guestId] = true;

  const p1Ready = match.readyPlayers[match.player1.guestId] || match.isBot;
  const p2Ready = match.readyPlayers[match.player2.guestId] || match.isBot;
  const bothReady = !!(p1Ready && p2Ready);

  await saveMatch(match);

  if (bothReady) {
    await publishToAbly(`match:${matchId}`, "match-ready-success", {
      matchId,
      message: "Both players confirmed ready! Starting match...",
    });
  }

  return { success: true, bothReady };
}

/**
 * Endless Series Rematch handler with alternating roles.
 */
async function handleRematchUnlocked(
  matchId: string,
  guestId: string
): Promise<{
  success: boolean;
  rematchStarted: boolean;
  seriesScore: { [guestId: string]: number };
  gameNumber: number;
  gameState?: GameState;
}> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");

  if (!match.seriesScore) {
    match.seriesScore = {
      [match.player1.guestId]: 0,
      [match.player2.guestId]: 0,
    };
  }

  if (!match.playAgainVotes) match.playAgainVotes = [];
  if (!match.playAgainVotes.includes(guestId)) {
    match.playAgainVotes.push(guestId);
  }

  const bothVoted =
    match.isBot ||
    (match.playAgainVotes.includes(match.player1.guestId) &&
      match.playAgainVotes.includes(match.player2.guestId));

  if (bothVoted) {
    match.playAgainVotes = [];
    match.gameNumber = (match.gameNumber || 1) + 1;

    // Update series score from ended game once when starting rematch
    if (match.gameState.phase === "match_ended" && match.gameState.winner) {
      if (match.gameState.winner === "p1") {
        match.seriesScore[match.player1.guestId] = (match.seriesScore[match.player1.guestId] || 0) + 1;
      } else if (match.gameState.winner === "p2") {
        match.seriesScore[match.player2.guestId] = (match.seriesScore[match.player2.guestId] || 0) + 1;
      }
    }

    // Role alternation: in even games, p2 is toss caller; in odd games, p1 is toss caller
    const tossCallerRole = match.gameNumber % 2 !== 0 ? "p1" : "p2";
    let nextGame = createInitialGameState(
      match.format,
      match.player1.name,
      match.player2.name,
      tossCallerRole
    );

    match.gameState = nextGame;
    match.currentBallMoves = {};
    match.currentBallIndex = 0;
    match.tossPicks = {};

    // If bot opponent is caller in rematch, bot automatically makes its toss call and secret pick
    if (match.isBot && tossCallerRole === "p2") {
      const botCall = getBotTossCall();
      nextGame = submitTossCall(nextGame, botCall);
      const botPick = getBotTossPick();
      match.tossPicks[match.player2.guestId] = botPick;
      nextGame = submitTossPick(nextGame, "p2", botPick);
      match.gameState = nextGame;
    }

    await saveMatch(match);

    await publishToAbly(`match:${matchId}`, "match-rematch-start", {
      matchId,
      seriesScore: match.seriesScore,
      gameNumber: match.gameNumber,
      gameState: nextGame,
      tossCaller: tossCallerRole,
    });

    return {
      success: true,
      rematchStarted: true,
      seriesScore: match.seriesScore,
      gameNumber: match.gameNumber,
      gameState: nextGame,
    };
  }

  await saveMatch(match);

  return {
    success: true,
    rematchStarted: false,
    seriesScore: match.seriesScore,
    gameNumber: match.gameNumber || 1,
  };
}

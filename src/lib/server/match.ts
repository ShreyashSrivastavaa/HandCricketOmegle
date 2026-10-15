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
  createdAt: number;
  updatedAt: number;
}

export interface WaitingQueueEntry {
  guestId: string;
  guestName: string;
  mode: "sudden_death" | "classic";
  joinedAt: number;
}

/**
 * Returns the queue key for a match mode.
 */
function getQueueKey(mode: "sudden_death" | "classic"): string {
  return `queue:hand_cricket:${mode}`;
}

/**
 * Atomically pops a waiting candidate from the Redis queue using Lua.
 * Guarantees no two concurrent join requests can pop the same candidate (prevents double-pairing).
 */
export async function popCandidateAtomically(
  redis: any,
  queueKey: string,
  currentGuestId: string,
  maxAgeMs = 25000
): Promise<WaitingQueueEntry | null> {
  const now = Date.now();
  const script = `
local queueKey = KEYS[1]
local currentGuestId = ARGV[1]
local maxAgeMs = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

while true do
  local item = redis.call('LPOP', queueKey)
  if not item then
    return nil
  end
  local ok, decoded = pcall(cjson.decode, item)
  if ok and decoded and decoded.guestId then
    if decoded.guestId ~= currentGuestId and (now - decoded.joinedAt) <= maxAgeMs then
      return item
    end
  end
end
`;

  try {
    if (typeof redis.eval === "function") {
      const result = await redis.eval(
        script,
        [queueKey],
        [currentGuestId, String(maxAgeMs), String(now)]
      );
      if (result) {
        return typeof result === "string" ? JSON.parse(result) : result;
      }
      return null;
    }
  } catch (err) {
    console.warn("[Matchmaking] Lua atomic pop error, falling back to atomic loop:", err);
  }

  // Safe LPOP loop fallback
  while (true) {
    const item = await redis.lpop(queueKey);
    if (!item) return null;
    const parsed = typeof item === "string" ? JSON.parse(item) : item;
    if (
      parsed &&
      parsed.guestId !== currentGuestId &&
      now - parsed.joinedAt <= maxAgeMs
    ) {
      return parsed;
    }
  }
}

/**
 * Atomically attempts to pair the guest with a waiting player or queues them.
 */
export async function joinMatchmakingQueue(
  guestId: string,
  guestName: string,
  mode: "sudden_death" | "classic" = "sudden_death"
): Promise<{
  status: "matched" | "queued";
  matchId?: string;
  role?: "p1" | "p2";
  opponentName?: string;
  isBot?: boolean;
}> {
  const redis = getRedis();
  const queueKey = getQueueKey(mode);

  // 1. Verify guest is not suspended
  const banStatus = await isGuestBanned(guestId);
  if (banStatus.banned) {
    throw new Error("Access suspended: Your account is temporarily suspended due to community reports.");
  }

  // 2. Atomically pop a candidate from queue
  let waitingPlayer = await popCandidateAtomically(redis, queueKey, guestId, 25000);

  // 3. Ensure candidate is not blocked or banned
  if (waitingPlayer) {
    const [isBlocked, candidateBan] = await Promise.all([
      isOpponentBlocked(guestId, waitingPlayer.guestId),
      isGuestBanned(waitingPlayer.guestId),
    ]);

    if (isBlocked || candidateBan.banned) {
      // Discard invalid candidate and attempt next
      waitingPlayer = await popCandidateAtomically(redis, queueKey, guestId, 25000);
    }
  }

  if (waitingPlayer) {
    // Found a match! Pair guest with waitingPlayer
    const matchId = `match_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
    const format = mode === "classic" ? CLASSIC_FORMAT : DEFAULT_SUDDEN_DEATH_FORMAT;

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

    // Store match with 30 min TTL
    await redis.set(`match:${matchId}`, JSON.stringify(matchData), {
      ex: MATCH_TTL_SECONDS,
    });

    // Notify waiting player on their private channel
    await publishToAbly(`user:${p1.guestId}`, "match-found", {
      matchId,
      role: "p1",
      opponentName: p2.name,
      isBot: false,
      mode,
    });

    // Notify current player on their private channel
    await publishToAbly(`user:${p2.guestId}`, "match-found", {
      matchId,
      role: "p2",
      opponentName: p1.name,
      isBot: false,
      mode,
    });

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

  await redis.rpush(queueKey, JSON.stringify(queueEntry));

  return {
    status: "queued",
  };
}

/**
 * Removes a player from the matchmaking queue.
 */
export async function leaveMatchmakingQueue(
  guestId: string,
  mode: "sudden_death" | "classic" = "sudden_death"
): Promise<void> {
  const redis = getRedis();
  const queueKey = getQueueKey(mode);

  const items = await redis.lrange<WaitingQueueEntry | string>(queueKey, 0, -1);
  for (const item of items) {
    const parsed: WaitingQueueEntry =
      typeof item === "string" ? JSON.parse(item) : item;
    if (parsed.guestId === guestId) {
      await redis.lrem(queueKey, 1, typeof item === "string" ? item : JSON.stringify(item));
      break;
    }
  }
}

/**
 * Creates a server-side bot match for fallback.
 */
export async function createBotMatch(
  guestId: string,
  guestName: string,
  mode: "sudden_death" | "classic" = "sudden_death"
): Promise<{
  matchId: string;
  role: "p1";
  opponentName: string;
  isBot: boolean;
}> {
  const redis = getRedis();
  const matchId = `match_bot_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const format = mode === "classic" ? CLASSIC_FORMAT : DEFAULT_SUDDEN_DEATH_FORMAT;

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
export async function handleTossAction(
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

    // If bot opponent, submit bot's toss pick if not already submitted
    if (match.isBot && match.tossPicks[match.player2.guestId] === undefined) {
      const botPick = getBotTossPick();
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
export async function handleStartSecondInnings(
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
export async function handleBallMove(
  matchId: string,
  guestId: string,
  ballIndex: number,
  pick: number,
  seq?: number
): Promise<{
  status: "waiting_opponent" | "resolved";
  outcome?: BallOutcome;
  gameState: GameState;
}> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");

  const state = match.gameState;
  if (state.phase !== "innings_1" && state.phase !== "innings_2") {
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
    const activeInnings = state.currentInnings === 1 ? state.innings1 : state.innings2!;
    const isP1Batting = activeInnings.battingPlayer === "p1";

    const batterPick = isP1Batting ? p1Pick : p2Pick;
    const bowlerPick = isP1Batting ? p2Pick : p1Pick;

    const { nextState, outcome } = applyBall(state, batterPick, bowlerPick);

    // Reset ball moves and increment index
    match.currentBallMoves = {};
    match.currentBallIndex += 1;
    match.gameState = nextState;

    await saveMatch(match);

    // Broadcast authoritative outcome & revealed picks to both players
    await publishToAbly(`match:${matchId}`, "ball-resolved", {
      ballIndex,
      p1Pick,
      p2Pick,
      batterPick,
      bowlerPick,
      outcome,
      gameState: nextState,
    });

    return {
      status: "resolved",
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
export async function handleForfeit(
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

import type {
  GameState,
  MatchFormat,
  PlayerId,
  TossCall,
  TossDecision,
  BallOutcome,
  InningsState,
} from "./types.ts";

/**
 * Creates the initial game state with the given format and player names.
 */
export function createInitialGameState(
  format: MatchFormat = { maxWickets: 2, maxOvers: 2 },
  player1Name: string = "You",
  player2Name: string = "Bot",
  tossCaller: PlayerId = "p1"
): GameState {
  return {
    format,
    phase: "toss_call",
    player1Name,
    player2Name,
    tossCaller,
    tossCall: null,
    tossPicks: {},
    tossWinner: null,
    tossDecision: null,
    currentInnings: 1,
    innings1: {
      battingPlayer: "p1", // Will be set after toss
      bowlingPlayer: "p2",
      score: 0,
      wickets: 0,
      balls: 0,
      overHistory: [],
      currentOver: [],
    },
    innings2: null,
    lastOutcome: null,
    winner: null,
    resultSummary: null,
  };
}

/**
 * Submits the caller's odd/even call.
 */
export function submitTossCall(state: GameState, call: TossCall): GameState {
  if (state.phase !== "toss_call") {
    throw new Error(`Cannot submit toss call in phase ${state.phase}`);
  }
  return {
    ...state,
    tossCall: call,
    phase: "toss_pick",
  };
}

/**
 * Submits a player's number pick (1-6) for the toss.
 * When both picks are present, computes the toss winner.
 */
export function submitTossPick(
  state: GameState,
  playerId: PlayerId,
  pick: number
): GameState {
  if (state.phase !== "toss_pick") {
    throw new Error(`Cannot submit toss pick in phase ${state.phase}`);
  }
  if (pick < 1 || pick > 6 || !Number.isInteger(pick)) {
    throw new Error(`Invalid pick ${pick}. Must be an integer between 1 and 6.`);
  }

  const updatedPicks = {
    ...state.tossPicks,
    [playerId]: pick,
  };

  // If both players have picked, calculate toss winner
  const p1Pick = updatedPicks.p1;
  const p2Pick = updatedPicks.p2;

  if (p1Pick !== undefined && p2Pick !== undefined) {
    const sum = p1Pick + p2Pick;
    const isSumOdd = sum % 2 !== 0;
    const callerWon =
      (state.tossCall === "odd" && isSumOdd) ||
      (state.tossCall === "even" && !isSumOdd);

    const tossWinner: PlayerId = callerWon
      ? state.tossCaller
      : state.tossCaller === "p1"
      ? "p2"
      : "p1";

    return {
      ...state,
      tossPicks: updatedPicks,
      tossWinner,
      phase: "toss_decision",
    };
  }

  return {
    ...state,
    tossPicks: updatedPicks,
  };
}

/**
 * Toss winner chooses to bat or bowl.
 * Sets batting and bowling roles and advances game to innings_1.
 */
export function submitTossDecision(
  state: GameState,
  decision: TossDecision
): GameState {
  if (state.phase !== "toss_decision" || !state.tossWinner) {
    throw new Error(`Cannot submit toss decision in phase ${state.phase}`);
  }

  const otherPlayer: PlayerId = state.tossWinner === "p1" ? "p2" : "p1";
  const battingPlayer: PlayerId = decision === "bat" ? state.tossWinner : otherPlayer;
  const bowlingPlayer: PlayerId = decision === "bowl" ? state.tossWinner : otherPlayer;

  return {
    ...state,
    tossDecision: decision,
    phase: "innings_1",
    currentInnings: 1,
    innings1: {
      battingPlayer,
      bowlingPlayer,
      score: 0,
      wickets: 0,
      balls: 0,
      overHistory: [],
      currentOver: [],
    },
    innings2: null,
  };
}

/**
 * Starts the second innings from innings_break.
 */
export function startSecondInnings(state: GameState): GameState {
  if (state.phase !== "innings_break" || !state.innings2) {
    throw new Error("Cannot start second innings outside innings_break");
  }
  return {
    ...state,
    phase: "innings_2",
    currentInnings: 2,
    lastOutcome: null,
  };
}

/**
 * Pure function: Executes a single ball delivery.
 * Authoritatively calculates runs, wickets, over completions, innings transitions and match result.
 */
export function applyBall(
  state: GameState,
  batterPick: number,
  bowlerPick: number
): { nextState: GameState; outcome: BallOutcome } {
  if (state.phase !== "innings_1" && state.phase !== "innings_2") {
    throw new Error(`Cannot apply ball during phase: ${state.phase}`);
  }

  if (
    batterPick < 1 ||
    batterPick > 6 ||
    bowlerPick < 1 ||
    bowlerPick > 6 ||
    !Number.isInteger(batterPick) ||
    !Number.isInteger(bowlerPick)
  ) {
    throw new Error(
      `Invalid picks: batter=${batterPick}, bowler=${bowlerPick}. Must be integers 1-6.`
    );
  }

  const inningsNumber = state.currentInnings;
  const activeInnings = inningsNumber === 1 ? state.innings1 : state.innings2!;
  const battingPlayerName =
    activeInnings.battingPlayer === "p1" ? state.player1Name : state.player2Name;

  const isWicket = batterPick === bowlerPick;
  const runsScored = isWicket ? 0 : batterPick;

  const newWickets = activeInnings.wickets + (isWicket ? 1 : 0);
  const newScore = activeInnings.score + runsScored;
  const newBalls = activeInnings.balls + 1;

  const ballInOver = ((newBalls - 1) % 6) + 1;
  const overIndex = Math.floor((newBalls - 1) / 6);
  const isOverComplete = ballInOver === 6;

  let commentary = "";
  if (isWicket) {
    commentary = `OUT! Both picked ${batterPick}. Wicket falls!`;
  } else if (runsScored === 6) {
    commentary = `SIX! ${battingPlayerName} smashes a maximum!`;
  } else if (runsScored === 4) {
    commentary = `FOUR! Clean boundary picked!`;
  } else {
    commentary = `${runsScored} run${runsScored === 1 ? "" : "s"} scored.`;
  }

  const maxTotalBalls = state.format.maxOvers * 6;
  let isInningsComplete = false;
  let isMatchComplete = false;
  let nextPhase: GameState["phase"] = state.phase;
  let winner: GameState["winner"] = null;
  let resultSummary: string | null = null;
  let updatedInnings2 = state.innings2;

  // Innings 1 Completion Check
  if (inningsNumber === 1) {
    const isAllOut = newWickets >= state.format.maxWickets;
    const areOversCompleted = newBalls >= maxTotalBalls;

    if (isAllOut || areOversCompleted) {
      isInningsComplete = true;
      nextPhase = "innings_break";
      const target = newScore + 1;

      updatedInnings2 = {
        battingPlayer: activeInnings.bowlingPlayer,
        bowlingPlayer: activeInnings.battingPlayer,
        score: 0,
        wickets: 0,
        balls: 0,
        overHistory: [],
        currentOver: [],
        target,
      };
    }
  } else {
    // Innings 2 (Chase) Check
    const target = activeInnings.target!;
    const isTargetChased = newScore >= target;
    const isAllOut = newWickets >= state.format.maxWickets;
    const areOversCompleted = newBalls >= maxTotalBalls;

    const chasingPlayerName =
      activeInnings.battingPlayer === "p1" ? state.player1Name : state.player2Name;
    const defendingPlayerName =
      activeInnings.bowlingPlayer === "p1" ? state.player1Name : state.player2Name;

    if (isTargetChased) {
      // Batter won the chase
      isInningsComplete = true;
      isMatchComplete = true;
      nextPhase = "match_ended";
      winner = activeInnings.battingPlayer;
      const wicketsLeft = state.format.maxWickets - newWickets;
      resultSummary = `${chasingPlayerName} won by ${wicketsLeft} wicket${
        wicketsLeft === 1 ? "" : "s"
      }!`;
    } else if (isAllOut || areOversCompleted) {
      // Innings 2 ended without reaching target
      isInningsComplete = true;
      isMatchComplete = true;
      nextPhase = "match_ended";

      if (newScore === state.innings1.score) {
        winner = "tie";
        resultSummary = "Match Tied! Scores are level.";
      } else {
        winner = activeInnings.bowlingPlayer;
        const runsMargin = state.innings1.score - newScore;
        resultSummary = `${defendingPlayerName} won by ${runsMargin} run${
          runsMargin === 1 ? "" : "s"
        }!`;
      }
    }
  }

  const outcome: BallOutcome = {
    innings: inningsNumber,
    overIndex,
    ballInOver,
    totalBallsInInnings: newBalls,
    batterPick,
    bowlerPick,
    isWicket,
    runsScored,
    isOverComplete,
    isInningsComplete,
    isMatchComplete,
    commentary,
  };

  // Build the new currentOver & overHistory
  const updatedCurrentOver = [...activeInnings.currentOver, outcome];
  let newCurrentOver = updatedCurrentOver;
  let newOverHistory = activeInnings.overHistory;

  if (isOverComplete) {
    newOverHistory = [...activeInnings.overHistory, updatedCurrentOver];
    newCurrentOver = [];
  }

  const updatedActiveInnings: InningsState = {
    ...activeInnings,
    score: newScore,
    wickets: newWickets,
    balls: newBalls,
    currentOver: newCurrentOver,
    overHistory: newOverHistory,
  };

  const nextState: GameState = {
    ...state,
    phase: nextPhase,
    innings1: inningsNumber === 1 ? updatedActiveInnings : state.innings1,
    innings2: inningsNumber === 2 ? updatedActiveInnings : updatedInnings2,
    lastOutcome: outcome,
    winner: winner ?? state.winner,
    resultSummary: resultSummary ?? state.resultSummary,
  };

  return { nextState, outcome };
}

/**
 * Format total balls into cricket overs display format (e.g. 7 balls -> "1.1").
 */
export function formatOvers(balls: number): string {
  const overs = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return `${overs}.${remainingBalls}`;
}

/**
 * Runs needed by chasing team in Innings 2.
 */
export function getRequiredRuns(state: GameState): number {
  if (state.currentInnings !== 2 || !state.innings2 || !state.innings2.target) {
    return 0;
  }
  return Math.max(0, state.innings2.target - state.innings2.score);
}

/**
 * Legal deliveries remaining in the active innings.
 */
export function getRemainingBalls(state: GameState): number {
  const activeInnings = state.currentInnings === 1 ? state.innings1 : state.innings2;
  if (!activeInnings) return 0;
  const maxBalls = state.format.maxOvers * 6;
  return Math.max(0, maxBalls - activeInnings.balls);
}

/**
 * Required Run Rate per over in Innings 2.
 */
export function getRequiredRunRate(state: GameState): number | null {
  if (state.currentInnings !== 2 || !state.innings2) return null;
  const ballsLeft = getRemainingBalls(state);
  const runsLeft = getRequiredRuns(state);
  if (ballsLeft <= 0) return null;
  return Number(((runsLeft / ballsLeft) * 6).toFixed(2));
}

/**
 * Current Run Rate per over.
 */
export function getCurrentRunRate(state: GameState): number {
  const activeInnings = state.currentInnings === 1 ? state.innings1 : state.innings2;
  if (!activeInnings || activeInnings.balls === 0) return 0;
  return Number(((activeInnings.score / activeInnings.balls) * 6).toFixed(2));
}

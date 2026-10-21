export type WicketsOption = 1 | 2 | 3;
export type OversOption = 0 | 1 | 2 | 3;
export type MatchMode = "sudden_death" | "classic" | "endless";

export interface ModeVariant {
  id: string;
  label: string;
  wickets: number;
}

export interface ModeConfig {
  id: MatchMode;
  wickets: number;
  overs: number; // 0 for endless (no limit)
  endless: boolean;
  label: string;
  description: string;
  badge?: string;
  variants?: ModeVariant[];
}

export const MODE_CONFIGS: Record<MatchMode, ModeConfig> = {
  sudden_death: {
    id: "sudden_death",
    wickets: 1,
    overs: 2,
    endless: false,
    label: "Sudden Death",
    description: "Instant knockout. Innings ends on the very first wicket!",
    badge: "DEFAULT",
  },
  classic: {
    id: "classic",
    wickets: 2,
    overs: 2,
    endless: false,
    label: "Classic Match",
    description: "12 balls total with 2 wickets. Strategic chase pacing.",
  },
  endless: {
    id: "endless",
    wickets: 1,
    overs: 0,
    endless: true,
    label: "Endless Mode",
    description: "No over limit! Bat until you are out. Higher total wins; tie goes to super over.",
    badge: "NEW",
    variants: [
      { id: "standard", label: "1 Wicket (Default)", wickets: 1 },
      { id: "pro", label: "3 Wickets (Endless Pro)", wickets: 3 },
    ],
  },
};

export interface MatchFormat {
  mode?: MatchMode;
  maxWickets: number;
  maxOvers: number; // 0 or Infinity for endless
  isEndless?: boolean;
  endlessVariant?: "standard" | "pro";
}

export type PlayerId = "p1" | "p2";
export type TossCall = "odd" | "even";
export type TossDecision = "bat" | "bowl";
export type Role = "batting" | "bowling";

export interface BallOutcome {
  innings: 1 | 2;
  overIndex: number;
  ballInOver: number; // 1..6
  totalBallsInInnings: number;
  batterPick: number;
  bowlerPick: number;
  isWicket: boolean;
  runsScored: number;
  isOverComplete: boolean;
  isInningsComplete: boolean;
  isMatchComplete: boolean;
  commentary: string;
  isSuperOver?: boolean;
}

export interface InningsState {
  battingPlayer: PlayerId;
  bowlingPlayer: PlayerId;
  score: number;
  wickets: number;
  balls: number; // total legal balls played
  overHistory: BallOutcome[][]; // completed overs
  currentOver: BallOutcome[];   // balls in current over
  target?: number; // only defined in innings 2
  strikeStreak?: number; // active streak of balls scoring runs
  bestStreak?: number;   // highest streak in innings
  fours?: number;        // count of 4s
  sixes?: number;        // count of 6s
}

export type MatchPhase =
  | "setup"
  | "format_select"
  | "toss_call"
  | "toss_pick"
  | "toss_decision"
  | "innings_1"
  | "innings_break"
  | "innings_2"
  | "super_over"
  | "match_ended";

export interface GameState {
  format: MatchFormat;
  phase: MatchPhase;
  player1Name: string;
  player2Name: string;

  // Toss state
  tossCaller: PlayerId;
  tossCall: TossCall | null;
  tossPicks: { [key in PlayerId]?: number };
  tossWinner: PlayerId | null;
  tossDecision: TossDecision | null;

  // Active Innings
  currentInnings: 1 | 2;
  innings1: InningsState;
  innings2: InningsState | null;

  // Super-over state (for Endless tie decider)
  superOver?: {
    batterId: PlayerId;
    bowlerId: PlayerId;
    ball: number;
  };
  superOverPicks?: { [key in PlayerId]?: number };
  superOverBatter?: PlayerId;
  isSuperOver?: boolean;

  // Pause state for long sessions
  isPaused?: boolean;
  pausedBy?: PlayerId | null;

  // Last ball outcome for reveal
  lastOutcome: BallOutcome | null;

  // Match Result
  winner: PlayerId | "tie" | null;
  resultSummary: string | null;
  isForfeit?: boolean;
}

export type GameAction =
  | { type: "SUBMIT_TOSS_CALL"; call: TossCall }
  | { type: "SUBMIT_TOSS_PICK"; playerId: PlayerId; pick: number }
  | { type: "SUBMIT_TOSS_DECISION"; decision: TossDecision }
  | { type: "START_SECOND_INNINGS" }
  | { type: "APPLY_BALL"; batterPick: number; bowlerPick: number }
  | { type: "APPLY_SUPER_OVER_BALL"; p1Pick: number; p2Pick: number }
  | { type: "TOGGLE_PAUSE"; playerId: PlayerId }
  | { type: "TIMEOUT_AUTO_PICK"; playerId: PlayerId; isToss?: boolean }
  | { type: "FORFEIT"; forfeitingPlayerId: PlayerId; reason?: string }
  | { type: "RESET"; format?: MatchFormat; player1Name?: string; player2Name?: string };

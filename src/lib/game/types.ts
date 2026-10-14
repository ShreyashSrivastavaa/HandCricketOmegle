export type WicketsOption = 1 | 2 | 3;
export type OversOption = 1 | 2 | 3;

export interface MatchFormat {
  maxWickets: WicketsOption;
  maxOvers: OversOption;
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
}

export type MatchPhase =
  | "format_select"
  | "toss_call"
  | "toss_pick"
  | "toss_decision"
  | "innings_1"
  | "innings_break"
  | "innings_2"
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

  // Last ball outcome for reveal
  lastOutcome: BallOutcome | null;

  // Match Result
  winner: PlayerId | "tie" | null;
  resultSummary: string | null;
}

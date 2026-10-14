import React from "react";
import { formatOvers, getRequiredRuns, getRemainingBalls, getRequiredRunRate, getCurrentRunRate } from "@/lib/game-core/engine";
import type { GameState } from "@/lib/game-core/types";

interface ScoreBarProps {
  state: GameState;
  userPlayerId: "p1" | "p2";
  className?: string;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({
  state,
  userPlayerId,
  className = "",
}) => {
  const isInnings2 = state.currentInnings === 2;
  const activeInnings = isInnings2 ? state.innings2! : state.innings1;
  const battingPlayerId = activeInnings.battingPlayer;
  const isUserBatting = battingPlayerId === userPlayerId;
  const battingPlayerName = isUserBatting
    ? "You"
    : battingPlayerId === "p1"
    ? state.player1Name
    : state.player2Name;
  const bowlingPlayerName = !isUserBatting
    ? "You"
    : battingPlayerId === "p1"
    ? state.player2Name
    : state.player1Name;

  const runs = activeInnings.score;
  const wickets = activeInnings.wickets;
  const maxWickets = state.format.maxWickets;
  const oversFormatted = formatOvers(activeInnings.balls);
  const maxOvers = state.format.maxOvers;

  const crr = getCurrentRunRate(state);

  // Chase info
  const target = isInnings2 && activeInnings.target ? activeInnings.target : null;
  const runsNeeded = isInnings2 ? getRequiredRuns(state) : null;
  const ballsLeft = isInnings2 ? getRemainingBalls(state) : null;
  const rrr = isInnings2 ? getRequiredRunRate(state) : null;

  return (
    <div
      className={`bg-surface border border-line rounded-[12px] p-3 sm:p-4 text-chalk shadow-none select-none ${className}`}
      role="region"
      aria-label="Match Scoreboard"
    >
      {/* Top Meta Line: Innings and Format */}
      <div className="flex items-center justify-between pb-2 border-b border-line text-[11px] font-semibold tracking-wider text-muted uppercase">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-turf" />
          <span>
            {isInnings2 ? "2nd Innings • The Chase" : "1st Innings • Setting Target"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>{maxOvers} Overs</span>
          <span>•</span>
          <span>{maxWickets} {maxWickets === 1 ? "Wkt" : "Wkts"}</span>
        </div>
      </div>

      {/* Main Score Centerpiece */}
      <div className="flex items-center justify-between py-2 sm:py-3">
        {/* Batting Team and Big Score */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted tracking-wide uppercase">
              {battingPlayerName}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-turf/10 text-turf border border-turf/30">
              BAT
            </span>
          </div>

          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-heading font-black text-4xl sm:text-5xl tracking-tight tabular-nums text-chalk">
              {runs}
            </span>
            <span className="font-heading font-bold text-2xl sm:text-3xl text-ball/90 tabular-nums">
              /{wickets}
            </span>
            <span className="text-xs text-muted font-heading ml-1 uppercase">
              ({maxWickets} max)
            </span>
          </div>
        </div>

        {/* Overs & Run Rate Display */}
        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold text-muted tracking-wide uppercase">
            Overs
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-heading font-black text-3xl sm:text-4xl tabular-nums text-chalk">
              {oversFormatted}
            </span>
            <span className="text-sm font-heading font-bold text-muted tabular-nums">
              /{maxOvers}.0
            </span>
          </div>
          <span className="text-[11px] font-heading text-muted tabular-nums mt-0.5">
            CRR: {crr}
          </span>
        </div>
      </div>

      {/* Chase Target / Equation Banner (Innings 2 only) */}
      {isInnings2 && target !== null && runsNeeded !== null && ballsLeft !== null && (
        <div className="mt-2 pt-2 border-t border-line flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-muted">TARGET:</span>
            <span className="font-heading font-bold text-base tabular-nums text-amber">
              {target}
            </span>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-2 border border-line">
            <span className="font-heading font-bold text-xs tracking-wide text-turf tabular-nums">
              Need {runsNeeded} off {ballsLeft} ball{ballsLeft === 1 ? "" : "s"}
            </span>
            {rrr !== null && (
              <span className="text-[10px] text-muted border-l border-line pl-2 tabular-nums">
                RRR: {rrr}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Innings 1 Bowling info */}
      {!isInnings2 && (
        <div className="mt-1 pt-1.5 border-t border-line flex items-center justify-between text-xs text-muted">
          <span>Bowling: {bowlingPlayerName} {!isUserBatting ? "(You)" : ""}</span>
          <span className="text-[11px] font-heading uppercase text-muted">
            Balls: {activeInnings.balls}/{maxOvers * 6}
          </span>
        </div>
      )}
    </div>
  );
};

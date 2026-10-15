import React from "react";
import {
  formatOvers,
  getRequiredRuns,
  getRemainingBalls,
  getRequiredRunRate,
  getCurrentRunRate,
} from "@/lib/game/engine";
import type { GameState, PlayerId } from "@/lib/game/types";

interface ScoreBarProps {
  state: GameState;
  userPlayerId?: PlayerId;
  className?: string;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({
  state,
  userPlayerId = "p1",
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
      className={`bg-surface border border-line rounded-[14px] p-3 sm:p-4 text-chalk shadow-sm select-none ${className}`}
      role="region"
      aria-label="Match Scoreboard"
    >
      {/* Top Meta Line: Innings and Format */}
      <div className="flex flex-wrap items-center justify-between gap-1 pb-2 border-b border-line text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted uppercase">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-turf" />
          <span>
            {isInnings2 ? "2nd Innings • The Chase" : "1st Innings • Setting Target"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-chalk font-bold">
            {state.format.mode === "classic" ? "CLASSIC" : "SUDDEN DEATH"}
          </span>
          <span>•</span>
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
            <span className="text-xs text-muted font-sans font-medium">
              /{maxOvers}.0
            </span>
          </div>
          <span className="text-[10px] text-muted tracking-wider uppercase mt-0.5">
            CRR: <strong className="text-chalk font-mono">{crr}</strong>
          </span>
        </div>
      </div>

      {/* Target Equation Bar (Only in Innings 2 Chase) */}
      {isInnings2 && target !== null && (
        <div className="mt-2 pt-2 border-t border-line flex flex-wrap items-center justify-between gap-1.5 text-xs bg-surface-2/40 px-2.5 py-1.5 rounded-lg">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-muted uppercase font-semibold">Target:</span>
            <strong className="text-amber font-heading text-sm tabular-nums">{target}</strong>
            <span className="text-muted uppercase text-[10px] font-medium">
              (Need <strong className="text-chalk font-semibold">{runsNeeded}</strong> from{" "}
              <strong className="text-chalk font-semibold">{ballsLeft}b</strong>)
            </span>
          </div>

          {rrr !== null && (
            <div className="flex items-center gap-1 text-[11px] text-muted ml-auto">
              <span>RRR:</span>
              <strong className="text-amber font-mono font-semibold">{rrr}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

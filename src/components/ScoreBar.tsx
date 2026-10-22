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
      className={`bg-bone-white border-2 border-pure-black rounded-[6px] p-3.5 sm:p-4 text-ink-black shadow-none select-none ${className}`}
      role="region"
      aria-label="Match Scoreboard"
    >
      {/* Top Meta Line: Innings and Format */}
      <div className="flex flex-wrap items-center justify-between gap-1 pb-2 border-b-2 border-pure-black text-[10px] sm:text-[11px] font-mono font-bold tracking-wider text-pure-black uppercase">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-firecracker-red border border-pure-black animate-pulse" />
          <span>
            {isInnings2 ? "2nd Innings • The Chase" : "1st Innings • Setting Target"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-pure-black font-black bg-hi-vis-yellow px-2 py-0.5 rounded-[100px] border border-pure-black">
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
            <span className="text-xs font-mono font-bold text-pure-black/80 tracking-wide uppercase">
              {battingPlayerName}
            </span>
            <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-[100px] bg-hi-vis-yellow text-pure-black border border-pure-black">
              BAT
            </span>
          </div>

          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-heading font-black text-5xl sm:text-6xl tracking-tight tabular-nums text-pure-black">
              {runs}
            </span>
            <span className="font-heading font-black text-3xl sm:text-4xl text-firecracker-red tabular-nums">
              /{wickets}
            </span>
            <span className="text-xs text-pure-black/70 font-mono ml-1 uppercase font-bold">
              ({maxWickets} MAX)
            </span>
          </div>
        </div>

        {/* Overs & Run Rate Display */}
        <div className="flex flex-col items-end">
          <span className="text-xs font-mono font-bold text-pure-black/80 tracking-wide uppercase">
            Overs
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-heading font-black text-4xl sm:text-5xl tabular-nums text-pure-black">
              {oversFormatted}
            </span>
            <span className="text-xs text-pure-black/70 font-mono font-bold">
              /{maxOvers}.0
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-pure-black uppercase mt-0.5">
            CRR: <strong className="text-pure-black">{crr}</strong>
          </span>
        </div>
      </div>

      {/* Target Equation Bar (Only in Innings 2 Chase) */}
      {isInnings2 && target !== null && (
        <div className="mt-2 pt-2 border-t-2 border-pure-black flex flex-wrap items-center justify-between gap-1.5 text-xs bg-hi-vis-yellow px-3 py-2 rounded-[6px] border border-pure-black text-pure-black">
          <div className="flex items-center gap-1.5 flex-wrap font-mono font-bold">
            <span className="uppercase">Target:</span>
            <strong className="text-pure-black font-black text-base tabular-nums">{target}</strong>
            <span className="text-[11px] uppercase">
              (Need <strong className="underline">{runsNeeded}</strong> from{" "}
              <strong>{ballsLeft}b</strong>)
            </span>
          </div>

          {rrr !== null && (
            <div className="flex items-center gap-1 text-[11px] font-mono font-bold ml-auto">
              <span>RRR:</span>
              <strong className="text-pure-black">{rrr}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

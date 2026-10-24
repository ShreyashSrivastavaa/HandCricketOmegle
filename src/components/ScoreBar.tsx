import React from "react";
import {
  formatOvers,
  getRequiredRuns,
  getRemainingBalls,
  getRequiredRunRate,
  getCurrentRunRate,
} from "@/lib/game/engine";
import type { GameState, PlayerId } from "@/lib/game/types";
import { Target, TrendingUp, Activity } from "lucide-react";

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

  const target = isInnings2 && activeInnings.target ? activeInnings.target : null;
  const runsNeeded = isInnings2 ? getRequiredRuns(state) : null;
  const ballsLeft = isInnings2 ? getRemainingBalls(state) : null;
  const rrr = isInnings2 ? getRequiredRunRate(state) : null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-line bg-surface/85 text-chalk shadow-panel backdrop-blur-sm select-none ${className}`}
      role="region"
      aria-label="Match Scoreboard"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-turf/[0.06] to-transparent"
        aria-hidden="true"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-1 border-b border-line/60 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted sm:px-4">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-turf opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-turf" />
          </span>
          <span>
            {isInnings2 ? "2nd Innings · The Chase" : "1st Innings · Setting Target"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full border border-line/70 bg-surface-2/60 px-1.5 py-0.5 text-chalk">
            {state.format.mode === "classic" ? "Classic" : state.format.mode === "endless" ? "Endless" : "Sudden Death"}
          </span>
          <span>{maxOvers} ov</span>
          <span className="h-1 w-1 rotate-45 bg-line" />
          <span>{maxWickets} {maxWickets === 1 ? "wkt" : "wkts"}</span>
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              {battingPlayerName}
            </span>
            <span className="rounded-full border border-turf/25 bg-turf/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-turf">
              Bat
            </span>
          </div>

          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="font-heading text-4xl font-black leading-none tracking-tight tabular-nums text-chalk sm:text-5xl">
              {runs}
            </span>
            <span className="font-heading text-xl font-black leading-none tabular-nums text-ball/90 sm:text-2xl">
              /{wickets}
            </span>
            <span className="ml-1 hidden text-[9px] uppercase tracking-wider text-muted sm:inline">
              of {maxWickets}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden items-center gap-1.5 rounded-xl border border-line/60 bg-surface-2/40 px-2.5 py-1.5 sm:flex">
            <Activity className="h-3.5 w-3.5 text-turf" />
            <div>
              <p className="text-[8px] uppercase tracking-[0.14em] text-muted">CRR</p>
              <p className="font-mono text-xs font-bold text-chalk">{crr}</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.14em] text-muted">Overs</p>
            <div className="flex items-baseline justify-end gap-0.5">
              <span className="font-heading text-2xl font-black leading-none tabular-nums text-chalk sm:text-3xl">
                {oversFormatted}
              </span>
              <span className="text-[10px] font-medium text-muted">/{maxOvers}.0</span>
            </div>
          </div>
        </div>
      </div>

      {isInnings2 && target !== null && (
        <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-line/60 bg-surface-2/40 px-3 py-1.5 text-[10px] sm:px-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full border border-amber/20 bg-amber/[0.06] px-1.5 py-0.5 font-bold uppercase tracking-wider text-amber">
              <Target className="h-2.5 w-2.5" />
              Target {target}
            </span>
            <span className="text-muted">
              Need <strong className="text-chalk">{runsNeeded}</strong> from{" "}
              <strong className="text-chalk">{ballsLeft}</strong> balls
            </span>
          </div>

          {rrr !== null && (
            <div className="ml-auto flex items-center gap-1 rounded-full border border-line/60 bg-surface/50 px-2 py-0.5 text-muted">
              <TrendingUp className="h-2.5 w-2.5 text-amber" />
              <span>RRR</span>
              <strong className="font-mono text-amber">{rrr}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

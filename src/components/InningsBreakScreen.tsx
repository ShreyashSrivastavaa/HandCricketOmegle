import React from "react";
import type { GameState, PlayerId } from "@/lib/game/types";
import { formatOvers } from "@/lib/game/engine";
import { Button } from "./Button";
import { Flag, ArrowRight, Target, Flame, ShieldCheck } from "lucide-react";
import { playClickSound } from "@/lib/client/audio";

interface InningsBreakScreenProps {
  gameState: GameState;
  userPlayerId?: PlayerId;
  onStartInnings2: () => void;
  className?: string;
}

export const InningsBreakScreen: React.FC<InningsBreakScreenProps> = ({
  gameState,
  userPlayerId = "p1",
  onStartInnings2,
  className = "",
}) => {
  const inn1 = gameState.innings1;
  const inn2 = gameState.innings2!;
  const target = inn2.target!;

  const inn1BattingName =
    inn1.battingPlayer === "p1" ? gameState.player1Name : gameState.player2Name;
  const inn2BattingName =
    inn2.battingPlayer === "p1" ? gameState.player1Name : gameState.player2Name;

  const isUserChasing = inn2.battingPlayer === userPlayerId;
  const maxBalls = gameState.format.maxOvers * 6;

  return (
    <div
      className={`relative w-full max-w-xl overflow-hidden rounded-[28px] border border-line bg-surface/85 p-5 text-chalk shadow-panel backdrop-blur-sm sm:p-7 ${className}`}
      role="dialog"
      aria-label="Innings Break Dialog"
    >
      <div className="pitch-grid pointer-events-none absolute inset-0 opacity-25" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-amber/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber/25 bg-amber/[0.07] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber">
          <Flag className="h-3.5 w-3.5" />
          <span>Innings break</span>
        </div>
        <h2 className="font-heading text-3xl font-black uppercase tracking-tight text-chalk sm:text-4xl">
          1st Innings Concluded
        </h2>
        <p className="text-xs text-muted">The chase is about to begin.</p>
      </div>

      <div className="relative z-10 mt-5 overflow-hidden rounded-[22px] border border-line/70 bg-surface-2/40">
        <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-turf/10 text-turf">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <span className="font-heading text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              {inn1BattingName}&apos;s innings
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted">
            {formatOvers(inn1.balls)} / {gameState.format.maxOvers}.0 ov
          </span>
        </div>

        <div className="flex items-end justify-between px-4 py-4">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-5xl font-black tabular-nums text-chalk">
                {inn1.score}
              </span>
              <span className="font-heading text-2xl font-black text-ball">/{inn1.wickets}</span>
            </div>
            <span className="mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-muted">
              {inn1.wickets >= gameState.format.maxWickets ? "All out" : "Overs complete"}
            </span>
          </div>

          <div className="rounded-xl border border-amber/20 bg-amber/[0.06] px-3 py-2 text-right">
            <span className="flex items-center justify-end gap-1 text-[9px] uppercase tracking-[0.14em] text-amber">
              <Target className="h-3 w-3" />
              Target
            </span>
            <div className="mt-0.5 flex items-baseline justify-end gap-1">
              <span className="font-heading text-3xl font-black tabular-nums text-amber">{target}</span>
              <span className="text-[10px] text-muted">runs</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-3 flex items-start gap-2.5 rounded-2xl border border-line/60 bg-surface/50 p-3.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-turf/10 text-turf">
          <Flame className="h-3.5 w-3.5" />
        </span>
        <p className="text-[11px] leading-relaxed text-muted">
          <strong className="text-chalk">{inn2BattingName}</strong>{" "}
          {inn2BattingName === "You" ? "need" : "needs"}{" "}
          <strong className="text-turf">{target} runs</strong> from{" "}
          <strong className="text-chalk">{maxBalls} balls</strong>. You are now{" "}
          <strong className="text-chalk">{isUserChasing ? "batting" : "bowling"}</strong> for the chase.
        </p>
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => {
          playClickSound();
          onStartInnings2();
        }}
        className="relative z-10 mt-4 flex min-h-[56px] items-center justify-center gap-2 rounded-2xl font-heading text-base font-black uppercase tracking-wider shadow-glow"
      >
        <span>Begin 2nd Innings</span>
        <ArrowRight className="h-5 w-5" />
      </Button>
    </div>
  );
};

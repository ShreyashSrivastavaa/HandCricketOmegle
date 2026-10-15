import React from "react";
import type { GameState, PlayerId } from "@/lib/game/types";
import { formatOvers } from "@/lib/game/engine";
import { Button } from "./Button";
import { Flag, ArrowRight } from "lucide-react";
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
      className={`w-full max-w-xl mx-auto bg-surface border border-line rounded-[16px] p-6 sm:p-8 flex flex-col items-center gap-6 text-chalk select-none shadow-xl ${className}`}
      role="dialog"
      aria-label="Innings Break Dialog"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-line text-xs font-bold uppercase tracking-wider text-amber">
          <Flag className="w-3.5 h-3.5" />
          <span>Innings Break</span>
        </div>
        <h2 className="font-heading font-black text-3xl sm:text-4xl uppercase tracking-tight">
          1st Innings Concluded
        </h2>
      </div>

      {/* 1st Innings Total Card */}
      <div className="w-full bg-surface-2/60 border border-line rounded-[14px] p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-semibold text-muted uppercase">
          <span>{inn1BattingName}&apos;s Innings</span>
          <span>{formatOvers(inn1.balls)} / {gameState.format.maxOvers}.0 Overs</span>
        </div>

        <div className="flex items-baseline justify-between border-b border-line pb-3">
          <span className="font-heading font-black text-5xl tabular-nums text-chalk">
            {inn1.score}/{inn1.wickets}
          </span>
          <span className="text-xs text-muted uppercase">
            {inn1.wickets >= gameState.format.maxWickets ? "All Out" : "Overs Complete"}
          </span>
        </div>

        {/* Target display */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs uppercase font-bold text-muted">Target to Win:</span>
          <div className="flex items-center gap-1.5">
            <span className="font-heading font-black text-3xl text-amber tabular-nums">
              {target}
            </span>
            <span className="text-xs text-muted">runs</span>
          </div>
        </div>
      </div>

      {/* Equation Brief */}
      <div className="w-full p-4 rounded-[14px] border border-line bg-surface/50 text-center text-sm">
        <p className="text-muted">
          <strong className="text-chalk">{inn2BattingName}</strong> needs{" "}
          <strong className="text-turf font-heading text-lg tabular-nums">{target} runs</strong> from{" "}
          <strong className="text-chalk font-heading text-lg tabular-nums">{maxBalls} balls</strong> to win!
        </p>
        <span className="block text-xs text-muted mt-1">
          {isUserChasing ? "You are now BATTING to chase the target." : "You are now BOWLING to defend the target."}
        </span>
      </div>

      {/* Start Innings 2 Button */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => {
          playClickSound();
          onStartInnings2();
        }}
        className="flex items-center justify-center gap-2 font-heading font-black text-lg"
      >
        <span>BEGIN 2ND INNINGS (CHASE)</span>
        <ArrowRight className="w-5 h-5" />
      </Button>
    </div>
  );
};

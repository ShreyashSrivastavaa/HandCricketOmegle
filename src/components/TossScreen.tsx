import React from "react";
import type { GameState } from "@/lib/game-core/types";
import { Button } from "./Button.tsx";
import { Hand } from "./Hand.tsx";
import { Swords, CheckCircle2 } from "lucide-react";

interface TossScreenProps {
  gameState: GameState;
  onCall: (call: "odd" | "even") => void;
  onPick: (num: number) => void;
  onDecision: (decision: "bat" | "bowl") => void;
  className?: string;
}

export const TossScreen: React.FC<TossScreenProps> = ({
  gameState,
  onCall,
  onPick,
  onDecision,
  className = "",
}) => {
  const isCaller = gameState.tossCaller === "p1";
  const p1Pick = gameState.tossPicks.p1;
  const p2Pick = gameState.tossPicks.p2;

  return (
    <div
      className={`w-full max-w-xl mx-auto bg-surface border border-line rounded-[12px] p-6 sm:p-8 flex flex-col items-center gap-6 text-chalk select-none ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-line text-xs font-bold uppercase tracking-wider text-turf">
          <Swords className="w-3.5 h-3.5" />
          <span>Match Toss</span>
        </div>
        <h2 className="font-heading font-black text-3xl sm:text-4xl uppercase tracking-tight">
          Hand Cricket Coin Toss
        </h2>
        <p className="text-xs sm:text-sm text-muted max-w-md">
          One player calls Odd or Even. Both secretly pick a number 1-6. The sum decides the winner, who then chooses to Bat or Bowl.
        </p>
      </div>

      {/* STEP 1: CALL ODD OR EVEN */}
      {gameState.phase === "toss_call" && (
        <div className="w-full flex flex-col items-center gap-4 bg-surface-2 border border-line rounded-[12px] p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            {isCaller ? "Make your call" : "Opponent calling..."}
          </span>

          <div className="grid grid-cols-2 gap-3 w-full">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onCall("odd")}
              className="font-heading font-black text-xl hover:border-turf"
            >
              ODD
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onCall("even")}
              className="font-heading font-black text-xl hover:border-turf"
            >
              EVEN
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: SECRET PICK 1-6 */}
      {gameState.phase === "toss_pick" && (
        <div className="w-full flex flex-col items-center gap-4 bg-surface-2 border border-line rounded-[12px] p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase">
            <span>You called:</span>
            <strong className="text-turf font-heading text-sm">{gameState.tossCall?.toUpperCase()}</strong>
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-chalk">
            Pick a number 1 to 6 for the toss
          </span>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onPick(num)}
                className="flex flex-col items-center justify-center p-3 rounded-[12px] border border-line bg-surface hover:bg-surface-2 hover:border-turf transition-all active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf"
              >
                <div className="text-muted group-hover:text-chalk mb-1">
                  <Hand value={num} size={28} />
                </div>
                <span className="font-heading font-black text-2xl tabular-nums">
                  {num}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: TOSS OUTCOME & DECISION */}
      {gameState.phase === "toss_decision" && (
        <div className="w-full flex flex-col items-center gap-5 bg-surface-2 border border-line rounded-[12px] p-5">
          {/* Summary of picks and sum */}
          {p1Pick && p2Pick && (
            <div className="flex items-center justify-around w-full border-b border-line pb-4 text-center">
              <div>
                <span className="text-[11px] text-muted block uppercase">You Picked</span>
                <span className="font-heading font-black text-2xl tabular-nums text-chalk">{p1Pick}</span>
              </div>
              <div className="text-xl font-black text-muted">+</div>
              <div>
                <span className="text-[11px] text-muted block uppercase">Bot Picked</span>
                <span className="font-heading font-black text-2xl tabular-nums text-chalk">{p2Pick}</span>
              </div>
              <div className="text-xl font-black text-muted">=</div>
              <div>
                <span className="text-[11px] text-muted block uppercase">Sum ({ (p1Pick + p2Pick) % 2 === 0 ? "EVEN" : "ODD" })</span>
                <span className="font-heading font-black text-2xl tabular-nums text-turf">
                  {p1Pick + p2Pick}
                </span>
              </div>
            </div>
          )}

          {/* Winner announcement */}
          <div className="flex flex-col items-center text-center gap-1">
            <span className="text-xs uppercase font-bold text-muted">Toss Winner</span>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-turf" />
              <span className="font-heading font-black text-2xl text-chalk">
                {gameState.tossWinner === "p1" ? "YOU WON THE TOSS!" : "BOT ARENA WON THE TOSS"}
              </span>
            </div>
          </div>

          {/* Decision Buttons (If player won) */}
          {gameState.tossWinner === "p1" ? (
            <div className="w-full flex flex-col gap-2">
              <span className="text-xs text-center font-medium text-muted">
                What do you want to do first?
              </span>
              <div className="grid grid-cols-2 gap-3 w-full">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => onDecision("bat")}
                  className="font-heading font-black text-lg"
                >
                  BAT FIRST
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => onDecision("bowl")}
                  className="font-heading font-black text-lg hover:border-turf"
                >
                  BOWL FIRST
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted text-center animate-pulse">
              Bot is making its decision...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

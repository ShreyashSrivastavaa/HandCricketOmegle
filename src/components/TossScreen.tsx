import React from "react";
import type { GameState, PlayerId } from "@/lib/game/types";
import { Button } from "./Button";
import { Hand } from "./Hand";
import { Swords, CheckCircle2 } from "lucide-react";
import { playClickSound, playBoundarySound } from "@/lib/client/audio";

interface TossScreenProps {
  gameState: GameState;
  userPlayerId?: PlayerId;
  onCall: (call: "odd" | "even") => void;
  onPick: (num: number) => void;
  onDecision: (decision: "bat" | "bowl") => void;
  className?: string;
}

export const TossScreen: React.FC<TossScreenProps> = ({
  gameState,
  userPlayerId = "p1",
  onCall,
  onPick,
  onDecision,
  className = "",
}) => {
  const isCaller = gameState.tossCaller === userPlayerId;
  const callerName =
    gameState.tossCaller === "p1" ? gameState.player1Name : gameState.player2Name;
  const userPick = gameState.tossPicks[userPlayerId];
  const otherPlayerId: PlayerId = userPlayerId === "p1" ? "p2" : "p1";
  const otherPlayerName =
    otherPlayerId === "p1" ? gameState.player1Name : gameState.player2Name;
  const otherPick = gameState.tossPicks[otherPlayerId];
  const userWonToss = gameState.tossWinner === userPlayerId;

  return (
    <div
      className={`w-full max-w-xl mx-auto bg-surface border border-line rounded-[16px] p-5 sm:p-8 flex flex-col items-center gap-6 text-chalk select-none shadow-xl ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-line text-xs font-bold uppercase tracking-wider text-turf">
          <Swords className="w-3.5 h-3.5" />
          <span>Coin Toss</span>
        </div>
        <h2 className="font-heading font-black text-3xl sm:text-4xl uppercase tracking-tight">
          Authoritative Coin Toss
        </h2>
        <p className="text-xs sm:text-sm text-muted max-w-md">
          {callerName} calls Odd or Even. Both pick 1–6. The sum decides the toss winner.
        </p>
      </div>

      {/* STEP 1: CALL ODD OR EVEN */}
      {gameState.phase === "toss_call" && (
        <div className="w-full flex flex-col items-center gap-4 bg-surface-2/60 border border-line rounded-[14px] p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            {isCaller ? "You are the caller — Make your call" : `Waiting for ${callerName} to call...`}
          </span>

          {isCaller ? (
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  playClickSound();
                  onCall("odd");
                }}
                className="font-heading font-black text-xl hover:border-turf"
              >
                ODD
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  playClickSound();
                  onCall("even");
                }}
                className="font-heading font-black text-xl hover:border-turf"
              >
                EVEN
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted animate-pulse py-4">
              <span>{callerName} is choosing Odd or Even...</span>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: SECRET PICK 1-6 */}
      {gameState.phase === "toss_pick" && (
        <div className="w-full flex flex-col items-center gap-4 bg-surface-2/60 border border-line rounded-[14px] p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase">
            <span>Call was:</span>
            <strong className="text-turf font-heading text-sm">
              {gameState.tossCall?.toUpperCase()} (by {callerName})
            </strong>
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-chalk">
            {userPick ? "You picked a number! Waiting for opponent..." : "Pick a number 1 to 6 for the toss"}
          </span>

          {userPick ? (
            <div className="flex flex-col items-center gap-2 py-3">
              <div className="w-16 h-16 rounded-2xl bg-surface border-2 border-turf flex items-center justify-center">
                <span className="font-heading font-black text-3xl text-turf tabular-nums">
                  {userPick}
                </span>
              </div>
              <span className="text-xs text-muted animate-pulse">
                Locked in! Waiting for {otherPlayerName}...
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onPick(num);
                  }}
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
          )}
        </div>
      )}

      {/* STEP 3: TOSS OUTCOME & DECISION */}
      {gameState.phase === "toss_decision" && (
        <div className="w-full flex flex-col items-center gap-5 bg-surface-2/60 border border-line rounded-[14px] p-5">
          {/* Summary of picks and sum */}
          {userPick && otherPick && (
            <div className="flex items-center justify-around w-full border-b border-line pb-4 text-center">
              <div>
                <span className="text-[11px] text-muted block uppercase">You Picked</span>
                <span className="font-heading font-black text-2xl tabular-nums text-chalk">{userPick}</span>
              </div>
              <div className="text-xl font-black text-muted">+</div>
              <div>
                <span className="text-[11px] text-muted block uppercase">{otherPlayerName}</span>
                <span className="font-heading font-black text-2xl tabular-nums text-chalk">{otherPick}</span>
              </div>
              <div className="text-xl font-black text-muted">=</div>
              <div>
                <span className="text-[11px] text-muted block uppercase">
                  Sum ({(userPick + otherPick) % 2 === 0 ? "EVEN" : "ODD"})
                </span>
                <span className="font-heading font-black text-2xl tabular-nums text-turf">
                  {userPick + otherPick}
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
                {userWonToss
                  ? "YOU WON THE TOSS!"
                  : `${otherPlayerName.toUpperCase()} WON THE TOSS`}
              </span>
            </div>
          </div>

          {/* Decision Buttons (If user won) */}
          {userWonToss ? (
            <div className="w-full flex flex-col gap-2">
              <span className="text-xs text-center font-medium text-muted">
                Choose your role for Innings 1:
              </span>
              <div className="grid grid-cols-2 gap-3 w-full">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    playBoundarySound();
                    onDecision("bat");
                  }}
                  className="font-heading font-black text-lg"
                >
                  BAT FIRST
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    playClickSound();
                    onDecision("bowl");
                  }}
                  className="font-heading font-black text-lg hover:border-turf"
                >
                  BOWL FIRST
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted text-center animate-pulse py-2">
              {otherPlayerName} is deciding to bat or bowl...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

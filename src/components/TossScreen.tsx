import React from "react";
import type { GameState, PlayerId } from "@/lib/game/types";
import { Button } from "./Button";
import { Hand } from "./Hand";
import { Swords, CheckCircle2, CircleDot, Hand as HandIcon, Trophy } from "lucide-react";
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

  const activeStep =
    gameState.phase === "toss_call" ? 1 : gameState.phase === "toss_pick" ? 2 : 3;

  return (
    <div
      className={`relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-line bg-surface/85 p-5 text-chalk shadow-panel backdrop-blur-sm sm:p-7 ${className}`}
    >
      <div className="pitch-grid pointer-events-none absolute inset-0 opacity-25" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-turf/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-turf/25 bg-turf/[0.07] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-turf">
          <CircleDot className="h-3.5 w-3.5" />
          <span>Coin toss</span>
        </div>
        <h2 className="font-heading text-3xl font-black uppercase tracking-tight text-chalk sm:text-4xl">
          Authoritative Coin Toss
        </h2>
        <p className="max-w-md text-xs leading-relaxed text-muted">
          {callerName} calls odd or even. Both players throw a secret number. The sum decides who
          chooses first.
        </p>
      </div>

      <div className="relative z-10 mt-5 flex items-center justify-center gap-1.5">
        {[
          { step: 1, label: "Call" },
          { step: 2, label: "Throw" },
          { step: 3, label: "Decide" },
        ].map((item, index) => (
          <React.Fragment key={item.step}>
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-black transition-colors ${
                  activeStep >= item.step
                    ? "border-turf/50 bg-turf/15 text-turf"
                    : "border-line bg-surface-2/40 text-muted"
                }`}
              >
                {activeStep > item.step ? <CheckCircle2 className="h-3.5 w-3.5" /> : item.step}
              </span>
              <span
                className={`font-heading text-[10px] font-bold uppercase tracking-[0.14em] ${
                  activeStep >= item.step ? "text-chalk" : "text-muted"
                }`}
              >
                {item.label}
              </span>
            </div>
            {index < 2 && <span className="h-px w-6 bg-line/80 sm:w-10" aria-hidden="true" />}
          </React.Fragment>
        ))}
      </div>

      {gameState.phase === "toss_call" && (
        <div className="relative z-10 mt-5 rounded-[22px] border border-line/70 bg-surface-2/40 p-4 sm:p-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber/30 via-amber/10 to-transparent blur-md" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-amber/50 bg-gradient-to-br from-amber to-[#e09c00] shadow-[0_0_40px_-8px_rgba(247,181,0,0.45)]">
                <span className="font-heading text-3xl font-black text-chalk/80">?</span>
                <span className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-chalk/20" />
                <span className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-chalk/20" />
              </div>
            </div>

            <div className="w-full flex-1">
              <span className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                {isCaller ? "You are the caller" : `Waiting for ${callerName}`}
              </span>

              {isCaller ? (
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      onCall("odd");
                      playClickSound();
                    }}
                    className="group min-h-[64px] rounded-2xl border-line bg-gradient-to-br from-surface to-surface-2/40 font-heading text-xl font-black tracking-[0.16em] hover:border-sky/50 hover:text-sky"
                  >
                    ODD
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      onCall("even");
                      playClickSound();
                    }}
                    className="group min-h-[64px] rounded-2xl border-line bg-gradient-to-br from-surface to-surface-2/40 font-heading text-xl font-black tracking-[0.16em] hover:border-amber/50 hover:text-amber"
                  >
                    EVEN
                  </Button>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-line/60 bg-surface/50 px-3 py-2.5 text-xs text-muted">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber" />
                  <span>{callerName} is choosing odd or even...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {gameState.phase === "toss_pick" && (
        <div className="relative z-10 mt-5 rounded-[22px] border border-line/70 bg-surface-2/40 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 rounded-full border border-turf/20 bg-turf/[0.06] px-2.5 py-1">
              <HandIcon className="h-3.5 w-3.5 text-turf" />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                Call was
              </span>
              <span className="font-heading text-xs font-black uppercase text-turf">
                {gameState.tossCall}
              </span>
            </div>
            <span className="text-[10px] text-muted">by {callerName}</span>
          </div>

          <p className="mt-3 text-center font-heading text-sm font-black uppercase tracking-wider text-chalk">
            {userPick ? "Your throw is locked in" : "Throw a number for the toss"}
          </p>

          {userPick ? (
            <div className="mt-3 flex flex-col items-center gap-2 py-2">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-turf bg-turf/10 text-turf shadow-glow">
                <Hand value={userPick} size={42} />
              </div>
              <span className="font-heading text-2xl font-black tabular-nums text-chalk">{userPick}</span>
              <span className="flex items-center gap-1.5 text-[11px] text-muted">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-turf" />
                Waiting for {otherPlayerName}...
              </span>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  aria-label={`Pick ${num} for coin toss`}
                  onClick={() => {
                    onPick(num);
                    playClickSound();
                  }}
                  className="group flex min-h-[86px] flex-col items-center justify-center rounded-2xl border border-line bg-surface px-2 py-2 transition-all hover:-translate-y-0.5 hover:border-turf/50 hover:bg-surface-2 active:scale-95"
                >
                  <Hand
                    value={num}
                    size={30}
                    className="text-muted transition-colors group-hover:text-turf"
                  />
                  <span className="mt-1 font-heading text-xl font-black tabular-nums text-chalk">
                    {num}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(gameState.phase === "toss_decision" ||
        (gameState.phase === "innings_1" && !userWonToss)) && (
        <div className="relative z-10 mt-5 rounded-[22px] border border-line/70 bg-surface-2/40 p-4 sm:p-5">
          {userPick && otherPick && (
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 border-b border-line/60 pb-4 text-center">
              <div>
                <span className="text-[9px] uppercase tracking-[0.14em] text-muted">You</span>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-turf">
                  <Hand value={userPick} size={24} />
                  <span className="font-heading text-2xl font-black tabular-nums text-chalk">{userPick}</span>
                </div>
              </div>
              <span className="font-heading text-lg font-black text-muted">+</span>
              <div>
                <span className="text-[9px] uppercase tracking-[0.14em] text-muted">{otherPlayerName}</span>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-sky">
                  <Hand value={otherPick} size={24} mirrored />
                  <span className="font-heading text-2xl font-black tabular-nums text-chalk">{otherPick}</span>
                </div>
              </div>
              <span className="font-heading text-lg font-black text-muted">=</span>
              <div>
                <span className="text-[9px] uppercase tracking-[0.14em] text-muted">
                  {(userPick + otherPick) % 2 === 0 ? "Even" : "Odd"}
                </span>
                <div className="mt-1 font-heading text-2xl font-black tabular-nums text-amber">
                  {userPick + otherPick}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col items-center gap-1 text-center">
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted">Toss winner</span>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-turf" />
              <span className="font-heading text-xl font-black uppercase tracking-tight text-chalk sm:text-2xl">
                {userWonToss ? "You won the toss!" : `${otherPlayerName} won the toss`}
              </span>
            </div>
            {gameState.phase === "innings_1" && !userWonToss && (
              <div className="mt-2 flex flex-col items-center gap-1">
                <span className="font-heading text-sm font-bold text-amber">
                  {otherPlayerName} elected to {gameState.tossDecision} first
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-turf">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-turf" />
                  Starting match...
                </span>
              </div>
            )}
          </div>

          {userWonToss ? (
            <div className="mt-4">
              <span className="mb-2 block text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                Choose your role for the first innings
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    onDecision("bat");
                    playBoundarySound();
                  }}
                  className="min-h-[58px] rounded-2xl font-heading text-lg font-black tracking-wide"
                >
                  BAT FIRST
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    onDecision("bowl");
                    playClickSound();
                  }}
                  className="min-h-[58px] rounded-2xl border-line font-heading text-lg font-black tracking-wide hover:border-sky/50 hover:text-sky"
                >
                  BOWL FIRST
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-line/60 bg-surface/40 px-3 py-2.5 text-[11px] text-muted">
              <Swords className="h-3.5 w-3.5 text-amber" />
              <span>{otherPlayerName} is choosing to bat or bowl...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useEffect } from "react";
import { formatOvers } from "@/lib/game/engine";
import type { GameState, PlayerId } from "@/lib/game/types";
import { Button } from "./Button";
import {
  Trophy,
  AlertCircle,
  RotateCcw,
  Home,
  Sparkles,
  UserPlus,
  Swords,
  Medal,
  ShieldCheck,
} from "lucide-react";
import { fireVictoryConfetti } from "@/lib/client/confetti";
import { playVictorySound, playClickSound } from "@/lib/client/audio";

export interface ResultBannerProps {
  state?: GameState;
  result?: "win" | "lose" | "tie";
  summaryText?: string;
  userPlayerId?: PlayerId;
  onPlayAgain?: () => void;
  onFindNewOpponent?: () => void;
  onBackToLobby?: () => void;
  className?: string;
  onRematch?: () => void;
  isFriendRoom?: boolean;
  seriesScoreText?: string;
  rematchWaiting?: boolean;
  onChangeFormat?: () => void;
  onLeaveRoom?: () => void;
  isHost?: boolean;
  playAgainWaiting?: boolean;
}

export const ResultBanner: React.FC<ResultBannerProps> = ({
  state,
  result,
  summaryText,
  userPlayerId = "p1",
  onPlayAgain,
  onFindNewOpponent,
  onBackToLobby,
  className = "",
  onRematch,
  isFriendRoom,
  seriesScoreText,
  rematchWaiting,
  onChangeFormat,
  onLeaveRoom,
  isHost,
  playAgainWaiting,
}) => {
  const effectivePlayAgain = onPlayAgain || onRematch;
  const effectiveFindNew = onFindNewOpponent || onRematch;
  const resolvedResult =
    result ??
    (state?.winner === "tie"
      ? "tie"
      : state?.winner === userPlayerId
      ? "win"
      : "lose");

  const isWin = resolvedResult === "win";
  const isTie = resolvedResult === "tie";

  useEffect(() => {
    if (isWin) {
      fireVictoryConfetti();
      playVictorySound();
    }
  }, [isWin]);

  const badgeStyle = isTie
    ? "text-amber border-amber/30 bg-amber/10"
    : isWin
    ? "text-turf border-turf/30 bg-turf/10"
    : "text-ball border-ball/30 bg-ball/10";

  const badgeTitle = isTie ? "MATCH TIED" : isWin ? "VICTORY!" : "DEFEAT";

  const summary =
    summaryText ??
    state?.resultSummary ??
    (isWin ? "You won the match!" : isTie ? "Scores are level!" : "Better luck next over!");

  const p1Name = state?.player1Name ?? "You";
  const p2Name = state?.player2Name ?? "Opponent";
  const inn1 = state?.innings1;
  const inn2 = state?.innings2;

  const inn1BattingName = inn1 ? (inn1.battingPlayer === "p1" ? p1Name : p2Name) : p1Name;
  const inn2BattingName = inn2 ? (inn2.battingPlayer === "p1" ? p1Name : p2Name) : p2Name;

  const heroTone = isTie
    ? "from-amber/20 via-surface to-surface"
    : isWin
    ? "from-turf/20 via-surface to-surface"
    : "from-ball/15 via-surface to-surface";

  return (
    <div
      className={`relative w-full max-w-lg overflow-hidden rounded-[28px] border border-line bg-gradient-to-br ${heroTone} p-5 text-chalk shadow-panel sm:p-7 ${className}`}
      role="dialog"
      aria-label={`Match Result: ${badgeTitle}`}
    >
      <div className="pitch-grid pointer-events-none absolute inset-0 opacity-25" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-52 w-72 -translate-x-1/2 rounded-full bg-current opacity-[0.08] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center gap-2 text-center">
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${badgeStyle}`}>
          {isWin ? <Trophy className="h-3.5 w-3.5" /> : isTie ? <Swords className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          <span>{badgeTitle}</span>
        </div>

        <div className="my-1 flex h-20 w-20 items-center justify-center rounded-2xl border border-line/60 bg-surface/70">
          {isWin ? (
            <Trophy className="h-10 w-10 text-turf drop-shadow-[0_10px_20px_rgba(247,181,0,0.35)]" />
          ) : isTie ? (
            <Medal className="h-10 w-10 text-amber" />
          ) : (
            <ShieldCheck className="h-10 w-10 text-ball" />
          )}
        </div>

        <h2 className="font-heading text-3xl font-black uppercase tracking-tight text-chalk sm:text-4xl">
          {summary}
        </h2>
        {!isTie && (
          <p className="text-[11px] text-muted">
            {isWin ? "A clinical performance. The arena approves." : "Shake it off and go again. The pitch is still open."}
          </p>
        )}
      </div>

      {seriesScoreText && (
        <div className="relative z-10 mt-4 flex flex-col items-center gap-1 rounded-2xl border border-turf/25 bg-turf/[0.06] p-3 text-center">
          <div className="inline-flex items-center gap-1.5 font-heading text-[9px] font-black uppercase tracking-[0.16em] text-turf">
            <Sparkles className="h-3 w-3" />
            <span>Endless series</span>
          </div>
          <div className="font-heading text-base font-black tracking-wide text-chalk">{seriesScoreText}</div>
        </div>
      )}

      {inn1 && (
        <div className="relative z-10 mt-4 overflow-hidden rounded-2xl border border-line/70 bg-surface/60">
          <div className="flex items-center justify-between border-b border-line/60 px-4 py-2.5">
            <span className="font-heading text-[9px] font-black uppercase tracking-[0.18em] text-muted">
              Official scorecard
            </span>
            <Trophy className="h-3.5 w-3.5 text-amber/70" />
          </div>

          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-[9px] uppercase text-muted">1st</span>
              <span className="truncate font-semibold text-chalk">{inn1BattingName}</span>
            </div>
            <div className="shrink-0 font-heading text-lg font-black tabular-nums text-chalk">
              {inn1.score}/{inn1.wickets}
              <span className="ml-1 font-sans text-[10px] font-normal text-muted">
                ({formatOvers(inn1.balls)} ov)
              </span>
            </div>
          </div>

          {inn2 && (
            <div className="flex items-center justify-between border-t border-line/50 px-4 py-2.5 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-mono text-[9px] uppercase text-muted">2nd</span>
                <span className="truncate font-semibold text-chalk">{inn2BattingName}</span>
              </div>
              <div className="shrink-0 font-heading text-lg font-black tabular-nums text-chalk">
                {inn2.score}/{inn2.wickets}
                <span className="ml-1 font-sans text-[10px] font-normal text-muted">
                  ({formatOvers(inn2.balls)} ov)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="relative z-10 mt-4 flex w-full flex-col gap-2">
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
          {effectivePlayAgain && (
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                playClickSound();
                effectivePlayAgain();
              }}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl font-heading text-sm font-black uppercase tracking-wider"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{playAgainWaiting || rematchWaiting ? "Waiting..." : "Play Again"}</span>
            </Button>
          )}

          {effectiveFindNew && !isFriendRoom && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                playClickSound();
                effectiveFindNew();
              }}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-line font-heading text-sm font-black uppercase tracking-wider hover:border-turf/40"
            >
              <UserPlus className="h-4 w-4" />
              <span>New Opponent</span>
            </Button>
          )}

          {isFriendRoom && onChangeFormat && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                playClickSound();
                onChangeFormat();
              }}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-line font-heading text-sm font-black uppercase tracking-wider hover:border-sky/40"
            >
              <Swords className="h-4 w-4" />
              <span>Change Format</span>
            </Button>
          )}
        </div>

        {(onBackToLobby || onLeaveRoom) && (
          <button
            type="button"
            onClick={() => {
              playClickSound();
              if (onBackToLobby) onBackToLobby();
              else if (onLeaveRoom) onLeaveRoom();
            }}
            className="flex w-full items-center justify-center gap-1.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted transition-colors hover:text-chalk"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Return to lobby</span>
          </button>
        )}
      </div>
    </div>
  );
};

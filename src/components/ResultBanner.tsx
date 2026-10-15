import React, { useEffect } from "react";
import { formatOvers } from "@/lib/game/engine";
import type { GameState, PlayerId } from "@/lib/game/types";
import { Button } from "./Button";
import { Trophy, AlertCircle, RotateCcw, Home, Sparkles, UserPlus } from "lucide-react";
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
  // Legacy / Friend room props
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

  // Trigger celebration on mount if win
  useEffect(() => {
    if (isWin) {
      fireVictoryConfetti();
      playVictorySound();
    }
  }, [isWin]);

  const badgeStyle = isTie
    ? "text-amber border-amber/40 bg-amber/10"
    : isWin
    ? "text-turf border-turf/40 bg-turf/10"
    : "text-ball border-ball/40 bg-ball/10";

  const badgeTitle = isTie
    ? "MATCH TIED"
    : isWin
    ? "VICTORY!"
    : "DEFEAT";

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

  return (
    <div
      className={`w-full max-w-lg mx-auto bg-surface border border-line rounded-[16px] p-5 sm:p-7 flex flex-col items-center gap-5 text-chalk select-none shadow-2xl relative overflow-hidden ${className}`}
      role="dialog"
      aria-label={`Match Result: ${badgeTitle}`}
    >
      {/* Glow for win */}
      {isWin && (
        <div className="absolute -top-20 inset-x-0 h-40 bg-turf/15 rounded-full blur-3xl pointer-events-none" />
      )}

      {/* Result Badge & Big Title */}
      <div className="flex flex-col items-center gap-2 text-center z-10">
        <div
          className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${badgeStyle}`}
        >
          {isWin ? (
            <Trophy className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <AlertCircle className="w-4 h-4 stroke-[2.5]" />
          )}
          <span>{badgeTitle}</span>
        </div>

        <h2 className="font-heading font-black text-3xl sm:text-4xl uppercase tracking-tight text-chalk">
          {summary}
        </h2>
      </div>

      {/* Endless Series Scoreboard */}
      {seriesScoreText && (
        <div className="w-full bg-turf/10 border-2 border-turf/40 rounded-[14px] p-3.5 flex flex-col items-center gap-1 text-center z-10 animate-fadeIn">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-turf font-heading">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Endless Series Scoreboard</span>
          </div>
          <div className="font-heading font-black text-lg sm:text-xl text-chalk tracking-wide">
            {seriesScoreText}
          </div>
        </div>
      )}

      {/* Match Scorecard Breakdown */}
      {inn1 && (
        <div className="w-full bg-surface-2/60 border border-line rounded-[14px] p-4 flex flex-col gap-2.5 z-10">
          <span className="text-[11px] font-bold tracking-wider text-muted uppercase font-heading">
            Official Scorecard
          </span>

          {/* Innings 1 Card */}
          <div className="flex items-center justify-between py-2 border-b border-line text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted uppercase font-semibold">1st Innings:</span>
              <span className="font-semibold text-chalk">{inn1BattingName}</span>
            </div>
            <div className="font-heading font-black text-lg tabular-nums text-chalk">
              {inn1.score}/{inn1.wickets}{" "}
              <span className="text-xs text-muted font-normal font-sans">
                ({formatOvers(inn1.balls)} ov)
              </span>
            </div>
          </div>

          {/* Innings 2 Card */}
          {inn2 && (
            <div className="flex items-center justify-between py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted uppercase font-semibold">2nd Innings:</span>
                <span className="font-semibold text-chalk">{inn2BattingName}</span>
              </div>
              <div className="font-heading font-black text-lg tabular-nums text-chalk">
                {inn2.score}/{inn2.wickets}{" "}
                <span className="text-xs text-muted font-normal font-sans">
                  ({formatOvers(inn2.balls)} ov)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons: Play Again & Find New Opponent */}
      <div className="w-full flex flex-col gap-2.5 z-10 pt-1">
        <div className="grid grid-cols-2 gap-2.5 w-full">
          {effectivePlayAgain && (
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                playClickSound();
                effectivePlayAgain();
              }}
              className="flex items-center justify-center gap-2 font-heading font-black text-base uppercase"
            >
              <RotateCcw className="w-4 h-4" />
              <span>PLAY AGAIN</span>
            </Button>
          )}

          {effectiveFindNew && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                playClickSound();
                effectiveFindNew();
              }}
              className="flex items-center justify-center gap-2 font-heading font-black text-base uppercase hover:border-turf"
            >
              <UserPlus className="w-4 h-4" />
              <span>NEW OPPONENT</span>
            </Button>
          )}
        </div>

        {onBackToLobby && (
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onBackToLobby();
            }}
            className="w-full py-2 text-xs text-muted hover:text-chalk uppercase font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Lobby</span>
          </button>
        )}
      </div>
    </div>
  );
};

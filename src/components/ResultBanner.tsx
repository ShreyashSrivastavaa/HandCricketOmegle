import React from "react";
import { formatOvers } from "@/lib/game-core/engine";
import type { GameState } from "@/lib/game-core/types";
import { Button } from "./Button.tsx";
import { Trophy, AlertCircle, RotateCcw, Home } from "lucide-react";

export interface ResultBannerProps {
  state?: GameState;
  result?: "win" | "lose" | "tie";
  summaryText?: string;
  userPlayerId?: "p1" | "p2";
  onRematch?: () => void;
  onBackToLobby?: () => void;
  className?: string;
}

export const ResultBanner: React.FC<ResultBannerProps> = ({
  state,
  result,
  summaryText,
  userPlayerId = "p1",
  onRematch = () => {},
  onBackToLobby = () => {},
  className = "",
}) => {
  // Determine outcome
  const resolvedResult =
    result ??
    (state?.winner === "tie"
      ? "tie"
      : state?.winner === userPlayerId
      ? "win"
      : "lose");

  const isWin = resolvedResult === "win";
  const isTie = resolvedResult === "tie";

  const badgeStyle = isTie
    ? "text-amber border-amber/40 bg-amber/10"
    : isWin
    ? "text-turf border-turf/40 bg-turf/10"
    : "text-ball border-ball/40 bg-ball/10";

  const badgeTitle = isTie
    ? "MATCH TIED"
    : isWin
    ? "VICTORY"
    : "DEFEAT";

  const summary =
    summaryText ??
    state?.resultSummary ??
    (isWin ? "You won the match!" : isTie ? "Scores are level!" : "Bot won the match!");

  const p1Name = state?.player1Name ?? "You";
  const p2Name = state?.player2Name ?? "Bot Arena";
  const inn1 = state?.innings1;
  const inn2 = state?.innings2;

  const inn1BattingName = inn1 ? (inn1.battingPlayer === "p1" ? p1Name : p2Name) : p1Name;
  const inn2BattingName = inn2 ? (inn2.battingPlayer === "p1" ? p1Name : p2Name) : p2Name;

  return (
    <div
      className={`w-full max-w-xl mx-auto bg-surface border border-line rounded-[12px] p-6 sm:p-8 flex flex-col items-center gap-6 text-chalk select-none ${className}`}
      role="dialog"
      aria-label={`Match Result: ${badgeTitle}`}
    >
      {/* Result Badge & Big Title */}
      <div className="flex flex-col items-center gap-2 text-center">
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

      {/* Match Scorecards Breakdown */}
      {inn1 && (
        <div className="w-full bg-surface-2 border border-line rounded-[12px] p-4 flex flex-col gap-3">
          <span className="text-[11px] font-bold tracking-wider text-muted uppercase font-heading">
            Match Breakdown
          </span>

          {/* Innings 1 Card */}
          <div className="flex items-center justify-between py-2 border-b border-line text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted uppercase font-semibold">1st Innings:</span>
              <span className="font-semibold text-chalk">{inn1BattingName}</span>
            </div>
            <div className="font-heading font-black text-lg tabular-nums">
              {inn1.score}/{inn1.wickets}{" "}
              <span className="text-xs text-muted font-normal font-sans">
                ({formatOvers(inn1.balls)} ov)
              </span>
            </div>
          </div>

          {/* Innings 2 Card */}
          {inn2 && (
            <div className="flex items-center justify-between py-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted uppercase font-semibold">2nd Innings:</span>
                <span className="font-semibold text-chalk">{inn2BattingName}</span>
              </div>
              <div className="font-heading font-black text-lg tabular-nums">
                {inn2.score}/{inn2.wickets}{" "}
                <span className="text-xs text-muted font-normal font-sans">
                  ({formatOvers(inn2.balls)} ov)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rematch & Navigation Actions */}
      <div className="w-full flex flex-col sm:flex-row items-center gap-3">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onRematch}
          className="flex items-center justify-center gap-2 font-heading font-black text-lg uppercase"
        >
          <RotateCcw className="w-4 h-4" />
          <span>PLAY REMATCH</span>
        </Button>

        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={onBackToLobby}
          className="flex items-center justify-center gap-2 font-heading font-black text-lg uppercase"
        >
          <Home className="w-4 h-4" />
          <span>BACK TO LOBBY</span>
        </Button>
      </div>
    </div>
  );
};

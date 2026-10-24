import React from "react";
import type { BallOutcome } from "@/lib/game/types";
import { CircleDot } from "lucide-react";

interface BallStripProps {
  currentOver: BallOutcome[];
  overIndex: number;
  maxOvers: number;
  className?: string;
}

export const BallStrip: React.FC<BallStripProps> = ({
  currentOver,
  overIndex,
  maxOvers,
  className = "",
}) => {
  const totalSlots = 6;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border border-line/70 bg-surface/70 px-2.5 py-1.5 backdrop-blur-sm ${className}`}
      aria-label={`Over ${overIndex + 1} of ${maxOvers} deliveries`}
    >
      <div className="flex shrink-0 items-center gap-1.5">
        <CircleDot className="h-3 w-3 text-turf/70" />
        <span className="font-heading text-[9px] font-bold uppercase tracking-[0.14em] text-muted">
          Over {overIndex + 1}/{maxOvers}
        </span>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5">
        {Array.from({ length: totalSlots }).map((_, idx) => {
          const ball = currentOver[idx];
          const isCurrentPending = idx === currentOver.length;

          if (!ball) {
            return (
              <div
                key={idx}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] transition-all sm:h-7 sm:w-7 ${
                  isCurrentPending
                    ? "border border-turf/60 bg-turf/10 text-turf"
                    : "border border-line/50 bg-surface-2/30 text-muted/30"
                }`}
                aria-label={isCurrentPending ? "Current delivery pending" : "Upcoming delivery"}
              >
                {isCurrentPending ? (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-turf" />
                ) : (
                  <span className="h-1 w-1 rounded-full bg-line" />
                )}
              </div>
            );
          }

          let chipStyle = "border-line bg-surface-2 text-chalk";
          let label = `${ball.runsScored}`;

          if (ball.isWicket) {
            chipStyle = "border-ball bg-ball text-white font-black shadow-glow-ball";
            label = "W";
          } else if (ball.runsScored === 6) {
            chipStyle = "border-amber bg-amber text-ink font-black shadow-[0_0_14px_-2px_rgba(247,181,0,0.45)]";
            label = "6";
          } else if (ball.runsScored === 4) {
            chipStyle = "border-amber/40 bg-amber/10 text-amber font-bold";
            label = "4";
          } else if (ball.runsScored === 0) {
            chipStyle = "border-line bg-surface text-muted";
            label = "•";
          }

          return (
            <div
              key={idx}
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-heading font-bold tabular-nums sm:h-7 sm:w-7 ${chipStyle}`}
              aria-label={ball.isWicket ? "Wicket" : `${ball.runsScored} runs`}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

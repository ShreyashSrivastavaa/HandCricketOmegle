import React from "react";
import type { BallOutcome } from "@/lib/game/types";

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
  // Cricket over has 6 legal deliveries
  const totalSlots = 6;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2 bg-surface rounded-[12px] border border-line ${className}`}
      aria-label={`Over ${overIndex + 1} of ${maxOvers} deliveries`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold tracking-wider text-muted uppercase font-heading">
          Over {overIndex + 1}/{maxOvers}
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {Array.from({ length: totalSlots }).map((_, idx) => {
          const ball = currentOver[idx];
          const isCurrentPending = idx === currentOver.length;

          if (!ball) {
            return (
              <div
                key={idx}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs transition-all ${
                  isCurrentPending
                    ? "border-2 border-turf/80 bg-surface-2 text-turf animate-pulse"
                    : "border border-line/60 bg-surface-2/30 text-muted/30"
                }`}
                aria-label={isCurrentPending ? "Current delivery pending" : "Upcoming delivery"}
              >
                {isCurrentPending ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-turf" />
                ) : (
                  <span className="w-1 h-1 rounded-full bg-line" />
                )}
              </div>
            );
          }

          // Render finished ball chip
          let chipStyle = "bg-surface-2 text-chalk border border-line";
          let label = `${ball.runsScored}`;

          if (ball.isWicket) {
            chipStyle = "bg-ball text-white font-black border border-ball shadow-sm";
            label = "W";
          } else if (ball.runsScored === 6) {
            chipStyle = "bg-amber text-ink font-black border border-amber shadow-sm";
            label = "6";
          } else if (ball.runsScored === 4) {
            chipStyle = "bg-amber/15 text-amber font-bold border border-amber/50";
            label = "4";
          } else if (ball.runsScored === 0) {
            chipStyle = "bg-surface text-muted border border-line";
            label = "•";
          }

          return (
            <div
              key={idx}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-heading font-bold tabular-nums transition-transform ${chipStyle}`}
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

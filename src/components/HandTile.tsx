import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand } from "./Hand";
import { Lock } from "lucide-react";

export type HandTileState =
  | "empty"
  | "locked"
  | "revealing"
  | "revealed"
  | "out"
  | "scored";

export interface HandTileProps {
  playerName: string;
  isUser: boolean;
  role: "batting" | "bowling";
  state: HandTileState;
  pick: number | null; // null if hidden
  showUserPreview?: boolean; // if true and isUser, preview secret pick
  countdownNumber?: number | null; // 3, 2, 1
  mirrored?: boolean; // for opponent facing player
  className?: string;
}

export const HandTile: React.FC<HandTileProps> = ({
  playerName,
  isUser,
  role,
  state,
  pick,
  showUserPreview = true,
  countdownNumber = null,
  mirrored = false,
  className = "",
}) => {
  const isBatting = role === "batting";
  const accentColor = isUser ? "var(--color-turf)" : "var(--color-sky)";
  const tagBg = isBatting
    ? "bg-turf/10 text-turf border-turf/30"
    : "bg-sky/10 text-sky border-sky/30";

  const displayName = isUser ? "You" : playerName;

  // Derive dynamic border and shadow for out / scored states
  let cardBorder = "border-2 border-pure-black";
  if (state === "out") {
    cardBorder = "border-2 border-pure-black bg-firecracker-red/15";
  } else if (state === "scored") {
    cardBorder = "border-2 border-pure-black bg-hi-vis-yellow/20";
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-between p-3 sm:p-5 rounded-[6px] bg-bone-white text-ink-black select-none transition-all duration-200 min-h-[160px] sm:min-h-[220px] flex-1 shadow-none ${cardBorder} ${className}`}
      role="region"
      aria-label={`${displayName} arena hand tile (${state})`}
    >
      {/* Header Info */}
      <div className="w-full flex items-center justify-between gap-2 border-b-2 border-pure-black pb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full border border-pure-black"
            style={{ backgroundColor: accentColor }}
          />
          <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-pure-black font-heading">
            {displayName}
          </span>
        </div>

        <span
          className={`text-[10px] font-mono font-black tracking-wider px-2 py-0.5 rounded-[100px] border border-pure-black ${
            isBatting ? "bg-hi-vis-yellow text-pure-black" : "bg-matcha-cream text-pure-black"
          }`}
        >
          {isBatting ? "BATTING" : "BOWLING"}
        </span>
      </div>

      {/* Main Gesture Arena Body */}
      <div className="flex-1 flex flex-col items-center justify-center my-2 sm:my-3 relative w-full">
        <AnimatePresence mode="wait">
          {/* STATE 1: EMPTY / WAITING */}
          {state === "empty" && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-1.5"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border border-dashed border-line flex items-center justify-center text-muted/50">
                <span className="font-heading font-black text-xl sm:text-2xl">?</span>
              </div>
              <span className="text-[11px] sm:text-xs font-medium text-muted uppercase tracking-wider">
                {isUser ? "Choose a number" : "Opponent thinking..."}
              </span>
            </motion.div>
          )}

          {/* STATE 2: LOCKED IN (Hidden pick) */}
          {state === "locked" && (
            <motion.div
              key="locked"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center justify-center gap-1.5"
            >
              <div
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border border-line bg-surface-2 flex items-center justify-center shadow-inner"
                style={{ borderColor: accentColor }}
              >
                {isUser && showUserPreview && pick ? (
                  <div className="flex flex-col items-center justify-center">
                    <span className="font-heading font-black text-2xl sm:text-3xl tabular-nums text-chalk">
                      {pick}
                    </span>
                    <span className="text-[8px] text-turf uppercase font-bold tracking-wider">
                      LOCKED
                    </span>
                  </div>
                ) : (
                  <Lock className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" style={{ color: accentColor }} />
                )}
              </div>
              <span className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-chalk flex items-center gap-1">
                <Lock className="w-3 h-3" style={{ color: accentColor }} />
                {isUser ? "Locked In" : "Opponent Locked In"}
              </span>
            </motion.div>
          )}

          {/* STATE 3: SYNC REVEAL COUNTDOWN */}
          {state === "revealing" && (
            <motion.div
              key={`revealing-${countdownNumber}`}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center gap-1.5"
            >
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border-2 border-amber bg-surface-2 flex items-center justify-center">
                <span className="font-heading font-black text-3xl sm:text-4xl text-amber tabular-nums">
                  {countdownNumber ?? "..."}
                </span>
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-amber uppercase tracking-widest">
                REVEALING
              </span>
            </motion.div>
          )}

          {/* STATE 4: REVEALED / OUT / SCORED */}
          {(state === "revealed" || state === "out" || state === "scored") && pick !== null && (
            <motion.div
              key={`revealed-${state}-${pick}`}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              className="flex flex-col items-center justify-center gap-1.5"
            >
              {/* Hand Icon with Mirrored Support */}
              <div
                className={`p-1.5 sm:p-2.5 rounded-full bg-surface-2 border border-line flex items-center justify-center transition-transform hover:scale-105 ${
                  state === "out" ? "text-ball border-ball/50" : state === "scored" ? "text-amber border-amber/50" : ""
                }`}
                style={{ color: state === "revealed" ? accentColor : undefined }}
              >
                <Hand value={pick} size={48} mirrored={mirrored} className="sm:w-16 sm:h-16" />
              </div>

              {/* Number and Label Pill */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-heading font-black text-2xl sm:text-3xl tabular-nums ${
                    state === "out" ? "text-ball" : state === "scored" ? "text-amber" : "text-chalk"
                  }`}
                >
                  {pick}
                </span>
                <span
                  className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider ${
                    state === "out" ? "text-ball font-bold" : state === "scored" ? "text-amber font-bold" : "text-muted"
                  }`}
                >
                  {state === "out" ? "WICKET!" : state === "scored" ? (isBatting ? `+${pick} RUNS` : "DELIVERY") : isBatting ? "Runs" : "Delivery"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Status Line */}
      <div className="w-full text-center pt-2 border-t border-line text-[11px] text-muted uppercase tracking-wider font-heading">
        {state === "out" ? (
          <span className="text-ball font-bold">DISMISSED (OUT)</span>
        ) : state === "scored" ? (
          <span className="text-amber font-bold">SCORED +{pick}</span>
        ) : state === "revealed" && pick !== null ? (
          <span className="text-chalk font-semibold">Played {pick}</span>
        ) : state === "locked" ? (
          <span className="text-muted">Awaiting reveal</span>
        ) : (
          <span>Turn in progress</span>
        )}
      </div>
    </div>
  );
};

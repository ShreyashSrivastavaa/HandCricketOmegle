import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand } from "./Hand";
import { Lock, Sparkles, XCircle } from "lucide-react";

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
  pick: number | null;
  showUserPreview?: boolean;
  countdownNumber?: number | null;
  mirrored?: boolean;
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
  const displayName = isUser ? "You" : playerName;

  let cardStyle = "border-line bg-surface/80";
  if (state === "out") {
    cardStyle = "border-ball/60 bg-gradient-to-b from-ball/[0.12] to-surface/90 shadow-glow-ball";
  } else if (state === "scored") {
    cardStyle = "border-amber/50 bg-gradient-to-b from-amber/[0.1] to-surface/90 shadow-[0_0_42px_-10px_rgba(247,181,0,0.35)]";
  } else if (state === "locked") {
    cardStyle = "border-turf/40 bg-gradient-to-b from-turf/[0.06] to-surface/90";
  }

  const roleStyle = isBatting
    ? "border-turf/25 bg-turf/10 text-turf"
    : "border-sky/25 bg-sky/10 text-sky";

  return (
    <div
      className={`match-hand-tile relative flex h-full min-h-0 flex-1 select-none flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border p-2.5 sm:p-3 shadow-panel backdrop-blur-sm transition-all duration-200 ${cardStyle} ${className}`}
      role="region"
      aria-label={`${displayName} arena hand tile (${state})`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/[0.025] to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 flex items-center justify-between gap-1.5 border-b border-line/60 pb-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              isUser ? "bg-turf shadow-[0_0_10px_rgba(247,181,0,0.5)]" : "bg-sky shadow-[0_0_10px_rgba(34,197,94,0.5)]"
            }`}
            aria-hidden="true"
          />
          <span
            title={playerName}
            className="truncate font-heading text-xs sm:text-sm font-black uppercase tracking-wide text-chalk"
          >
            {displayName}
          </span>
        </div>

        <span
          title={isBatting ? "Batting" : "Bowling"}
          className={`shrink-0 rounded-full border px-1.5 py-0.2 font-heading text-[8px] font-black uppercase tracking-[0.12em] ${roleStyle}`}
        >
          {isBatting ? "Bat" : "Bowl"}
        </span>
      </div>

      <div className="match-tile-inner relative z-10 flex w-full flex-1 min-h-0 flex-col items-center justify-center py-1 sm:py-2">
        <AnimatePresence mode="wait">
          {state === "empty" && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-1.5 sm:gap-2"
            >
              <div className="match-tile-box flex h-11 w-11 sm:h-13 sm:w-13 md:h-14 md:w-14 items-center justify-center rounded-xl border border-dashed border-line/80 bg-surface-2/40 text-muted/60 shadow-inner">
                <span className="font-heading text-xl font-black text-muted/70 sm:text-2xl">?</span>
              </div>
              <span className="text-center font-heading text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                {isUser ? "Choose your hand" : "Reading opponent..."}
              </span>
            </motion.div>
          )}

          {state === "locked" && (
            <motion.div
              key="locked"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center justify-center gap-1.5"
            >
              <div className="match-tile-box relative flex h-11 w-11 sm:h-13 sm:w-13 md:h-14 md:w-14 items-center justify-center rounded-xl border border-turf/35 bg-turf/[0.07] shadow-glow">
                {isUser && showUserPreview && pick ? (
                  <>
                    <Hand value={pick} size={28} className="text-turf sm:hidden" />
                    <Hand value={pick} size={36} className="hidden text-turf sm:block" />
                    <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-surface bg-turf px-0.5 font-heading text-[9px] font-black text-ink">
                      {pick}
                    </span>
                  </>
                ) : (
                  <Lock className="h-5 w-5 text-turf sm:h-6 sm:w-6" strokeWidth={2.4} />
                )}
              </div>
              <span className="flex items-center gap-1 rounded-full border border-turf/25 bg-turf/[0.06] px-2 py-0.5 font-heading text-[8px] sm:text-[9px] font-black uppercase tracking-[0.12em] text-turf">
                <Lock className="h-2.5 w-2.5" />
                {isUser ? "Pick locked" : "Opponent locked"}
              </span>
            </motion.div>
          )}

          {state === "revealing" && (
            <motion.div
              key={`revealing-${countdownNumber}`}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center gap-1.5"
            >
              <div className="match-tile-box relative flex h-11 w-11 sm:h-13 sm:w-13 md:h-14 md:w-14 items-center justify-center rounded-full border-2 border-amber/60 bg-amber/[0.06]">
                <span className="absolute inset-0 animate-ping rounded-full border border-amber/20" />
                <span className="font-heading text-2xl font-black tabular-nums text-amber sm:text-3xl">
                  {countdownNumber ?? "..."}
                </span>
              </div>
              <span className="font-heading text-[8px] sm:text-[9px] font-black uppercase tracking-[0.18em] text-amber">
                Revealing
              </span>
            </motion.div>
          )}

          {(state === "revealed" || state === "out" || state === "scored") && pick !== null && (
            <motion.div
              key={`revealed-${state}-${pick}`}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              className="flex flex-col items-center justify-center gap-1"
            >
              <div
                className={`match-tile-box relative flex h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center rounded-xl sm:rounded-2xl border ${
                  state === "out"
                    ? "border-ball/50 bg-ball/10 text-ball"
                    : state === "scored"
                    ? "border-amber/50 bg-amber/10 text-amber"
                    : isUser
                    ? "border-turf/35 bg-turf/[0.06] text-turf"
                    : "border-sky/35 bg-sky/[0.06] text-sky"
                }`}
              >
                <Hand value={pick} size={32} mirrored={mirrored} className="sm:hidden" />
                <Hand value={pick} size={42} mirrored={mirrored} className="hidden sm:block" />
                {state === "out" && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ball text-white">
                    <XCircle className="h-3.5 w-3.5" />
                  </span>
                )}
                {state === "scored" && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber text-ink">
                    <Sparkles className="h-3 w-3 fill-current" />
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <span
                  className={`font-heading text-xl font-black tabular-nums sm:text-2xl ${
                    state === "out" ? "text-ball" : state === "scored" ? "text-amber" : "text-chalk"
                  }`}
                >
                  {pick}
                </span>
                <span
                  className={`font-heading text-[8px] sm:text-[9px] font-black uppercase tracking-[0.12em] ${
                    state === "out" ? "text-ball" : state === "scored" ? "text-amber" : "text-muted"
                  }`}
                >
                  {state === "out"
                    ? "Wicket!"
                    : state === "scored"
                    ? isBatting
                      ? `+${pick} runs`
                      : "Delivery"
                    : isBatting
                    ? "Runs"
                    : "Delivery"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-10 border-t border-line/60 pt-1 text-center">
        {state === "out" ? (
          <span className="font-heading text-[9px] font-black uppercase tracking-[0.16em] text-ball">
            Dismissed
          </span>
        ) : state === "scored" ? (
          <span className="font-heading text-[9px] font-black uppercase tracking-[0.16em] text-amber">
            Scored +{pick}
          </span>
        ) : state === "revealed" && pick !== null ? (
          <span className="font-heading text-[9px] font-bold uppercase tracking-[0.16em] text-chalk/80">
            Played {pick}
          </span>
        ) : state === "locked" ? (
          <span className="font-heading text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
            Awaiting reveal
          </span>
        ) : state === "revealing" ? (
          <span className="font-heading text-[9px] font-bold uppercase tracking-[0.16em] text-amber">
            Balls in sync
          </span>
        ) : (
          <span className="font-heading text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
            {isUser ? "Your turn" : "Waiting"}
          </span>
        )}
      </div>
    </div>
  );
};

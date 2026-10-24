import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand } from "./Hand";
import { Lock, Eye, Sparkles, XCircle } from "lucide-react";

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
      className={`relative flex min-h-[184px] flex-1 select-none flex-col justify-between overflow-hidden rounded-[22px] border p-3.5 shadow-panel backdrop-blur-sm transition-all duration-200 sm:min-h-[248px] sm:p-4 ${cardStyle} ${className}`}
      role="region"
      aria-label={`${displayName} arena hand tile (${state})`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.025] to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 flex items-center justify-between gap-2 border-b border-line/60 pb-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              isUser ? "bg-turf shadow-[0_0_10px_rgba(247,181,0,0.5)]" : "bg-sky shadow-[0_0_10px_rgba(34,197,94,0.5)]"
            }`}
            aria-hidden="true"
          />
          <span
            title={playerName}
            className="truncate font-heading text-sm font-black uppercase tracking-wide text-chalk"
          >
            {displayName}
          </span>
        </div>

        <span
          title={isBatting ? "Batting" : "Bowling"}
          className={`shrink-0 rounded-full border px-2 py-0.5 font-heading text-[8px] font-black uppercase tracking-[0.14em] ${roleStyle}`}
        >
          {isBatting ? "Bat" : "Bowl"}
        </span>
      </div>

      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center py-3">
        <AnimatePresence mode="wait">
          {state === "empty" && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-2.5"
            >
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-line bg-surface-2/30 text-muted/50 sm:h-20 sm:w-20">
                  <span className="font-heading text-2xl font-black sm:text-3xl">?</span>
                </div>
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-muted">
                  <Eye className="h-2.5 w-2.5" />
                </span>
              </div>
              <span className="text-center font-heading text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
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
              className="flex flex-col items-center justify-center gap-2.5"
            >
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-turf/35 bg-turf/[0.07] shadow-glow sm:h-20 sm:w-20">
                {isUser && showUserPreview && pick ? (
                  <>
                    <Hand value={pick} size={38} className="text-turf sm:hidden" />
                    <Hand value={pick} size={48} className="hidden text-turf sm:block" />
                    <span className="absolute -bottom-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-surface bg-turf px-1 font-heading text-[10px] font-black text-ink">
                      {pick}
                    </span>
                  </>
                ) : (
                  <Lock className="h-6 w-6 text-turf sm:h-7 sm:w-7" strokeWidth={2.4} />
                )}
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-turf/25 bg-turf/[0.06] px-2.5 py-1 font-heading text-[9px] font-black uppercase tracking-[0.14em] text-turf">
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
              className="flex flex-col items-center justify-center gap-2.5"
            >
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber/60 bg-amber/[0.06] sm:h-20 sm:w-20">
                <span className="absolute inset-0 animate-ping rounded-full border border-amber/20" />
                <span className="font-heading text-3xl font-black tabular-nums text-amber sm:text-4xl">
                  {countdownNumber ?? "..."}
                </span>
              </div>
              <span className="font-heading text-[9px] font-black uppercase tracking-[0.2em] text-amber">
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
              className="flex flex-col items-center justify-center gap-1.5"
            >
              <div
                className={`relative flex h-[72px] w-[72px] items-center justify-center rounded-2xl border sm:h-24 sm:w-24 ${
                  state === "out"
                    ? "border-ball/50 bg-ball/10 text-ball"
                    : state === "scored"
                    ? "border-amber/50 bg-amber/10 text-amber"
                    : isUser
                    ? "border-turf/35 bg-turf/[0.06] text-turf"
                    : "border-sky/35 bg-sky/[0.06] text-sky"
                }`}
              >
                <Hand value={pick} size={44} mirrored={mirrored} className="sm:hidden" />
                <Hand value={pick} size={58} mirrored={mirrored} className="hidden sm:block" />
                {state === "out" && (
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ball text-white">
                    <XCircle className="h-4 w-4" />
                  </span>
                )}
                {state === "scored" && (
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber text-ink">
                    <Sparkles className="h-3.5 w-3.5 fill-current" />
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className={`font-heading text-2xl font-black tabular-nums sm:text-3xl ${
                    state === "out" ? "text-ball" : state === "scored" ? "text-amber" : "text-chalk"
                  }`}
                >
                  {pick}
                </span>
                <span
                  className={`font-heading text-[9px] font-black uppercase tracking-[0.14em] ${
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

      <div className="relative z-10 border-t border-line/60 pt-2 text-center">
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
            Turn in progress
          </span>
        )}
      </div>
    </div>
  );
};

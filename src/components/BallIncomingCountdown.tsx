"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playClickSound, isSoundMuted } from "@/lib/client/audio";
import type { HandGesture } from "@/lib/gesture/handClassifier";

export type CountdownStage = "ready" | "countdown" | "throwing" | "resolving" | "result";

interface BallIncomingCountdownProps {
  countdownNumber: number | null;
  stage: CountdownStage;
  detectedGesture?: HandGesture | null;
  isTapMode?: boolean;
  selectedNum?: number | null;
  isLocked?: boolean;
  userPick?: number | null;
  outcomeText?: string | null;
  isOutcomeWicket?: boolean;
  className?: string;
}

export function BallIncomingCountdownBadge({
  countdownNumber,
  stage,
}: {
  countdownNumber: number | null;
  stage: CountdownStage;
}) {
  // Audio cue on each countdown tick
  useEffect(() => {
    if (stage === "countdown" && countdownNumber !== null && !isSoundMuted()) {
      playClickSound();
    }
  }, [countdownNumber, stage]);

  if (stage !== "countdown" || countdownNumber === null) {
    return null;
  }

  return (
    <div
      className="pointer-events-none relative z-30 flex items-center justify-center"
      aria-live="assertive"
      aria-label={`Ball countdown: ${countdownNumber}`}
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`countdown-badge-${countdownNumber}`}
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.75, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 24,
            mass: 0.6,
          }}
          className="flex h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 items-center justify-center rounded-full border-4 border-black bg-[#FF5FB2] shadow-[4px_4px_0px_#000]"
        >
          <span className="font-heading text-4xl sm:text-5xl md:text-6xl font-black text-white select-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]">
            {countdownNumber}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function CameraDetectionPill({
  detectedGesture,
  isTapMode,
  selectedNum,
  isLocked,
  userPick,
}: {
  detectedGesture?: HandGesture | null;
  isTapMode?: boolean;
  selectedNum?: number | null;
  isLocked?: boolean;
  userPick?: number | null;
}) {
  if (isLocked) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-[#86efac] px-2.5 py-1 font-heading text-[10px] sm:text-xs font-black uppercase text-black shadow-[2px_2px_0px_#000]">
        <span>🔒</span>
        <span>LOCKED: {userPick ?? selectedNum}</span>
      </span>
    );
  }

  if (isTapMode) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-[#93c5fd] px-2.5 py-1 font-heading text-[10px] sm:text-xs font-black uppercase text-black shadow-[2px_2px_0px_#000]">
        <span>📱</span>
        <span>TAP MODE {selectedNum ? `(${selectedNum})` : ""}</span>
      </span>
    );
  }

  if (detectedGesture !== null && detectedGesture !== undefined) {
    const label =
      detectedGesture === 5
        ? "OPEN PALM (5)"
        : detectedGesture === 6
        ? "THUMBS UP (6)"
        : `${detectedGesture} ${detectedGesture === 1 ? "FINGER" : "FINGERS"}`;

    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-[#86efac] px-2.5 py-1 font-heading text-[10px] sm:text-xs font-black uppercase text-black shadow-[2px_2px_0px_#000]">
        <span>✋</span>
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-[#fef08a] px-2.5 py-1 font-heading text-[10px] sm:text-xs font-black uppercase text-black shadow-[2px_2px_0px_#000]">
      <span>🤏</span>
      <span>NO HAND</span>
    </span>
  );
}

export function BallIncomingStatusPanel({
  stage,
  countdownNumber,
  userPick,
  outcomeText,
  isOutcomeWicket,
  className = "",
}: {
  stage: CountdownStage;
  countdownNumber: number | null;
  userPick?: number | null;
  outcomeText?: string | null;
  isOutcomeWicket?: boolean;
  className?: string;
}) {
  const isResolving = stage === "throwing" || stage === "resolving";
  const isResult = stage === "result" || !!outcomeText;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border-4 border-black bg-[#FFD600] p-4 sm:p-5 text-left shadow-[4px_4px_0px_#000] transition-all ${className}`}
      role="status"
      aria-live="polite"
    >
      {isResult ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3
              className={`font-heading text-xl sm:text-2xl font-black uppercase tracking-wide leading-none ${
                isOutcomeWicket ? "text-red-700" : "text-black"
              }`}
            >
              {outcomeText || "DELIVERY COMPLETE"}
            </h3>
            <p className="mt-1 font-bold text-xs sm:text-sm text-black/85 leading-tight">
              {isOutcomeWicket
                ? "Wicket fell! Crease resetting for next batter."
                : "Runs scored! Next ball incoming."}
            </p>
          </div>
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-black font-heading text-lg sm:text-xl font-black text-[#FFD600] shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
            {isOutcomeWicket ? "W" : outcomeText?.replace(/[^0-9]/g, "") || "🏏"}
          </div>
        </div>
      ) : isResolving ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-xl sm:text-2xl font-black uppercase tracking-wide text-black leading-none flex items-center gap-2">
              <span>THROW IN FLIGHT!</span>
              <span className="inline-block animate-bounce">🏏</span>
            </h3>
            <p className="mt-1 font-bold text-xs sm:text-sm text-black/85 leading-tight">
              {userPick !== null && userPick !== undefined
                ? `Locked in with ${userPick}. Calculating outcome...`
                : "Resolving delivery..."}
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-black text-[#FFD600] font-heading font-black text-base animate-pulse">
            {userPick ?? "..."}
          </div>
        </div>
      ) : (
        <div>
          <h3 className="font-heading text-xl sm:text-2xl font-black uppercase tracking-wide text-black leading-none">
            BALL INCOMING
          </h3>
          <p className="mt-1.5 font-bold text-xs sm:text-sm text-black/90 leading-tight">
            Hand up in frame. The throw happens on one.
          </p>
        </div>
      )}
    </div>
  );
}

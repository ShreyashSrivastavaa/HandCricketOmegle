"use client";

import React, { useEffect } from "react";
import { Button } from "./Button";
import { Check, X, Users, Video, ShieldCheck, Sparkles } from "lucide-react";
import { TimerRing } from "./TimerRing";

export interface ReadyCheckModalProps {
  isOpen: boolean;
  opponentName: string;
  countdownSeconds: number;
  hasConfirmed: boolean;
  onConfirm: () => void;
  onDecline: () => void;
  matchMode?: "video" | "game_only";
}

/**
 * Mutual 5-second Ready-Check Modal (REL-02).
 * Verifies both players are active and focused before establishing WebRTC video
 * or initiating toss/game delivery countdowns.
 */
export const ReadyCheckModal: React.FC<ReadyCheckModalProps> = ({
  isOpen,
  opponentName,
  countdownSeconds,
  hasConfirmed,
  onConfirm,
  onDecline,
  matchMode = "video",
}) => {
  useEffect(() => {
    if (isOpen && typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Match Ready Check"
    >
      <div className="w-full max-w-sm bg-surface border-2 border-turf rounded-[16px] p-6 flex flex-col items-center text-center shadow-2xl relative overflow-hidden select-none animate-scaleUp">
        {/* Glow */}
        <div className="absolute -top-16 inset-x-0 h-32 bg-turf/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-turf/40 bg-turf/10 text-turf text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Opponent Found!</span>
        </div>

        {/* Title */}
        <h2 className="font-heading font-black text-2xl uppercase tracking-tight text-chalk">
          Match Ready Check
        </h2>

        {/* Opponent Info */}
        <div className="flex items-center gap-2 my-2 px-3 py-1.5 bg-surface-2 rounded-lg border border-line text-sm">
          <Users className="w-4 h-4 text-turf" />
          <span className="text-muted">Matched with:</span>
          <span className="font-bold text-chalk">{opponentName}</span>
          {matchMode === "video" && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber uppercase font-semibold ml-1">
              <Video className="w-3 h-3" />
              Live
            </span>
          )}
        </div>

        {/* 5-Second Countdown Ring */}
        <div className="my-4 flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            <TimerRing
              remainingSeconds={countdownSeconds}
              totalSeconds={5}
              size={80}
              strokeWidth={6}
            />
            <span className="absolute font-heading font-black text-3xl text-turf tabular-nums">
              {countdownSeconds}
            </span>
          </div>
          <span className="text-[11px] text-muted uppercase font-heading tracking-wider mt-2">
            Confirm before time expires
          </span>
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-2.5 mt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={onConfirm}
            disabled={hasConfirmed}
            className={`w-full py-4 text-base font-heading font-black uppercase flex items-center justify-center gap-2 ${
              hasConfirmed
                ? "bg-turf/60 text-ink cursor-default"
                : "bg-turf hover:bg-turf/90 text-ink active:scale-98"
            }`}
          >
            {hasConfirmed ? (
              <>
                <Check className="w-5 h-5 stroke-[3]" />
                <span>READY! WAITING FOR OPPONENT...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                <span>I&apos;M READY! 🏏</span>
              </>
            )}
          </Button>

          {!hasConfirmed && (
            <button
              type="button"
              onClick={onDecline}
              className="py-2.5 text-xs text-muted hover:text-ball uppercase font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Decline / Find Another</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

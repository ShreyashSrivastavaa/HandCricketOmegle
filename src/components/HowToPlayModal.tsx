import React, { useEffect } from "react";
import { X, Trophy, Swords, Zap, AlertCircle } from "lucide-react";
import { Hand } from "./Hand";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface border border-line rounded-[16px] shadow-2xl p-5 sm:p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-turf/15 text-turf">
              <Swords className="w-5 h-5" />
            </span>
            <h2 id="rules-title" className="font-heading font-black text-2xl uppercase tracking-wider text-chalk">
              How to Play Hand Cricket
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rules"
            className="p-1.5 rounded-full hover:bg-surface-2 text-muted hover:text-chalk transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rules Content */}
        <div className="flex flex-col gap-4 text-sm text-chalk/90 leading-relaxed">
          {/* Step 1: The Core Mechanic */}
          <div className="p-3.5 rounded-xl bg-surface-2/60 border border-line flex flex-col gap-2">
            <span className="text-xs font-heading font-bold text-turf uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> 1. The Core Duel
            </span>
            <p className="text-xs text-muted">
              Each ball, both players secretly choose a number from <strong>1 to 6</strong> at the same time:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-lg bg-ink/70 border border-line/60 flex flex-col gap-1">
                <span className="text-xs font-bold text-ball uppercase">Different Numbers</span>
                <span className="text-[11px] text-muted">
                  Batter scores their chosen number of runs (e.g., 4 or 6).
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-ink/70 border border-line/60 flex flex-col gap-1">
                <span className="text-xs font-bold text-amber uppercase">Same Number</span>
                <span className="text-[11px] text-muted">
                  Batter is <strong>OUT (Wicket)</strong>! Both picked identical digits.
                </span>
              </div>
            </div>
          </div>

          {/* Gesture reference */}
          <div className="p-3.5 rounded-xl bg-surface-2/60 border border-line flex flex-col gap-2.5">
            <span className="text-xs font-heading font-bold text-turf uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> How to Show Numbers (Camera Gestures)
            </span>
            <p className="text-xs text-muted">
              Hold your hand clearly in the camera view. MediaPipe analyzes extended fingers on your device:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-ink/70 border border-line/60 flex items-center gap-2">
                <span className="font-heading font-black text-turf text-base w-5 text-center">1</span>
                <span className="text-[11px] text-muted">Index finger only</span>
              </div>
              <div className="p-2 rounded-lg bg-ink/70 border border-line/60 flex items-center gap-2">
                <span className="font-heading font-black text-turf text-base w-5 text-center">2</span>
                <span className="text-[11px] text-muted">Index + Middle</span>
              </div>
              <div className="p-2 rounded-lg bg-ink/70 border border-line/60 flex items-center gap-2">
                <span className="font-heading font-black text-turf text-base w-5 text-center">3</span>
                <span className="text-[11px] text-muted">Index + Middle + Ring</span>
              </div>
              <div className="p-2 rounded-lg bg-ink/70 border border-line/60 flex items-center gap-2">
                <span className="font-heading font-black text-turf text-base w-5 text-center">4</span>
                <span className="text-[11px] text-muted">4 fingers (thumb curled)</span>
              </div>
              <div className="p-2 rounded-lg bg-ink/70 border border-line/60 flex items-center gap-2">
                <span className="font-heading font-black text-turf text-base w-5 text-center">5</span>
                <span className="text-[11px] text-muted">Open palm (all 5 fingers)</span>
              </div>
              <div className="p-2 rounded-lg bg-ink/70 border border-line/60 flex items-center gap-2">
                <span className="font-heading font-black text-amber text-base w-5 text-center">6</span>
                <span className="text-[11px] text-muted"><strong>Thumbs-Up</strong> (thumb only)</span>
              </div>
            </div>
            <p className="text-[10px] text-muted italic">
              💡 Stability: Hold gesture steady for ~300ms to lock. Low light? Tap buttons 1–6 anytime.
            </p>
          </div>

          {/* Step 2: Coin Toss */}
          <div className="p-3.5 rounded-xl bg-surface-2/60 border border-line flex flex-col gap-1.5">
            <span className="text-xs font-heading font-bold text-sky uppercase tracking-wider">
              2. The Coin Toss
            </span>
            <p className="text-xs text-muted">
              Player 1 calls <strong>Odd</strong> or <strong>Even</strong>. Both pick a number 1–6. If the sum matches the call, the caller wins the toss and chooses to <strong>Bat</strong> or <strong>Bowl</strong>.
            </p>
          </div>

          {/* Step 3: Match Modes */}
          <div className="p-3.5 rounded-xl bg-surface-2/60 border border-line flex flex-col gap-2">
            <span className="text-xs font-heading font-bold text-amber uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-4 h-4" /> 3. Match Modes
            </span>
            <ul className="text-xs text-muted space-y-1.5 list-disc pl-4">
              <li>
                <strong className="text-chalk">Sudden Death (Default):</strong> 1 wicket per innings. Maximum adrenaline — one mistake and you&apos;re out!
              </li>
              <li>
                <strong className="text-chalk">Classic Mode:</strong> 2 wickets, 2 overs (12 balls). Tactical pacing and chase strategy.
              </li>
              <li>
                <strong className="text-amber">Endless Mode:</strong> No over limit! Keep batting until you are out.
                <br />
                • <strong>1v1 Endless:</strong> Player A bats until out, then Player B chases with live Target &amp; Runs needed. Higher score wins; a tie triggers a 1-ball Super-Over sudden death decider!
                <br />
                • <strong>Solo Endless:</strong> Bat against the Practice Bot, track your scoring streak, and save your personal best to the global leaderboard!
                <br />
                • <strong>Endless Pro:</strong> Choose the 3-wicket variant for longer, deeper innings.
              </li>
            </ul>
          </div>

          {/* 10s Timer Warning */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber/10 border border-amber/30 text-amber text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Turn clock: 10s per ball with a 3-2-1 &quot;Get Ready&quot; countdown. If no hand is detected, the last stable reading or random pick is used.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-line flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-turf text-ink font-heading font-black text-base uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            Got It, Let&apos;s Play!
          </button>
        </div>
      </div>
    </div>
  );
};

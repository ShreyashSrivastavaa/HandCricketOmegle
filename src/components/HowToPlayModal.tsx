import React, { useEffect } from "react";
import { X, Trophy, Swords, Zap, AlertCircle, Camera, Timer, ShieldCheck } from "lucide-react";
import { Hand } from "./Hand";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GESTURE_GUIDE = [
  { value: 1, label: "Index finger" },
  { value: 2, label: "Two fingers" },
  { value: 3, label: "Three fingers" },
  { value: 4, label: "Four fingers" },
  { value: 5, label: "Open palm" },
  { value: 6, label: "Thumbs up" },
];

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-md sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
      onClick={onClose}
    >
      <div
        className="animate-fade-up relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[26px] border border-line bg-surface shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pitch-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-turf/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-start justify-between gap-4 border-b border-line/70 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-turf/30 bg-turf/10 text-turf">
              <Swords className="h-5 w-5" />
            </span>
            <div>
              <h2
                id="rules-title"
                className="font-heading text-2xl font-black uppercase tracking-tight text-chalk sm:text-3xl"
              >
                How to Play Hand Cricket
              </h2>
              <p className="mt-0.5 text-[11px] text-muted">
                The schoolyard classic, umpired by your camera.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rules"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2/50 text-muted transition-colors hover:border-turf/40 hover:text-chalk"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative z-10 flex flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="rounded-2xl border border-line/70 bg-surface-2/40 p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-turf" />
              <span className="font-heading text-[11px] font-black uppercase tracking-[0.16em] text-turf">
                1. The Core Duel
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Each ball, both players secretly choose a number from <strong className="text-chalk">1 to 6</strong> at
              the same time. The batter scores if the numbers differ. If both pick the same number, the
              batter is out.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="flex items-start gap-2.5 rounded-xl border border-turf/20 bg-turf/[0.06] p-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-turf/15 text-[10px] font-black text-turf">
                  +
                </span>
                <div>
                  <p className="font-heading text-[11px] font-black uppercase tracking-wide text-turf">
                    Different numbers
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                    The batter adds their chosen number to the score.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl border border-ball/20 bg-ball/[0.06] p-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ball/15 text-[10px] font-black text-ball">
                  W
                </span>
                <div>
                  <p className="font-heading text-[11px] font-black uppercase tracking-wide text-ball">
                    Same number
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                    Wicket! The batter is dismissed and the innings ends.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line/70 bg-surface-2/40 p-4">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-sky" />
              <span className="font-heading text-[11px] font-black uppercase tracking-[0.16em] text-sky">
                Camera gestures
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Hold your hand clearly in the camera and keep it steady. The arena locks the most
              stable gesture before reveal. Low light? Tap mode is always one tap away.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {GESTURE_GUIDE.map(({ value, label }) => (
                <div
                  key={value}
                  className={`flex flex-col items-center rounded-xl border p-2 text-center ${
                    value === 6
                      ? "border-amber/25 bg-amber/[0.06]"
                      : "border-line/60 bg-surface/60"
                  }`}
                >
                  <Hand value={value} size={30} className={value === 6 ? "text-amber" : "text-turf"} />
                  <span className="mt-1 font-heading text-sm font-black tabular-nums text-chalk">{value}</span>
                  <span className="text-[9px] uppercase tracking-[0.08em] text-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-line/70 bg-surface-2/40 p-4">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-amber" />
                <span className="font-heading text-[11px] font-black uppercase tracking-[0.16em] text-amber">
                  2. The coin toss
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                One player calls <strong className="text-chalk">Odd</strong> or{" "}
                <strong className="text-chalk">Even</strong>. Both pick 1–6. The winner of the sum chooses to bat
                or bowl first.
              </p>
            </div>

            <div className="rounded-2xl border border-line/70 bg-surface-2/40 p-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-turf" />
                <span className="font-heading text-[11px] font-black uppercase tracking-[0.16em] text-turf">
                  3. Match formats
              </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Go all-in with a single wicket, play a two-over classic, or chase an endless score
                until you are finally out. Every format uses the same hand-cricket core.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-amber/25 bg-amber/[0.06] p-3.5 text-amber">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-[11px] leading-relaxed">
              <strong>Turn clock:</strong> each ball has a short countdown. If time runs out, the
              arena auto-locks your last stable gesture or a fallback pick so the match never stalls.
            </p>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-line/60 bg-surface/50 p-3.5 text-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-turf" />
            <p className="text-[11px] leading-relaxed">
              <strong className="text-chalk">Private by design:</strong> finger detection runs locally
              on your device. Video is peer-to-peer and is never recorded or stored. Stranger mode is
              strictly 18+.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between gap-3 border-t border-line/70 px-5 py-4 sm:px-6">
          <span className="hidden items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted sm:flex">
            <Swords className="h-3.5 w-3.5 text-turf" />
            See you on the pitch
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-turf px-6 py-3 font-heading text-sm font-black uppercase tracking-wider text-ink shadow-glow transition-colors hover:bg-turf-hover sm:w-auto"
          >
            Got It, Let&apos;s Play!
          </button>
        </div>
      </div>
    </div>
  );
};

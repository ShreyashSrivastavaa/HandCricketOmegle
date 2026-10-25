import React, { useEffect } from "react";
import { Hand } from "./Hand";
import { Button } from "./Button";
import { Lock, Zap, Keyboard } from "lucide-react";

export interface NumberPadProps {
  selectedNumber: number | null;
  onSelectNumber: (num: number) => void;
  onConfirmLock: () => void;
  isLocked: boolean;
  disabled?: boolean;
  tapToLock: boolean;
  onToggleTapToLock: () => void;
  hideHeader?: boolean;
  className?: string;
}

export const NumberPad: React.FC<NumberPadProps> = ({
  selectedNumber,
  onSelectNumber,
  onConfirmLock,
  isLocked,
  disabled = false,
  tapToLock,
  onToggleTapToLock,
  hideHeader = false,
  className = "",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || isLocked) return;

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 6) {
        e.preventDefault();
        onSelectNumber(num);
        if (tapToLock) {
          onConfirmLock();
        }
      } else if (e.key === "Enter" || e.key === " ") {
        if (selectedNumber && !tapToLock) {
          e.preventDefault();
          onConfirmLock();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disabled, isLocked, selectedNumber, tapToLock, onSelectNumber, onConfirmLock]);

  const handlePick = (num: number) => {
    if (disabled || isLocked) return;
    onSelectNumber(num);
    if (tapToLock) {
      setTimeout(() => {
        onConfirmLock();
      }, 50);
    }
  };

  const numbers = [1, 2, 3, 4, 5, 6];

  return (
    <div
      className={`flex w-full select-none flex-col items-center gap-1.5 sm:gap-2 ${className}`}
      role="group"
      aria-label="Hand cricket number picker 1 to 6"
    >
      {!hideHeader && (
        <div className="flex w-full items-center justify-between gap-2 px-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                isLocked ? "bg-turf" : disabled ? "bg-muted" : "animate-pulse bg-amber"
              }`}
            />
            <span className="truncate font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              {isLocked
                ? "Pick locked · get ready"
                : disabled
                ? "Waiting for next delivery"
                : tapToLock
                ? "Tap a hand to lock instantly"
                : "Select your hand (1–6)"}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span className="hidden items-center gap-1 rounded-md border border-line/60 bg-surface-2/40 px-1.5 py-1 text-[9px] text-muted md:flex">
              <Keyboard className="h-3 w-3" />
              1–6
            </span>
            <button
              type="button"
              onClick={onToggleTapToLock}
              aria-label={`Toggle Tap to Lock. Currently ${tapToLock ? "Enabled" : "Disabled"}`}
              title="Toggle instant lock mode"
              className={`flex items-center gap-1 rounded-full border px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-turf ${
                tapToLock
                  ? "border-amber/30 bg-amber/[0.08] text-amber"
                  : "border-line bg-surface-2/50 text-muted hover:text-chalk"
              }`}
            >
              <Zap className={`h-3 w-3 ${tapToLock ? "fill-current" : ""}`} />
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {tapToLock ? "Quick lock" : "Confirm"}
              </span>
            </button>
          </div>
        </div>
      )}

      <div className="grid w-full grid-cols-3 gap-1.5 sm:grid-cols-6 sm:gap-2">
        {numbers.map((num) => {
          const isSelected = selectedNumber === num;
          const isDisabled = disabled || isLocked;

          return (
            <button
              key={num}
              type="button"
              disabled={isDisabled}
              onClick={() => handlePick(num)}
              aria-label={`Pick number ${num}`}
              aria-pressed={isSelected}
              className={`match-number-pad-button group relative flex min-h-[44px] sm:min-h-[50px] md:min-h-[56px] flex-col items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl border px-1.5 py-1 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
                isDisabled
                  ? isSelected
                    ? "cursor-not-allowed border-turf/50 bg-turf/10 opacity-80"
                    : "cursor-not-allowed border-line/40 bg-surface/30 text-muted/30 opacity-50"
                  : isSelected
                  ? "scale-[1.02] border-turf bg-turf/[0.12] text-turf shadow-glow"
                  : "border-line bg-surface/80 text-chalk hover:-translate-y-0.5 hover:border-turf/45 hover:bg-surface-2 active:scale-95"
              }`}
            >
              <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded border border-line/50 bg-surface-2/70 px-0.5 font-mono text-[7px] text-muted/70">
                {num}
              </span>

              <div
                className={`mb-0.5 transition-all duration-150 ${
                  isSelected
                    ? "scale-110 text-turf"
                    : isDisabled
                    ? "text-muted/40"
                    : "text-muted group-hover:text-chalk"
                }`}
              >
                <Hand value={num} size={22} className="sm:h-6 sm:w-6" />
              </div>

              <span className="font-heading text-lg font-black leading-none tabular-nums sm:text-xl">
                {num}
              </span>

              {num === 6 && !isDisabled && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-transparent via-amber/70 to-transparent" />
              )}
            </button>
          );
        })}
      </div>

      {!tapToLock && (
        <div className="match-confirm-container mt-0.5 w-full">
          <Button
            variant="primary"
            size="sm"
            fullWidth
            disabled={disabled || isLocked || !selectedNumber}
            onClick={onConfirmLock}
            className="match-confirm-btn flex min-h-[36px] sm:min-h-[40px] items-center justify-center gap-1.5 rounded-xl font-heading text-xs font-black uppercase tracking-wider"
          >
            <Lock className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>
              {isLocked
                ? `Locked in: ${selectedNumber}`
                : selectedNumber
                ? `Confirm & lock (${selectedNumber})`
                : "Select a hand to lock"}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
};

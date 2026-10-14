import React, { useEffect } from "react";
import { Hand } from "./Hand.tsx";
import { Button } from "./Button.tsx";
import { Lock, Zap } from "lucide-react";

export interface NumberPadProps {
  selectedNumber: number | null;
  onSelectNumber: (num: number) => void;
  onConfirmLock: () => void;
  isLocked: boolean;
  disabled?: boolean;
  tapToLock: boolean;
  onToggleTapToLock: () => void;
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
  className = "",
}) => {
  // Listen to keyboard keys 1 to 6
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
      className={`w-full flex flex-col items-center gap-2.5 select-none pb-[calc(env(safe-area-inset-bottom,0px)+4px)] ${className}`}
      role="group"
      aria-label="Hand cricket number picker 1 to 6"
    >
      {/* Controls & Quick Setting Bar */}
      <div className="w-full flex items-center justify-between text-xs px-1">
        <span className="font-heading uppercase tracking-wider text-muted text-[11px]">
          {isLocked
            ? "Your pick is locked"
            : disabled
            ? "Waiting for next ball..."
            : "Select your number (1-6)"}
        </span>

        <button
          type="button"
          onClick={onToggleTapToLock}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-line bg-surface-2 text-muted hover:text-chalk transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-turf"
          title="Toggle Instant Lock Mode"
          aria-label={`Toggle Tap to Lock. Currently ${tapToLock ? "Enabled" : "Disabled"}`}
        >
          <Zap
            className={`w-3 h-3 ${tapToLock ? "text-amber fill-amber" : "text-muted"}`}
          />
          <span className="text-[11px] font-medium">
            Tap-to-lock: <strong className={tapToLock ? "text-chalk" : "text-muted"}>{tapToLock ? "ON" : "OFF"}</strong>
          </span>
        </button>
      </div>

      {/* Button Grid: 3x2 on mobile (min 64px tap target), 6-across on desktop */}
      <div className="w-full grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
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
              className={`group relative flex flex-col items-center justify-center min-h-[64px] sm:min-h-[76px] py-2 px-2 rounded-[12px] border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
                isDisabled
                  ? isSelected
                    ? "bg-turf/20 border-turf text-chalk opacity-75 cursor-not-allowed"
                    : "bg-surface/50 border-line/50 text-muted/40 cursor-not-allowed opacity-50"
                  : isSelected
                  ? "bg-surface-2 border-turf text-turf shadow-[0_0_0_1px_var(--color-turf)] scale-[1.02]"
                  : "bg-surface border-line text-chalk hover:bg-surface-2 hover:border-muted active:scale-[0.98]"
              }`}
            >
              {/* Keyboard hint (desktop only) */}
              <span className="hidden sm:inline-block absolute top-1.5 right-2 text-[10px] font-bold text-muted/60 bg-surface-2/80 px-1 rounded border border-line/40">
                {num}
              </span>

              {/* Hand Icon */}
              <div
                className={`transition-transform mb-1 ${
                  isSelected ? "scale-110 text-turf" : "text-muted group-hover:text-chalk"
                }`}
              >
                <Hand value={num} size={28} />
              </div>

              {/* Number Label */}
              <span className="font-heading font-black text-2xl sm:text-3xl tabular-nums leading-none">
                {num}
              </span>
            </button>
          );
        })}
      </div>

      {/* Explicit "Lock In" Button if Tap-to-Lock is OFF */}
      {!tapToLock && (
        <div className="w-full mt-0.5">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={disabled || isLocked || !selectedNumber}
            onClick={onConfirmLock}
            className="flex items-center justify-center gap-2 font-heading font-black tracking-wider text-lg"
          >
            <Lock className="w-4 h-4 stroke-[2.5]" />
            <span>
              {isLocked
                ? `LOCKED IN: ${selectedNumber}`
                : selectedNumber
                ? `CONFIRM & LOCK IN (${selectedNumber})`
                : "SELECT A NUMBER TO LOCK"}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
};

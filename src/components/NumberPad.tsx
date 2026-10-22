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
        <span className="font-mono uppercase tracking-wider text-pure-black font-bold text-[11px] bg-bone-white px-2.5 py-0.5 rounded-[100px] border border-pure-black">
          {isLocked
            ? "PICK LOCKED"
            : disabled
            ? "WAITING FOR BALL..."
            : "SELECT 1 TO 6"}
        </span>

        <button
          type="button"
          onClick={onToggleTapToLock}
          className="flex items-center gap-1.5 px-3 py-1 rounded-[100px] border-2 border-pure-black bg-bone-white text-pure-black hover:bg-hi-vis-yellow transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pure-black"
          title="Toggle Instant Lock Mode"
          aria-label={`Toggle Tap to Lock. Currently ${tapToLock ? "Enabled" : "Disabled"}`}
        >
          <Zap
            className={`w-3.5 h-3.5 stroke-[2.5] ${tapToLock ? "text-pure-black fill-hi-vis-yellow" : "text-pure-black/50"}`}
          />
          <span className="text-[11px] font-mono font-bold uppercase">
            Tap-to-lock: <strong>{tapToLock ? "ON" : "OFF"}</strong>
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
              className={`group relative flex flex-col items-center justify-center min-h-[64px] sm:min-h-[76px] py-2 px-2 rounded-[6px] border-2 border-pure-black transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hi-vis-yellow select-none ${
                isDisabled
                  ? isSelected
                    ? "bg-hi-vis-yellow text-pure-black opacity-80 cursor-not-allowed"
                    : "bg-bone-white/60 text-pure-black/40 cursor-not-allowed"
                  : isSelected
                  ? "bg-hi-vis-yellow text-pure-black font-black scale-[1.03]"
                  : "bg-bone-white text-pure-black hover:bg-buttery-yellow active:scale-95"
              }`}
            >
              {/* Keyboard hint (desktop only) */}
              <span className="hidden sm:inline-block absolute top-1.5 right-2 text-[10px] font-mono font-bold text-pure-black/60 bg-pure-black/10 px-1 rounded border border-pure-black/20">
                {num}
              </span>

              {/* Hand Icon */}
              <div
                className={`transition-transform mb-1 ${
                  isSelected ? "scale-110 text-pure-black" : "text-pure-black/80 group-hover:text-pure-black"
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

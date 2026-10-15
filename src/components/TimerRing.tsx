import React from "react";

export interface TimerRingProps {
  remainingSeconds: number;
  totalSeconds?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * 8-second authoritative turn timer component.
 * Features an SVG radial countdown stroke:
 * - Green (turf) when > 3s
 * - Amber when <= 3s
 * - Red (ball) when <= 1s
 */
export const TimerRing: React.FC<TimerRingProps> = ({
  remainingSeconds,
  totalSeconds = 8,
  size = 56,
  strokeWidth = 4,
  className = "",
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Fraction of time remaining
  const progress = Math.max(0, Math.min(1, remainingSeconds / totalSeconds));
  const strokeDashoffset = circumference * (1 - progress);

  // Strict color thresholds: turf -> amber at 3s -> red at 1s
  let strokeColor = "var(--color-turf)";
  let textColor = "text-chalk";

  if (remainingSeconds <= 1) {
    strokeColor = "var(--color-ball)";
    textColor = "text-ball animate-pulse";
  } else if (remainingSeconds <= 3) {
    strokeColor = "var(--color-amber)";
    textColor = "text-amber";
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      role="progressbar"
      aria-label={`${Math.ceil(remainingSeconds)} seconds remaining for turn`}
      aria-valuenow={Math.ceil(remainingSeconds)}
      aria-valuemin={0}
      aria-valuemax={totalSeconds}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-line)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated countdown stroke */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-200 ease-linear"
        />
      </svg>

      {/* Number in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`font-heading font-black tabular-nums transition-colors ${
            size >= 64 ? "text-xl sm:text-2xl" : "text-base sm:text-lg"
          } ${textColor}`}
        >
          {Math.ceil(remainingSeconds)}s
        </span>
      </div>
    </div>
  );
};

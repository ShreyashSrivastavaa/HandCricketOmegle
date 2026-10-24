import React from "react";
import { Check, Loader2 } from "lucide-react";

export interface PlayerChipProps {
  name: string;
  isUser: boolean;
  role: "batting" | "bowling";
  isLocked?: boolean;
  className?: string;
}

/**
 * Derives 2-letter geometric initials from player name.
 */
function getGeometricInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const PlayerChip: React.FC<PlayerChipProps> = ({
  name,
  isUser,
  role,
  isLocked = false,
  className = "",
}) => {
  const isBatting = role === "batting";
  const initials = getGeometricInitials(name);
  const sideColor = isUser ? "var(--color-turf)" : "var(--color-sky)";

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-2.5 py-1.5 rounded-full bg-surface-2 border border-line select-none ${className}`}
      role="status"
      aria-label={`${name}, ${isBatting ? "Batting" : "Bowling"}, ${isLocked ? "Ready" : "Thinking"}`}
    >
      {/* Generated Geometric Avatar (initials, no photos) */}
      <div
        className="w-7 h-7 rounded-[8px] flex items-center justify-center font-heading font-black text-xs tracking-wider border"
        style={{
          borderColor: sideColor,
          backgroundColor: isUser ? "rgba(168, 60, 47, 0.1)" : "rgba(47, 95, 70, 0.1)",
          color: sideColor,
        }}
        aria-hidden="true"
      >
        {initials}
      </div>

      {/* Name */}
      <span className="text-xs font-semibold tracking-wide text-chalk uppercase">
        {name}
      </span>

      {/* Role Badge */}
      <span
        className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border ${
          isBatting
            ? "bg-turf/10 text-turf border-turf/30"
            : "bg-sky/10 text-sky border-sky/30"
        }`}
      >
        {isBatting ? "BAT" : "BOWL"}
      </span>

      {/* Turn Ready/Thinking Status Indicator */}
      <div className="flex items-center pl-1 border-l border-line text-[11px]">
        {isLocked ? (
          <span className="flex items-center gap-1 text-turf font-medium" title="Ready">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Ready</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-muted" title="Thinking">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="hidden sm:inline">Thinking</span>
          </span>
        )}
      </div>
    </div>
  );
};

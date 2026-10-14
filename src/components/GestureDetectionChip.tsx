"use client";

import React from "react";
import { HandGesture } from "@/lib/gesture/handClassifier";
import { Check, AlertCircle, SunMedium, Sparkles } from "lucide-react";

interface GestureDetectionChipProps {
  detectedGesture: HandGesture | null;
  progress: number; // 0.0 to 1.0
  isLocked: boolean;
  lockedNumber?: number | null;
  hint?: string;
  isLowLight?: boolean;
  className?: string;
}

export function GestureDetectionChip({
  detectedGesture,
  progress,
  isLocked,
  lockedNumber,
  hint,
  isLowLight,
  className = "",
}: GestureDetectionChipProps) {
  // SVG Progress Ring calculations
  const size = 30;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border shadow-md select-none transition-all duration-200 ${
        isLocked
          ? "bg-turf/20 border-turf text-turf shadow-[0_0_12px_rgba(0,230,118,0.3)]"
          : detectedGesture !== null
          ? "bg-surface-2 border-turf/80 text-chalk"
          : isLowLight
          ? "bg-amber/15 border-amber/60 text-amber"
          : "bg-surface-2/90 border-line text-muted"
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* 1. Locked State */}
      {isLocked ? (
        <>
          <div className="w-5 h-5 rounded-full bg-turf text-ink flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span className="font-heading font-black text-xs tracking-wider uppercase text-turf">
            Locked: <strong className="text-sm font-mono">{lockedNumber || detectedGesture}</strong>
          </span>
        </>
      ) : detectedGesture !== null ? (
        /* 2. Actively Detecting with Progress Ring (1.0s hold) */
        <>
          <div className="relative w-[30px] h-[30px] shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
              {/* Background Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                className="stroke-line"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Animated Progress Arc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                className="stroke-turf transition-all duration-75"
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <span className="absolute font-mono font-black text-xs text-turf">
              {detectedGesture}
            </span>
          </div>

          <div className="flex flex-col text-left leading-tight">
            <span className="font-heading font-bold text-xs text-chalk">
              Detected: <span className="font-mono text-turf text-sm font-black">{detectedGesture}</span>
            </span>
            <span className="text-[10px] text-muted">
              {progress >= 0.8
                ? "Locking in..."
                : `Hold steady (${Math.round(progress * 100)}%)`}
            </span>
          </div>
        </>
      ) : isLowLight ? (
        /* 3. Low Light Warning Hint */
        <>
          <SunMedium className="w-4 h-4 text-amber shrink-0 animate-pulse" />
          <span className="text-xs font-medium text-amber">
            Need more light
          </span>
        </>
      ) : (
        /* 4. Ambiguous or No Hand Detected Hint */
        <>
          <Sparkles className="w-3.5 h-3.5 text-muted shrink-0" />
          <span className="text-xs font-medium text-muted">
            {hint || "Not sure, show clearly or tap a number"}
          </span>
        </>
      )}
    </div>
  );
}

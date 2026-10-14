"use client";

import React, { useEffect, useState } from "react";
import { handDetector, DetectionResult } from "@/lib/gesture/handDetector";
import { HandGesture } from "@/lib/gesture/handClassifier";
import { Check, Sparkles, AlertCircle } from "lucide-react";

interface GesturePracticeProps {
  videoElement: HTMLVideoElement | null;
  className?: string;
}

const GESTURE_LEGEND: { num: HandGesture; name: string; desc: string }[] = [
  { num: 1, name: "Index Only", desc: "1 finger raised" },
  { num: 2, name: "Index + Middle", desc: "2 fingers raised" },
  { num: 3, name: "Three Fingers", desc: "Index, Middle, Ring" },
  { num: 4, name: "Four Fingers", desc: "All 4, thumb in" },
  { num: 5, name: "Open Palm", desc: "All 5 extended" },
  { num: 6, name: "Thumb Only", desc: "Thumbs-up" },
];

export const GesturePractice: React.FC<GesturePracticeProps> = ({ videoElement, className = "" }) => {
  const [detection, setDetection] = useState<DetectionResult>({
    gesture: null,
    progress: 0,
    locked: false,
  });

  useEffect(() => {
    if (!videoElement) return;

    handDetector.onDetectionChange = (res) => {
      setDetection(res);
    };

    handDetector.start(videoElement);

    return () => {
      handDetector.stop();
    };
  }, [videoElement]);

  // Radius for progress ring
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - detection.progress * circumference;

  return (
    <div className={`flex flex-col gap-3 bg-surface-2 p-3.5 rounded-[12px] border border-line ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-turf flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Show to Camera Practice
        </span>
        <span className="text-[10px] text-muted font-medium">Hold 1.0s to lock</span>
      </div>

      {/* Live Detection Status Chip */}
      <div className="flex items-center justify-between bg-ink border border-line rounded-lg p-2.5">
        <div className="flex items-center gap-2.5">
          {/* Progress Ring */}
          <div className="relative w-8 h-8 flex items-center justify-center">
            <svg className="w-8 h-8 transform -rotate-90">
              <circle
                cx="16"
                cy="16"
                r={radius}
                className="stroke-line"
                strokeWidth="3"
                fill="transparent"
              />
              <circle
                cx="16"
                cy="16"
                r={radius}
                className="stroke-turf transition-all duration-100"
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <span className="absolute text-xs font-heading font-black tabular-nums text-chalk">
              {detection.gesture || "-"}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-heading font-bold uppercase text-chalk">
              {detection.locked
                ? `Locked: ${detection.lockedNumber}! ✓`
                : detection.gesture
                ? `Detected: ${detection.gesture}`
                : "Looking for hand..."}
            </span>
            <span className="text-[10px] text-muted">
              {detection.isLowLight
                ? "Need more light"
                : detection.hint || (detection.gesture ? "Holding steady..." : "Show your hand clearly")}
            </span>
          </div>
        </div>

        {detection.locked && (
          <button
            type="button"
            onClick={() => {
              if (videoElement) {
                handDetector.start(videoElement);
              }
            }}
            className="text-[11px] font-heading font-bold uppercase px-2.5 py-1 bg-turf text-ink rounded hover:bg-turf-hover transition-colors"
          >
            Try Again
          </button>
        )}
      </div>

      {/* 1-6 Gestures Legend */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
        {GESTURE_LEGEND.map((g) => {
          const isActive = detection.gesture === g.num;
          return (
            <div
              key={g.num}
              className={`flex flex-col items-center justify-center p-1.5 rounded-[8px] border text-center transition-all ${
                isActive
                  ? "bg-turf/15 border-turf text-turf shadow-sm"
                  : "bg-surface border-line text-muted"
              }`}
            >
              <span className="font-heading font-black text-sm tabular-nums text-chalk">
                {g.num}
              </span>
              <span className="text-[9px] font-heading font-semibold uppercase leading-tight line-clamp-1 mt-0.5">
                {g.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

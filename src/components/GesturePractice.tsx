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

  const [timerSeconds, setTimerSeconds] = useState<number>(5);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockedNumber, setLockedNumber] = useState<HandGesture | null>(null);

  const latestGestureRef = React.useRef<HandGesture | null>(null);
  const timerIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const autoRestartTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Initialize and run HandDetector continuously
  useEffect(() => {
    if (!videoElement) return;

    handDetector.autoLock = false; // Never prematurely auto-lock
    handDetector.resetForNextBall();

    handDetector.onDetectionChange = (res) => {
      setDetection(res);
      latestGestureRef.current = res.gesture;
    };

    handDetector.start(videoElement);

    return () => {
      handDetector.stop();
    };
  }, [videoElement]);

  // Start / restart practice countdown round (5s -> 1s lock)
  const startPracticeRound = React.useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (autoRestartTimeoutRef.current) clearTimeout(autoRestartTimeoutRef.current);

    setIsLocked(false);
    setLockedNumber(null);
    setTimerSeconds(5);

    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev === 2) {
          // At 1s remaining: Lock whatever is currently visible ("jb 1 sec bacha ho toh jodikhra ho voh lock kre")
          const pick = latestGestureRef.current;
          setIsLocked(true);
          setLockedNumber(pick);

          // Auto-restart next practice round after 3 seconds of viewing locked result
          autoRestartTimeoutRef.current = setTimeout(() => {
            startPracticeRound();
          }, 3000);

          return 1;
        }

        if (prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startPracticeRound();
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (autoRestartTimeoutRef.current) clearTimeout(autoRestartTimeoutRef.current);
    };
  }, [startPracticeRound]);

  // Radius for progress ring
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  // Visual progress: countdown from 5s down to 1s
  const progressRatio = isLocked ? 1 : Math.max(0, (5 - timerSeconds) / 4);
  const strokeDashoffset = circumference - progressRatio * circumference;

  const currentDisplayNumber = isLocked ? lockedNumber : detection.gesture;

  return (
    <div className={`flex flex-col gap-3 bg-surface-2 p-3.5 rounded-[12px] border border-line ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-turf flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Show to Camera Practice
        </span>
        <span className="text-[10px] text-muted font-medium">Locks at 1s remaining • Change freely</span>
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
                className={`transition-all duration-300 ${isLocked ? "stroke-turf" : "stroke-turf/70"}`}
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <span className="absolute text-xs font-heading font-black tabular-nums text-chalk">
              {currentDisplayNumber || (isLocked ? "-" : timerSeconds > 0 ? timerSeconds : "-")}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-heading font-bold uppercase text-chalk flex items-center gap-1.5">
              {isLocked ? (
                lockedNumber ? (
                  <>
                    <span className="text-turf">LOCKED: {lockedNumber}!</span>
                    <Check className="w-3.5 h-3.5 text-turf" />
                  </>
                ) : (
                  <span className="text-amber-400">No Hand At 1s ✗</span>
                )
              ) : detection.gesture ? (
                <span className="text-chalk">Live: {detection.gesture} (Changing...)</span>
              ) : (
                "Show hand to camera..."
              )}
            </span>
            <span className="text-[10px] text-muted">
              {isLocked
                ? lockedNumber
                  ? "Locked at 1s mark • Matches real game timing"
                  : "Keep hand visible before 1s mark"
                : detection.isLowLight
                ? "Need more light"
                : `${timerSeconds}s left • Change hand anytime!`}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={startPracticeRound}
          className="text-[11px] font-heading font-bold uppercase px-2.5 py-1 bg-turf text-ink rounded hover:bg-turf-hover transition-colors"
        >
          {isLocked ? "Practice Again" : "Restart Round"}
        </button>
      </div>

      {/* 1-6 Gestures Legend */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
        {GESTURE_LEGEND.map((g) => {
          const isSelected = currentDisplayNumber === g.num;
          return (
            <div
              key={g.num}
              className={`flex flex-col items-center justify-center p-1.5 rounded-[8px] border text-center transition-all ${
                isSelected
                  ? isLocked
                    ? "bg-turf/25 border-turf text-turf ring-2 ring-turf/40 shadow-sm"
                    : "bg-turf/15 border-turf text-turf shadow-sm"
                  : "bg-surface border-line text-muted"
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="font-heading font-black text-sm tabular-nums text-chalk">
                  {g.num}
                </span>
                {isSelected && isLocked && <Check className="w-3 h-3 text-turf" />}
              </div>
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

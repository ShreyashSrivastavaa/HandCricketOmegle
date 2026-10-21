"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLiveMatchStore } from "@/lib/store/liveMatchStore";
import { webrtcManager } from "@/lib/webrtc/webrtcManager";
import { handDetector, drawHandSkeleton } from "@/lib/gesture/handDetector";
import type { HandGesture } from "@/lib/gesture/handClassifier";
import { ScoreBar } from "./ScoreBar";
import { BallStrip } from "./BallStrip";
import { HandTile } from "./HandTile";
import { NumberPad } from "./NumberPad";
import { TimerRing } from "./TimerRing";
import { EmojiReactions } from "./EmojiReactions";
import {
  Flag,
  LogOut,
  AlertTriangle,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  RotateCw,
  Eye,
  EyeOff,
  Flame,
  Infinity as InfinityIcon,
  Pause,
  Play,
  Sparkles,
  Trophy,
  ShieldCheck,
  Hand,
} from "lucide-react";
import { playClickSound, playBoundarySound } from "@/lib/client/audio";

export const LiveMatchScreen: React.FC = () => {
  const {
    gameState,
    userRole,
    opponentName,
    isBotMatch,
    userPick,
    isUserLocked,
    opponentPick,
    userTileState,
    opponentTileState,
    revealCountdown,
    outcomeText,
    isOutcomeWicket,
    screenShake,
    timerSeconds,
    opponentDisconnectSeconds,
    activeReactions,
    isPaused,
    togglePause,
    submitBallPick,
    sendReaction,
    forfeitCurrentMatch,
    setIsReportOpen,
  } = useLiveMatchStore();

  const [useTapMode, setUseTapMode] = useState<boolean>(false);
  const [tapToLock, setTapToLock] = useState<boolean>(true);
  const [selectedNum, setSelectedNum] = useState<number | null>(null);

  // Video State
  const [isCameraOn, setIsCameraOn] = useState<boolean>(webrtcManager.isCameraEnabled);
  const [isMicOn, setIsMicOn] = useState<boolean>(webrtcManager.isMicEnabled);
  const [isOpponentBlurred, setIsOpponentBlurred] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hc_blur_video_start") === "true";
    }
    return false;
  });

  // Hand Tracker Feedback State
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);
  const [detectedGesture, setDetectedGesture] = useState<HandGesture | null>(null);
  const [gestureProgress, setGestureProgress] = useState<number>(0);
  const [hasSuggestedTap, setHasSuggestedTap] = useState<boolean>(false);
  const [lastStableGesture, setLastStableGesture] = useState<number | null>(null);

  // Milestone Celebration Banner
  const [milestoneText, setMilestoneText] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const skeletonCanvasRef = useRef<HTMLCanvasElement>(null);

  // Milestone notification trigger (25, 50, 100 runs)
  useEffect(() => {
    if (!gameState) return;
    const activeInnings =
      gameState.currentInnings === 1 ? gameState.innings1 : gameState.innings2!;
    const score = activeInnings?.score;
    if (score === 25 || score === 50 || score === 100) {
      setMilestoneText(`${score} RUNS MILESTONE! 🔥`);
      playBoundarySound();
      const timer = setTimeout(() => setMilestoneText(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.currentInnings, gameState?.innings1?.score, gameState?.innings2?.score]);

  // Video Streams Attachment
  useEffect(() => {
    if (!isBotMatch) {
      const localStream = webrtcManager.getLocalStream();
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }

      webrtcManager.onRemoteStream = (stream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      };
    }
  }, [isBotMatch]);

  // Hand Tracker Lifecycle
  useEffect(() => {
    if (useTapMode || isUserLocked || !gameState) {
      handDetector.stop();
      return;
    }

    if (localVideoRef.current) {
      handDetector.resetForNextBall();
      handDetector.onDetectionChange = (res) => {
        setDetectedGesture(res.gesture);
        setGestureProgress(res.progress);
        setIsLoadingModel(!!res.isLoadingModel);

        if (res.gesture !== null) {
          setLastStableGesture(res.gesture);
        }

        if (res.suggestTapMode) {
          setHasSuggestedTap(true);
        }

        if (res.landmarks && skeletonCanvasRef.current) {
          drawHandSkeleton(skeletonCanvasRef.current, res.landmarks, res.locked);
        }

        // Lock in gesture if valid pick 1-6
        if (
          res.locked &&
          res.lockedNumber !== undefined &&
          res.lockedNumber >= 1 &&
          res.lockedNumber <= 6 &&
          !isUserLocked
        ) {
          submitBallPick(res.lockedNumber);
        }
      };

      handDetector.start(localVideoRef.current);
    }

    return () => {
      handDetector.stop();
    };
  }, [useTapMode, isUserLocked, submitBallPick, gameState?.innings1?.balls, gameState?.innings2?.balls]);

  if (!gameState) return null;

  const activeInnings =
    gameState.currentInnings === 1 ? gameState.innings1 : gameState.innings2!;
  const isUserBatting = activeInnings.battingPlayer === userRole;
  const userRoleStr = isUserBatting ? "batting" : "bowling";
  const opponentRoleStr = isUserBatting ? "bowling" : "batting";

  const currentOverIndex = Math.floor(activeInnings.balls / 6);
  const opponentDisplayName = opponentName || "Opponent";

  const isEndless = gameState.format.isEndless || gameState.format.mode === "endless";
  const isChasing = gameState.currentInnings === 2 && activeInnings.target !== undefined;
  const runsNeeded = isChasing ? Math.max(0, (activeInnings.target || 0) - activeInnings.score) : 0;

  // Turn Flow Stage Indicator
  const turnStage =
    revealCountdown !== null
      ? "reveal"
      : timerSeconds > 7
      ? "get_ready"
      : "show";

  const handleSelectNumber = (num: number) => {
    setSelectedNum(num);
  };

  const handleConfirmLock = () => {
    if (selectedNum && !isUserLocked) {
      submitBallPick(selectedNum);
    }
  };

  const handleSkipOrLeave = () => {
    playClickSound();
    if (window.confirm("Are you sure you want to forfeit this match?")) {
      forfeitCurrentMatch("Forfeited by player");
    }
  };

  const handleToggleCamera = () => {
    const nextState = webrtcManager.toggleCamera();
    setIsCameraOn(nextState);
  };

  const handleToggleMic = () => {
    const nextState = webrtcManager.toggleMic();
    setIsMicOn(nextState);
  };

  const handleFlipCamera = async () => {
    playClickSound();
    await webrtcManager.flipCamera();
  };

  return (
    <main
      className={`min-h-screen bg-ink text-chalk flex flex-col justify-between max-w-4xl mx-auto p-2 sm:p-4 select-none transition-transform ${
        screenShake ? "animate-shake" : ""
      }`}
    >
      {/* Disconnect Grace Timer Banner */}
      {opponentDisconnectSeconds !== null && (
        <div className="w-full bg-ball/20 border border-ball/50 rounded-xl px-4 py-2 flex items-center justify-between text-xs text-ball font-semibold mb-2 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Opponent connection lost! Waiting for reconnect...</span>
          </div>
          <span className="font-heading font-black text-sm tabular-nums">
            {opponentDisconnectSeconds}s to forfeit
          </span>
        </div>
      )}

      {/* Milestone Celebratory Banner */}
      {milestoneText && (
        <div className="w-full bg-amber text-ink font-heading font-black text-sm sm:text-base uppercase py-2 px-4 rounded-xl text-center shadow-lg animate-bounce flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 fill-current" />
          <span>{milestoneText}</span>
          <Sparkles className="w-4 h-4 fill-current" />
        </div>
      )}

      {/* TOP HEADER: Navigation, Role Banner, ScoreBar, BallStrip */}
      <header className="w-full flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs pb-1">
          {/* Role Banner with Mode Badge */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3.5 py-1 rounded-full border font-heading font-black tracking-wider text-xs sm:text-sm uppercase ${
                isUserBatting
                  ? "bg-turf/15 text-turf border-turf/40"
                  : "bg-sky/15 text-sky border-sky/40"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isUserBatting ? "bg-turf" : "bg-sky"
                }`}
              />
              <span>{isUserBatting ? "YOU ARE BATTING" : "YOU ARE BOWLING"}</span>
            </div>

            {isEndless && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber/15 border border-amber/40 text-amber text-[10px] font-heading font-black uppercase flex items-center gap-1">
                <InfinityIcon className="w-3 h-3" /> Endless
              </span>
            )}
          </div>

          {/* Action Tools: Reactions, Pause, Report, Forfeit */}
          <div className="flex items-center gap-2">
            <EmojiReactions
              onSendReaction={sendReaction}
              activeReactions={activeReactions}
            />

            {/* Tactical Pause button for long sessions */}
            {isEndless && (
              <button
                type="button"
                onClick={togglePause}
                title={isPaused ? "Resume match" : "Pause turn clock"}
                className={`p-1.5 rounded-full border transition-colors ${
                  isPaused
                    ? "bg-amber text-ink border-amber"
                    : "border-line bg-surface text-muted hover:text-chalk"
                }`}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
            )}

            {!isBotMatch && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsReportOpen(true);
                }}
                className="p-1.5 rounded-full border border-line bg-surface text-muted hover:text-ball hover:border-ball/40 transition-colors"
                title="Report Opponent"
                aria-label="Report Opponent"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleSkipOrLeave}
              className="flex items-center gap-1 py-1 px-2.5 rounded-full border border-line bg-surface text-muted hover:text-chalk transition-colors font-semibold text-[11px] uppercase"
              title="Skip / Forfeit Match"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Skip</span>
            </button>
          </div>
        </div>

        {/* ScoreBar */}
        <ScoreBar state={gameState} userPlayerId={userRole} />

        {/* Endless HUD vs Standard BallStrip */}
        {isEndless ? (
          <div className="w-full bg-surface-2 border border-line rounded-lg px-3 py-1.5 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-muted">
                Balls Faced: <strong className="text-chalk">{activeInnings.balls}</strong>
              </span>
              <span className="text-muted flex items-center gap-1">
                Streak: <strong className="text-amber">{activeInnings.strikeStreak || 0}</strong>
                {(activeInnings.strikeStreak || 0) >= 3 && <Flame className="w-3 h-3 text-amber fill-current" />}
              </span>
            </div>

            {isChasing ? (
              <div className="text-right">
                <span className="text-amber font-bold">
                  Target: {activeInnings.target} ({runsNeeded} needed)
                </span>
              </div>
            ) : (
              <span className="text-turf font-bold text-[11px] uppercase tracking-wider">
                Bat until OUT
              </span>
            )}
          </div>
        ) : (
          <BallStrip
            currentOver={activeInnings.currentOver}
            overIndex={currentOverIndex}
            maxOvers={gameState.format.maxOvers}
          />
        )}
      </header>

      {/* CENTER: LIVE VIDEO CALL + FINGER DETECTION ARENA */}
      <section
        className="w-full my-2 flex flex-col items-center justify-center relative rounded-2xl overflow-hidden border border-line bg-ink/90 min-h-[220px] sm:min-h-[280px]"
        aria-label="Hand Cricket Live Video Arena"
      >
        {/* Opponent Video Background / Primary Feed */}
        <div className="relative w-full h-full min-h-[220px] sm:min-h-[280px] bg-ink flex items-center justify-center overflow-hidden">
          {isBotMatch ? (
            /* Bot Match Animated Graphic Arena */
            <div className="flex flex-col items-center justify-center p-6 text-center gap-2">
              <div className="w-16 h-16 rounded-full bg-turf/10 border border-turf/30 flex items-center justify-center text-3xl">
                🤖
              </div>
              <span className="font-heading font-black text-sm uppercase text-turf tracking-wider">
                Practice Bot Arena
              </span>
              <span className="text-xs text-muted max-w-xs">
                Playing offline against server AI. Show fingers to camera or tap 1-6 below!
              </span>
            </div>
          ) : (
            /* Peer-to-Peer Opponent Video Element */
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover transition-filter duration-300 ${
                  isOpponentBlurred && turnStage !== "reveal"
                    ? "blur-2xl brightness-50"
                    : ""
                }`}
              />

              {/* Opponent Label */}
              <div className="absolute top-2 left-2 bg-ink/80 border border-line rounded px-2.5 py-1 text-[11px] text-chalk flex items-center gap-1.5 z-10">
                <span className="w-2 h-2 rounded-full bg-turf animate-pulse" />
                <span className="font-bold">{opponentDisplayName}</span>
                <span className="text-[10px] text-muted">({opponentRoleStr})</span>
              </div>
            </>
          )}

          {/* TURN FLOW OVERLAYS (Center) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
            {outcomeText ? (
              <div
                className={`px-6 py-3 rounded-2xl border font-heading font-black text-2xl sm:text-4xl uppercase tracking-wider tabular-nums shadow-2xl ${
                  isOutcomeWicket
                    ? "bg-ball text-white border-ball animate-shake"
                    : "bg-amber text-ink border-amber"
                }`}
              >
                {outcomeText}
              </div>
            ) : revealCountdown !== null ? (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-amber bg-surface-2 flex items-center justify-center shadow-2xl">
                <span className="font-heading font-black text-4xl sm:text-5xl text-amber tabular-nums animate-pulse">
                  {revealCountdown}
                </span>
              </div>
            ) : turnStage === "get_ready" ? (
              <div className="bg-ink/85 border border-turf/40 px-4 py-2 rounded-xl text-center shadow-lg">
                <span className="text-xs font-heading font-black uppercase text-turf tracking-wider block">
                  GET READY...
                </span>
                <span className="text-[11px] text-muted">Prepare your finger gesture</span>
              </div>
            ) : (
              <div className="bg-ink/85 border border-amber/40 px-4 py-2 rounded-xl text-center shadow-lg animate-pulse">
                <span className="text-xs font-heading font-black uppercase text-amber tracking-wider block">
                  SHOW YOUR NUMBER!
                </span>
                <span className="text-[11px] text-muted">Show hand to camera or tap 1-6</span>
              </div>
            )}
          </div>

          {/* Self Video Picture-in-Picture (PiP) with Hand Skeleton Canvas */}
          <div className="absolute bottom-2 right-2 w-28 h-20 sm:w-36 sm:h-28 bg-surface border border-line rounded-xl overflow-hidden shadow-2xl z-20">
            {isCameraOn ? (
              <div className="relative w-full h-full">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />

                {/* AR Hand Skeleton Overlay */}
                <canvas
                  ref={skeletonCanvasRef}
                  width={320}
                  height={240}
                  className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
                />

                {/* Hand Detection Badge */}
                <div className="absolute top-1 left-1 z-10">
                  {isLoadingModel ? (
                    <span className="px-1.5 py-0.5 rounded bg-ink/80 text-[8px] font-mono text-muted">
                      Loading tracker...
                    </span>
                  ) : isUserLocked ? (
                    <span className="px-1.5 py-0.5 rounded bg-turf text-ink text-[9px] font-bold font-mono uppercase shadow">
                      LOCKED: {userPick}
                    </span>
                  ) : detectedGesture !== null ? (
                    <span className="px-1.5 py-0.5 rounded bg-amber text-ink text-[9px] font-bold font-mono uppercase shadow">
                      PICK: {detectedGesture} ({Math.round(gestureProgress * 100)}%)
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-ink/80 text-[8px] font-mono text-muted">
                      Looking for hand
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full h-full bg-surface-2 flex items-center justify-center text-[10px] text-muted">
                Camera Off
              </div>
            )}

            <div className="absolute bottom-0.5 left-0.5 text-[8px] bg-ink/80 px-1 rounded text-turf font-mono">
              YOU
            </div>
          </div>

          {/* Video Controls Bar (Bottom Left Overlay) */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-20 bg-ink/80 border border-line rounded-lg p-1">
            {/* Camera Toggle */}
            <button
              type="button"
              onClick={handleToggleCamera}
              title={isCameraOn ? "Turn camera off" : "Turn camera on"}
              className={`p-1.5 rounded transition-colors ${
                isCameraOn
                  ? "bg-surface-2 text-chalk hover:text-turf"
                  : "bg-ball text-white"
              }`}
            >
              {isCameraOn ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
            </button>

            {/* Mic Toggle */}
            <button
              type="button"
              onClick={handleToggleMic}
              title={isMicOn ? "Mute microphone" : "Unmute microphone"}
              className={`p-1.5 rounded transition-colors ${
                isMicOn
                  ? "bg-turf text-ink"
                  : "bg-surface-2 text-muted hover:text-chalk"
              }`}
            >
              {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            </button>

            {/* Flip Camera */}
            <button
              type="button"
              onClick={handleFlipCamera}
              title="Flip Camera (Front/Back)"
              className="p-1.5 rounded bg-surface-2 text-chalk hover:text-turf transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Switch Mode: Hand Gesture vs Tap Mode */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setUseTapMode(!useTapMode);
              }}
              title={useTapMode ? "Switch to Hand Gesture mode" : "Switch to Tap Mode"}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center gap-1 ${
                useTapMode
                  ? "bg-sky text-ink"
                  : "bg-surface-2 text-turf hover:bg-turf/20"
              }`}
            >
              <Hand className="w-3 h-3" />
              <span>{useTapMode ? "Tap Mode" : "Gesture"}</span>
            </button>

            {/* Blur Opponent Video */}
            <button
              type="button"
              onClick={() => setIsOpponentBlurred(!isOpponentBlurred)}
              title={isOpponentBlurred ? "Unblur opponent video" : "Blur opponent video"}
              className={`p-1.5 rounded transition-colors ${
                isOpponentBlurred
                  ? "bg-turf text-ink"
                  : "bg-surface-2 text-muted hover:text-chalk"
              }`}
            >
              {isOpponentBlurred ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Turn Timer Dial (Top Right Overlay) */}
          <div className="absolute top-2 right-2 flex items-center gap-2 z-20 bg-ink/80 border border-line rounded-lg px-2.5 py-1">
            <TimerRing
              remainingSeconds={timerSeconds}
              totalSeconds={10}
              size={34}
              strokeWidth={3}
            />
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-mono text-muted uppercase">Timer</span>
              <span className="font-heading font-black text-xs text-amber tabular-nums">
                {timerSeconds}s
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Auto-suggest tap fallback banner if hand not seen for 3 seconds */}
      {hasSuggestedTap && !useTapMode && (
        <div className="w-full bg-sky/15 border border-sky/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs text-sky mb-1">
          <span>Hand gesture not detected. Tap a number 1-6 below to play!</span>
          <button
            type="button"
            onClick={() => setUseTapMode(true)}
            className="px-2 py-0.5 rounded bg-sky text-ink font-bold text-[10px] uppercase"
          >
            Use Tap Buttons
          </button>
        </div>
      )}

      {/* BOTTOM: NumberPad accessible tap-pick buttons */}
      <footer className="w-full pb-1 pt-1">
        <NumberPad
          selectedNumber={userPick || selectedNum}
          onSelectNumber={(num) => {
            handleSelectNumber(num);
            if (tapToLock) {
              submitBallPick(num);
            }
          }}
          onConfirmLock={handleConfirmLock}
          isLocked={isUserLocked}
          disabled={userTileState !== "empty"}
          tapToLock={tapToLock}
          onToggleTapToLock={() => setTapToLock(!tapToLock)}
        />
      </footer>
    </main>
  );
};

"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLiveMatchStore } from "@/lib/store/liveMatchStore";
import { webrtcManager } from "@/lib/webrtc/webrtcManager";
import { handDetector, drawHandSkeleton } from "@/lib/gesture/handDetector";
import type { HandGesture } from "@/lib/gesture/handClassifier";
import { ScoreBar } from "./ScoreBar";
import { BallStrip } from "./BallStrip";
import { Hand as HandCard } from "./Hand";
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
  ShieldCheck,
  Hand,
  Check,
  Wifi,
  Radio,
  Swords,
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

  const [isCameraOn, setIsCameraOn] = useState<boolean>(webrtcManager.isCameraEnabled);
  const [isMicOn, setIsMicOn] = useState<boolean>(webrtcManager.isMicEnabled);
  const [isOpponentBlurred, setIsOpponentBlurred] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hc_blur_video_start") === "true";
    }
    return false;
  });

  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);
  const [detectedGesture, setDetectedGesture] = useState<HandGesture | null>(null);
  const [gestureProgress, setGestureProgress] = useState<number>(0);
  const [hasSuggestedTap, setHasSuggestedTap] = useState<boolean>(false);
  const [lastStableGesture, setLastStableGesture] = useState<number | null>(null);

  const [milestoneText, setMilestoneText] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const skeletonCanvasRef = useRef<HTMLCanvasElement>(null);

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

  const attachLocalStream = (videoEl: HTMLVideoElement | null) => {
    (localVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = videoEl;
    if (videoEl) {
      const stream = webrtcManager.getLocalStream();
      if (stream && videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
        videoEl.play().catch(() => {});
      }
    }
  };

  const attachRemoteStream = (videoEl: HTMLVideoElement | null) => {
    (remoteVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = videoEl;
    if (videoEl) {
      const stream = webrtcManager.getRemoteStream();
      if (stream && videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
        videoEl.play().catch(() => {});
      }
    }
  };

  // Video Streams Attachment & Camera Initialization
  useEffect(() => {
    let isCancelled = false;

    const setupCamera = async () => {
      try {
        let stream = webrtcManager.getLocalStream();
        if (!stream && isCameraOn) {
          stream = await webrtcManager.initLocalMedia();
        }
        if (!isCancelled && localVideoRef.current && stream) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn("[LiveMatchScreen] Camera initialization error:", err);
        if (!isCancelled) {
          setIsCameraOn(false);
        }
      }
    };

    if (isCameraOn) {
      setupCamera();
    } else if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (!isBotMatch) {
      const remoteStream = webrtcManager.getRemoteStream();
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }

      webrtcManager.onRemoteStream = (stream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch(() => {});
        }
      };
    }

    return () => {
      isCancelled = true;
    };
  }, [isBotMatch, isCameraOn]);

  // Hand Tracker Lifecycle
  useEffect(() => {
    if (useTapMode || isUserLocked || !gameState || !isCameraOn) {
      handDetector.stop();
      return;
    }

    if (localVideoRef.current) {
      handDetector.autoLock = false;
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
      };

      handDetector.start(localVideoRef.current);
    }

    return () => {
      handDetector.stop();
    };
  }, [useTapMode, isUserLocked, isCameraOn, gameState?.innings1?.balls, gameState?.innings2?.balls]);

  useEffect(() => {
    if (timerSeconds === 1 && !isUserLocked && !useTapMode) {
      const pickToLock = detectedGesture ?? lastStableGesture;
      if (pickToLock && pickToLock >= 1 && pickToLock <= 6) {
        submitBallPick(pickToLock);
      }
    }
  }, [timerSeconds, isUserLocked, useTapMode, detectedGesture, lastStableGesture, submitBallPick]);

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

  const turnStage = revealCountdown !== null ? "reveal" : timerSeconds > 7 ? "get_ready" : "show";

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
      webrtcManager.cleanup();
      forfeitCurrentMatch("Forfeited by player");
    }
  };

  const handleToggleCamera = async () => {
    playClickSound();
    const nextState = await webrtcManager.toggleCamera();
    setIsCameraOn(nextState);
    if (nextState && localVideoRef.current) {
      const stream = webrtcManager.getLocalStream();
      if (stream) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
    }
  };

  const handleToggleMic = () => {
    const nextState = webrtcManager.toggleMic();
    setIsMicOn(nextState);
  };

  const handleFlipCamera = async () => {
    playClickSound();
    try {
      await webrtcManager.flipCamera();
      const stream = webrtcManager.getLocalStream();
      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn("[LiveMatchScreen] Flip camera error:", err);
    }
  };

  return (
    <main
      className={`relative min-h-[100dvh] overflow-hidden bg-ink text-chalk selection:bg-turf selection:text-ink ${
        screenShake ? "animate-shake" : ""
      }`}
    >
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(247,181,0,0.07),transparent_65%)]"
        aria-hidden="true"
      />
      <div className="pitch-grid pointer-events-none fixed inset-0 opacity-10" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1440px] flex-col px-2.5 pb-3 pt-2.5 sm:px-4 sm:pb-4 sm:pt-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-turf/30 bg-gradient-to-br from-turf/20 to-sky/10 text-turf">
                <HandCard value={6} size={20} />
              </span>
              <div className="hidden sm:block">
                <p className="font-heading text-[10px] font-black uppercase leading-none tracking-[0.14em] text-muted">
                  Arena live
                </p>
                <p className="mt-0.5 font-heading text-sm font-black uppercase tracking-wide text-chalk">
                  Hand Cricket
                </p>
              </div>
            </div>

            <span className="hidden h-8 w-px bg-line/70 sm:block" aria-hidden="true" />

            <div
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-heading text-[10px] font-black uppercase tracking-[0.1em] ${
                isUserBatting
                  ? "border-turf/30 bg-turf/10 text-turf"
                  : "border-sky/30 bg-sky/10 text-sky"
              }`}
            >
              <Swords className="h-3 w-3" />
              <span>{isUserBatting ? "Batting" : "Bowling"}</span>
            </div>

            {isEndless && (
              <span className="flex items-center gap-1 rounded-full border border-amber/30 bg-amber/10 px-2 py-1 font-heading text-[9px] font-black uppercase tracking-wider text-amber">
                <InfinityIcon className="h-3 w-3" />
                Endless
              </span>
            )}

            <span className="hidden items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted md:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ball" />
              {isBotMatch ? "Bot arena" : "Stranger duel"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <EmojiReactions onSendReaction={sendReaction} activeReactions={activeReactions} />

            {isEndless && (
              <button
                type="button"
                onClick={togglePause}
                title={isPaused ? "Resume match" : "Pause turn clock"}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                  isPaused
                    ? "border-amber bg-amber text-ink"
                    : "border-line bg-surface/70 text-muted hover:border-amber/40 hover:text-amber"
                }`}
              >
                {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
            )}

            {!isBotMatch && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsReportOpen(true);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface/70 text-muted transition-colors hover:border-ball/40 hover:text-ball"
                title="Report Opponent"
                aria-label="Report Opponent"
              >
                <Flag className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleSkipOrLeave}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface/70 px-2.5 font-heading text-[10px] font-bold uppercase tracking-wider text-muted transition-colors hover:border-ball/40 hover:text-ball"
              title="Skip / Forfeit Match"
            >
              <LogOut className="h-3 w-3" />
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>
        </header>

        <div className="mt-2.5">
          <ScoreBar state={gameState} userPlayerId={userRole} />
        </div>

        {opponentDisconnectSeconds !== null && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-ball/40 bg-ball/10 px-3 py-2 text-[11px] font-semibold text-ball">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Opponent connection lost. Waiting for reconnect...</span>
            </div>
            <span className="shrink-0 font-heading text-xs font-black tabular-nums">
              {opponentDisconnectSeconds}s
            </span>
          </div>
        )}

        {milestoneText && (
          <div className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-amber/40 bg-amber px-3 py-2 font-heading text-sm font-black uppercase text-ink shadow-[0_0_40px_-10px_rgba(247,181,0,0.5)] animate-fade-up">
            <Sparkles className="h-4 w-4 fill-current" />
            <span>{milestoneText}</span>
            <Sparkles className="h-4 w-4 fill-current" />
          </div>
        )}

        {hasSuggestedTap && !useTapMode && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-sky/30 bg-sky/10 px-3 py-2 text-[11px] text-sky">
            <span>Hand gesture not detected. Tap a number below to play.</span>
            <button
              type="button"
              onClick={() => setUseTapMode(true)}
              className="shrink-0 rounded-md bg-sky px-2 py-1 font-heading text-[9px] font-black uppercase tracking-wider text-ink"
            >
              Use taps
            </button>
          </div>
        )}

        <div className="mt-2.5 grid flex-1 gap-2.5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <section
            className="relative flex min-h-[300px] flex-col overflow-hidden rounded-[26px] border border-line bg-[#071021] shadow-panel sm:min-h-[380px] lg:min-h-0"
            aria-label="Hand Cricket Live Video Arena"
          >
            <div className="relative flex-1 overflow-hidden">
              {!isBotMatch ? (
                <video
                  ref={attachRemoteStream}
                  autoPlay
                  playsInline
                  className={`h-full w-full object-cover transition-all duration-300 ${
                    isOpponentBlurred && turnStage !== "reveal" ? "blur-2xl brightness-50" : ""
                  }`}
                />
              ) : (
                <div className="absolute inset-0" aria-hidden="true">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_60%_at_50%_68%,rgba(247,181,0,0.14),transparent_65%),linear-gradient(180deg,#0b1628_0%,#050b16_100%)]" />
                  <div className="pitch-grid absolute inset-0 opacity-40" />
                  <div className="absolute -bottom-36 left-1/2 h-64 w-[125%] -translate-x-1/2 rounded-[50%] border-t-2 border-turf/30" />
                  <div className="absolute -bottom-28 left-1/2 h-48 w-[95%] -translate-x-1/2 rounded-[50%] border-t border-turf/15" />
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/80" aria-hidden="true" />

              <div className="pointer-events-none absolute inset-3 z-10 hidden sm:block" aria-hidden="true">
                <span className="absolute left-0 top-0 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-turf/30" />
                <span className="absolute right-0 top-0 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-turf/30" />
                <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-turf/30" />
                <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-turf/30" />
              </div>

              <div className="absolute left-2.5 top-2.5 z-20 flex items-center gap-2 rounded-xl border border-line/70 bg-surface/90 px-2.5 py-1.5 shadow-lg backdrop-blur-md">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky/25 bg-sky/10 text-[11px]">
                  {isBotMatch ? "🤖" : opponentDisplayName.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-heading text-[11px] font-black uppercase tracking-wide text-chalk">
                      {isBotMatch ? "RoboCricket" : opponentDisplayName}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-turf" />
                  </div>
                  <span className="flex items-center gap-1 text-[8px] uppercase tracking-[0.14em] text-muted">
                    <Wifi className="h-2.5 w-2.5 text-turf" />
                    {opponentRoleStr} · connected
                  </span>
                </div>
              </div>

              <div className="absolute right-2.5 top-2.5 z-20 flex items-center gap-2 rounded-xl border border-line/70 bg-surface/90 px-2.5 py-1.5 shadow-lg backdrop-blur-md">
                <TimerRing
                  remainingSeconds={timerSeconds}
                  totalSeconds={10}
                  size={30}
                  strokeWidth={3}
                  showText={false}
                />
                <div className="text-right">
                  <span className="block font-heading text-[8px] font-bold uppercase tracking-[0.14em] text-muted">
                    Turn clock
                  </span>
                  <span className="font-heading text-xs font-black tabular-nums text-amber">
                    {timerSeconds}s
                  </span>
                </div>
              </div>

              <div className="absolute inset-0 z-20 flex items-center justify-center px-16 py-16 pointer-events-none">
                {outcomeText ? (
                  <div className="flex flex-col items-center gap-2.5 animate-fade-up">
                    <div
                      className={`rounded-2xl border px-6 py-3 font-heading text-2xl font-black uppercase tracking-wider tabular-nums shadow-2xl sm:text-4xl ${
                        isOutcomeWicket
                          ? "border-ball bg-ball text-white animate-shake"
                          : "border-amber bg-amber text-ink"
                      }`}
                    >
                      {outcomeText}
                    </div>
                    {opponentPick !== null && (
                      <div className="flex items-center gap-2 rounded-full border border-line bg-surface/95 px-3 py-1 font-mono text-[10px] shadow-lg backdrop-blur-md">
                        <span className="text-muted">
                          You <strong className="text-chalk">{userPick}</strong>
                        </span>
                        <span className="h-1 w-1 rotate-45 bg-line" />
                        <span className="text-muted">
                          {isBotMatch ? "Bot" : opponentDisplayName}{" "}
                          <strong className="text-chalk">{opponentPick}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                ) : revealCountdown !== null ? (
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber/60 bg-amber/[0.06] shadow-[0_0_60px_-12px_rgba(247,181,0,0.45)] sm:h-24 sm:w-24">
                    <span className="absolute inset-0 animate-ping rounded-full border border-amber/25" />
                    <span className="font-heading text-4xl font-black tabular-nums text-amber sm:text-5xl">
                      {revealCountdown}
                    </span>
                  </div>
                ) : isBotMatch ? (
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="relative">
                      <div
                        className={`flex h-16 w-16 items-center justify-center rounded-2xl border text-3xl shadow-lg transition-all sm:h-20 sm:w-20 ${
                          isUserLocked
                            ? "border-turf/40 bg-turf/10 shadow-glow"
                            : "border-line bg-surface/60"
                        }`}
                      >
                        🤖
                      </div>
                      <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-ink bg-turf" title="Bot ready" />
                    </div>
                    {isUserLocked ? (
                      <div className="flex items-center gap-1.5 rounded-full border border-turf/35 bg-surface/90 px-3.5 py-1.5 backdrop-blur-md">
                        <Check className="h-3.5 w-3.5 text-turf" />
                        <span className="font-heading text-[10px] font-bold uppercase tracking-wider text-turf">
                          Locked {userPick} · bot thinking
                        </span>
                      </div>
                    ) : (
                      <div className="rounded-full border border-amber/35 bg-surface/90 px-3.5 py-1.5 backdrop-blur-md">
                        <span className="font-heading text-[10px] font-black uppercase tracking-wider text-amber">
                          Pick your hand
                        </span>
                      </div>
                    )}
                  </div>
                ) : turnStage === "get_ready" ? (
                  <div className="rounded-xl border border-turf/30 bg-surface/90 px-4 py-2 text-center backdrop-blur-md">
                    <span className="block font-heading text-[10px] font-black uppercase tracking-[0.16em] text-turf">
                      Get ready
                    </span>
                    <span className="text-[10px] text-muted">Prepare your gesture or tap</span>
                  </div>
                ) : isUserLocked ? (
                  <div className="flex items-center gap-1.5 rounded-full border border-turf/35 bg-surface/90 px-4 py-1.5 backdrop-blur-md">
                    <Check className="h-3.5 w-3.5 text-turf" />
                    <span className="font-heading text-[10px] font-bold uppercase tracking-wider text-turf">
                      Locked {userPick}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber/35 bg-surface/90 px-4 py-2 text-center backdrop-blur-md">
                    <span className="block font-heading text-[10px] font-black uppercase tracking-[0.16em] text-amber">
                      Show your number
                    </span>
                    <span className="text-[10px] text-muted">Hand to camera or tap 1–6</span>
                  </div>
                )}
              </div>

              {(isCameraOn || !isBotMatch) && (
                <div className="absolute bottom-3 right-2.5 z-20 w-24 overflow-hidden rounded-xl border border-line/70 bg-[#050b16] shadow-2xl sm:w-32 lg:w-36">
                  {isCameraOn ? (
                    <div className="relative aspect-[4/3] w-full">
                      <video
                        ref={attachLocalStream}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full -scale-x-100 object-cover"
                      />
                      <canvas
                        ref={skeletonCanvasRef}
                        width={320}
                        height={240}
                        className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100"
                      />
                      <div className="absolute left-1 top-1 z-10">
                        {isLoadingModel ? (
                          <span className="rounded bg-black/65 px-1 py-0.5 font-mono text-[7px] text-white/70">
                            Loading tracker
                          </span>
                        ) : isUserLocked ? (
                          <span className="rounded bg-turf px-1 py-0.5 font-mono text-[7px] font-bold uppercase text-ink">
                            Locked {userPick}
                          </span>
                        ) : detectedGesture !== null ? (
                          <span className="rounded bg-amber px-1 py-0.5 font-mono text-[7px] font-bold uppercase text-ink">
                            {detectedGesture} · {Math.round(gestureProgress * 100)}%
                          </span>
                        ) : (
                          <span className="rounded bg-black/65 px-1 py-0.5 font-mono text-[7px] text-white/70">
                            Find hand
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-[#050b16] text-[9px] text-white/45">
                      Camera off
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1 font-mono text-[7px] uppercase tracking-wider text-turf">
                    You
                  </span>
                </div>
              )}

              <div className="absolute bottom-3 left-2.5 z-20 flex items-center gap-1 rounded-xl border border-line/70 bg-surface/90 p-1 backdrop-blur-md">
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  title={isCameraOn ? "Turn camera off" : "Turn camera on"}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                    isCameraOn ? "bg-surface-2 text-chalk hover:text-turf" : "bg-surface text-muted hover:text-chalk"
                  }`}
                >
                  {isCameraOn ? <Camera className="h-3.5 w-3.5" /> : <CameraOff className="h-3.5 w-3.5" />}
                </button>

                {!isBotMatch && (
                  <button
                    type="button"
                    onClick={handleToggleMic}
                    title={isMicOn ? "Mute microphone" : "Unmute microphone"}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                      isMicOn ? "bg-turf text-ink" : "bg-surface text-muted hover:text-chalk"
                    }`}
                  >
                    {isMicOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                  </button>
                )}

                {isCameraOn && (
                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    title="Flip Camera"
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-muted transition-colors hover:text-turf"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setUseTapMode(!useTapMode);
                  }}
                  title={useTapMode ? "Switch to gesture mode" : "Switch to tap mode"}
                  className={`flex h-7 items-center gap-1 rounded-lg px-2 font-heading text-[8px] font-black uppercase tracking-wider transition-colors ${
                    useTapMode ? "bg-sky text-ink" : "bg-surface text-turf hover:bg-turf/15"
                  }`}
                >
                  <Hand className="h-3 w-3" />
                  <span>{useTapMode ? "Tap" : "Gesture"}</span>
                </button>

                {!isBotMatch && (
                  <button
                    type="button"
                    onClick={() => setIsOpponentBlurred(!isOpponentBlurred)}
                    title={isOpponentBlurred ? "Unblur opponent" : "Blur opponent"}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                      isOpponentBlurred ? "bg-turf text-ink" : "bg-surface text-muted hover:text-chalk"
                    }`}
                  >
                    {isOpponentBlurred ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>

              <div className="absolute bottom-3 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-1.5 rounded-full border border-line/60 bg-surface/85 px-2.5 py-1 text-[8px] uppercase tracking-[0.14em] text-muted backdrop-blur-md sm:flex">
                <Radio className="h-2.5 w-2.5 text-ball" />
                Live feed · P2P encrypted
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <HandTile
                playerName="You"
                isUser
                role={userRoleStr}
                state={userTileState}
                pick={userPick}
                countdownNumber={revealCountdown}
              />
              <HandTile
                playerName={opponentDisplayName}
                isUser={false}
                role={opponentRoleStr}
                state={opponentTileState}
                pick={opponentPick}
                mirrored
                countdownNumber={revealCountdown}
              />
            </div>

            {isEndless ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-line/70 bg-surface/70 px-3 py-2">
                <div className="flex items-center gap-3 text-[10px] text-muted">
                  <span>
                    Balls <strong className="font-mono text-chalk">{activeInnings.balls}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    Streak{" "}
                    <strong className="font-mono text-amber">{activeInnings.strikeStreak || 0}</strong>
                    {(activeInnings.strikeStreak || 0) >= 3 && <Flame className="h-3 w-3 fill-current text-amber" />}
                  </span>
                </div>
                <span className="font-heading text-[9px] font-black uppercase tracking-wider text-turf">
                  {isChasing ? `${runsNeeded} needed` : "Bat until out"}
                </span>
              </div>
            ) : (
              <BallStrip
                currentOver={activeInnings.currentOver}
                overIndex={currentOverIndex}
                maxOvers={gameState.format.maxOvers}
              />
            )}

            <div className="relative overflow-hidden rounded-2xl border border-line/70 bg-surface/70 p-2.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${isUserLocked ? "bg-turf" : "animate-pulse bg-amber"}`} />
                  <span className="font-heading text-[9px] font-black uppercase tracking-[0.14em] text-muted">
                    Your delivery
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[8px] uppercase tracking-[0.12em] text-muted">
                  <ShieldCheck className="h-2.5 w-2.5 text-turf" />
                  Secret pick
                </span>
              </div>

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
            </div>

            <div className="hidden items-center justify-between rounded-xl border border-line/50 bg-surface/40 px-3 py-1.5 text-[8px] uppercase tracking-[0.12em] text-muted sm:flex">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-2.5 w-2.5 text-turf" />
                Peer-to-peer video
              </span>
              <span>On-device AI umpire</span>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLiveMatchStore } from "@/lib/store/liveMatchStore";
import { webrtcManager } from "@/lib/webrtc/webrtcManager";
import { handDetector, drawHandSkeleton } from "@/lib/gesture/handDetector";
import type { HandGesture } from "@/lib/gesture/handClassifier";
import { BallStrip } from "./BallStrip";
import { NumberPad } from "./NumberPad";
import { EmojiReactions } from "./EmojiReactions";
import {
  BallIncomingCountdownBadge,
  CameraDetectionPill,
  BallIncomingStatusPanel,
  type CountdownStage,
} from "./BallIncomingCountdown";
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
  Volume2,
  VolumeX,
  Swords,
  Wifi,
} from "lucide-react";
import {
  playClickSound,
  playBoundarySound,
  isSoundMuted,
  toggleSoundMute,
} from "@/lib/client/audio";

export const LiveMatchScreen: React.FC = () => {
  const {
    gameState,
    userRole,
    opponentName,
    isBotMatch,
    userPick,
    isUserLocked,
    opponentPick,
    outcomeText,
    isOutcomeWicket,
    screenShake,
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
  const [isSoundMute, setIsSoundMute] = useState<boolean>(false);
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

  // Ball incoming countdown state machine (3 -> 2 -> 1 -> throw)
  const [roundStage, setRoundStage] = useState<CountdownStage>("countdown");
  const [ballCountdownNumber, setBallCountdownNumber] = useState<number | null>(3);
  const hasSubmittedThisBallRef = useRef<boolean>(false);
  const roundStartTimeRef = useRef<number>(Date.now());

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const skeletonCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setIsSoundMute(isSoundMuted());
  }, []);

  // Milestones banner
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

  // Synchronized Ball Countdown (3 -> 2 -> 1 -> Throw)
  useEffect(() => {
    if (!gameState || !gameState.phase.startsWith("innings_") || isPaused) {
      return;
    }

    if (outcomeText) {
      setRoundStage("result");
      setBallCountdownNumber(null);
      return;
    }

    if (isUserLocked) {
      setRoundStage("throwing");
      setBallCountdownNumber(null);
      return;
    }

    // New ball delivery ready: initialize 3-2-1 countdown
    hasSubmittedThisBallRef.current = false;
    roundStartTimeRef.current = Date.now();
    setRoundStage("countdown");
    setBallCountdownNumber(3);

    const interval = setInterval(() => {
      if (hasSubmittedThisBallRef.current) return;

      const elapsed = Date.now() - roundStartTimeRef.current;

      if (elapsed < 1000) {
        setBallCountdownNumber(3);
      } else if (elapsed < 2000) {
        setBallCountdownNumber(2);
      } else if (elapsed < 3000) {
        setBallCountdownNumber(1);
      } else {
        // Countdown completed: trigger throw event!
        setBallCountdownNumber(null);
        setRoundStage("throwing");
        hasSubmittedThisBallRef.current = true;
        clearInterval(interval);

        const currentGesture = detectedGesture ?? lastStableGesture;
        const fallback = Math.floor(Math.random() * 6) + 1;
        const throwPick =
          useTapMode && selectedNum
            ? selectedNum
            : currentGesture && currentGesture >= 1 && currentGesture <= 6
            ? currentGesture
            : selectedNum || fallback;

        submitBallPick(throwPick);
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [
    gameState?.phase,
    gameState?.currentInnings,
    gameState?.innings1?.balls,
    gameState?.innings2?.balls,
    outcomeText,
    isUserLocked,
    isPaused,
    useTapMode,
    selectedNum,
    detectedGesture,
    lastStableGesture,
    submitBallPick,
  ]);

  if (!gameState) return null;

  const activeInnings =
    gameState.currentInnings === 1 ? gameState.innings1 : gameState.innings2!;
  const isUserBatting = activeInnings.battingPlayer === userRole;
  const userRoleStr = isUserBatting ? "batting" : "bowling";
  const opponentRoleStr = isUserBatting ? "bowling" : "batting";

  const currentOverIndex = Math.floor(activeInnings.balls / 6);
  const opponentDisplayName = isBotMatch ? "COMPUTER" : opponentName || "OPPONENT";

  const isEndless = gameState.format.isEndless || gameState.format.mode === "endless";
  const isChasing = gameState.currentInnings === 2 && activeInnings.target !== undefined;
  const runsNeeded = isChasing ? Math.max(0, (activeInnings.target || 0) - activeInnings.score) : 0;

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

  const handleToggleSound = () => {
    playClickSound();
    const next = toggleSoundMute();
    setIsSoundMute(next);
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
      className={`relative min-h-[100dvh] w-full overflow-x-hidden bg-[#4ea826] text-chalk select-none ${
        screenShake ? "animate-shake" : ""
      }`}
    >
      {/* Retro Arcade Green Pitch-Grid Background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0, 0, 0, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.15) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
        aria-hidden="true"
      />

      {/* Central Beige / Tan Cricket Pitch Strip */}
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[620px] flex-col border-x-4 border-black bg-[#deb887] px-3 pb-6 pt-3 shadow-2xl sm:px-5 sm:pt-4">
        {/* Top Header & Wickets Bar */}
        <header className="relative z-10 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            {/* Pill: HAND CRICKET */}
            <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-[#86efac] px-3 py-1 font-heading text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_#000]">
              <span>🏏</span>
              <span>HAND CRICKET</span>
            </div>

            {/* Stumps Graphic (Top of Crease) */}
            <div className="flex flex-col items-center justify-center">
              <div className="flex gap-1 mb-0.5">
                <span className="h-1 w-3 rounded-sm border border-black bg-white" />
                <span className="h-1 w-3 rounded-sm border border-black bg-white" />
              </div>
              <div className="flex gap-1">
                <span className="h-5 w-1.5 rounded-sm border border-black bg-white" />
                <span className="h-5 w-1.5 rounded-sm border border-black bg-white" />
                <span className="h-5 w-1.5 rounded-sm border border-black bg-white" />
              </div>
            </div>

            {/* Back / Leave Button */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleSound}
                title={isSoundMute ? "Unmute audio" : "Mute audio"}
                className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-black bg-white text-black shadow-[2px_2px_0px_#000] transition-transform active:translate-y-0.5"
              >
                {isSoundMute ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={handleSkipOrLeave}
                className="inline-flex items-center gap-1 rounded-xl border-2 border-black bg-white px-3 py-1 font-heading text-xs font-black uppercase text-black shadow-[3px_3px_0px_#000] transition-transform active:translate-y-0.5"
                title="Forfeit / Exit match"
              >
                <span>←</span>
                <span>BACK</span>
              </button>
            </div>
          </div>

          {/* Quick Match Status Bar (Endless / Disconnect) */}
          {opponentDisconnectSeconds !== null && (
            <div className="flex items-center justify-between gap-2 rounded-xl border-2 border-black bg-[#f87171] px-3 py-1.5 text-xs font-black text-black shadow-[2px_2px_0px_#000]">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Opponent disconnected. Forfeiting in {opponentDisconnectSeconds}s...</span>
              </div>
            </div>
          )}

          {milestoneText && (
            <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-black bg-[#FFD600] px-3 py-1.5 font-heading text-xs font-black uppercase text-black shadow-[2px_2px_0px_#000] animate-bounce">
              <Sparkles className="h-4 w-4 fill-current" />
              <span>{milestoneText}</span>
              <Sparkles className="h-4 w-4 fill-current" />
            </div>
          )}

          {/* Black Retro Arcade Scoreboard */}
          <div className="mt-1 flex overflow-hidden rounded-2xl border-4 border-black bg-black text-white shadow-[4px_4px_0px_#000]">
            {/* Player Side (YOU) */}
            <div className="flex flex-1 flex-col items-center justify-between p-3 sm:p-4 text-center">
              <span className="font-heading text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                YOU
              </span>
              <span className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums my-1">
                {activeInnings.score}
              </span>
              <span
                className={`rounded-full border border-black px-2.5 py-0.5 font-heading text-[9px] font-black uppercase tracking-wider ${
                  isUserBatting ? "bg-[#86efac] text-black" : "bg-[#93c5fd] text-black"
                }`}
              >
                {isUserBatting ? "BATTING" : "BOWLING"}
              </span>
            </div>

            {/* Pink Divider with "v" */}
            <div className="flex w-7 sm:w-8 items-center justify-center border-x-2 border-black bg-[#FF5FB2] font-heading text-xs font-black uppercase text-white select-none">
              v
            </div>

            {/* Opponent Side (COMPUTER / STRANGER) */}
            <div className="flex flex-1 flex-col items-center justify-between p-3 sm:p-4 text-center">
              <span className="font-heading text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate max-w-[120px]">
                {opponentDisplayName}
              </span>
              <span className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums my-1">
                {isChasing
                  ? `${runsNeeded} needed`
                  : gameState.currentInnings === 2 && gameState.innings1
                  ? gameState.innings1.score
                  : "0"}
              </span>
              <span
                className={`rounded-full border border-black px-2.5 py-0.5 font-heading text-[9px] font-black uppercase tracking-wider ${
                  opponentRoleStr === "batting"
                    ? "bg-[#86efac] text-black"
                    : "bg-[#93c5fd] text-black"
                }`}
              >
                {opponentRoleStr === "batting" ? "BATTING" : "BOWLING"}
              </span>
            </div>
          </div>
        </header>

        {/* DUEL ARENA: Two Side-by-Side Video Panels (matching screenshot) */}
        <section
          className="relative z-10 my-3 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full"
          aria-label="Hand Cricket Duel Panels"
        >
          {/* Left Panel: Player Camera Feed */}
          <div className="relative aspect-square sm:aspect-[4/3] w-full overflow-hidden rounded-2xl border-4 border-black bg-black shadow-[4px_4px_0px_#000]">
            {isCameraOn ? (
              <>
                <video
                  ref={attachLocalStream}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover -scale-x-100"
                />
                <canvas
                  ref={skeletonCanvasRef}
                  width={320}
                  height={240}
                  className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100"
                />
              </>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center bg-[#1e293b]">
                <CameraOff className="h-8 w-8 text-slate-400 mb-1" />
                <span className="font-heading text-xs font-bold text-white uppercase">
                  Camera Off
                </span>
                <span className="text-[10px] text-slate-300 mt-0.5">
                  Tap delivery mode active
                </span>
              </div>
            )}

            {/* Top-Left Hand Detection Pill ("NO HAND" / "2 FINGERS" / "TAP MODE") */}
            <div className="absolute left-2 top-2 z-20">
              <CameraDetectionPill
                detectedGesture={detectedGesture}
                isTapMode={useTapMode}
                selectedNum={selectedNum}
                isLocked={isUserLocked}
                userPick={userPick}
              />
            </div>

            {/* Large Pink Circular Countdown Badge (3 -> 2 -> 1) in Center */}
            <BallIncomingCountdownBadge
              countdownNumber={ballCountdownNumber}
              stage={roundStage}
            />

            {/* Floating Outcome Text (e.g. FOUR! SIX! OUT!) on Resolution */}
            {outcomeText && (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-3 animate-fade-up">
                <div
                  className={`rounded-2xl border-4 border-black px-5 py-2.5 font-heading text-3xl sm:text-4xl font-black uppercase tracking-wider text-black shadow-[4px_4px_0px_#000] ${
                    isOutcomeWicket ? "bg-red-500 text-white animate-shake" : "bg-[#FFD600]"
                  }`}
                >
                  {outcomeText}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Opponent / Computer Feed */}
          <div className="relative aspect-square sm:aspect-[4/3] w-full overflow-hidden rounded-2xl border-4 border-black bg-black shadow-[4px_4px_0px_#000] flex flex-col">
            {/* Pink Header: OOO COMPUTER */}
            <div className="z-10 flex items-center justify-between border-b-4 border-black bg-[#FF5FB2] px-3 py-1.5 text-black">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white border border-black" />
                <span className="h-2 w-2 rounded-full bg-white border border-black" />
                <span className="h-2 w-2 rounded-full bg-white border border-black" />
                <span className="ml-1 font-heading text-xs font-black uppercase tracking-wider">
                  {opponentDisplayName}
                </span>
              </div>

              {!isBotMatch && (
                <button
                  type="button"
                  onClick={() => setIsOpponentBlurred(!isOpponentBlurred)}
                  title={isOpponentBlurred ? "Unblur opponent" : "Blur opponent"}
                  className="rounded border border-black bg-white px-1.5 py-0.5 text-[9px] font-black uppercase text-black"
                >
                  {isOpponentBlurred ? "Unblur" : "Blur"}
                </button>
              )}
            </div>

            {/* Feed Content: Bot Visualizer or Remote Peer Video */}
            <div className="relative flex-1 overflow-hidden">
              {isBotMatch ? (
                <div className="flex h-full w-full flex-col items-center justify-center bg-[#3B82F6] p-4 text-white">
                  <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl border-4 border-black bg-white text-3xl sm:text-4xl shadow-[3px_3px_0px_#000]">
                    🤖
                  </div>
                  <span className="mt-2 font-heading text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                    {outcomeText && opponentPick !== null
                      ? `THREW: ${opponentPick}`
                      : roundStage === "throwing"
                      ? "THROWING..."
                      : "READY"}
                  </span>
                </div>
              ) : (
                <video
                  ref={attachRemoteStream}
                  autoPlay
                  playsInline
                  className={`h-full w-full object-cover transition-all ${
                    isOpponentBlurred ? "blur-xl" : ""
                  }`}
                />
              )}
            </div>
          </div>
        </section>

        {/* BOLD YELLOW STATUS PANEL (Below Camera Panels) */}
        <section className="relative z-10 w-full mb-3" aria-label="Game Status Panel">
          <BallIncomingStatusPanel
            stage={roundStage}
            countdownNumber={ballCountdownNumber}
            userPick={userPick}
            outcomeText={outcomeText}
            isOutcomeWicket={isOutcomeWicket}
          />
        </section>

        {/* CONTROLS & NUMBER PAD (Taps & Fallbacks) */}
        <section className="relative z-10 flex flex-col gap-2.5 w-full">
          {/* Quick Hardware Controls Strip */}
          <div className="flex items-center justify-between rounded-xl border-2 border-black bg-white p-1.5 shadow-[2px_2px_0px_#000]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleCamera}
                title={isCameraOn ? "Turn camera off" : "Turn camera on"}
                className={`flex h-8 items-center gap-1 rounded-lg border-2 border-black px-2 font-heading text-[10px] font-black uppercase transition-colors ${
                  isCameraOn ? "bg-[#86efac] text-black" : "bg-[#f87171] text-white"
                }`}
              >
                {isCameraOn ? <Camera className="h-3.5 w-3.5" /> : <CameraOff className="h-3.5 w-3.5" />}
                <span>{isCameraOn ? "Camera ON" : "Camera OFF"}</span>
              </button>

              {isCameraOn && (
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  title="Flip camera"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-white text-black hover:bg-slate-100"
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
                className={`flex h-8 items-center gap-1 rounded-lg border-2 border-black px-2.5 font-heading text-[10px] font-black uppercase transition-colors ${
                  useTapMode ? "bg-[#93c5fd] text-black" : "bg-[#86efac] text-black"
                }`}
              >
                <Hand className="h-3.5 w-3.5" />
                <span>{useTapMode ? "Tap Mode" : "Gesture Mode"}</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <EmojiReactions onSendReaction={sendReaction} activeReactions={activeReactions} />
              {!isBotMatch && (
                <button
                  type="button"
                  onClick={() => setIsReportOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-white text-black hover:bg-slate-100"
                  title="Report player"
                >
                  <Flag className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* NumberPad (Tap Controls) */}
          <div className="rounded-2xl border-4 border-black bg-white p-2.5 shadow-[4px_4px_0px_#000]">
            <div className="mb-1.5 flex items-center justify-between text-black px-1">
              <span className="font-heading text-[10px] font-black uppercase tracking-wider">
                Select your delivery (Tap or Gesture):
              </span>
              <span className="font-mono text-[9px] font-bold text-slate-500">1 to 6</span>
            </div>

            <NumberPad
              selectedNumber={userPick || selectedNum}
              onSelectNumber={(num) => {
                handleSelectNumber(num);
                if (tapToLock && !hasSubmittedThisBallRef.current) {
                  submitBallPick(num);
                }
              }}
              onConfirmLock={handleConfirmLock}
              isLocked={isUserLocked}
              disabled={isUserLocked || outcomeText !== null}
              tapToLock={tapToLock}
              onToggleTapToLock={() => setTapToLock(!tapToLock)}
            />
          </div>

          {/* BallStrip Over History */}
          {!isEndless && (
            <div className="rounded-xl border-2 border-black bg-white p-2 shadow-[2px_2px_0px_#000]">
              <BallStrip
                currentOver={activeInnings.currentOver}
                overIndex={currentOverIndex}
                maxOvers={gameState.format.maxOvers}
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

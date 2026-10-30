"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLiveMatchStore } from "@/lib/store/liveMatchStore";
import { webrtcManager, playRemoteVideo } from "@/lib/webrtc/webrtcManager";
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
  Lock,
  Check,
  Wifi,
  Radio,
  Swords,
  Zap,
} from "lucide-react";
import { playClickSound, playBoundarySound } from "@/lib/client/audio";

const hasCameraTrack = (stream: MediaStream | null) =>
  !!stream?.getVideoTracks().some((t) => t.readyState === "live");

export const LiveMatchScreen: React.FC = () => {
  const {
    gameState,
    userRole,
    opponentName,
    isBotMatch,
    isGestureMode,
    setIsGestureMode,
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
    isAutoPicked,
    sendReaction,
    forfeitCurrentMatch,
    setIsReportOpen,
  } = useLiveMatchStore();

  const useTapMode = !isGestureMode;
  const setUseTapMode = (tap: boolean) => setIsGestureMode(!tap);
  const [tapToLock, setTapToLock] = useState<boolean>(true);
  const [selectedNum, setSelectedNum] = useState<number | null>(null);

  const [isCameraOn, setIsCameraOn] = useState<boolean>(() => isGestureMode && webrtcManager.isCameraEnabled);
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
  const [isOpponentVideoLive, setIsOpponentVideoLive] = useState<boolean>(
    () => webrtcManager.getState() === "live"
  );
  const [isOpponentCameraOn, setIsOpponentCameraOn] = useState<boolean>(
    () => webrtcManager.isOpponentCameraEnabled
  );

  // Automatically reset manual number selection when a delivery finishes or pick is cleared
  useEffect(() => {
    if (!isUserLocked && userPick === null) {
      setSelectedNum(null);
      setDetectedGesture(null);
      setLastStableGesture(null);
    }
  }, [isUserLocked, userPick, gameState?.innings1?.balls, gameState?.innings2?.balls, gameState?.phase]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const skeletonCanvasRef = useRef<HTMLCanvasElement>(null);

  // Opponent video link (started by the store when the match is found)
  useEffect(() => {
    if (isBotMatch) return;
    const attachRemote = (stream: MediaStream | null) => playRemoteVideo(remoteVideoRef.current, stream);
    // This screen remounts between toss / innings break, so re-sync everything the link already knows
    attachRemote(webrtcManager.getRemoteStream());
    setIsOpponentVideoLive(webrtcManager.getState() === "live");
    setIsOpponentCameraOn(webrtcManager.isOpponentCameraEnabled);

    webrtcManager.onRemoteStream = attachRemote;
    webrtcManager.onConnectionStateChange = (state) => {
      setIsOpponentVideoLive(state === "live");
    };
    webrtcManager.onOpponentCameraToggle = (enabled) => {
      setIsOpponentCameraOn(enabled);
    };
    return () => {
      webrtcManager.onRemoteStream = undefined;
      webrtcManager.onConnectionStateChange = undefined;
      webrtcManager.onOpponentCameraToggle = undefined;
    };
  }, [isBotMatch]);

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

  // Tap mode in a human match: camera off, but keep the mic so both players hear each other
  const goCameraOffKeepMic = () => {
    if (isBotMatch) {
      webrtcManager.stopLocalStream();
      return;
    }
    webrtcManager
      .stopCamera()
      .then(() => webrtcManager.ensureAudio())
      .catch((err) => console.warn("[LiveMatch] Mic unavailable:", err));
  };

  useEffect(() => {
    let active = true;

    const setupCamera = async () => {
      try {
        let stream = webrtcManager.getLocalStream();
        if (!hasCameraTrack(stream) && isCameraOn && isGestureMode && gameState?.phase !== "match_ended") {
          stream = await webrtcManager.initLocalMedia();
        }
        if (active && localVideoRef.current && stream) {
          localVideoRef.current.srcObject = stream;
          try {
            await localVideoRef.current.play();
          } catch {}
        }
      } catch (err) {
        console.warn("[LiveMatch] Camera initialization skipped or denied:", err);
      }
    };

    if (isGestureMode && isCameraOn && gameState?.phase !== "match_ended") {
      setupCamera();
    } else {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (gameState?.phase === "match_ended") {
        handDetector.stop();
        webrtcManager.endMatchMedia();
      } else if (!isGestureMode) {
        handDetector.stop();
        goCameraOffKeepMic();
      } else if (!isBotMatch) {
        webrtcManager.ensureAudio().catch((err) => console.warn("[LiveMatch] Mic unavailable:", err));
      }
    }

    return () => {
      active = false;
      handDetector.stop();
      const currentPhase = useLiveMatchStore.getState().gameState?.phase;
      const currentScreen = useLiveMatchStore.getState().screen;
      if (currentScreen === "landing") {
        webrtcManager.stopLocalStream();
      } else if (currentPhase === "match_ended" || currentScreen === "result") {
        webrtcManager.endMatchMedia();
      }
    };
  }, [isGestureMode, isCameraOn, isBotMatch, gameState?.phase]);

  // Automatically shut off camera and hand detector when match ends (the mic stays on)
  useEffect(() => {
    if (gameState?.phase === "match_ended") {
      handDetector.stop();
      webrtcManager.endMatchMedia();
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      setIsCameraOn(false);
    }
  }, [gameState?.phase]);

  useEffect(() => {
    if (useTapMode || !isCameraOn || isUserLocked || !gameState || gameState.phase === "match_ended") {
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

        // Always update skeleton canvas — draw landmarks when present, clear when absent
        if (skeletonCanvasRef.current) {
          // Sync canvas resolution to the actual video dimensions for accurate overlay
          const video = localVideoRef.current;
          if (video && video.videoWidth > 0) {
            const canvas = skeletonCanvasRef.current;
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }
          }
          drawHandSkeleton(skeletonCanvasRef.current, res.landmarks, isUserLocked || res.locked);
        }

        // Fast lock-in: when holding a valid gesture steady (100% progress) in Quick Lock mode
        if (
          tapToLock &&
          !isUserLocked &&
          res.progress >= 1 &&
          res.gesture !== null &&
          res.gesture >= 1 &&
          res.gesture <= 6
        ) {
          submitBallPick(res.gesture);
        }
      };

      handDetector.start(localVideoRef.current);
    }

    return () => {
      handDetector.stop();
    };
  }, [useTapMode, isCameraOn, isUserLocked, tapToLock, gameState?.innings1?.balls, gameState?.innings2?.balls]);

  // Lock the pick as the turn clock goes 4 -> 3, just before the opponent's video is revealed:
  // take whatever the player chose (tap or held gesture), otherwise a random number.
  // Bot matches have no video, so they keep the last-second gesture lock.
  const lockAtSecond = isBotMatch ? 1 : 3;
  useEffect(() => {
    if (timerSeconds !== lockAtSecond || isUserLocked) return;
    const chosen = selectedNum ?? (useTapMode ? null : detectedGesture ?? lastStableGesture);
    if (chosen && chosen >= 1 && chosen <= 6) {
      submitBallPick(chosen);
    } else if (!isBotMatch) {
      submitBallPick(Math.floor(Math.random() * 6) + 1, { auto: true });
    }
  }, [timerSeconds, lockAtSecond, isUserLocked, isBotMatch, useTapMode, selectedNum, detectedGesture, lastStableGesture, submitBallPick]);

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

  // Opponent's video stays hidden while picking and is revealed once the turn clock hits 3
  const isOpponentVideoHidden = !outcomeText && revealCountdown === null && timerSeconds > 3;
  const showOpponentVideo = !isBotMatch && isOpponentVideoLive && isOpponentCameraOn;

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

  const handleToggleCamera = async () => {
    if (!isGestureMode) return;
    if (!isCameraOn) {
      let stream = webrtcManager.getLocalStream();
      if (!hasCameraTrack(stream)) {
        try {
          stream = await webrtcManager.initLocalMedia();
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            await localVideoRef.current.play().catch(() => {});
          }
        } catch (e) {
          console.warn("[LiveMatch] Camera access denied:", e);
        }
      }
    }
    const nextState = webrtcManager.toggleCamera();
    setIsCameraOn(nextState);
  };

  const handleSetGestureMode = async (enableGesture: boolean) => {
    if (enableGesture === isGestureMode) return;
    playClickSound();
    setIsGestureMode(enableGesture);
    if (!enableGesture) {
      // Switching to Tap Mode:
      // Immediately stop hand detector, turn off camera, and release local stream so hardware light turns off
      handDetector.stop();
      setIsCameraOn(false);
      webrtcManager.toggleCamera(false);
      goCameraOffKeepMic();
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    } else {
      // Switching to Gesture Mode:
      // Turn camera on and acquire local media
      setIsCameraOn(true);
      webrtcManager.toggleCamera(true);
      try {
        let stream = webrtcManager.getLocalStream();
        if (!hasCameraTrack(stream)) {
          stream = await webrtcManager.initLocalMedia();
        }
        if (localVideoRef.current && stream) {
          localVideoRef.current.srcObject = stream;
          await localVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn("[LiveMatch] Camera access denied on mode switch:", err);
      }
    }
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
      className={`relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-ink text-chalk selection:bg-turf selection:text-ink ${
        screenShake ? "animate-shake" : ""
      }`}
    >
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(247,181,0,0.07),transparent_65%)]"
        aria-hidden="true"
      />
      <div className="pitch-grid pointer-events-none fixed inset-0 opacity-10" aria-hidden="true" />

      <div className="match-screen-container relative z-10 mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-[1440px] flex-col p-2 sm:p-2.5 overflow-hidden">
        <header className="match-header flex shrink-0 flex-wrap items-center justify-between gap-1.5 sm:gap-2">
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

        <div className="mt-1.5 shrink-0">
          <ScoreBar state={gameState} userPlayerId={userRole} />
        </div>

        {opponentDisconnectSeconds !== null && (
          <div className="mt-1.5 shrink-0 flex items-center justify-between gap-2 rounded-xl border border-ball/40 bg-ball/10 px-3 py-1.5 text-[11px] font-semibold text-ball">
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
          <div className="mt-1.5 shrink-0 flex items-center justify-center gap-2 rounded-xl border border-amber/40 bg-amber px-3 py-1.5 font-heading text-xs font-black uppercase text-ink shadow-[0_0_40px_-10px_rgba(247,181,0,0.5)] animate-fade-up">
            <Sparkles className="h-3.5 w-3.5 fill-current" />
            <span>{milestoneText}</span>
            <Sparkles className="h-3.5 w-3.5 fill-current" />
          </div>
        )}

        {hasSuggestedTap && !useTapMode && (
          <div className="mt-1.5 shrink-0 flex items-center justify-between gap-2 rounded-xl border border-sky/30 bg-sky/10 px-3 py-1.5 text-[10px] text-sky">
            <span>Hand gesture not detected. Tap a number below to play.</span>
            <button
              type="button"
              onClick={() => setUseTapMode(true)}
              className="shrink-0 rounded-md bg-sky px-2 py-0.5 font-heading text-[8px] font-black uppercase tracking-wider text-ink"
            >
              Use taps
            </button>
          </div>
        )}

        <div className="match-live-grid mt-1.5 flex-1 min-h-0 grid gap-2 lg:grid-cols-[minmax(0,1fr)_310px] xl:grid-cols-[minmax(0,1fr)_340px]">
          <section
            className="relative flex flex-col h-full min-h-0 overflow-hidden rounded-2xl border border-line bg-[#071021] shadow-panel"
            aria-label="Hand Cricket Live Video Arena"
          >
            <div className="relative flex-1 overflow-hidden">
              {!isBotMatch ? (
                <>
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`h-full w-full object-cover transition-all duration-300 ${
                      isOpponentVideoHidden || (isOpponentBlurred && turnStage !== "reveal")
                        ? "blur-2xl brightness-50"
                        : ""
                    } ${showOpponentVideo ? "" : "invisible"}`}
                  />
                  <div className="absolute left-1/2 top-14 z-20 -translate-x-1/2 sm:top-3">
                    {!showOpponentVideo ? (
                      <span className="flex items-center gap-1.5 rounded-full border border-line/70 bg-surface/90 px-3 py-1 text-[10px] font-semibold text-muted backdrop-blur-md">
                        <CameraOff className="h-3 w-3" />
                        {isOpponentVideoLive ? "Opponent camera is off" : "Connecting opponent video..."}
                      </span>
                    ) : isOpponentVideoHidden ? (
                      <span className="flex items-center gap-1.5 rounded-full border border-line/70 bg-surface/90 px-3 py-1 text-[10px] font-semibold text-chalk backdrop-blur-md">
                        <Lock className="h-3 w-3 text-turf" />
                        Opponent video reveals at 3
                      </span>
                    ) : null}
                  </div>
                </>
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
                      {isAutoPicked ? "Time up · auto-picked" : "Locked"} {userPick}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber/35 bg-surface/90 px-4 py-2 text-center backdrop-blur-md">
                    <span className="block font-heading text-[10px] font-black uppercase tracking-[0.16em] text-amber">
                      {isGestureMode ? "Show your number" : "Select your number"}
                    </span>
                    <span className="text-[10px] text-muted">
                      {isGestureMode ? "Hand to camera or tap 1–6" : "Tap 1–6 buttons below or press keys 1–6"}
                    </span>
                  </div>
                )}
              </div>

              {isGestureMode && (
                <div className="absolute bottom-3 right-2.5 z-20 w-24 overflow-hidden rounded-xl border border-line/70 bg-[#050b16] shadow-2xl sm:w-32 lg:w-36">
                  {isCameraOn ? (
                    <div className="relative aspect-[4/3] w-full">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full -scale-x-100 object-cover"
                      />
                      <canvas
                        ref={skeletonCanvasRef}
                        className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover"
                      />
                      <div className="absolute left-1 top-1 z-10">
                        {isLoadingModel ? (
                          <span className="rounded bg-black/65 px-1 py-0.5 font-mono text-[7px] text-white/70">
                            Loading tracker
                          </span>
                        ) : isUserLocked ? (
                          <span className="rounded bg-turf px-1 py-0.5 font-mono text-[7px] font-bold uppercase text-ink">
                            {isAutoPicked ? "Auto" : "Locked"} {userPick}
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
                {isGestureMode && (
                  <>
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
                  </>
                )}

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

                <button
                  type="button"
                  onClick={() => handleSetGestureMode(!isGestureMode)}
                  title={isGestureMode ? "Gesture Mode active. Click to switch to Tap Mode." : "Tap Mode active. Click to switch to Gesture Mode."}
                  className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 font-heading text-[9px] font-black uppercase tracking-wider transition-colors ${
                    isGestureMode ? "bg-turf/20 text-turf border border-turf/40" : "bg-sky text-ink"
                  }`}
                >
                  {isGestureMode ? <Hand className="h-3 w-3" /> : <Zap className="h-3 w-3 fill-current" />}
                  <span>{isGestureMode ? "Gesture" : "Tap"}</span>
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
                {isGestureMode ? "Live feed · P2P encrypted" : "Tap Mode · Camera Off"}
              </div>
            </div>
          </section>

          <aside className="match-sidebar flex flex-col gap-1.5 sm:gap-2.5 h-full min-h-0 overflow-hidden">
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 flex-1 min-h-0">
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
              <div className="shrink-0 flex items-center justify-between gap-2 rounded-xl border border-line/70 bg-surface/70 px-2.5 py-1 sm:py-1.5">
                <div className="flex items-center gap-2.5 text-[9px] text-muted">
                  <span>
                    Balls <strong className="font-mono text-chalk">{activeInnings.balls}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    Streak{" "}
                    <strong className="font-mono text-amber">{activeInnings.strikeStreak || 0}</strong>
                    {(activeInnings.strikeStreak || 0) >= 3 && <Flame className="h-3 w-3 fill-current text-amber" />}
                  </span>
                </div>
                <span className="font-heading text-[8px] font-black uppercase tracking-wider text-turf">
                  {isChasing ? `${runsNeeded} needed` : "Bat until out"}
                </span>
              </div>
            ) : (
              <div className="shrink-0">
                <BallStrip
                  currentOver={activeInnings.currentOver}
                  overIndex={currentOverIndex}
                  maxOvers={gameState.format.maxOvers}
                />
              </div>
            )}

            <div className="match-delivery-panel shrink-0 relative overflow-hidden rounded-xl sm:rounded-2xl border border-line/70 bg-surface/80 p-2 sm:p-2.5">
              <div className="mb-1 flex items-center justify-between gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${isUserLocked ? "bg-turf" : "animate-pulse bg-amber"}`} />
                  <span className="font-heading text-[10px] font-black uppercase tracking-[0.14em] text-chalk">
                    {isUserLocked
                      ? isAutoPicked
                        ? `Time up · auto-picked ${userPick}`
                        : "Pick locked · get ready"
                      : "Your delivery"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Mode switcher with 2 clear options */}
                  <div
                    className="flex items-center rounded-lg border border-line bg-surface-2/80 p-0.5"
                    role="group"
                    aria-label="Gameplay mode switcher"
                  >
                    <button
                      type="button"
                      onClick={() => handleSetGestureMode(true)}
                      aria-pressed={isGestureMode}
                      title="Gesture Mode: Show 1–6 fingers to camera"
                      className={`flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-0.5 font-heading text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all ${
                        isGestureMode
                          ? "bg-turf text-ink shadow-sm"
                          : "text-muted hover:text-chalk"
                      }`}
                    >
                      <Hand className="h-2.5 w-2.5" />
                      <span>Gesture</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetGestureMode(false)}
                      aria-pressed={!isGestureMode}
                      title="Tap Mode: Click 1–6 buttons or use keyboard"
                      className={`flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-0.5 font-heading text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all ${
                        !isGestureMode
                          ? "bg-sky text-ink shadow-sm"
                          : "text-muted hover:text-chalk"
                      }`}
                    >
                      <Zap className="h-2.5 w-2.5" />
                      <span>Tap</span>
                    </button>
                  </div>

                  {!tapToLock && (selectedNum || userPick) && !isUserLocked && userTileState === "empty" && (
                    <button
                      type="button"
                      onClick={handleConfirmLock}
                      className="flex items-center gap-1 rounded-full border border-turf/50 bg-turf px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-ink transition-transform hover:scale-105 active:scale-95 shadow-glow"
                      title="Lock in selected pick"
                    >
                      <Lock className="h-2.5 w-2.5 stroke-[2.5]" />
                      Lock {selectedNum || userPick}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setTapToLock(!tapToLock)}
                    aria-label={`Toggle Tap to Lock. Currently ${tapToLock ? "Enabled" : "Disabled"}`}
                    title="Toggle instant lock mode"
                    className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider transition-colors ${
                      tapToLock
                        ? "border-amber/40 bg-amber/10 text-amber"
                        : "border-line bg-surface-2/50 text-muted hover:text-chalk"
                    }`}
                  >
                    <Zap className={`h-2 w-2 ${tapToLock ? "fill-current" : ""}`} />
                    {tapToLock ? "Quick" : "Confirm"}
                  </button>
                </div>
              </div>

              {/* Mode description strip */}
              <div className="mb-1.5 flex items-center justify-between text-[8px] text-slate-300">
                {isGestureMode ? (
                  <p className="flex items-center gap-1 text-slate-300 truncate">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-turf animate-pulse" />
                    <span>
                      <strong className="text-turf">Gesture Mode:</strong> Show 1–6 fingers to webcam • Auto-locks on hold
                    </span>
                  </p>
                ) : (
                  <p className="flex items-center gap-1 text-slate-300 truncate">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-sky" />
                    <span>
                      <strong className="text-sky">Tap Mode:</strong> Tap buttons below or press keys 1–6 to play
                    </span>
                  </p>
                )}
                <span className="hidden sm:inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wider text-muted shrink-0 ml-1">
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
                hideHeader={true}
              />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

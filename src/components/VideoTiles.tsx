"use client";

import React, { useEffect, useRef, useState } from "react";
import { webrtcManager, playRemoteVideo, type WebRTCConnectionState } from "@/lib/webrtc/webrtcManager";
import { nsfwScanner } from "@/lib/safety/nsfwScanner";
import { PlayerChip } from "./PlayerChip";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  Flag,
  UserX,
  RotateCw,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Lock,
} from "lucide-react";
import type { HandGesture } from "@/lib/gesture/handClassifier";

interface VideoTilesProps {
  layout: "mobile-portrait" | "desktop" | "landscape";
  opponentGuestId: string;
  opponentName: string;
  isFirstMatchForGuest?: boolean;
  isFriendRoom?: boolean;
  onNextOpponent: () => void;
  onBlockOpponent: (opponentGuestId: string) => void;
  onOpenReport: () => void;
  remoteVideoRefOut?: React.RefObject<HTMLVideoElement | null>;
  localVideoRefOut?: React.RefObject<HTMLVideoElement | null>;
  // Turn stage for anti-copying video pause & blur
  turnStage?: "pick" | "countdown" | "reveal" | "idle";
  countdownSeconds?: number | null;
  // Gesture detection feedback for self-preview overlay
  isGestureModeActive?: boolean;
  detectedGesture?: HandGesture | null;
  gestureProgress?: number;
  isGestureLocked?: boolean;
  gestureHint?: string;
  isLowLight?: boolean;
  // Overrides the turn-stage mask: true keeps the opponent's video hidden, false shows it
  hideOpponentVideo?: boolean;
  // Local camera stream to preview once it's acquired after mount
  localStream?: MediaStream | null;
}

export function VideoTiles({
  layout,
  opponentGuestId,
  opponentName,
  isFirstMatchForGuest = false,
  isFriendRoom = false,
  onNextOpponent,
  onBlockOpponent,
  onOpenReport,
  remoteVideoRefOut,
  localVideoRefOut,
  turnStage = "idle",
  countdownSeconds = null,
  isGestureModeActive = false,
  detectedGesture = null,
  gestureProgress = 0,
  isGestureLocked = false,
  gestureHint,
  isLowLight = false,
  hideOpponentVideo,
  localStream,
}: VideoTilesProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const internalRemoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = remoteVideoRefOut || internalRemoteVideoRef;

  const [connectionState, setConnectionState] = useState<WebRTCConnectionState>(
    webrtcManager.getState()
  );
  const [isOpponentCameraOn, setIsOpponentCameraOn] = useState<boolean>(
    () => webrtcManager.getState() !== "live" || webrtcManager.isOpponentCameraEnabled
  );
  const [isOpponentMicOn, setIsOpponentMicOn] = useState<boolean>(false);

  const [isLocalCameraOn, setIsLocalCameraOn] = useState<boolean>(webrtcManager.isCameraEnabled);
  const [isLocalMicOn, setIsLocalMicOn] = useState<boolean>(webrtcManager.isMicEnabled);
  const [isSelfHidden, setIsSelfHidden] = useState<boolean>(webrtcManager.isSelfHidden);

  // Safety Blur States (Friend rooms are never blurred: friends consent to each other)
  // In stranger mode, stranger video starts blurred for privacy & safety until revealed
  const [isFirstMatchBlurred, setIsFirstMatchBlurred] = useState<boolean>(
    isFriendRoom ? false : true
  );
  const [isUserBlurred, setIsUserBlurred] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hc_blur_opponent_video") === "true";
    }
    return false;
  });
  const [isNsfwBlurred, setIsNsfwBlurred] = useState<boolean>(false);

  const handleToggleUserBlur = () => {
    const nextVal = !isUserBlurred;
    setIsUserBlurred(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("hc_blur_opponent_video", String(nextVal));
    }
  };

  useEffect(() => {
    // 1. Attach local stream to preview element
    const localStream = webrtcManager.getLocalStream();
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }

    // A peer session may already be live before this tile mounted
    const existingRemote = webrtcManager.getRemoteStream();
    playRemoteVideo(remoteVideoRef.current, existingRemote);
    setConnectionState(webrtcManager.getState());

    // 2. Attach callbacks
    webrtcManager.onConnectionStateChange = (state) => {
      setConnectionState(state);
    };

    webrtcManager.onRemoteStream = (stream) => {
      if (remoteVideoRef.current) {
        playRemoteVideo(remoteVideoRef.current, stream);
        // Start on-device NSFW scanner for random queue only
        if (!isFriendRoom) {
          nsfwScanner.startScanning(remoteVideoRef.current);
        }
      }
    };

    webrtcManager.onOpponentCameraToggle = (enabled) => {
      setIsOpponentCameraOn(enabled);
    };

    webrtcManager.onOpponentMicToggle = (enabled) => {
      setIsOpponentMicOn(enabled);
    };

    nsfwScanner.onInappropriateDetected = () => {
      setIsNsfwBlurred(true);
    };

    return () => {
      nsfwScanner.stopScanning();
    };
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isLocalCameraOn]);

  const handleToggleCamera = () => {
    const newState = webrtcManager.toggleCamera();
    setIsLocalCameraOn(newState);
  };

  const handleToggleMic = () => {
    const newState = webrtcManager.toggleMic();
    setIsLocalMicOn(newState);
  };

  const handleToggleHideSelf = () => {
    const newState = webrtcManager.toggleHideSelf();
    setIsSelfHidden(newState);
  };

  // Anti-Copying Remote Video Protection:
  // Note: We pause video playback and hide rendering client-side. A determined cheater can still
  // modify the client to unpause or remove CSS blur; this is a casual game, so the server
  // guarantees picks cannot change after lock and picks stay hidden until both are locked.
  const isPickOrCountdown = hideOpponentVideo ?? (turnStage === "pick" || turnStage === "countdown");

  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video) return;

    if (isPickOrCountdown) {
      video.pause();
    } else if (turnStage === "reveal" || hideOpponentVideo === false) {
      video.play().catch(() => {});
    }
  }, [isPickOrCountdown, turnStage, hideOpponentVideo]);

  useEffect(() => {
    if (localVideoRefOut && localVideoRef.current) {
      (localVideoRefOut as any).current = localVideoRef.current;
    }
  }, [localVideoRefOut]);

  const isBlurred = isFirstMatchBlurred || isUserBlurred || isNsfwBlurred || isPickOrCountdown;

  return (
    <div
      className={`relative w-full ${
        layout === "mobile-portrait"
          ? "h-28 sm:h-36 max-h-[25vh] mb-2 shrink-0"
          : layout === "landscape"
          ? "w-48 h-full flex flex-col justify-between shrink-0"
          : "w-full max-w-sm h-40 mb-3"
      }`}
    >
      {/* Opponent Video Container */}
      <div className="relative w-full h-full bg-ink rounded-lg border border-line overflow-hidden flex items-center justify-center">
        {/* Remote Video Stream */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-filter duration-300 ${
            isBlurred ? "blur-2xl brightness-50" : ""
          } ${!isOpponentCameraOn || connectionState !== "live" ? "hidden" : "block"}`}
        />

        {/* State Overlays */}
        {connectionState === "connecting" && (
          <div className="flex flex-col items-center gap-1.5 p-3 text-center">
            <RefreshCw className="w-5 h-5 text-turf animate-spin" />
            <span className="text-xs text-muted font-medium">Connecting video...</span>
          </div>
        )}

        {connectionState === "reconnecting" && (
          <div className="flex flex-col items-center gap-1.5 p-3 text-center">
            <RefreshCw className="w-5 h-5 text-amber animate-spin" />
            <span className="text-xs text-amber font-medium">Reconnecting...</span>
          </div>
        )}

        {connectionState === "failed" && (
          <div className="flex flex-col items-center gap-2 p-3 text-center">
            <AlertTriangle className="w-6 h-6 text-ball" />
            <span className="text-xs text-chalk font-semibold">Connection failed</span>
            <button
              onClick={onNextOpponent}
              className="px-2.5 py-1 bg-surface-2 border border-line rounded text-[11px] text-turf hover:border-turf"
            >
              Try Next Opponent
            </button>
          </div>
        )}

        {connectionState === "live" && !isOpponentCameraOn && (
          <div className="flex flex-col items-center gap-1 p-2 text-center">
            <PlayerChip name={opponentName} isUser={false} role="bowling" />
            <span className="text-[11px] text-muted font-medium">Opponent camera is off</span>
          </div>
        )}

        {/* Initial Stranger / User Blur Warning */}
        {connectionState === "live" && (isFirstMatchBlurred || isUserBlurred) && !isNsfwBlurred && !isPickOrCountdown && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-3 text-center bg-ink/75">
            <ShieldAlert className="w-5 h-5 text-turf mb-1" />
            <p className="text-[11px] text-chalk font-semibold">
              {isUserBlurred ? "Opponent video blurred (Privacy Mode)" : "Stranger video preview blurred for safety"}
            </p>
            <button
              onClick={() => {
                setIsFirstMatchBlurred(false);
                if (isUserBlurred) {
                  setIsUserBlurred(false);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("hc_blur_opponent_video", "false");
                  }
                }
              }}
              className="mt-1.5 px-3 py-1 bg-turf text-ink font-bold text-xs rounded hover:brightness-110"
            >
              Tap to Reveal
            </button>
          </div>
        )}

        {/* Auto-Blur On NSFW Flag */}
        {connectionState === "live" && isNsfwBlurred && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-2 text-center bg-ink/85 space-y-1">
            <AlertTriangle className="w-5 h-5 text-ball" />
            <p className="text-[11px] text-chalk font-bold">Video hidden: possible inappropriate content</p>
            <div className="flex gap-1.5 pt-1">
              <button
                onClick={() => setIsNsfwBlurred(false)}
                className="px-2 py-0.5 bg-surface-2 border border-line text-[10px] text-muted rounded hover:text-chalk"
              >
                Show Anyway
              </button>
              <button
                onClick={onOpenReport}
                className="px-2 py-0.5 bg-ball text-white text-[10px] font-bold rounded"
              >
                Report
              </button>
              <button
                onClick={onNextOpponent}
                className="px-2 py-0.5 bg-turf text-ink text-[10px] font-bold rounded"
              >
                Next Opponent
              </button>
            </div>
          </div>
        )}

        {/* Anti-Copying Frosted Mask: PICK & COUNTDOWN */}
        {connectionState === "live" && isOpponentCameraOn && isPickOrCountdown && !isNsfwBlurred && !isFirstMatchBlurred && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-3 text-center bg-ink/75">
            <div className="w-8 h-8 rounded-full bg-surface-2 border border-line flex items-center justify-center mb-1 text-turf">
              <Lock className="w-4 h-4" />
            </div>
            <p className="text-xs text-chalk font-heading font-black uppercase tracking-wider">
              {turnStage === "countdown"
                ? `Revealing in ${countdownSeconds ?? 5}...`
                : "Opponent is choosing..."}
            </p>
            <span className="text-[10px] text-muted mt-0.5">
              {turnStage === "countdown"
                ? "Both picks locked! Unblurring camera..."
                : hideOpponentVideo !== undefined
                ? "Video reveals at 3..."
                : "Picks hidden until both players lock in"}
            </span>
          </div>
        )}

        {/* Opponent Info Bar */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1.5 bg-ink/80 border border-line rounded px-2 py-0.5 text-[10px] text-chalk">
          <span className="w-1.5 h-1.5 rounded-full bg-turf animate-pulse" />
          <span className="font-semibold">{opponentName}</span>
          {!isOpponentMicOn && <MicOff className="w-2.5 h-2.5 text-muted ml-0.5" />}
        </div>

        {/* Self Preview Thumbnail (Corner) */}
        {!isSelfHidden && (
          <div
            className={`absolute bottom-1.5 right-1.5 bg-surface border border-line rounded overflow-hidden shadow-lg z-10 transition-all duration-200 ${
              isGestureModeActive
                ? "w-24 h-18 sm:w-28 sm:h-20"
                : "w-16 h-12 sm:w-20 sm:h-14"
            }`}
          >
            {isLocalCameraOn ? (
              <div className="relative w-full h-full">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />

                {/* Hand Guide Overlay (Active in gesture mode) */}
                {isGestureModeActive && (
                  <div
                    className={`absolute inset-1 rounded border-2 border-dashed transition-all pointer-events-none flex flex-col items-center justify-between p-0.5 ${
                      isGestureLocked
                        ? "border-turf bg-turf/15 shadow-[0_0_8px_rgba(247,181,0,0.35)]"
                        : detectedGesture !== null
                        ? "border-turf shadow-[0_0_6px_rgba(247,181,0,0.3)]"
                        : "border-turf/60"
                    }`}
                  >
                    <span className="text-[7px] font-mono font-bold uppercase px-1 py-0.2 bg-ink/80 text-turf rounded">
                      HAND ZONE
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full bg-surface-2 flex items-center justify-center text-[9px] text-muted">
                Off
              </div>
            )}
            <div className="absolute top-0.5 left-0.5 text-[8px] bg-ink/80 px-1 rounded text-turf font-mono">
              YOU
            </div>
          </div>
        )}

        {/* Quick Action Overlay Strip */}
        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 z-10">
          {/* Camera toggle */}
          <button
            onClick={handleToggleCamera}
            title={isLocalCameraOn ? "Turn camera off" : "Turn camera on"}
            className={`p-1.5 rounded border text-xs transition-colors ${
              isLocalCameraOn
                ? "bg-surface-2/90 border-line text-chalk hover:text-turf"
                : "bg-ball/20 border-ball text-ball"
            }`}
          >
            {isLocalCameraOn ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
          </button>

          {/* Mic toggle (MUTED by default) */}
          <button
            onClick={handleToggleMic}
            title={isLocalMicOn ? "Mute microphone" : "Unmute microphone"}
            className={`p-1.5 rounded border text-xs transition-colors ${
              isLocalMicOn
                ? "bg-turf/20 border-turf text-turf"
                : "bg-surface-2/90 border-line text-muted hover:text-chalk"
            }`}
          >
            {isLocalMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          </button>

          {/* Hide self toggle */}
          <button
            onClick={handleToggleHideSelf}
            title={isSelfHidden ? "Show self-preview" : "Hide self-preview"}
            className="p-1.5 rounded border border-line bg-surface-2/90 text-chalk hover:text-turf transition-colors"
          >
            {isSelfHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Persistent Opponent Blur toggle */}
          <button
            onClick={handleToggleUserBlur}
            title={isUserBlurred ? "Unblur opponent video" : "Blur opponent video (Privacy Mode)"}
            className={`p-1.5 rounded border text-xs transition-colors ${
              isUserBlurred
                ? "bg-turf/20 border-turf text-turf"
                : "bg-surface-2/90 border-line text-muted hover:text-chalk"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
          </button>

          {/* Report */}
          <button
            onClick={onOpenReport}
            title="Report Opponent"
            className="p-1.5 rounded border border-ball/40 bg-surface-2/90 text-ball hover:bg-ball hover:text-white transition-colors"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>

          {/* Block */}
          <button
            onClick={() => onBlockOpponent(opponentGuestId)}
            title="Don't match me with this player again"
            className="p-1.5 rounded border border-line bg-surface-2/90 text-muted hover:text-ball transition-colors"
          >
            <UserX className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

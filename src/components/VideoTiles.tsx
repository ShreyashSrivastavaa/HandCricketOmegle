"use client";

import React, { useEffect, useRef, useState } from "react";
import { webrtcManager, type WebRTCConnectionState } from "@/lib/webrtc/webrtcManager";
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
} from "lucide-react";

interface VideoTilesProps {
  layout: "mobile-portrait" | "desktop" | "landscape";
  opponentGuestId: string;
  opponentName: string;
  isFirstMatchForGuest?: boolean;
  onNextOpponent: () => void;
  onBlockOpponent: (opponentGuestId: string) => void;
  onOpenReport: () => void;
  remoteVideoRefOut?: React.RefObject<HTMLVideoElement | null>;
}

export function VideoTiles({
  layout,
  opponentGuestId,
  opponentName,
  isFirstMatchForGuest = false,
  onNextOpponent,
  onBlockOpponent,
  onOpenReport,
  remoteVideoRefOut,
}: VideoTilesProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const internalRemoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = remoteVideoRefOut || internalRemoteVideoRef;

  const [connectionState, setConnectionState] = useState<WebRTCConnectionState>(
    webrtcManager.getState()
  );
  const [isOpponentCameraOn, setIsOpponentCameraOn] = useState<boolean>(true);
  const [isOpponentMicOn, setIsOpponentMicOn] = useState<boolean>(false);

  const [isLocalCameraOn, setIsLocalCameraOn] = useState<boolean>(webrtcManager.isCameraEnabled);
  const [isLocalMicOn, setIsLocalMicOn] = useState<boolean>(webrtcManager.isMicEnabled);
  const [isSelfHidden, setIsSelfHidden] = useState<boolean>(webrtcManager.isSelfHidden);

  // Safety Blur States
  const [isFirstMatchBlurred, setIsFirstMatchBlurred] = useState<boolean>(isFirstMatchForGuest);
  const [isNsfwBlurred, setIsNsfwBlurred] = useState<boolean>(false);

  useEffect(() => {
    // 1. Attach local stream to preview element
    const localStream = webrtcManager.getLocalStream();
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }

    // 2. Attach callbacks
    webrtcManager.onConnectionStateChange = (state) => {
      setConnectionState(state);
    };

    webrtcManager.onRemoteStream = (stream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        // Start on-device NSFW scanner
        nsfwScanner.startScanning(remoteVideoRef.current);
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

  const isBlurred = isFirstMatchBlurred || isNsfwBlurred;

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
            <PlayerChip name={opponentName} isOpponent size="md" />
            <span className="text-[11px] text-muted font-medium">Opponent camera is off</span>
          </div>
        )}

        {/* Initial First-Match Blur Warning */}
        {connectionState === "live" && isFirstMatchBlurred && !isNsfwBlurred && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-3 text-center bg-ink/70">
            <ShieldAlert className="w-5 h-5 text-turf mb-1" />
            <p className="text-[11px] text-chalk font-semibold">Video preview blurred for safety</p>
            <button
              onClick={() => setIsFirstMatchBlurred(false)}
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
                className="px-2 py-0.5 bg-ball text-chalk text-[10px] font-bold rounded"
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

        {/* Opponent Info Bar */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1.5 bg-ink/80 border border-line rounded px-2 py-0.5 text-[10px] text-chalk">
          <span className="w-1.5 h-1.5 rounded-full bg-turf animate-pulse" />
          <span className="font-semibold">{opponentName}</span>
          {!isOpponentMicOn && <MicOff className="w-2.5 h-2.5 text-muted ml-0.5" />}
        </div>

        {/* Self Preview Thumbnail (Corner) */}
        {!isSelfHidden && (
          <div className="absolute bottom-1.5 right-1.5 w-16 h-12 sm:w-20 sm:h-14 bg-surface border border-line rounded overflow-hidden shadow-lg z-10">
            {isLocalCameraOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
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

          {/* Report */}
          <button
            onClick={onOpenReport}
            title="Report Opponent"
            className="p-1.5 rounded border border-ball/40 bg-surface-2/90 text-ball hover:bg-ball hover:text-chalk transition-colors"
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

"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "./Button";
import { webrtcManager, type MediaDeviceOption } from "@/lib/webrtc/webrtcManager";
import { GesturePractice } from "./GesturePractice";
import {
  Camera,
  Video,
  Gamepad2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  X,
  RotateCcw,
  Info,
  Check,
} from "lucide-react";

interface CameraCheckModalProps {
  isOpen: boolean;
  initialMode?: "video" | "game_only";
  onReady: (mode: "video" | "game_only") => void;
  onCancel: () => void;
}

interface CameraDiagnostics {
  isApiSupported: boolean;
  isSecureContext: boolean;
  permissionState: "prompt" | "granted" | "denied" | "unsupported";
  isRequestInitiated: boolean;
  hasLocalStream: boolean;
  videoTrackCount: number;
  videoTrackLabel?: string;
  isPlaybackStarted: boolean;
}

export function CameraCheckModal({
  isOpen,
  initialMode = "video",
  onReady,
  onCancel,
}: CameraCheckModalProps) {
  const [mode, setMode] = useState<"video" | "game_only">(initialMode);
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied">("prompt");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  const [videoDevices, setVideoDevices] = useState<MediaDeviceOption[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  const [diagnostics, setDiagnostics] = useState<CameraDiagnostics>({
    isApiSupported: true,
    isSecureContext: true,
    permissionState: "prompt",
    isRequestInitiated: false,
    hasLocalStream: false,
    videoTrackCount: 0,
    isPlaybackStarted: false,
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync initial mode
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Refresh diagnostics from system
  const updateDiagnostics = useCallback(async (overrides?: Partial<CameraDiagnostics>) => {
    try {
      const baseDiag = await webrtcManager.getCameraDiagnostics();
      setDiagnostics((prev) => ({
        ...prev,
        isApiSupported: baseDiag.isApiSupported,
        isSecureContext: baseDiag.isSecureContext,
        permissionState: baseDiag.permissionState,
        hasLocalStream: baseDiag.hasLocalStream,
        videoTrackCount: baseDiag.videoTrackCount,
        videoTrackLabel: baseDiag.videoTrackLabel,
        ...overrides,
      }));
    } catch {
      // Diagnostic check failure should never crash UI
    }
  }, []);

  // Request camera and attach preview
  const initDevicesAndStream = useCallback(async (vDeviceId?: string) => {
    setErrorMessage(null);
    setErrorType(null);
    setIsRequesting(true);

    await updateDiagnostics({ isRequestInitiated: true, isPlaybackStarted: false });

    try {
      // Direct camera-only acquisition (audio: false)
      const stream = await webrtcManager.initLocalMedia(vDeviceId);
      setPermissionState("granted");
      setIsRequesting(false);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current
          .play()
          .then(() => {
            updateDiagnostics({ isPlaybackStarted: true, hasLocalStream: true });
          })
          .catch((err) => {
            console.debug("[CameraCheck] Video play warning:", err);
          });
      }

      // Enumerate available video devices
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const vDevs = devices
            .filter((d) => d.kind === "videoinput")
            .map((d, i) => ({
              deviceId: d.deviceId,
              label: d.label || `Camera ${i + 1}`,
            }));

          setVideoDevices(vDevs);
          if (vDevs.length > 0 && !vDeviceId) {
            setSelectedVideoDevice(vDevs[0].deviceId);
          }
        } catch (e) {
          console.debug("[CameraCheck] Device enumeration error:", e);
        }
      }

      await updateDiagnostics({
        permissionState: "granted",
        hasLocalStream: true,
      });
    } catch (err: any) {
      console.error("[CameraCheck] Camera access error:", err?.name, err?.message);
      setPermissionState("denied");
      setIsRequesting(false);
      setErrorType(err?.name || "UnknownError");

      await updateDiagnostics({
        permissionState: "denied",
        hasLocalStream: false,
        isPlaybackStarted: false,
      });

      // Phase 3: Explicit contextual error handling
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage(
          "Camera access was denied. To enable: click the lock/camera icon in your browser URL bar, set Camera to 'Allow', and click 'Retry Camera'."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMessage(
          "No camera detected on this device. Please connect a webcam or switch to Game Only mode."
        );
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setErrorMessage(
          "Your camera is currently in use by another application (e.g. Zoom, Google Meet, OBS, or another tab). Close the other app and retry."
        );
      } else if (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError") {
        setErrorMessage(
          "Your camera does not support the requested video constraints. Retrying with simpler defaults..."
        );
      } else if (err.name === "SecurityError") {
        setErrorMessage(
          "Camera access was blocked by browser security settings or Permissions-Policy. Ensure you are on HTTPS."
        );
      } else if (err.name === "NotSupportedError") {
        setErrorMessage(
          "Your browser does not support the MediaDevices camera API. Please use a modern browser (Chrome, Edge, Safari, Firefox)."
        );
      } else {
        setErrorMessage(
          err.message ? `Hardware error: ${err.message}` : "Failed to access camera hardware."
        );
      }
    }
  }, [updateDiagnostics]);

  // Request permissions and initialize hardware when opened in "video" mode
  useEffect(() => {
    if (!isOpen) return;

    if (mode === "video") {
      initDevicesAndStream();
    } else {
      webrtcManager.stopLocalStream();
      setPermissionState("prompt");
      setErrorMessage(null);
      setErrorType(null);
    }
  }, [isOpen, mode, initDevicesAndStream]);

  const handleDeviceChange = (id: string) => {
    setSelectedVideoDevice(id);
    initDevicesAndStream(id);
  };

  const handleReady = () => {
    // Preserve stream for transition into the match!
    onReady(mode);
  };

  const handleClose = () => {
    // Release hardware when user cancels
    webrtcManager.stopLocalStream();
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-check-title"
    >
      <div className="relative flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[26px] border border-line bg-surface shadow-panel">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(247,181,0,0.1),transparent_70%)]"
          aria-hidden="true"
        />

        {/* Header */}
        <div className="relative z-10 flex flex-col gap-3 border-b border-line px-5 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-turf/30 bg-turf/10 text-turf">
              <Camera className="h-5 w-5" />
            </span>
            <div>
              <p className="eyebrow text-[10px]">Match setup</p>
              <h2
                id="camera-check-title"
                className="font-heading text-xl font-black uppercase leading-none tracking-tight text-chalk sm:text-2xl"
              >
                Camera Umpire Setup
              </h2>
              <p className="mt-0.5 text-[11px] text-muted">
                Test your camera &amp; hand gestures before stepping into the crease.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-line bg-surface-2 p-1">
              <button
                type="button"
                onClick={() => setMode("video")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-heading text-[10px] font-black uppercase tracking-wider transition-colors ${
                  mode === "video" ? "bg-turf text-ink" : "text-muted hover:text-chalk"
                }`}
              >
                <Video className="h-3.5 w-3.5" />
                <span>Camera Umpire</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("game_only")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-heading text-[10px] font-black uppercase tracking-wider transition-colors ${
                  mode === "game_only" ? "bg-turf text-ink" : "text-muted hover:text-chalk"
                }`}
              >
                <Gamepad2 className="h-3.5 w-3.5" />
                <span>Game Only</span>
              </button>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close modal"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface-2 text-muted transition-colors hover:text-chalk"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {mode === "video" ? (
            <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="flex flex-col gap-3">
                {/* Camera Preview Box */}
                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-line bg-ink">
                  {permissionState === "granted" ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        onPlaying={() =>
                          setDiagnostics((prev) => ({ ...prev, isPlaybackStarted: true }))
                        }
                        className="h-full w-full -scale-x-100 object-cover"
                      />
                      <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full border border-turf/30 bg-ink/80 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-turf backdrop-blur-md">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-turf" />
                        Live camera stream
                      </div>
                      <div className="absolute bottom-2.5 left-2.5 rounded-lg border border-line bg-ink/80 px-2 py-1 font-mono text-[9px] text-muted backdrop-blur-md">
                        Video only • No audio used
                      </div>
                    </>
                  ) : permissionState === "denied" ? (
                    <div className="space-y-3 p-5 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-ball/30 bg-ball/10 text-ball">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-heading text-xs font-bold uppercase tracking-wide text-ball">
                          {errorType || "Camera Permission Denied"}
                        </p>
                        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-chalk/90">
                          {errorMessage || "Camera access was denied by your browser."}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => initDevicesAndStream(selectedVideoDevice)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-turf px-3.5 py-1.5 font-heading text-xs font-bold uppercase tracking-wider text-ink transition-colors hover:bg-turf-hover"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Retry Camera</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMode("game_only")}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-1.5 font-heading text-xs font-semibold text-muted transition-colors hover:text-chalk"
                        >
                          <Gamepad2 className="h-3.5 w-3.5" />
                          <span>Play Game Only</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 p-5 text-center">
                      <RefreshCw className="mx-auto h-7 w-7 animate-spin text-turf" />
                      <div>
                        <p className="font-heading text-xs font-bold uppercase tracking-wider text-chalk">
                          {isRequesting ? "Waiting for Browser Permission..." : "Initializing Camera..."}
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                          Please click &ldquo;Allow&rdquo; in the browser prompt to activate the Camera Umpire.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Device Selector & Controls */}
                {permissionState === "granted" && videoDevices.length > 1 && (
                  <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/60 px-3 py-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      Camera:
                    </label>
                    <select
                      value={selectedVideoDevice}
                      onChange={(e) => handleDeviceChange(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-2.5 py-1 text-xs text-chalk focus:border-turf focus:outline-none"
                    >
                      {videoDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Privacy & Safety Policies */}
                <div className="space-y-2 rounded-2xl border border-line bg-surface-2/60 p-3.5 text-[11px] text-muted">
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2 font-medium text-chalk">
                      <input
                        type="checkbox"
                        defaultChecked={
                          typeof window !== "undefined"
                            ? localStorage.getItem("hc_blur_video_start") === "true"
                            : false
                        }
                        onChange={(e) => {
                          if (typeof window !== "undefined") {
                            localStorage.setItem("hc_blur_video_start", String(e.target.checked));
                          }
                        }}
                        className="rounded border-line text-turf focus:ring-turf"
                      />
                      <span>Blur my video until the match starts</span>
                    </label>
                    <span className="font-mono text-[9px] text-turf">OPTIONAL</span>
                  </div>
                  <div className="flex items-start gap-1.5 border-t border-line/60 pt-2 text-[10px] leading-relaxed">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-turf" />
                    <span>
                      <strong className="text-turf">Zero video storage.</strong> Hand gesture detection
                      runs entirely inside your local browser via MediaPipe. Video is peer-to-peer.
                    </span>
                  </div>
                </div>

                {/* Lightweight Diagnostics Status (Phase 5) */}
                <div className="rounded-xl border border-line/60 bg-surface-2/40 px-3 py-2 text-[10px]">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowDiagnostics((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted hover:text-chalk"
                    >
                      <Info className="h-3 w-3 text-sky" />
                      <span>Camera Diagnostics</span>
                      <span className="text-[9px] text-sky">{showDiagnostics ? "(hide)" : "(show)"}</span>
                    </button>
                    <div className="flex items-center gap-2 font-mono text-[9px]">
                      <span className={diagnostics.isSecureContext ? "text-turf" : "text-ball"}>
                        {diagnostics.isSecureContext ? "HTTPS" : "INSECURE"}
                      </span>
                      <span>•</span>
                      <span
                        className={
                          permissionState === "granted"
                            ? "text-turf"
                            : permissionState === "denied"
                            ? "text-ball"
                            : "text-amber-400"
                        }
                      >
                        {permissionState.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {showDiagnostics && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-line/50 pt-2 font-mono text-[9px] text-muted">
                      <div>
                        API Supported:{" "}
                        <span className={diagnostics.isApiSupported ? "text-turf" : "text-ball"}>
                          {diagnostics.isApiSupported ? "YES" : "NO"}
                        </span>
                      </div>
                      <div>
                        Secure Context:{" "}
                        <span className={diagnostics.isSecureContext ? "text-turf" : "text-ball"}>
                          {diagnostics.isSecureContext ? "YES" : "NO"}
                        </span>
                      </div>
                      <div>
                        Stream Acquired:{" "}
                        <span className={diagnostics.hasLocalStream ? "text-turf" : "text-muted"}>
                          {diagnostics.hasLocalStream ? "ACTIVE" : "NONE"}
                        </span>
                      </div>
                      <div>
                        Playback:{" "}
                        <span className={diagnostics.isPlaybackStarted ? "text-turf" : "text-muted"}>
                          {diagnostics.isPlaybackStarted ? "PLAYING" : "STOPPED"}
                        </span>
                      </div>
                      {diagnostics.videoTrackLabel && (
                        <div className="col-span-2 truncate">
                          Track: <span className="text-chalk">{diagnostics.videoTrackLabel}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Hand Gesture Practice Side */}
              <div className="flex flex-col gap-3">
                {permissionState === "granted" ? (
                  <GesturePractice videoElement={videoRef.current} />
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-surface-2/40 p-6 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky/25 bg-sky/10 text-sky">
                      <ShieldCheck className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="font-heading text-sm font-black uppercase tracking-wide text-chalk">
                        Camera Umpire Practice
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted">
                        Once camera permission is granted, you can practice 1 to 6 finger gestures
                        here with live AI recognition before entering the arena.
                      </p>
                    </div>
                    {permissionState === "denied" && (
                      <button
                        type="button"
                        onClick={() => initDevicesAndStream(selectedVideoDevice)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-turf px-4 py-2 font-heading text-xs font-bold uppercase tracking-wider text-ink transition-colors hover:bg-turf-hover"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Retry Camera Access</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-2 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-turf/30 bg-turf/10 text-turf">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-black uppercase tracking-wide text-chalk">
                  Game Only Mode Selected
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted">
                  You will play using tap controls and number buttons. No camera will be requested or
                  used.
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-2xl border border-line bg-surface-2/60 p-3 text-left text-[10px] leading-relaxed text-muted">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-turf" />
                <span>
                  <strong className="text-turf">Zero camera usage.</strong> Finger detection is
                  disabled in this mode. You can always switch to camera mode later.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex gap-3 border-t border-line px-5 py-4 sm:px-6">
          <Button variant="secondary" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            disabled={mode === "video" && permissionState === "denied"}
            onClick={handleReady}
          >
            I&apos;m Ready — Find Match
          </Button>
        </div>
      </div>
    </div>
  );
}

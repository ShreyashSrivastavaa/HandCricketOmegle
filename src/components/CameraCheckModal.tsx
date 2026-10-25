"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { webrtcManager, type MediaDeviceOption } from "@/lib/webrtc/webrtcManager";
import { GesturePractice } from "./GesturePractice";
import { playClickSound } from "@/lib/client/audio";
import {
  Camera,
  Mic,
  Video,
  Gamepad2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  X,
  Hand,
  Zap,
  Swords,
} from "lucide-react";

interface CameraCheckModalProps {
  isOpen: boolean;
  initialMode: "video" | "game_only";
  onReady: (mode: "video" | "game_only") => void;
  onCancel: () => void;
}

export function CameraCheckModal({
  isOpen,
  initialMode,
  onReady,
  onCancel,
}: CameraCheckModalProps) {
  const [mode, setMode] = useState<"video" | "game_only">(initialMode);
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied">("prompt");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [videoDevices, setVideoDevices] = useState<MediaDeviceOption[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceOption[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");

  const [micLevel, setMicLevel] = useState<number>(0);
  const [isMicTestActive, setIsMicTestActive] = useState<boolean>(true);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [skeletonCanvas, setSkeletonCanvas] = useState<HTMLCanvasElement | null>(null);
  const [liveGesture, setLiveGesture] = useState<number | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);
  const [tapTestNumber, setTapTestNumber] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isReadyRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Request permissions and initialize hardware when opened in "video" mode
  useEffect(() => {
    if (!isOpen) {
      stopAudioAnalysis();
      if (!isReadyRef.current) {
        webrtcManager.stopLocalStream();
      }
      return;
    }

    isReadyRef.current = false;
    if (mode === "video") {
      initDevicesAndStream();
    } else {
      stopAudioAnalysis();
      webrtcManager.stopLocalStream();
    }

    return () => {
      stopAudioAnalysis();
      if (!isReadyRef.current) {
        webrtcManager.stopLocalStream();
      }
    };
  }, [isOpen, mode]);

  const initDevicesAndStream = async (vDeviceId?: string, aDeviceId?: string) => {
    setErrorMessage(null);
    try {
      const stream = await webrtcManager.initLocalMedia(vDeviceId, aDeviceId);
      setPermissionState("granted");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Enumerate available devices
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vDevs = devices
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));
        const aDevs = devices
          .filter((d) => d.kind === "audioinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` }));

        setVideoDevices(vDevs);
        setAudioDevices(aDevs);

        if (vDevs.length > 0 && !vDeviceId) setSelectedVideoDevice(vDevs[0].deviceId);
        if (aDevs.length > 0 && !aDeviceId) setSelectedAudioDevice(aDevs[0].deviceId);
      }

      // Start mic level analyzer
      startAudioAnalysis(stream);
    } catch (err: any) {
      console.warn("[CameraCheck] Access error", err);
      setPermissionState("denied");
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Camera/Microphone permission denied. Allow access in your browser settings to use Video mode, or play in Game Only mode.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMessage("No camera or microphone found on this device. You can still play in Game Only mode.");
      } else {
        setErrorMessage(`Hardware error: ${err.message || "Failed to access devices."}`);
      }
    }
  };

  const startAudioAnalysis = (stream: MediaStream) => {
    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      // Unmute momentarily just for level testing inside preview if muted
      const originalEnabled = audioTrack.enabled;
      audioTrack.enabled = true;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setMicLevel(normalized);

        animFrameRef.current = requestAnimationFrame(checkLevel);
      };

      checkLevel();
    } catch (e) {
      console.debug("[CameraCheck] Audio analysis error", e);
    }
  };

  const stopAudioAnalysis = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setMicLevel(0);
  };

  const handleDeviceChange = (type: "video" | "audio", id: string) => {
    if (type === "video") {
      setSelectedVideoDevice(id);
      initDevicesAndStream(id, selectedAudioDevice);
    } else {
      setSelectedAudioDevice(id);
      initDevicesAndStream(selectedVideoDevice, id);
    }
  };

  const handleReady = () => {
    isReadyRef.current = true;
    stopAudioAnalysis();
    onReady(mode);
  };

  const handleClose = () => {
    stopAudioAnalysis();
    webrtcManager.stopLocalStream();
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-md sm:p-6"
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
                Camera &amp; Mic Check
              </h2>
              <p className="mt-0.5 text-[11px] text-muted">
                Test your hardware before stepping into the arena.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-line bg-surface-2 p-1">
              <button
                type="button"
                onClick={() => setMode("video")}
                aria-pressed={mode === "video"}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-heading text-[10px] font-black uppercase tracking-wider transition-colors ${
                  mode === "video" ? "bg-turf text-ink shadow-sm" : "text-muted hover:text-chalk"
                }`}
              >
                <Hand className="h-3.5 w-3.5" />
                <span>Gesture Mode</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("game_only")}
                aria-pressed={mode === "game_only"}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-heading text-[10px] font-black uppercase tracking-wider transition-colors ${
                  mode === "game_only" ? "bg-sky text-ink shadow-sm" : "text-muted hover:text-chalk"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Tap Mode</span>
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

        {/* Mode Distinction & Description Strip */}
        <div className="relative z-10 border-b border-line/60 bg-surface-2/40 px-5 py-2.5 sm:px-6">
          {mode === "video" ? (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="h-2 w-2 shrink-0 rounded-full bg-turf animate-pulse" />
              <span>
                <strong className="text-turf">Gesture Mode (Camera):</strong> Uses your webcam to detect 1–6 hand gestures in real time. Show fingers to bowl or bat.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="h-2 w-2 shrink-0 rounded-full bg-sky" />
              <span>
                <strong className="text-sky">Tap Mode (Buttons):</strong> Play with on-screen number buttons or keyboard keys 1–6. Camera is disabled — fast, quiet, and private.
              </span>
            </div>
          )}
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {mode === "video" ? (
            <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="flex flex-col gap-3">
                {/* Camera Preview Box */}
                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-line bg-ink">
                  {permissionState === "granted" ? (
                    <>
                      <video
                        ref={(el) => {
                          videoRef.current = el;
                          setVideoElement(el);
                          if (el && !el.srcObject) {
                            const stream = webrtcManager.getLocalStream();
                            if (stream) {
                              el.srcObject = stream;
                              el.play().catch(() => {});
                            }
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full -scale-x-100 object-cover"
                      />
                      <canvas
                        ref={(el) => setSkeletonCanvas(el)}
                        className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover"
                      />
                      <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full border border-turf/30 bg-ink/80 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-turf backdrop-blur-md">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-turf" />
                        Live preview
                      </div>
                      <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1.5 rounded-full border border-line bg-ink/80 px-2.5 py-1 font-mono text-[9px] backdrop-blur-md">
                        {isLoadingModel ? (
                          <span className="text-amber">Loading tracker...</span>
                        ) : liveGesture !== null ? (
                          <span className="font-bold text-turf">Detected: {liveGesture}</span>
                        ) : (
                          <span className="text-muted">Show hand to test</span>
                        )}
                      </div>
                      <div className="absolute bottom-2.5 left-2.5 rounded-lg border border-line bg-ink/80 px-2 py-1 text-[9px] text-muted backdrop-blur-md">
                        Mic starts muted during the match
                      </div>
                    </>
                  ) : permissionState === "denied" ? (
                    <div className="space-y-2 p-5 text-center">
                      <AlertCircle className="mx-auto h-8 w-8 text-ball" />
                      <p className="text-xs font-medium leading-relaxed text-ball">
                        {errorMessage || "Camera or Microphone access was denied."}
                      </p>
                      <p className="text-[11px] text-muted">
                        Enable camera permissions in your browser or switch to{" "}
                        <strong className="text-chalk">Game Only</strong> mode.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 p-5 text-center">
                      <RefreshCw className="mx-auto h-6 w-6 animate-spin text-turf" />
                      <p className="text-xs text-muted">Requesting camera and microphone access...</p>
                    </div>
                  )}
                </div>

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
                      <strong className="text-turf">Zero video storage.</strong> Video and audio are
                      strictly peer-to-peer (WebRTC). Gesture detection runs 100% locally in your
                      browser. 18+ only.
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {permissionState === "granted" ? (
                  <>
                    <div className="space-y-3 rounded-2xl border border-line bg-surface-2/60 p-3.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-muted">
                          <Mic className="h-3.5 w-3.5 text-turf" />
                          Mic input level
                        </span>
                        <span className="font-mono text-[11px] text-turf">{micLevel}%</span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full border border-line bg-ink">
                        <div
                          className="h-full bg-gradient-to-r from-turf/70 to-turf transition-all duration-75"
                          style={{ width: `${Math.min(100, micLevel * 1.5)}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 lg:grid-cols-1">
                        <div>
                          <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted">
                            Camera Device
                          </label>
                          <select
                            value={selectedVideoDevice}
                            onChange={(e) => handleDeviceChange("video", e.target.value)}
                            className="w-full rounded-lg border border-line bg-ink px-2.5 py-1.5 text-xs text-chalk focus:border-turf focus:outline-none"
                          >
                            {videoDevices.map((d) => (
                              <option key={d.deviceId} value={d.deviceId}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted">
                            Microphone Device
                          </label>
                          <select
                            value={selectedAudioDevice}
                            onChange={(e) => handleDeviceChange("audio", e.target.value)}
                            className="w-full rounded-lg border border-line bg-ink px-2.5 py-1.5 text-xs text-chalk focus:border-turf focus:outline-none"
                          >
                            {audioDevices.map((d) => (
                              <option key={d.deviceId} value={d.deviceId}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <GesturePractice
                      videoElement={videoElement || videoRef.current}
                      skeletonCanvas={skeletonCanvas}
                      onDetectionUpdate={(res) => {
                        setLiveGesture(res.gesture);
                        setIsLoadingModel(!!res.isLoadingModel);
                      }}
                    />
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-surface-2/40 p-6 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky/25 bg-sky/10 text-sky">
                      <ShieldCheck className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="font-heading text-sm font-black uppercase tracking-wide text-chalk">
                        Privacy first
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted">
                        Nothing is recorded or uploaded. Grant camera access to preview your feed,
                        or jump straight in with Game Only mode.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-2 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky/30 bg-sky/10 text-sky">
                <Zap className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-black uppercase tracking-wide text-chalk">
                  Tap Mode Active
                </h3>
                <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">
                  No camera or microphone required. Play by clicking numbers 1–6 on-screen or pressing number keys <strong className="text-chalk">1–6</strong> on your keyboard.
                </p>
              </div>

              {/* Interactive Practice Pad for Tap Mode */}
              <div className="w-full rounded-2xl border border-line bg-surface-2/60 p-4 text-left">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-heading font-bold uppercase tracking-wider text-muted">
                    Test Number Pad (1–6)
                  </span>
                  {tapTestNumber !== null && (
                    <span className="font-heading font-black text-sky">
                      Tapped: {tapTestNumber} ✓
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setTapTestNumber(num);
                      }}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2 transition-all ${
                        tapTestNumber === num
                          ? "border-sky bg-sky/20 text-sky scale-105 shadow-glow"
                          : "border-line bg-surface text-chalk hover:border-sky/50 hover:bg-surface-2"
                      }`}
                    >
                      <span className="font-heading text-lg font-black">{num}</span>
                      <span className="font-mono text-[8px] text-muted">key {num}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-center text-[10px] text-muted">
                  Try tapping a number above to test your controls. In the live match, you can tap to lock instantly.
                </p>
              </div>

              <div className="flex w-full items-start gap-2 rounded-2xl border border-line bg-surface-2/60 p-3 text-left text-[10px] leading-relaxed text-muted">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-turf" />
                <span>
                  <strong className="text-turf">Camera Disabled:</strong> Zero camera or microphone permissions needed. Matches with both Tap Mode and Gesture Mode players seamlessly.
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

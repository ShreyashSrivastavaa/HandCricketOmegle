"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { webrtcManager, type MediaDeviceOption } from "@/lib/webrtc/webrtcManager";
import { GesturePractice } from "./GesturePractice";
import { Camera, Mic, MicOff, Video, VideoOff, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

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

  const videoRef = useRef<HTMLVideoElement>(null);
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
      webrtcManager.stopLocalStream();
      return;
    }

    if (mode === "video") {
      initDevicesAndStream();
    } else {
      stopAudioAnalysis();
      webrtcManager.stopLocalStream();
    }

    return () => {
      stopAudioAnalysis();
      webrtcManager.stopLocalStream();
    };
  }, [isOpen, mode]);

  const initDevicesAndStream = async (vDeviceId?: string, aDeviceId?: string) => {
    setErrorMessage(null);
    try {
      const stream = await webrtcManager.initLocalMedia(vDeviceId, aDeviceId);
      setPermissionState("granted");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/90">
      <div className="w-full max-w-lg bg-surface border border-line rounded-xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h2 className="text-lg font-bold font-heading uppercase tracking-wide text-chalk">
              Match Setup & Camera Check
            </h2>
            <p className="text-xs text-muted">Test your audio and video before entering arena</p>
          </div>
          <div className="flex bg-surface-2 p-1 rounded-lg border border-line">
            <button
              onClick={() => setMode("video")}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                mode === "video" ? "bg-turf text-ink" : "text-muted hover:text-chalk"
              }`}
            >
              Video
            </button>
            <button
              onClick={() => setMode("game_only")}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                mode === "game_only" ? "bg-turf text-ink" : "text-muted hover:text-chalk"
              }`}
            >
              Game Only
            </button>
          </div>
        </div>

        {/* Video Mode Content */}
        {mode === "video" ? (
          <div className="space-y-4">
            {/* Camera Preview Box */}
            <div className="relative w-full aspect-video bg-ink rounded-lg border border-line overflow-hidden flex items-center justify-center">
              {permissionState === "granted" ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  {/* Badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-ink/80 border border-line rounded text-[11px] font-mono text-turf flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-turf animate-pulse" />
                    LIVE PREVIEW
                  </div>
                  <div className="absolute bottom-2 left-2 text-[10px] text-muted bg-ink/80 px-2 py-0.5 rounded border border-line">
                    Mic starts MUTED during match
                  </div>
                </>
              ) : permissionState === "denied" ? (
                <div className="p-4 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-ball mx-auto" />
                  <p className="text-xs text-ball font-medium leading-relaxed">
                    {errorMessage || "Camera or Microphone access was denied."}
                  </p>
                  <p className="text-[11px] text-muted">
                    Enable camera permissions in your browser or switch to <strong>Game Only</strong> mode.
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-2 p-4">
                  <RefreshCw className="w-6 h-6 text-turf animate-spin mx-auto" />
                  <p className="text-xs text-muted">Requesting camera and microphone access...</p>
                </div>
              )}
            </div>

            {/* Mic Meter and Diagnostics */}
            {permissionState === "granted" && (
              <div className="space-y-3 bg-surface-2 p-3 rounded-lg border border-line text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted flex items-center gap-1.5 font-medium">
                    <Mic className="w-3.5 h-3.5 text-turf" />
                    Mic Input Level:
                  </span>
                  <span className="font-mono text-[11px] text-turf">{micLevel}%</span>
                </div>

                {/* Level Bar */}
                <div className="w-full h-2 bg-ink rounded-full overflow-hidden border border-line">
                  <div
                    className="h-full bg-turf transition-all duration-75"
                    style={{ width: `${Math.min(100, micLevel * 1.5)}%` }}
                  />
                </div>

                {/* Device Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] text-muted mb-1">Camera Device</label>
                    <select
                      value={selectedVideoDevice}
                      onChange={(e) => handleDeviceChange("video", e.target.value)}
                      className="w-full bg-ink border border-line rounded px-2 py-1 text-xs text-chalk focus:outline-none focus:border-turf"
                    >
                      {videoDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted mb-1">Microphone Device</label>
                    <select
                      value={selectedAudioDevice}
                      onChange={(e) => handleDeviceChange("audio", e.target.value)}
                      className="w-full bg-ink border border-line rounded px-2 py-1 text-xs text-chalk focus:outline-none focus:border-turf"
                    >
                      {audioDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Gesture Legend & Live Practice Step */}
                <GesturePractice videoElement={videoRef.current} />
              </div>
            )}
          </div>
        ) : (
          /* Game Only Mode Content */
          <div className="py-6 px-4 bg-surface-2 rounded-lg border border-line text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-turf/10 border border-turf/30 text-turf flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-chalk text-sm uppercase tracking-wide">
                Game Only Mode Selected
              </h3>
              <p className="text-xs text-muted max-w-xs mx-auto mt-1">
                You will only be paired with other Game Only players. No camera or microphone will be used.
              </p>
            </div>
          </div>
        )}

        {/* Privacy & Safety Policies */}
        <div className="bg-surface-2/60 border border-line rounded-lg p-3 text-[11px] text-muted space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-chalk font-medium">
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
            <span className="text-[10px] text-turf font-mono">OPTIONAL</span>
          </div>
          <div className="pt-1 border-t border-line/60 flex items-start gap-1.5 text-[10px]">
            <span className="text-turf font-bold">🔒 Zero Video Storage:</span>
            <span>Video & audio are strictly peer-to-peer (WebRTC). Video is never recorded or stored on any server. Finger detection runs 100% locally on your browser. 18+ only.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
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

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "./Button";
import { AgeGateModal } from "./AgeGateModal";
import { CameraCheckModal } from "./CameraCheckModal";
import { WicketsOption, OversOption, MatchFormat } from "@/lib/game-core/types";
import { useGameStore } from "@/lib/store/gameStore";
import { io } from "socket.io-client";
import {
  Users,
  UserCheck,
  Video,
  Gamepad2,
  Shield,
  ShieldAlert,
  HelpCircle,
  Zap,
  ArrowRight,
  PlusCircle,
  LogIn,
  Edit2,
  Check,
  Bot,
  Camera,
} from "lucide-react";

export const Lobby: React.FC = () => {
  const router = useRouter();
  const {
    format,
    setWickets,
    setOvers,
    startBotMatch,
    tapToLock,
    toggleTapToLock,
    addToast,
  } = useGameStore();

  // Guest Identity
  const [guestId, setGuestId] = useState<string>("");
  const [guestName, setGuestName] = useState<string>("");
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>("");

  // Mode & Preferences
  const [matchPreference, setMatchPreference] = useState<"video" | "game_only">("video");
  const [showAgeGate, setShowAgeGate] = useState<boolean>(false);
  const [showCameraCheck, setShowCameraCheck] = useState<boolean>(false);
  const [showBotSetup, setShowBotSetup] = useState<boolean>(false);
  const [showRules, setShowRules] = useState<boolean>(false);

  // Friend Room Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [joinCode, setJoinCode] = useState<string>("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Custom Friend Room Setup
  const [friendWickets, setFriendWickets] = useState<WicketsOption>(2);
  const [friendOvers, setFriendOvers] = useState<OversOption>(2);
  const [friendMode, setFriendMode] = useState<"video" | "game_only">("video");

  // Show to Camera Gesture Lock-in Preference (Default: ON for video duels)
  const [showToCamera, setShowToCamera] = useState<boolean>(true);

  // Load guest identity
  useEffect(() => {
    let gid = localStorage.getItem("hca_guest_id");
    if (!gid) {
      gid = `g_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      localStorage.setItem("hca_guest_id", gid);
    }
    setGuestId(gid);

    let gName = localStorage.getItem("hca_guest_name");
    if (!gName) {
      gName = `Guest ${gid.slice(-4).toUpperCase()}`;
      localStorage.setItem("hca_guest_name", gName);
    }
    setGuestName(gName);
    setTempName(gName);

    const savedCameraGesture = localStorage.getItem("hca_show_to_camera");
    if (savedCameraGesture !== null) {
      setShowToCamera(savedCameraGesture === "true");
    }
  }, []);

  const handleToggleShowToCamera = () => {
    const next = !showToCamera;
    setShowToCamera(next);
    localStorage.setItem("hca_show_to_camera", String(next));
    addToast(`Show to Camera gesture lock-in: ${next ? "ON" : "OFF"}`, "info");
  };

  const handleSaveName = () => {
    const trimmed = tempName.trim();
    if (!trimmed) return;
    const finalName = trimmed.slice(0, 20);
    setGuestName(finalName);
    localStorage.setItem("hca_guest_name", finalName);
    setIsEditingName(false);
    addToast(`Name updated to "${finalName}"`, "success");
  };

  const isAgeVerified = (): boolean => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("hca_age_verified") !== null;
  };

  // ==========================================
  // MODE B: Random Matchmaking Trigger
  // ==========================================
  const handleFindMatchClick = () => {
    if (matchPreference === "video") {
      if (!isAgeVerified()) {
        setShowAgeGate(true);
      } else {
        setShowCameraCheck(true);
      }
    } else {
      router.push("/play/match?mode=game_only");
    }
  };

  const handleAgeConfirmed = () => {
    setShowAgeGate(false);
    setShowCameraCheck(true);
  };

  const handleAgeDeclined = () => {
    setShowAgeGate(false);
    setMatchPreference("game_only");
    addToast("Video mode disabled. Switched to Game Only mode.", "info");
    router.push("/play/match?mode=game_only");
  };

  const handleCameraCheckReady = (selectedMode: "video" | "game_only") => {
    setShowCameraCheck(false);
    router.push(`/play/match?mode=${selectedMode}`);
  };

  // ==========================================
  // MODE A: Friend Room Creation
  // ==========================================
  const handleCreateFriendRoom = () => {
    setIsSubmitting(true);
    const socket = io({ transports: ["websocket", "polling"] });

    socket.on("connect", () => {
      socket.emit("friend:create", {
        guestId,
        name: guestName,
        mode: friendMode,
        format: { maxWickets: friendWickets, maxOvers: friendOvers },
      });
    });

    socket.on("friend:created", (data: { code: string }) => {
      socket.disconnect();
      setIsSubmitting(false);
      setShowCreateModal(false);
      router.push(`/room/${data.code}`);
    });

    socket.on("friend:error", (err: { message: string }) => {
      setIsSubmitting(false);
      addToast(err.message || "Failed to create room.", "error");
      socket.disconnect();
    });
  };

  // ==========================================
  // MODE A: Friend Room Join
  // ==========================================
  const handleJoinWithCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setJoinError("Room code must be exactly 6 characters.");
      return;
    }

    setJoinError(null);
    setShowJoinModal(false);
    router.push(`/room/${cleanCode}`);
  };

  const handleStartBot = () => {
    startBotMatch(format);
    router.push("/play/bot");
  };

  return (
    <main className="min-h-screen bg-ink text-chalk flex flex-col justify-center items-center px-4 py-8 select-none">
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-6">
        
        {/* EDITABLE GUEST NAME BADGE (At top) */}
        <div className="flex items-center gap-2 bg-surface border border-line rounded-full px-4 py-1.5 shadow-none">
          <span className="text-[10px] font-heading uppercase tracking-wider text-muted font-bold">
            Playing As:
          </span>

          {isEditingName ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={tempName}
                maxLength={18}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                className="bg-surface-2 border border-turf text-chalk text-xs font-bold px-2 py-0.5 rounded focus:outline-none w-32"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveName}
                className="p-1 text-turf hover:text-turf-hover transition-colors"
                title="Save Name"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-heading font-black text-chalk uppercase tracking-wide">
                {guestName}
              </span>
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="p-1 text-muted hover:text-chalk transition-colors"
                title="Edit Guest Name"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* LOGO WORDMARK */}
        <div className="flex flex-col items-center text-center gap-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-turf inline-block" />
            <h1 className="font-heading font-black text-4xl sm:text-5xl tracking-tight uppercase text-chalk leading-none">
              HAND CRICKET ARENA
            </h1>
          </div>
          <p className="text-xs font-heading font-semibold uppercase tracking-widest text-muted mt-1">
            Real-Time 1v1 Cricket Duel Engine
          </p>
        </div>

        {/* TWO PRIMARY PLAY MODE CARDS: Desktop Side-by-Side, Mobile Stacked */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 1. PLAY WITH A FRIEND (Primary Card) */}
          <div className="bg-surface border border-line rounded-[12px] p-5 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-turf bg-turf/10 px-2 py-0.5 rounded-full border border-turf/30">
                  Private Duel
                </span>
                <UserCheck className="w-4 h-4 text-turf" />
              </div>
              <h2 className="font-heading font-black text-xl sm:text-2xl uppercase tracking-tight text-chalk">
                PLAY WITH A FRIEND
              </h2>
              <p className="text-xs text-muted leading-relaxed">
                Create a private room with a 6-character code or join your friend&apos;s arena with custom format rules.
              </p>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => setShowCreateModal(true)}
                className="font-heading font-black text-base uppercase tracking-wider min-h-[56px] flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                <span>CREATE ROOM</span>
              </Button>

              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => {
                  setJoinCode("");
                  setJoinError(null);
                  setShowJoinModal(true);
                }}
                className="font-heading font-black text-sm uppercase tracking-wider min-h-[48px] flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>JOIN WITH CODE</span>
              </Button>
            </div>
          </div>

          {/* 2. PLAY WITH RANDOM PLAYERS (Primary Card) */}
          <div className="bg-surface border border-line rounded-[12px] p-5 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-sky bg-sky/10 px-2 py-0.5 rounded-full border border-sky/30">
                  Omegle-Style Queue
                </span>
                <Users className="w-4 h-4 text-sky" />
              </div>
              <h2 className="font-heading font-black text-xl sm:text-2xl uppercase tracking-tight text-chalk">
                PLAY WITH RANDOM PLAYERS
              </h2>
              <p className="text-xs text-muted leading-relaxed">
                Instant 1v1 matchmaking with players around the world. Live peer-to-peer video with safety controls.
              </p>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleFindMatchClick}
                className="font-heading font-black text-base uppercase tracking-wider min-h-[56px] flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" />
                <span>FIND MATCH</span>
              </Button>

              <span className="text-[11px] text-muted text-center py-2">
                Safe duel • 18+ verified • Instant Next Opponent
              </span>
            </div>
          </div>
        </div>

        {/* CONTROLS BELOW CARDS: Video Toggle & Bot Link */}
        <div className="w-full flex flex-col gap-4 bg-surface border border-line rounded-[12px] p-5">
          {/* Match Preference Toggle: Video vs Game Only */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-col text-center sm:text-left">
              <span className="text-xs font-heading font-bold uppercase tracking-wider text-chalk">
                Connection Preference
              </span>
              <span className="text-[11px] text-muted">
                {matchPreference === "video"
                  ? "Live 1v1 peer-to-peer video duel with camera & audio"
                  : "Match only with other game-only players (no camera/mic)"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-surface-2 p-1 rounded-lg border border-line w-full sm:w-auto min-w-[240px]">
              <button
                type="button"
                onClick={() => setMatchPreference("video")}
                className={`py-2 px-3 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-all ${
                  matchPreference === "video"
                    ? "bg-turf text-ink shadow-sm"
                    : "text-muted hover:text-chalk"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>VIDEO ON</span>
              </button>
              <button
                type="button"
                onClick={() => setMatchPreference("game_only")}
                className={`py-2 px-3 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-all ${
                  matchPreference === "game_only"
                    ? "bg-turf text-ink shadow-sm"
                    : "text-muted hover:text-chalk"
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>GAME ONLY</span>
              </button>
            </div>
          </div>

          {/* Show to Camera Gesture Lock-in Setting */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-line">
            <div className="flex flex-col text-center sm:text-left">
              <span className="text-xs font-heading font-bold uppercase tracking-wider text-chalk flex items-center gap-1.5 justify-center sm:justify-start">
                <Camera className="w-3.5 h-3.5 text-turf" />
                <span>Show to Camera Lock-in</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-turf/20 text-turf border border-turf/40 rounded font-mono">
                  NEW
                </span>
              </span>
              <span className="text-[11px] text-muted">
                Hold hand gesture (1-6) for 1s to auto-lock ball picks (video duels only). NumberPad stays active as fallback.
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggleShowToCamera}
              className={`py-2 px-4 rounded-lg border text-xs font-heading font-bold flex items-center justify-center gap-2 transition-all shrink-0 ${
                showToCamera
                  ? "bg-turf/20 border-turf text-turf shadow-sm"
                  : "bg-surface-2 border-line text-muted hover:text-chalk"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${showToCamera ? "bg-turf animate-pulse" : "bg-muted"}`} />
              <span>{showToCamera ? "ENABLED (ON)" : "DISABLED (OFF)"}</span>
            </button>
          </div>

          {/* 3. PLAY VS BOT (Secondary Link Below Cards) */}
          <div className="pt-3 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowBotSetup(true)}
              className="text-xs font-heading font-bold uppercase tracking-wider text-muted hover:text-chalk flex items-center gap-2 transition-colors py-1"
            >
              <Bot className="w-4 h-4 text-turf" />
              <span>Practice Offline: Play vs Bot Arena</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted" />
            </button>

            <div className="flex items-center gap-4 text-xs">
              <button
                type="button"
                onClick={toggleTapToLock}
                className="flex items-center gap-1 text-muted hover:text-chalk transition-colors"
                title="Toggle Instant Lock Mode"
              >
                <Zap className={`w-3.5 h-3.5 ${tapToLock ? "text-amber fill-amber" : "text-muted"}`} />
                <span>Tap-lock: <strong>{tapToLock ? "ON" : "OFF"}</strong></span>
              </button>

              <button
                type="button"
                onClick={() => setShowRules(true)}
                className="flex items-center gap-1 text-muted hover:text-turf transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Rules</span>
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="text-center text-xs text-muted flex items-center gap-4">
          <Link href="/privacy" className="hover:text-turf transition-colors flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Privacy Policy</span>
          </Link>
          <span>•</span>
          <Link href="/admin/reports" className="hover:text-turf transition-colors flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            <span>Admin Queue</span>
          </Link>
        </footer>
      </div>

      {/* CREATE FRIEND ROOM MODAL */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-ink/80 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-surface border border-line rounded-[12px] p-6 max-w-sm w-full flex flex-col gap-4 text-chalk"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Create Friend Room"
          >
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <h3 className="font-heading font-black text-xl uppercase tracking-wide">
                Create Friend Room
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-xs text-muted hover:text-chalk p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted">
              Choose your duel rules. A shareable 6-character room code will be generated.
            </p>

            {/* Wickets */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                Wickets Limit
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as WicketsOption[]).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setFriendWickets(w)}
                    className={`py-2 rounded-[12px] border text-xs font-heading font-bold tabular-nums transition-all ${
                      friendWickets === w
                        ? "bg-surface-2 border-turf text-turf"
                        : "bg-surface-2/40 border-line text-muted hover:text-chalk"
                    }`}
                  >
                    {w} {w === 1 ? "Wkt" : "Wkts"}
                  </button>
                ))}
              </div>
            </div>

            {/* Overs */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                Overs Limit
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as OversOption[]).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setFriendOvers(o)}
                    className={`py-2 rounded-[12px] border text-xs font-heading font-bold tabular-nums transition-all ${
                      friendOvers === o
                        ? "bg-surface-2 border-turf text-turf"
                        : "bg-surface-2/40 border-line text-muted hover:text-chalk"
                    }`}
                  >
                    {o} {o === 1 ? "Over" : "Overs"}
                  </button>
                ))}
              </div>
            </div>

            {/* Video vs Game Only */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                Video Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFriendMode("video")}
                  className={`py-2 rounded-[12px] border text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition-all ${
                    friendMode === "video"
                      ? "bg-surface-2 border-turf text-turf"
                      : "bg-surface-2/40 border-line text-muted hover:text-chalk"
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Video On</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFriendMode("game_only")}
                  className={`py-2 rounded-[12px] border text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition-all ${
                    friendMode === "game_only"
                      ? "bg-surface-2 border-turf text-turf"
                      : "bg-surface-2/40 border-line text-muted hover:text-chalk"
                  }`}
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>Game Only</span>
                </button>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={isSubmitting}
              onClick={handleCreateFriendRoom}
              className="font-heading font-black text-base uppercase tracking-wider min-h-[52px] mt-1"
            >
              {isSubmitting ? "GENERATING ROOM..." : "CREATE & GET CODE"}
            </Button>
          </div>
        </div>
      )}

      {/* JOIN WITH CODE MODAL */}
      {showJoinModal && (
        <div
          className="fixed inset-0 z-50 bg-ink/80 flex items-center justify-center p-4"
          onClick={() => setShowJoinModal(false)}
        >
          <div
            className="bg-surface border border-line rounded-[12px] p-6 max-w-sm w-full flex flex-col gap-4 text-chalk"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Join Friend Room"
          >
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <h3 className="font-heading font-black text-xl uppercase tracking-wide">
                Join Friend Room
              </h3>
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="text-xs text-muted hover:text-chalk p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted">
              Enter the 6-character room code given by your friend.
            </p>

            <form onSubmit={handleJoinWithCode} className="flex flex-col gap-3">
              {/* 6-box style or single stylized auto-uppercase input */}
              <input
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) => {
                  setJoinError(null);
                  setJoinCode(e.target.value.toUpperCase());
                }}
                placeholder="ABC234"
                className="bg-surface-2 border border-line rounded-[12px] px-4 py-3 text-center font-heading font-black text-2xl tracking-[0.3em] uppercase text-turf focus:outline-none focus:border-turf"
                autoFocus
              />

              {joinError && (
                <span className="text-xs text-ball font-semibold text-center">
                  {joinError}
                </span>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={joinCode.trim().length !== 6}
                className="font-heading font-black text-base uppercase tracking-wider min-h-[52px]"
              >
                ENTER ROOM
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* 18+ AGE GATE MODAL */}
      <AgeGateModal
        isOpen={showAgeGate}
        onConfirm={handleAgeConfirmed}
        onDecline={handleAgeDeclined}
      />

      {/* CAMERA CHECK MODAL */}
      <CameraCheckModal
        isOpen={showCameraCheck}
        initialMode={matchPreference}
        onReady={handleCameraCheckReady}
        onCancel={() => setShowCameraCheck(false)}
      />

      {/* VS BOT FORMAT SETUP MODAL */}
      {showBotSetup && (
        <div
          className="fixed inset-0 z-50 bg-ink/80 flex items-center justify-center p-4"
          onClick={() => setShowBotSetup(false)}
        >
          <div
            className="bg-surface border border-line rounded-[12px] p-6 max-w-sm w-full flex flex-col gap-5 text-chalk"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Bot Match Setup"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-turf" />
                <h3 className="font-heading font-black text-xl uppercase tracking-wide">
                  Bot Match Setup
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBotSetup(false)}
                className="text-xs text-muted hover:text-chalk p-1"
              >
                ✕
              </button>
            </div>

            {/* Wickets */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                Wickets Limit
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as WicketsOption[]).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWickets(w)}
                    className={`py-2 rounded-[12px] border text-sm font-heading font-bold tabular-nums transition-all ${
                      format.maxWickets === w
                        ? "bg-surface-2 border-turf text-turf"
                        : "bg-surface-2/40 border-line text-muted hover:text-chalk"
                    }`}
                  >
                    {w} {w === 1 ? "Wkt" : "Wkts"}
                  </button>
                ))}
              </div>
            </div>

            {/* Overs */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                Overs Limit (6 balls/over)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as OversOption[]).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOvers(o)}
                    className={`py-2 rounded-[12px] border text-sm font-heading font-bold tabular-nums transition-all ${
                      format.maxOvers === o
                        ? "bg-surface-2 border-turf text-turf"
                        : "bg-surface-2/40 border-line text-muted hover:text-chalk"
                    }`}
                  >
                    {o} {o === 1 ? "Over" : "Overs"}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                setShowBotSetup(false);
                handleStartBot();
              }}
              className="font-heading font-black text-xl uppercase tracking-wider flex items-center justify-center gap-2 mt-1 min-h-[52px]"
            >
              <span>ENTER ARENA</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* RULES MODAL */}
      {showRules && (
        <div
          className="fixed inset-0 z-50 bg-ink/80 flex items-center justify-center p-4"
          onClick={() => setShowRules(false)}
        >
          <div
            className="bg-surface border border-line rounded-[12px] p-6 max-w-lg w-full flex flex-col gap-4 text-chalk"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Hand Cricket Rules"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-heading font-black text-xl uppercase tracking-wider text-chalk">
                Hand Cricket Rules
              </h3>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                className="text-xs text-muted hover:text-chalk p-1"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs sm:text-sm text-muted leading-relaxed">
              <div>
                <strong className="text-chalk block font-heading uppercase text-sm">
                  1. The Coin Toss
                </strong>
                One player calls Odd or Even. Both secretly pick 1-6. If the sum matches the call, the caller wins and picks to Bat or Bowl.
              </div>

              <div>
                <strong className="text-chalk block font-heading uppercase text-sm">
                  2. Ball Delivery &amp; Scoring
                </strong>
                Batter and bowler secretly pick 1-6 simultaneously.
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li><strong className="text-ball">Same Number = OUT!</strong> Batter is dismissed.</li>
                  <li><strong className="text-turf">Different Number = Runs!</strong> Batter scores their number (1 to 6 runs).</li>
                </ul>
              </div>

              <div>
                <strong className="text-chalk block font-heading uppercase text-sm">
                  3. Live Peer-to-Peer Video
                </strong>
                Video duels are encrypted peer-to-peer WebRTC. Camera and mic are strictly active only during match play. Zero streams are recorded.
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setShowRules(false)}
            >
              GOT IT, PLAY
            </Button>
          </div>
        </div>
      )}
    </main>
  );
};

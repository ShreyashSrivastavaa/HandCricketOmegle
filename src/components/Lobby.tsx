"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "./Button";
import { AgeGateModal } from "./AgeGateModal";
import { CameraCheckModal } from "./CameraCheckModal";
import { WicketsOption, OversOption, MatchFormat } from "@/lib/game-core/types";
import { useGameStore } from "@/lib/store/gameStore";
import {
  Play,
  Users,
  Video,
  Shield,
  Gamepad2,
  KeyRound,
  HelpCircle,
  Zap,
  ArrowRight,
  ShieldAlert,
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

  const [matchPreference, setMatchPreference] = useState<"video" | "game_only">("video");
  const [showAgeGate, setShowAgeGate] = useState<boolean>(false);
  const [showCameraCheck, setShowCameraCheck] = useState<boolean>(false);
  const [showBotSetup, setShowBotSetup] = useState<boolean>(false);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [showRoomModal, setShowRoomModal] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>("");

  // Check age verification status on mount
  const isAgeVerified = (): boolean => {
    if (typeof window === "undefined") return false;
    const verified = localStorage.getItem("hca_age_verified");
    return verified !== null;
  };

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

  const handleStartBot = () => {
    startBotMatch(format);
    router.push("/play/bot");
  };

  return (
    <main className="min-h-screen bg-ink text-chalk flex flex-col justify-center items-center px-4 py-8 select-none">
      {/* SINGLE CENTERED COLUMN */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6">
        
        {/* TEXT-ONLY LOGO WORDMARK */}
        <div className="flex flex-col items-center text-center gap-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-turf inline-block" />
            <h1 className="font-heading font-black text-4xl sm:text-5xl tracking-tight uppercase text-chalk leading-none">
              HAND CRICKET ARENA
            </h1>
          </div>
          <p className="text-xs font-heading font-semibold uppercase tracking-widest text-muted mt-1">
            Real-Time Competitive Duel Engine
          </p>
        </div>

        {/* LOBBY CONTROLS BOX */}
        <div className="w-full flex flex-col gap-4 bg-surface border border-line rounded-[12px] p-6 shadow-none">
          {/* Match Preference Toggle: Video vs Game Only */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-heading font-bold uppercase tracking-wider text-muted">
              Match Preference
            </label>
            <div className="grid grid-cols-2 gap-2 bg-surface-2 p-1 rounded-lg border border-line">
              <button
                type="button"
                onClick={() => setMatchPreference("video")}
                className={`py-2 px-3 text-xs font-bold rounded flex items-center justify-center gap-2 transition-all ${
                  matchPreference === "video"
                    ? "bg-turf text-ink shadow-sm"
                    : "text-muted hover:text-chalk"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>VIDEO + GAME</span>
              </button>
              <button
                type="button"
                onClick={() => setMatchPreference("game_only")}
                className={`py-2 px-3 text-xs font-bold rounded flex items-center justify-center gap-2 transition-all ${
                  matchPreference === "game_only"
                    ? "bg-turf text-ink shadow-sm"
                    : "text-muted hover:text-chalk"
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>GAME ONLY</span>
              </button>
            </div>
            <span className="text-[10px] text-muted">
              {matchPreference === "video"
                ? "1-to-1 WebRTC video duel (Camera check before entering)"
                : "Match only with other Game-only players (no camera/mic)"}
            </span>
          </div>

          {/* LARGE FIND MATCH (PRIMARY BUTTON) */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleFindMatchClick}
            className="font-heading font-black text-2xl uppercase tracking-wider py-4 flex items-center justify-center gap-2.5 shadow-none"
          >
            <Users className="w-6 h-6" />
            <span>FIND MATCH</span>
          </Button>

          {/* PLAY VS BOT (SECONDARY BUTTON) */}
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => setShowBotSetup(true)}
            className="font-heading font-black text-xl uppercase tracking-wider py-3.5 flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>PLAY VS BOT</span>
          </Button>

          {/* PRIVATE ROOM (GHOST LINK) */}
          <button
            type="button"
            onClick={() => setShowRoomModal(true)}
            className="w-full py-2 text-center text-xs font-heading font-bold uppercase tracking-wider text-muted hover:text-chalk transition-colors border border-transparent hover:border-line rounded-[12px] flex items-center justify-center gap-2"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Private Room (Code)</span>
          </button>

          {/* Settings & Info Bar */}
          <div className="pt-3 border-t border-line flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={toggleTapToLock}
              className="flex items-center gap-1.5 text-muted hover:text-chalk transition-colors"
              title="Toggle Instant Lock Mode"
            >
              <Zap className={`w-3.5 h-3.5 ${tapToLock ? "text-amber fill-amber" : "text-muted"}`} />
              <span>
                Tap-to-lock: <strong>{tapToLock ? "ON" : "OFF"}</strong>
              </span>
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

        {/* Quick Footer Links */}
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
                <Play className="w-4 h-4 text-turf fill-turf" />
                <h3 className="font-heading font-black text-xl uppercase tracking-wide">
                  Match Setup
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
              className="font-heading font-black text-xl uppercase tracking-wider flex items-center justify-center gap-2 mt-1"
            >
              <span>ENTER ARENA</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* PRIVATE ROOM MODAL */}
      {showRoomModal && (
        <div
          className="fixed inset-0 z-50 bg-ink/80 flex items-center justify-center p-4"
          onClick={() => setShowRoomModal(false)}
        >
          <div
            className="bg-surface border border-line rounded-[12px] p-6 max-w-sm w-full flex flex-col gap-4 text-chalk"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Private Room Dialog"
          >
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <h3 className="font-heading font-black text-xl uppercase tracking-wide">
                Private Room Duel
              </h3>
              <button
                type="button"
                onClick={() => setShowRoomModal(false)}
                className="text-xs text-muted hover:text-chalk"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted">
              Enter a 6-character room code to join or create a private arena room.
            </p>

            <input
              type="text"
              placeholder="ENTER 6-CHAR CODE"
              maxLength={6}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="bg-surface-2 border border-line rounded-[12px] px-3 py-2 text-sm font-heading font-bold uppercase text-chalk text-center placeholder:text-muted/50 tracking-widest focus-visible:outline-none focus-visible:border-turf"
            />

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setShowRoomModal(false);
                  router.push(`/play/match?mode=${matchPreference}&room=${roomCode || "HCA921"}`);
                }}
              >
                CREATE ROOM
              </Button>
              <Button
                variant="secondary"
                size="md"
                disabled={!roomCode}
                onClick={() => {
                  setShowRoomModal(false);
                  router.push(`/play/match?mode=${matchPreference}&room=${roomCode}`);
                }}
              >
                JOIN ROOM
              </Button>
            </div>
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
                Hand Cricket Arena Rules
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
                  2. Ball Delivery & Scoring
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
                Video duels are encrypted peer-to-peer WebRTC. Camera and mic are strictly active only during match play. Zero live streams are recorded.
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

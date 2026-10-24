"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import {
  Users,
  Copy,
  Check,
  Share2,
  X,
  PlusCircle,
  LogIn,
  Loader2,
  AlertCircle,
  Video,
  Gamepad2,
  Clock,
  Flame,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/Button";
import { playClickSound } from "@/lib/client/audio";
import type { OversOption, WicketsOption, MatchMode } from "@/lib/game/types";

interface PlayWithFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestId?: string;
  guestName?: string;
  defaultMode?: MatchMode;
}

export function PlayWithFriendModal({
  isOpen,
  onClose,
  guestId = "",
  guestName = "Guest",
  defaultMode = "sudden_death",
}: PlayWithFriendModalProps) {
  const router = useRouter();

  // Tab State: "create" | "join"
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");

  // Create Room State
  const [matchMode, setMatchMode] = useState<"video" | "game_only">("game_only");
  const [wickets, setWickets] = useState<WicketsOption>(defaultMode === "classic" ? 2 : 1);
  const [overs, setOvers] = useState<OversOption>(defaultMode === "classic" ? 2 : 1);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join Room State
  const [inputCode, setInputCode] = useState<string>("");
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Create Room
  const handleCreateRoom = async () => {
    playClickSound();
    setIsCreating(true);
    setCreateError(null);

    const effectiveId =
      guestId ||
      (typeof window !== "undefined" ? localStorage.getItem("hca_guest_id") : null) ||
      `g_${Date.now()}`;
    const effectiveName =
      guestName ||
      (typeof window !== "undefined" ? localStorage.getItem("hca_guest_name") : null) ||
      "Player";

    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: effectiveId,
          name: effectiveName,
          mode: matchMode,
          format: { maxWickets: wickets, maxOvers: overs },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.code) {
        throw new Error(data.error || "Failed to create room.");
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("hca_created_room", data.code);
        localStorage.setItem("hca_last_created_room", data.code);
        sessionStorage.setItem("hca_tab_guest_id", effectiveId);
        sessionStorage.setItem("hca_tab_guest_name", effectiveName);
      }

      setIsCreating(false);
      setCreatedRoomCode(data.code);
    } catch (err: any) {
      console.warn("[Friend Room] API create failed, falling back to socket:", err);
      // Fallback to socket if API had an unexpected issue
      const socket = io({ transports: ["websocket", "polling"] });

      socket.on("connect", () => {
        socket.emit("friend:create", {
          guestId: effectiveId,
          name: effectiveName,
          mode: matchMode,
          format: { maxWickets: wickets, maxOvers: overs },
        });
      });

      socket.on("friend:created", (data: { code: string }) => {
        socket.disconnect();
        if (typeof window !== "undefined") {
          sessionStorage.setItem("hca_created_room", data.code);
          localStorage.setItem("hca_last_created_room", data.code);
          sessionStorage.setItem("hca_tab_guest_id", effectiveId);
          sessionStorage.setItem("hca_tab_guest_name", effectiveName);
        }
        setIsCreating(false);
        setCreatedRoomCode(data.code);
      });

      socket.on("friend:error", (socketErr: { message: string }) => {
        socket.disconnect();
        setIsCreating(false);
        setCreateError(socketErr.message || err.message || "Could not create room.");
      });
    }
  };

  // Copy Room Code
  const handleCopyCode = () => {
    if (!createdRoomCode) return;
    const fullCode = createdRoomCode.startsWith("HC-")
      ? createdRoomCode
      : `HC-${createdRoomCode}`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(fullCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Share Invite URL / Text
  const handleShareInvite = async () => {
    if (!createdRoomCode) return;
    const cleanCode = createdRoomCode.replace(/^HC-/, "");
    const fullCode = `HC-${cleanCode}`;
    const inviteUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/room/${cleanCode}`
        : "";

    if (navigator?.share) {
      try {
        await navigator.share({
          title: "Join Hand Cricket Duel",
          text: `Join my private Hand Cricket duel room with code ${fullCode}!`,
          url: inviteUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard if share was cancelled or unsupported
      }
    }

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Enter Room as Creator
  const handleEnterCreatedRoom = () => {
    if (!createdRoomCode) return;
    playClickSound();
    const cleanCode = createdRoomCode.replace(/^HC-/, "");
    onClose();
    router.push(`/room/${cleanCode}`);
  };

  // Reset Create Room Screen
  const handleResetCreate = () => {
    setCreatedRoomCode(null);
    setCreateError(null);
    setIsCreating(false);
  };

  // Handle Join Room
  const handleJoinRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    playClickSound();

    const raw = inputCode.trim().toUpperCase();
    const cleanCode = raw.startsWith("HC-")
      ? raw.slice(3)
      : raw.startsWith("HC") && raw.length > 6
      ? raw.slice(2)
      : raw;

    if (!cleanCode) {
      setJoinError("Please enter a room code.");
      return;
    }

    if (cleanCode.length < 4 || cleanCode.length > 8) {
      setJoinError("Room codes are 6 characters long (e.g. HC-7K9P2).");
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    onClose();
    router.push(`/room/${cleanCode}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="friend-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-[26px] border border-line bg-surface p-5 text-chalk shadow-panel sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_75%_100%_at_50%_0%,rgba(178,59,42,0.12),transparent_72%)]"
          aria-hidden="true"
        />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-turf/10 border border-turf/40 flex items-center justify-center text-turf">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="friend-modal-title"
                className="font-heading font-black text-xl uppercase tracking-tight text-chalk leading-none"
              >
                Play with Friend
              </h2>
              <p className="text-[11px] text-muted leading-tight mt-0.5">
                Private 1v1 match with custom rules &amp; instant sync
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-muted hover:text-chalk hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-turf"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher (Visible when not in Room Created screen) */}
        {!createdRoomCode && (
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-2 border border-line rounded-xl">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab("create");
                setCreateError(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-heading font-black tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "create"
                  ? "bg-turf text-ink shadow-sm"
                  : "text-muted hover:text-chalk"
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Room</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab("join");
                setJoinError(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-heading font-black tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "join"
                  ? "bg-turf text-ink shadow-sm"
                  : "text-muted hover:text-chalk"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Join Room</span>
            </button>
          </div>
        )}

        {/* TAB 1: CREATE ROOM */}
        {activeTab === "create" && (
          <>
            {!createdRoomCode ? (
              <div className="flex flex-col gap-4">
                {/* Format Presets */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-heading font-bold text-muted uppercase tracking-wider">
                    Format Preset
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setWickets(1);
                        setOvers(1);
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                        wickets === 1 && overs === 1
                          ? "bg-surface-2 border-turf shadow-[0_0_12px_rgba(178,59,42,0.15)] ring-1 ring-turf text-chalk"
                          : "bg-surface-2/40 border-line text-muted hover:text-chalk"
                      }`}
                    >
                      <span className="text-xs font-heading font-black uppercase text-turf flex items-center gap-1">
                        <Flame className="w-3 h-3 fill-current" /> Sudden Death
                      </span>
                      <span className="text-[10px] text-muted">1 Wkt • 1 Over (Fast)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setWickets(2);
                        setOvers(2);
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                        wickets === 2 && overs === 2
                          ? "bg-surface-2 border-turf shadow-[0_0_12px_rgba(178,59,42,0.15)] ring-1 ring-turf text-chalk"
                          : "bg-surface-2/40 border-line text-muted hover:text-chalk"
                      }`}
                    >
                      <span className="text-xs font-heading font-black uppercase text-sky flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> Classic Match
                      </span>
                      <span className="text-[10px] text-muted">2 Wkts • 2 Overs</span>
                    </button>
                  </div>
                </div>

                {/* Custom Rules (Wickets & Overs) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-heading font-bold text-muted uppercase tracking-wider">
                      Wickets Limit
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {([1, 2, 3] as WicketsOption[]).map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setWickets(w)}
                          className={`py-1.5 rounded-lg border text-xs font-heading font-bold transition-all ${
                            wickets === w
                              ? "bg-surface-2 border-turf text-turf"
                              : "bg-surface-2/40 border-line text-muted hover:text-chalk"
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-heading font-bold text-muted uppercase tracking-wider">
                      Overs Limit
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {([1, 2, 3] as OversOption[]).map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setOvers(o)}
                          className={`py-1.5 rounded-lg border text-xs font-heading font-bold transition-all ${
                            overs === o
                              ? "bg-surface-2 border-turf text-turf"
                              : "bg-surface-2/40 border-line text-muted hover:text-chalk"
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Connection Preference */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-heading font-bold text-muted uppercase tracking-wider">
                    Connection Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMatchMode("game_only")}
                      className={`py-2 px-3 rounded-xl border text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition-all ${
                        matchMode === "game_only"
                          ? "bg-surface-2 border-turf text-turf shadow-sm"
                          : "bg-surface-2/40 border-line text-muted hover:text-chalk"
                      }`}
                    >
                      <Gamepad2 className="w-3.5 h-3.5" />
                      <span>Game Only</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatchMode("video")}
                      className={`py-2 px-3 rounded-xl border text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition-all ${
                        matchMode === "video"
                          ? "bg-surface-2 border-turf text-turf shadow-sm"
                          : "bg-surface-2/40 border-line text-muted hover:text-chalk"
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Live Video</span>
                    </button>
                  </div>
                </div>

                {createError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-ball/10 border border-ball/30 text-ball text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                {/* Create Room Button */}
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={isCreating}
                  onClick={handleCreateRoom}
                  className="font-heading font-black text-sm uppercase tracking-wider min-h-[50px] flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(178,59,42,0.25)]"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-ink" />
                      <span>CREATING PRIVATE ROOM...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>GENERATE PRIVATE ROOM</span>
                    </>
                  )}
                </Button>
              </div>
            ) : (
              /* ROOM CREATED STATE */
              <div className="flex flex-col items-center gap-4 text-center py-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-turf/10 border border-turf/30 text-turf text-xs font-heading font-black uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-turf animate-pulse" />
                  <span>YOUR PRIVATE ROOM</span>
                </div>

                {/* Big Code Card */}
                <div className="w-full bg-surface-2 border border-line rounded-[16px] p-4 flex flex-col items-center gap-2">
                  <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-muted">
                    Room Invite Code
                  </span>
                  <div className="font-heading font-black text-3xl sm:text-4xl tracking-[0.2em] text-turf py-1 px-4 bg-ink/50 border border-turf/40 rounded-xl select-all">
                    {createdRoomCode.startsWith("HC-")
                      ? createdRoomCode
                      : `HC-${createdRoomCode}`}
                  </div>
                  <p className="text-[11px] text-muted max-w-xs leading-relaxed">
                    Share this code with your friend to invite them to the match.
                  </p>

                  <div className="grid grid-cols-2 gap-2 w-full mt-2">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleCopyCode}
                      className="flex items-center justify-center gap-1.5 font-heading font-bold text-xs uppercase"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? "COPIED!" : "Copy Code"}</span>
                    </Button>

                    <Button
                      variant="secondary"
                      size="md"
                      onClick={handleShareInvite}
                      className="flex items-center justify-center gap-1.5 font-heading font-bold text-xs uppercase"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? "COPIED!" : "Share Invite"}</span>
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted">
                  <Loader2 className="w-3.5 h-3.5 text-turf animate-spin" />
                  <span className="animate-pulse">Waiting for your friend to join...</span>
                </div>

                <div className="flex items-center justify-between w-full text-[11px] text-muted border-t border-line pt-2">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted" />
                    <span>Expires in 10 mins</span>
                  </div>
                  <span>
                    {wickets} {wickets === 1 ? "Wkt" : "Wkts"} • {overs}{" "}
                    {overs === 1 ? "Over" : "Overs"}
                  </span>
                </div>

                <div className="flex flex-col gap-2 w-full pt-1">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleEnterCreatedRoom}
                    className="font-heading font-black text-sm uppercase tracking-wider min-h-[46px]"
                  >
                    ENTER ROOM ARENA
                  </Button>

                  <button
                    type="button"
                    onClick={handleResetCreate}
                    className="text-xs text-muted hover:text-chalk py-1 transition-colors"
                  >
                    Cancel &amp; Create Different Room
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: JOIN ROOM */}
        {activeTab === "join" && (
          <form onSubmit={handleJoinRoom} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="friend-room-code-input"
                className="text-[11px] font-heading font-bold text-muted uppercase tracking-wider px-1"
              >
                Enter Friend&apos;s Room Code
              </label>
              <input
                id="friend-room-code-input"
                type="text"
                maxLength={10}
                value={inputCode}
                onChange={(e) => {
                  setJoinError(null);
                  setInputCode(e.target.value.toUpperCase());
                }}
                placeholder="HC-7K9P2"
                autoFocus
                className="w-full bg-surface-2 border border-line focus:border-turf rounded-xl px-4 py-3.5 text-center font-heading font-black text-2xl sm:text-3xl tracking-[0.25em] uppercase text-turf placeholder:text-muted/40 focus:outline-none transition-colors"
              />
              <span className="text-[11px] text-muted px-1 text-center">
                Enter the code shared by your friend (case-insensitive).
              </span>
            </div>

            {joinError && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-ball/10 border border-ball/30 text-ball text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isJoining || inputCode.trim().length === 0}
              className="font-heading font-black text-sm uppercase tracking-wider min-h-[50px] flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(178,59,42,0.25)]"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-ink" />
                  <span>CONNECTING TO ROOM...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>JOIN ROOM</span>
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

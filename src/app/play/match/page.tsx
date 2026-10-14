"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useGameStore } from "@/lib/store/gameStore";
import { webrtcManager } from "@/lib/webrtc/webrtcManager";
import { VideoTiles } from "@/components/VideoTiles";
import { ReportModal } from "@/components/ReportModal";
import { HandTile, HandTileState } from "@/components/HandTile";
import { NumberPad } from "@/components/NumberPad";
import { ScoreBar } from "@/components/ScoreBar";
import { BallStrip } from "@/components/BallStrip";
import { TimerRing } from "@/components/TimerRing";
import { TossScreen } from "@/components/TossScreen";
import { InningsBreakScreen } from "@/components/InningsBreakScreen";
import { ResultBanner } from "@/components/ResultBanner";
import { Button } from "@/components/Button";
import { Toast, ToastMessage } from "@/components/Toast";
import {
  GameState,
  MatchFormat,
  PlayerId,
  TossCall,
  TossDecision,
} from "@/lib/game-core/types";
import {
  createInitialGameState,
  submitTossCall,
  submitTossPick,
  submitTossDecision,
  applyBall,
  startSecondInnings,
} from "@/lib/game-core/engine";
import {
  ArrowLeft,
  RotateCw,
  Flag,
  UserX,
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
  Smile,
  Loader2,
  ShieldAlert,
} from "lucide-react";

const PRESET_EMOTES = ["👏", "🔥", "😅", "🏏"];

export default function PlayMatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: "video" (default) or "game_only"
  const requestedMode = (searchParams?.get("mode") as "video" | "game_only") || "video";

  // Guest ID & Session Blocks
  const [guestId, setGuestId] = useState<string>("");
  const [blockedGuests, setBlockedGuests] = useState<string[]>([]);
  const [isFirstMatchForGuest, setIsFirstMatchForGuest] = useState<boolean>(false);

  // Matchmaking State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(true);
  const [searchSeconds, setSearchSeconds] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Match Info
  const [roomId, setRoomId] = useState<string | null>(null);
  const [matchMode, setMatchMode] = useState<"video" | "game_only">(requestedMode);
  const [isInitiator, setIsInitiator] = useState<boolean>(false);
  const [opponent, setOpponent] = useState<{ guestId: string; name: string } | null>(null);

  // Game Core State
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<PlayerId>("p1");
  const [userPick, setUserPick] = useState<number | null>(null);
  const [isUserLocked, setIsUserLocked] = useState<boolean>(false);
  const [opponentPick, setOpponentPick] = useState<number | null>(null);
  const [isOpponentLocked, setIsOpponentLocked] = useState<boolean>(false);

  const [userTileState, setUserTileState] = useState<HandTileState>("empty");
  const [opponentTileState, setOpponentTileState] = useState<HandTileState>("empty");
  const [revealCountdown, setRevealCountdown] = useState<number | null>(null);
  const [outcomeText, setOutcomeText] = useState<string | null>(null);
  const [isOutcomeWicket, setIsOutcomeWicket] = useState<boolean>(false);
  const [screenShake, setScreenShake] = useState<boolean>(false);

  // Turn timer
  const [timerSeconds, setTimerSeconds] = useState<number>(8);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Emotes & Report
  const [receivedEmote, setReceivedEmote] = useState<{ emote: string; id: number } | null>(null);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Responsive layout state
  const [layout, setLayout] = useState<"mobile-portrait" | "desktop" | "landscape">("mobile-portrait");

  // Local toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastMessage["type"] = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Determine screen layout
  useEffect(() => {
    const updateLayout = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w > 1024) setLayout("desktop");
      else if (w > h && h < 600) setLayout("landscape");
      else setLayout("mobile-portrait");
    };
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  // Initialize Guest ID and Blocklist
  useEffect(() => {
    let gid = localStorage.getItem("hca_guest_id");
    if (!gid) {
      gid = `g_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      localStorage.setItem("hca_guest_id", gid);
      setIsFirstMatchForGuest(true);
    } else {
      const matchCount = parseInt(localStorage.getItem("hca_match_count") || "0", 10);
      setIsFirstMatchForGuest(matchCount === 0);
    }
    setGuestId(gid);

    const savedBlocks = sessionStorage.getItem("hca_blocked_guests");
    if (savedBlocks) {
      try {
        setBlockedGuests(JSON.parse(savedBlocks));
      } catch (e) {}
    }
  }, []);

  // Establish Socket.IO connection and join queue
  useEffect(() => {
    if (!guestId) return;

    const s = io({
      transports: ["websocket", "polling"],
    });
    setSocket(s);

    s.on("connect", () => {
      joinMatchQueue(s);
    });

    s.on("queue:waiting", () => {
      setIsSearching(true);
    });

    s.on("queue:error", (data: { message: string }) => {
      setIsSearching(false);
      setErrorMessage(data.message);
      addToast(data.message, "error");
    });

    s.on(
      "match:found",
      (data: {
        roomId: string;
        mode: "video" | "game_only";
        isInitiator: boolean;
        opponent: { guestId: string; name: string };
      }) => {
        setIsSearching(false);
        setRoomId(data.roomId);
        setMatchMode(data.mode);
        setIsInitiator(data.isInitiator);
        setOpponent(data.opponent);

        // p1 is initiator, p2 is non-initiator
        const myRole: PlayerId = data.isInitiator ? "p1" : "p2";
        setMyPlayerId(myRole);

        // Update match count in storage
        const count = parseInt(localStorage.getItem("hca_match_count") || "0", 10);
        localStorage.setItem("hca_match_count", (count + 1).toString());

        addToast(`Matched with ${data.opponent.name}!`, "success");

        // Start WebRTC session if in video mode
        if (data.mode === "video") {
          webrtcManager.startPeerSession(s, data.isInitiator);
        }

        // Initialize authoritative game state (format 2 overs, 2 wickets)
        const format: MatchFormat = { maxWickets: 2, maxOvers: 2 };
        const p1Name = data.isInitiator ? "You" : data.opponent.name;
        const p2Name = data.isInitiator ? data.opponent.name : "You";
        const initialGame = createInitialGameState(format, p1Name, p2Name, "p1");
        setGameState(initialGame);
      }
    );

    s.on("match:ended", (data: { reason: string; message: string }) => {
      addToast(data.message || "Match ended.", "info");
      webrtcManager.cleanup();
      // Reset match state and auto-requeue
      resetMatchState();
      joinMatchQueue(s);
    });

    // Game Events
    s.on("game:toss_call", (payload: { call: TossCall }) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return submitTossCall(prev, payload.call);
      });
    });

    s.on("game:toss_pick", (payload: { pick: number }) => {
      setGameState((prev) => {
        if (!prev) return prev;
        const otherRole: PlayerId = myPlayerId === "p1" ? "p2" : "p1";
        return submitTossPick(prev, otherRole, payload.pick);
      });
    });

    s.on("game:toss_decision", (payload: { role: TossDecision }) => {
      setGameState((prev) => {
        if (!prev) return prev;
        const next = submitTossDecision(prev, payload.role);
        startTurnCountdown();
        return next;
      });
    });

    s.on("game:opponent_locked", () => {
      setIsOpponentLocked(true);
      setOpponentTileState("locked");
    });

    s.on("game:ball_reveal", (payload: { p1Pick: number; p2Pick: number; ballIndex: number }) => {
      stopTurnCountdown();

      // Determine picks from user's perspective
      const myPick = myPlayerId === "p1" ? payload.p1Pick : payload.p2Pick;
      const theirPick = myPlayerId === "p1" ? payload.p2Pick : payload.p1Pick;

      setUserPick(myPick);
      setOpponentPick(theirPick);

      // 3-2-1 countdown tick
      setUserTileState("revealing");
      setOpponentTileState("revealing");
      setRevealCountdown(3);

      setTimeout(() => {
        setRevealCountdown(2);
        setTimeout(() => {
          setRevealCountdown(1);
          setTimeout(() => {
            setRevealCountdown(null);

            setGameState((prev) => {
              if (!prev) return prev;
              const activeInnings = prev.currentInnings === 1 ? prev.innings1 : prev.innings2!;
              const isUserBatting = activeInnings.battingPlayer === myPlayerId;

              const batterNum = isUserBatting ? myPick : theirPick;
              const bowlerNum = isUserBatting ? theirPick : myPick;

              const { nextState, outcome } = applyBall(prev, batterNum, bowlerNum);

              let display = "";
              if (outcome.isWicket) {
                display = "OUT!";
              } else if (outcome.runsScored === 6) {
                display = "SIX! +6";
              } else if (outcome.runsScored === 4) {
                display = "FOUR! +4";
              } else {
                display = `+${outcome.runsScored}`;
              }

              setOutcomeText(display);
              setIsOutcomeWicket(outcome.isWicket);
              setScreenShake(outcome.isWicket);

              if (outcome.isWicket) {
                setTimeout(() => setScreenShake(false), 200);
                setUserTileState(isUserBatting ? "out" : "revealed");
                setOpponentTileState(isUserBatting ? "revealed" : "out");
              } else {
                setUserTileState(isUserBatting ? "scored" : "revealed");
                setOpponentTileState(isUserBatting ? "revealed" : "scored");
              }

              // Advance to next ball
              setTimeout(() => {
                setUserPick(null);
                setIsUserLocked(false);
                setOpponentPick(null);
                setIsOpponentLocked(false);
                setUserTileState("empty");
                setOpponentTileState("empty");
                setOutcomeText(null);

                if (nextState.phase !== "match_ended" && nextState.phase !== "innings_break") {
                  startTurnCountdown();
                }
              }, 1200);

              return nextState;
            });
          }, 300);
        }, 300);
      }, 300);
    });

    s.on("game:emote", (payload: { emote: string }) => {
      setReceivedEmote({ emote: payload.emote, id: Date.now() });
      setTimeout(() => setReceivedEmote(null), 2500);
    });

    return () => {
      webrtcManager.cleanup();
      stopTurnCountdown();
      s.disconnect();
    };
  }, [guestId]);

  // Elapsed Search Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchSeconds((s) => s + 1);
      }, 1000);
    } else {
      setSearchSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSearching]);

  const joinMatchQueue = (s: Socket) => {
    const ageConfirmed = localStorage.getItem("hca_age_verified") !== null;
    setIsSearching(true);
    setErrorMessage(null);

    s.emit("queue:join", {
      guestId,
      queueType: matchMode,
      ageConfirmed,
      blockedGuestIds: blockedGuests,
    });
  };

  const resetMatchState = () => {
    setRoomId(null);
    setOpponent(null);
    setGameState(null);
    setUserPick(null);
    setIsUserLocked(false);
    setOpponentPick(null);
    setIsOpponentLocked(false);
    setUserTileState("empty");
    setOpponentTileState("empty");
    setRevealCountdown(null);
    setOutcomeText(null);
  };

  const startTurnCountdown = () => {
    stopTurnCountdown();
    setTimerSeconds(8);

    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          stopTurnCountdown();
          handleTurnTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTurnCountdown = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const handleTurnTimeout = () => {
    if (!isUserLocked && userTileState === "empty") {
      const autoPick = Math.floor(Math.random() * 6) + 1;
      handleConfirmBallPick(autoPick);
      addToast(`Time expired! Auto-picked ${autoPick}.`, "warning");
    }
  };

  // Next Opponent (works in 1 tap at all times in < 1s)
  const handleNextOpponent = () => {
    webrtcManager.cleanup();
    stopTurnCountdown();
    resetMatchState();

    if (socket) {
      socket.emit("match:next");
      joinMatchQueue(socket);
    }
  };

  // Block opponent
  const handleBlockOpponent = (targetGuestId: string) => {
    const updated = [...blockedGuests, targetGuestId];
    setBlockedGuests(updated);
    sessionStorage.setItem("hca_blocked_guests", JSON.stringify(updated));
    addToast("Opponent blocked for this session.", "info");
    handleNextOpponent();
  };

  // Game Pick Handlers
  const handleSelectBallNumber = (num: number) => {
    if (isUserLocked || userTileState !== "empty") return;
    setUserPick(num);
  };

  const handleConfirmBallPick = (overrideNum?: number) => {
    const num = overrideNum || userPick;
    if (!num || isUserLocked || userTileState !== "empty") return;

    setUserPick(num);
    setIsUserLocked(true);
    setUserTileState("locked");

    const ballIdx =
      gameState && (gameState.currentInnings === 1 ? gameState.innings1.balls : gameState.innings2?.balls || 0);

    socket?.emit("game:ball_pick", { pick: num, ballIndex: ballIdx || 0 });
  };

  // Toss Handlers
  const handleTossCall = (call: TossCall) => {
    setGameState((prev) => {
      if (!prev) return prev;
      return submitTossCall(prev, call);
    });
    socket?.emit("game:toss_call", { call });
  };

  const handleTossPick = (num: number) => {
    setGameState((prev) => {
      if (!prev) return prev;
      return submitTossPick(prev, myPlayerId, num);
    });
    socket?.emit("game:toss_pick", { pick: num });
  };

  const handleTossDecision = (role: TossDecision) => {
    setGameState((prev) => {
      if (!prev) return prev;
      const next = submitTossDecision(prev, role);
      startTurnCountdown();
      return next;
    });
    socket?.emit("game:toss_decision", { role });
  };

  // Innings 2 Start
  const handleStartInnings2 = () => {
    setGameState((prev) => {
      if (!prev) return prev;
      const next = startSecondInnings(prev);
      startTurnCountdown();
      return next;
    });
  };

  const handleSendEmote = (emote: string) => {
    socket?.emit("game:emote", { emote });
    setReceivedEmote({ emote, id: Date.now() });
    setTimeout(() => setReceivedEmote(null), 2500);
  };

  // 1. MATCH SEARCHING / QUEUE STATE
  if (isSearching || !opponent || !gameState) {
    return (
      <main className="min-h-screen bg-ink text-chalk flex flex-col justify-center items-center p-4 select-none">
        <div className="w-full max-w-sm bg-surface border border-line rounded-[12px] p-6 text-center space-y-5">
          <div className="w-14 h-14 rounded-full border border-turf/40 bg-turf/10 flex items-center justify-center text-turf mx-auto">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-turf font-heading">
              {matchMode === "video" ? "Live Video Matchmaking" : "Game Only Matchmaking"}
            </span>
            <h2 className="font-heading font-black text-2xl uppercase tracking-tight text-chalk">
              Finding Opponent...
            </h2>
            <div className="font-heading font-black text-3xl tabular-nums text-chalk mt-1">
              {Math.floor(searchSeconds / 60).toString().padStart(2, "0")}:
              {(searchSeconds % 60).toString().padStart(2, "0")}
            </div>
            <p className="text-xs text-muted">
              Matching with players in the {matchMode === "video" ? "video" : "game-only"} queue.
            </p>
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-ball/10 border border-ball/30 rounded text-xs text-ball text-left space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert className="w-4 h-4" />
                <span>Notice</span>
              </div>
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                webrtcManager.cleanup();
                router.push("/");
              }}
            >
              Cancel &amp; Return to Lobby
            </Button>
          </div>
        </div>
        <Toast toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
      </main>
    );
  }

  // Active Innings & Roles
  const activeInnings = gameState.currentInnings === 1 ? gameState.innings1 : gameState.innings2!;
  const isUserBatting = activeInnings.battingPlayer === myPlayerId;
  const userRole = isUserBatting ? "batting" : "bowling";
  const opponentRole = isUserBatting ? "bowling" : "batting";
  const currentOverIndex = Math.floor(activeInnings.balls / 6);

  return (
    <main
      className={`min-h-screen bg-ink text-chalk flex flex-col justify-between max-w-4xl mx-auto p-2 sm:p-4 select-none ${
        screenShake ? "animate-shake" : ""
      }`}
    >
      {/* TOP HEADER: Navigation, Mode, Next Opponent Button */}
      <header className="w-full flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs pb-1">
          <button
            type="button"
            onClick={() => {
              webrtcManager.cleanup();
              router.push("/");
            }}
            className="flex items-center gap-1.5 text-muted hover:text-chalk py-1 px-2.5 rounded-full border border-line bg-surface"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Lobby</span>
          </button>

          {/* Role Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full border font-heading font-black tracking-wider text-xs uppercase ${
              isUserBatting ? "bg-turf/15 text-turf border-turf/40" : "bg-sky/15 text-sky border-sky/40"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isUserBatting ? "bg-turf" : "bg-sky"}`} />
            <span>{isUserBatting ? "YOU ARE BATTING" : "YOU ARE BOWLING"}</span>
          </div>

          {/* Quick "Next Opponent" button */}
          <button
            type="button"
            onClick={handleNextOpponent}
            className="flex items-center gap-1 text-xs font-semibold text-turf bg-surface hover:bg-surface-2 border border-turf/40 hover:border-turf px-2.5 py-1 rounded-full transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Next Opponent</span>
          </button>
        </div>

        {/* ScoreBar */}
        <ScoreBar state={gameState} userPlayerId={myPlayerId} />

        {/* BallStrip */}
        <BallStrip
          currentOver={activeInnings.currentOver}
          overIndex={currentOverIndex}
          maxOvers={gameState.format.maxOvers}
        />
      </header>

      {/* VIDEO TILES (Game first, video second) */}
      {matchMode === "video" && (
        <VideoTiles
          layout={layout}
          opponentGuestId={opponent.guestId}
          opponentName={opponent.name}
          isFirstMatchForGuest={isFirstMatchForGuest}
          onNextOpponent={handleNextOpponent}
          onBlockOpponent={handleBlockOpponent}
          onOpenReport={() => setIsReportOpen(true)}
          remoteVideoRefOut={remoteVideoRef}
        />
      )}

      {/* Floating Emote Display */}
      {receivedEmote && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-40 bg-surface border border-turf px-4 py-2 rounded-full shadow-2xl animate-bounce text-2xl">
          {receivedEmote.emote}
        </div>
      )}

      {/* PHASE 1: TOSS SCREEN */}
      {(gameState.phase === "toss_call" ||
        gameState.phase === "toss_pick" ||
        gameState.phase === "toss_decision") && (
        <div className="flex-1 flex items-center justify-center my-3 w-full">
          <TossScreen
            gameState={gameState}
            onCall={handleTossCall}
            onPick={handleTossPick}
            onDecision={handleTossDecision}
          />
        </div>
      )}

      {/* PHASE 2: INNINGS BREAK */}
      {gameState.phase === "innings_break" && gameState.innings2 && (
        <div className="flex-1 flex items-center justify-center my-3 w-full">
          <InningsBreakScreen
            gameState={gameState}
            userPlayerId={myPlayerId}
            onStartInnings2={handleStartInnings2}
          />
        </div>
      )}

      {/* PHASE 3: MATCH RESULT */}
      {gameState.phase === "match_ended" && (
        <div className="flex-1 flex items-center justify-center my-3 w-full">
          <ResultBanner
            state={gameState}
            userPlayerId={myPlayerId}
            onRematch={handleNextOpponent}
            onBackToLobby={() => {
              webrtcManager.cleanup();
              router.push("/");
            }}
          />
        </div>
      )}

      {/* PHASE 4: ACTIVE PLAYING ARENA */}
      {gameState.phase === "playing" && (
        <section
          className="w-full my-2 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 relative"
          aria-label="Multiplayer Duel Arena"
        >
          {/* Opponent Tile */}
          <div className="w-full sm:w-1/2 order-1 sm:order-2">
            <HandTile
              playerName={opponent.name}
              isUser={false}
              role={opponentRole}
              state={opponentTileState}
              pick={opponentTileState !== "empty" && opponentTileState !== "locked" ? opponentPick : null}
              showUserPreview={false}
              countdownNumber={revealCountdown}
              mirrored={true}
            />
          </div>

          {/* Centerpiece: Timer / Countdown / Outcome */}
          <div className="order-2 sm:order-none z-10 flex flex-col items-center justify-center my-1 sm:my-0 px-2 sm:px-3">
            {outcomeText ? (
              <div
                className={`px-4 py-2 rounded-[12px] border font-heading font-black text-2xl sm:text-3xl uppercase tracking-wider tabular-nums ${
                  isOutcomeWicket
                    ? "bg-ball text-white border-ball animate-shake shadow-lg"
                    : "bg-amber text-ink border-amber shadow-lg"
                }`}
              >
                {outcomeText}
              </div>
            ) : revealCountdown !== null ? (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber bg-surface-2 flex items-center justify-center">
                <span className="font-heading font-black text-3xl sm:text-4xl text-amber tabular-nums">
                  {revealCountdown}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <TimerRing
                  remainingSeconds={timerSeconds}
                  totalSeconds={8}
                  size={48}
                  strokeWidth={4}
                />
                <span className="text-[9px] font-heading uppercase text-muted tracking-wider">
                  Turn
                </span>
              </div>
            )}
          </div>

          {/* User Tile */}
          <div className="w-full sm:w-1/2 order-3 sm:order-1">
            <HandTile
              playerName="You"
              isUser={true}
              role={userRole}
              state={userTileState}
              pick={userPick}
              showUserPreview={true}
              countdownNumber={revealCountdown}
              mirrored={false}
            />
          </div>
        </section>
      )}

      {/* BOTTOM CONTROLS & NUMBERPAD */}
      <footer className="w-full pb-2 pt-1 flex flex-col gap-2">
        {/* Preset Emotes Strip */}
        <div className="flex items-center justify-center gap-2">
          {PRESET_EMOTES.map((emote) => (
            <button
              key={emote}
              onClick={() => handleSendEmote(emote)}
              className="px-2 py-1 bg-surface hover:bg-surface-2 border border-line rounded-full text-base transition-transform hover:scale-110 active:scale-95"
              title={`Send ${emote}`}
            >
              {emote}
            </button>
          ))}
        </div>

        {/* NumberPad (Keeps Phase 1 minimum 64px tap targets) */}
        <NumberPad
          selectedNumber={userPick}
          onSelectNumber={handleSelectBallNumber}
          onConfirmLock={() => handleConfirmBallPick()}
          isLocked={isUserLocked}
          disabled={userTileState !== "empty" || gameState.phase !== "playing"}
          tapToLock={true}
          onToggleTapToLock={() => {}}
        />
      </footer>

      {/* Report Modal */}
      {isReportOpen && (
        <ReportModal
          isOpen={isReportOpen}
          reporterGuestId={guestId}
          reportedGuestId={opponent.guestId}
          roomId={roomId || "unknown"}
          remoteVideoRef={remoteVideoRef}
          onClose={() => setIsReportOpen(false)}
          onReportSubmitted={(autoBanned) => {
            setIsReportOpen(false);
            if (autoBanned) {
              addToast("Opponent suspended for community safety.", "warning");
            }
            handleNextOpponent();
          }}
        />
      )}

      <Toast toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </main>
  );
}

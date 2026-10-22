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
  Bot,
  Users,
  Copy,
  Check as CheckIcon,
} from "lucide-react";
import { handDetector } from "@/lib/gesture/handDetector";
import type { HandGesture } from "@/lib/gesture/handClassifier";
import { GestureDetectionChip } from "@/components/GestureDetectionChip";
import { useWakeLock } from "@/lib/client/useWakeLock";
import { ReadyCheckModal } from "@/components/ReadyCheckModal";
import { getBotBallPick, getBotTossPick, getBotTossDecision } from "@/lib/game/bot";

const PRESET_EMOTES = ["👏", "🔥", "😅", "🏏"];

function PlayMatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startBotMatch } = useGameStore();

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

  // "Show to Camera" Gesture & Anti-Copying Turn Stage State
  const [localGestureSetting, setLocalGestureSetting] = useState<boolean>(true);
  const [opponentGestureSetting, setOpponentGestureSetting] = useState<boolean>(true);
  const [isOpponentCameraOn, setIsOpponentCameraOn] = useState<boolean>(true);
  const [turnStage, setTurnStage] = useState<"pick" | "countdown" | "reveal" | "idle">("idle");
  const [detectedGesture, setDetectedGesture] = useState<HandGesture | null>(null);
  const [gestureProgress, setGestureProgress] = useState<number>(0);
  const [gestureHint, setGestureHint] = useState<string | undefined>(undefined);
  const [isLowLight, setIsLowLight] = useState<boolean>(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const isLocalCameraOn = webrtcManager.isCameraEnabled;
  const isGestureModeActive =
    matchMode === "video" &&
    isLocalCameraOn &&
    isOpponentCameraOn &&
    localGestureSetting &&
    opponentGestureSetting;

  // Turn timer
  const [timerSeconds, setTimerSeconds] = useState<number>(8);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const latestDetectedGestureRef = useRef<HandGesture | null>(null);

  // Bridge & Series State
  const [isConvertedToFriend, setIsConvertedToFriend] = useState<boolean>(false);
  const [playAgainWaiting, setPlayAgainWaiting] = useState<boolean>(false);
  const [seriesScore, setSeriesScore] = useState<{ [guestId: string]: number }>({});
  const [gameNumber, setGameNumber] = useState<number>(1);
  const [convertedRoomCode, setConvertedRoomCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Phase 4: Mutual 5s Ready Check (REL-02)
  const [isReadyCheckOpen, setIsReadyCheckOpen] = useState<boolean>(false);
  const [readyCheckSeconds, setReadyCheckSeconds] = useState<number>(5);
  const [hasConfirmedReady, setHasConfirmedReady] = useState<boolean>(false);
  const [pendingMatchData, setPendingMatchData] = useState<any>(null);
  const readyIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Phase 4: Bot Warmup Practice in Queue
  const [isBotWarmup, setIsBotWarmup] = useState<boolean>(false);
  const [botGameState, setBotGameState] = useState<GameState | null>(null);
  const [botUserPick, setBotUserPick] = useState<number | null>(null);
  const [botOpponentPick, setBotOpponentPick] = useState<number | null>(null);
  const [botOutcomeText, setBotOutcomeText] = useState<string | null>(null);

  // Screen Wake Lock during active match
  const isMatchActive = !isSearching && !!gameState && gameState.phase !== "match_ended";
  useWakeLock(isMatchActive);

  // Tab Backgrounding & Visibility Recovery (REL-04)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handDetector.stop();
      } else {
        if (isGestureModeActive && turnStage === "pick" && !isUserLocked && localVideoRef.current) {
          handDetector.start(localVideoRef.current);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isGestureModeActive, turnStage, isUserLocked]);

  // Emotes & Report
  const [receivedEmote, setReceivedEmote] = useState<{ emote: string; id: number } | null>(null);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const lastSkipRef = useRef<number>(0);

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
    document.title = "1v1 Stranger Match | HandCricketOmegle";
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

    const activateMatchData = (data: any) => {
      setIsSearching(false);
      setIsReadyCheckOpen(false);
      setRoomId(data.roomId);
      setMatchMode(data.mode);
      setIsInitiator(data.isInitiator);
      setOpponent(data.opponent);

      const myRole: PlayerId = data.isInitiator ? "p1" : "p2";
      setMyPlayerId(myRole);

      const count = parseInt(localStorage.getItem("hca_match_count") || "0", 10);
      localStorage.setItem("hca_match_count", (count + 1).toString());

      addToast(`Matched with ${data.opponent.name}!`, "success");

      if (data.mode === "video") {
        const pref = localStorage.getItem("hca_show_to_camera") !== "false";
        setLocalGestureSetting(pref);
        webrtcManager.toggleGestureMode(pref);
        webrtcManager.startPeerSession(s, data.isInitiator);
      }

      const format: MatchFormat = { maxWickets: 2, maxOvers: 2 };
      const p1Name = data.isInitiator ? "You" : data.opponent.name;
      const p2Name = data.isInitiator ? data.opponent.name : "You";
      const initialGame = createInitialGameState(format, p1Name, p2Name, "p1");
      setGameState(initialGame);
    };

    s.on(
      "match:found",
      (data: {
        roomId: string;
        mode: "video" | "game_only";
        isInitiator: boolean;
        opponent: { guestId: string; name: string };
      }) => {
        // Exit bot warmup immediately if active
        setIsBotWarmup(false);
        setBotGameState(null);

        // Store pending match data and initiate 5s Mutual Ready Check (REL-02)
        setPendingMatchData(data);
        setOpponent(data.opponent);
        setMatchMode(data.mode);
        setIsReadyCheckOpen(true);
        setReadyCheckSeconds(5);
        setHasConfirmedReady(false);

        if (readyIntervalRef.current) clearInterval(readyIntervalRef.current);
        readyIntervalRef.current = setInterval(() => {
          setReadyCheckSeconds((prev) => {
            if (prev <= 1) {
              if (readyIntervalRef.current) clearInterval(readyIntervalRef.current);
              setHasConfirmedReady((confirmed) => {
                if (confirmed) {
                  activateMatchData(data);
                } else {
                  setIsReadyCheckOpen(false);
                  s.emit("match:ready_decline");
                  addToast("Ready check expired. Returning to queue...", "warning");
                  joinMatchQueue(s);
                }
                return confirmed;
              });
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    );

    s.on("match:ready_success", () => {
      if (readyIntervalRef.current) clearInterval(readyIntervalRef.current);
      setPendingMatchData((current: any) => {
        if (current) activateMatchData(current);
        return null;
      });
    });

    s.on("match:partner_ready", () => {
      addToast("Opponent confirmed ready!", "info");
    });

    s.on("match:ready_cancelled", (data: { message?: string }) => {
      if (readyIntervalRef.current) clearInterval(readyIntervalRef.current);
      setIsReadyCheckOpen(false);
      setPendingMatchData(null);
      addToast(data.message || "Opponent was not ready. Re-queuing...", "warning");
      resetMatchState();
      joinMatchQueue(s);
    });

    // WebRTC toggles from partner
    webrtcManager.onOpponentCameraToggle = (enabled) => {
      setIsOpponentCameraOn(enabled);
    };
    webrtcManager.onOpponentGestureToggle = (enabled) => {
      setOpponentGestureSetting(enabled);
    };

    s.on("match:ended", (data: { reason: string; message: string }) => {
      addToast(data.message || "Match ended.", "info");
      webrtcManager.cleanup();
      handDetector.destroy();
      // Reset match state and auto-requeue
      resetMatchState();
      joinMatchQueue(s);
    });

    // Bridge Events: Convert random room to friend duel
    s.on("match:play_again_waiting", () => {
      setPlayAgainWaiting(true);
      addToast("Waiting for opponent to accept rematch...", "info");
    });

    s.on(
      "match:converted_to_friend",
      (data: { roomId: string; code?: string; seriesScore: { [guestId: string]: number }; message: string }) => {
        setIsConvertedToFriend(true);
        setPlayAgainWaiting(false);
        if (data.code) setConvertedRoomCode(data.code);
        setSeriesScore(data.seriesScore);
        addToast(data.message, "success");
      }
    );

    s.on(
      "game:rematch_start",
      (data: { roomId: string; isInitiator: boolean; seriesScore: { [guestId: string]: number }; gameNumber?: number }) => {
        setPlayAgainWaiting(false);
        setUserPick(null);
        setIsUserLocked(false);
        setOpponentPick(null);
        setIsOpponentLocked(false);
        setUserTileState("empty");
        setOpponentTileState("empty");
        setOutcomeText(null);
        setTurnStage("idle");
        setDetectedGesture(null);
        setGestureProgress(0);
        setGestureHint(undefined);
        handDetector.resetForNextBall();

        if (data.gameNumber) setGameNumber(data.gameNumber);
        setIsInitiator(data.isInitiator);
        setMyPlayerId(data.isInitiator ? "p1" : "p2");

        const format: MatchFormat = { maxWickets: 2, maxOvers: 2 };
        const p1Name = data.isInitiator ? "You" : opponent?.name || "Player";
        const p2Name = data.isInitiator ? opponent?.name || "Player" : "You";
        const initialGame = createInitialGameState(format, p1Name, p2Name, "p1");
        setGameState(initialGame);
        setSeriesScore(data.seriesScore);
        addToast(`Game ${data.gameNumber || 2} started! Roles alternated.`, "success");
      }
    );

    s.on("game:series_update", (data: { seriesScore: { [guestId: string]: number } }) => {
      setSeriesScore(data.seriesScore);
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

    // 4. Server-enforced 5s reveal countdown (5-4-3-2-1)
    s.on("game:ball_countdown", (payload: { seconds: number }) => {
      setTurnStage("countdown");
      setRevealCountdown(payload.seconds);
    });

    // Server-enforced auto-pick on turn timeout
    s.on("game:auto_picked", (payload: { pick: number }) => {
      if (!isUserLocked) {
        setUserPick(payload.pick);
        setIsUserLocked(true);
        setUserTileState("locked");
        handDetector.stop();
        addToast(`Turn time expired! Server auto-picked ${payload.pick}.`, "warning");
      }
    });

    // 5. REVEAL: server broadcasts both picks together, remote video unblurs
    s.on("game:ball_reveal", (payload: { p1Pick: number; p2Pick: number; ballIndex: number }) => {
      stopTurnCountdown();
      setTurnStage("reveal");
      setRevealCountdown(null);

      // Determine picks from user's perspective
      const myPick = myPlayerId === "p1" ? payload.p1Pick : payload.p2Pick;
      const theirPick = myPlayerId === "p1" ? payload.p2Pick : payload.p1Pick;

      setUserPick(myPick);
      setOpponentPick(theirPick);

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

        if (nextState.phase === "match_ended") {
          const winnerGuestId =
            nextState.winner === "tie"
              ? undefined
              : nextState.winner === myPlayerId
              ? guestId
              : opponent?.guestId;
          s.emit("game:match_complete", { winnerGuestId });
        }

        // Advance to next ball after 1.5s
        setTimeout(() => {
          setUserPick(null);
          setIsUserLocked(false);
          setOpponentPick(null);
          setIsOpponentLocked(false);
          setUserTileState("empty");
          setOpponentTileState("empty");
          setOutcomeText(null);
          setDetectedGesture(null);
          latestDetectedGestureRef.current = null;
          setGestureProgress(0);
          setGestureHint(undefined);
          handDetector.resetForNextBall();

          if (nextState.phase !== "match_ended" && nextState.phase !== "innings_break") {
            startTurnCountdown();
            s.emit("game:ball_start", { ballIndex: nextState.innings1.balls });
          } else {
            setTurnStage("idle");
          }
        }, 1500);

        return nextState;
      });
    });

    s.on("game:emote", (payload: { emote: string }) => {
      setReceivedEmote({ emote: payload.emote, id: Date.now() });
      setTimeout(() => setReceivedEmote(null), 2500);
    });

    return () => {
      webrtcManager.cleanup();
      handDetector.destroy();
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
    handDetector.stop();
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
    setTurnStage("idle");
    setDetectedGesture(null);
    setGestureProgress(0);
    setGestureHint(undefined);
  };

  const startTurnCountdown = () => {
    stopTurnCountdown();
    setTurnStage("pick");
    setTimerSeconds(8);

    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev === 2) {
          // At 1s remaining: Lock whatever is showing right now ("jb 1 sec bacha ho toh jodikhra ho voh lock kre")
          const gestureToLock = latestDetectedGestureRef.current;
          if (gestureToLock && gestureToLock >= 1 && gestureToLock <= 6 && !isUserLocked) {
            handleConfirmBallPick(gestureToLock);
          }
        }
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

  // Active on-device hand gesture detection loop on camera feed
  useEffect(() => {
    if (turnStage !== "pick" || isUserLocked || !isGestureModeActive) {
      handDetector.stop();
      return;
    }

    let isMounted = true;

    const startDetectionWhenReady = () => {
      if (!isMounted) return;
      const video = localVideoRef.current;
      if (video && video.videoWidth > 0 && !video.paused) {
        handDetector.autoLock = false;
        handDetector.start(video);
      } else {
        setTimeout(startDetectionWhenReady, 150);
      }
    };

    handDetector.autoLock = false;
    handDetector.onDetectionChange = (res) => {
      if (!isMounted) return;
      setDetectedGesture(res.gesture);
      latestDetectedGestureRef.current = res.gesture;
      setGestureProgress(res.progress);
      setGestureHint(res.hint);
      setIsLowLight(!!res.isLowLight);
    };

    startDetectionWhenReady();

    return () => {
      isMounted = false;
      handDetector.stop();
    };
  }, [turnStage, isUserLocked, isGestureModeActive]);

  // Next Opponent (works in 1 tap at all times, with rapid skip throttling)
  const handleNextOpponent = () => {
    const now = Date.now();
    if (now - lastSkipRef.current < 750) {
      addToast("Please wait a moment before searching again.", "warning");
      return;
    }
    lastSkipRef.current = now;

    webrtcManager.cleanup();
    handDetector.destroy();
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

    // Persist block to server backend
    fetch("/api/match/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedGuestId: targetGuestId }),
    }).catch(() => {});

    addToast("Opponent blocked permanently.", "info");
    handleNextOpponent();
  };

  // Game Pick Handlers: NumberPad fallback always functions
  const handleSelectBallNumber = (num: number) => {
    if (isUserLocked || userTileState !== "empty") return;
    // Tapping number on NumberPad immediately locks in and acts as instant override/fallback
    handleConfirmBallPick(num);
  };

  const handleConfirmBallPick = (overrideNum?: number) => {
    const num = overrideNum || userPick;
    if (!num || isUserLocked || userTileState !== "empty") return;

    // Stop detector immediately on lock
    handDetector.stop();

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

  const handleStartBotWarmup = () => {
    setIsBotWarmup(true);
    const botFormat: MatchFormat = { maxWickets: 2, maxOvers: 2 };
    let initial = createInitialGameState(botFormat, "You", "WarmupBot", "p1");
    initial = submitTossCall(initial, "odd");
    initial = submitTossPick(initial, "p1", 3);
    initial = submitTossPick(initial, "p2", 2);
    initial = submitTossDecision(initial, "bat");
    setBotGameState(initial);
    setBotUserPick(null);
    setBotOpponentPick(null);
    setBotOutcomeText(null);
    addToast("Warm-up active! Matchmaking continues in background.", "info");
  };

  const handleBotWarmupBall = (num: number) => {
    if (!botGameState) return;
    setBotUserPick(num);
    const botPick = getBotBallPick(botGameState);
    setBotOpponentPick(botPick);

    const activeInnings = botGameState.currentInnings === 1 ? botGameState.innings1 : botGameState.innings2!;
    const isUserBatting = activeInnings.battingPlayer === "p1";
    const batterNum = isUserBatting ? num : botPick;
    const bowlerNum = isUserBatting ? botPick : num;

    const { nextState, outcome } = applyBall(botGameState, batterNum, bowlerNum);
    setBotOutcomeText(outcome.isWicket ? "OUT!" : `+${outcome.runsScored}`);
    setBotGameState(nextState);

    setTimeout(() => {
      setBotUserPick(null);
      setBotOpponentPick(null);
      setBotOutcomeText(null);
      if (nextState.phase === "innings_break" && nextState.innings2) {
        setBotGameState(startSecondInnings(nextState));
      } else if (nextState.phase === "match_ended") {
        handleStartBotWarmup();
      }
    }, 1200);
  };

  const handleConfirmReadyCheck = () => {
    setHasConfirmedReady(true);
    socket?.emit("match:ready_confirm");
    addToast("Ready confirmed! Waiting for opponent...", "info");
  };

  const handleDeclineReadyCheck = () => {
    if (readyIntervalRef.current) clearInterval(readyIntervalRef.current);
    setIsReadyCheckOpen(false);
    setPendingMatchData(null);
    socket?.emit("match:ready_decline");
    addToast("Match declined. Returning to queue...", "info");
    if (socket) joinMatchQueue(socket);
  };

  // 1. MATCH SEARCHING / QUEUE STATE (Unlimited Search & Bot Warmup)
  if (isSearching || !opponent || !gameState) {
    return (
      <main className="min-h-screen bg-ink text-chalk flex flex-col justify-center items-center p-4 select-none">
        {/* BOT WARM-UP ARENA (Queue stays alive in background) */}
        {isBotWarmup && botGameState ? (
          <div className="w-full max-w-sm bg-surface border-2 border-turf/50 rounded-[16px] p-5 flex flex-col items-center gap-4 shadow-2xl animate-scaleUp">
            {/* Live Queue Status Banner */}
            <div className="w-full flex items-center justify-between bg-turf/15 border border-turf/30 px-3 py-1.5 rounded-lg text-xs">
              <div className="flex items-center gap-2 text-turf font-bold">
                <span className="w-2 h-2 rounded-full bg-turf animate-ping" />
                <span>Searching: {Math.floor(searchSeconds / 60)}:{(searchSeconds % 60).toString().padStart(2, "0")}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBotWarmup(false);
                  setBotGameState(null);
                }}
                className="text-muted hover:text-chalk underline text-[11px]"
              >
                Exit Warmup
              </button>
            </div>

            <div className="w-full flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs text-muted uppercase font-bold">
                <Bot className="w-4 h-4 text-turf" />
                <span>Training Bot</span>
              </div>
              <div className="font-heading font-black text-lg text-turf tabular-nums">
                {botGameState.currentInnings === 1
                  ? `${botGameState.innings1.score}/${botGameState.innings1.wickets}`
                  : `${botGameState.innings2?.score}/${botGameState.innings2?.wickets}`}
              </div>
            </div>

            {/* Picks Display */}
            <div className="w-full grid grid-cols-2 gap-3 text-center">
              <div className="bg-surface-2 p-3.5 rounded-xl border border-line">
                <div className="text-[10px] text-muted uppercase font-heading">You</div>
                <div className="font-heading font-black text-4xl text-chalk mt-1 tabular-nums">
                  {botUserPick ?? "-"}
                </div>
              </div>
              <div className="bg-surface-2 p-3.5 rounded-xl border border-line">
                <div className="text-[10px] text-muted uppercase font-heading">Bot</div>
                <div className="font-heading font-black text-4xl text-chalk mt-1 tabular-nums">
                  {botOpponentPick ?? "-"}
                </div>
              </div>
            </div>

            {botOutcomeText ? (
              <div className="font-heading font-black text-2xl text-amber animate-bounce">
                {botOutcomeText}
              </div>
            ) : (
              <div className="text-xs text-muted">Tap a number to play ball</div>
            )}

            {/* Quick Practice NumberPad */}
            <div className="w-full">
              <NumberPad
                selectedNumber={botUserPick}
                onSelectNumber={handleBotWarmupBall}
                onConfirmLock={() => {}}
                isLocked={botUserPick !== null}
                disabled={botUserPick !== null}
                tapToLock={true}
                onToggleTapToLock={() => {}}
              />
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm bg-surface border border-line rounded-[16px] p-6 text-center space-y-5 shadow-2xl">
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
                Indefinite queue search. We will alert you immediately when a stranger arrives.
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

            {/* Warmup vs Bot while searching */}
            <div className="pt-2 flex flex-col gap-2">
              <Button
                variant="primary"
                fullWidth
                onClick={handleStartBotWarmup}
                className="bg-turf hover:bg-turf/90 text-ink font-heading font-black text-xs uppercase py-3 flex items-center justify-center gap-2"
              >
                <Bot className="w-4 h-4" />
                <span>Warm Up vs Bot While Waiting</span>
              </Button>

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
        )}

        {/* 5-Second Mutual Ready-Check Modal */}
        <ReadyCheckModal
          isOpen={isReadyCheckOpen}
          opponentName={opponent?.name || "Stranger"}
          countdownSeconds={readyCheckSeconds}
          hasConfirmed={hasConfirmedReady}
          onConfirm={handleConfirmReadyCheck}
          onDecline={handleDeclineReadyCheck}
          matchMode={matchMode}
        />

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
        {/* Private Duel Room Code Banner (Bridge) */}
        {isConvertedToFriend && (
          <div className="w-full bg-turf/15 border border-turf/40 rounded-[10px] px-3 py-1.5 flex items-center justify-between text-xs animate-fadeIn">
            <div className="flex items-center gap-1.5 font-bold text-turf">
              <Users className="w-4 h-4" />
              <span>
                Private Duel Active — Code:{" "}
                <span className="underline tracking-wider font-mono">
                  {convertedRoomCode || roomId?.slice(-6).toUpperCase()}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const code = convertedRoomCode || roomId?.slice(-6).toUpperCase() || "";
                if (typeof window !== "undefined") {
                  navigator.clipboard.writeText(`${window.location.origin}/room/${code}`);
                }
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
                addToast("Friend room link copied to clipboard!", "success");
              }}
              className="px-2 py-0.5 bg-turf/20 hover:bg-turf/30 text-turf border border-turf/40 rounded text-[11px] font-bold uppercase transition-colors flex items-center gap-1"
            >
              {copiedCode ? <CheckIcon className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCode ? "Copied" : "Copy Link"}</span>
            </button>
          </div>
        )}

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
      {matchMode === "video" && opponent && (
        <VideoTiles
          layout={layout}
          opponentGuestId={opponent.guestId}
          opponentName={opponent.name}
          isFirstMatchForGuest={isFirstMatchForGuest}
          onNextOpponent={handleNextOpponent}
          onBlockOpponent={handleBlockOpponent}
          onOpenReport={() => setIsReportOpen(true)}
          remoteVideoRefOut={remoteVideoRef}
          localVideoRefOut={localVideoRef}
          turnStage={turnStage}
          countdownSeconds={revealCountdown}
          isGestureModeActive={isGestureModeActive}
          detectedGesture={detectedGesture}
          gestureProgress={gestureProgress}
          isGestureLocked={isUserLocked}
          gestureHint={gestureHint}
          isLowLight={isLowLight}
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
            onRematch={isConvertedToFriend ? () => socket?.emit("friend:rematch") : handleNextOpponent}
            onBackToLobby={() => {
              webrtcManager.cleanup();
              router.push("/");
            }}
            isFriendRoom={isConvertedToFriend}
            seriesScoreText={
              isConvertedToFriend || Object.keys(seriesScore).length > 0
                ? `Series: You ${seriesScore[guestId] || 0} - ${
                    opponent?.guestId ? seriesScore[opponent.guestId] || 0 : 0
                  } ${opponent?.name || "Opponent"} (Game ${gameNumber})`
                : undefined
            }
            onPlayAgain={!isConvertedToFriend ? () => socket?.emit("match:play_again") : undefined}
            playAgainWaiting={playAgainWaiting}
          />
        </div>
      )}

      {/* PHASE 4: ACTIVE PLAYING ARENA */}
      {(gameState.phase === "innings_1" || gameState.phase === "innings_2") && (
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
        {/* Live Gesture Detection Chip (When camera-gesture mode is active) */}
        {isGestureModeActive &&
          (gameState.phase === "innings_1" || gameState.phase === "innings_2") &&
          turnStage === "pick" && (
            <div className="flex items-center justify-center my-0.5 animate-fadeIn">
              <GestureDetectionChip
                detectedGesture={detectedGesture}
                progress={gestureProgress}
                isLocked={isUserLocked}
                lockedNumber={userPick}
                hint={gestureHint}
                isLowLight={isLowLight}
              />
            </div>
          )}

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
          disabled={userTileState !== "empty" || (gameState.phase !== "innings_1" && gameState.phase !== "innings_2")}
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

export default function PlayMatchPage() {
  return (
    <React.Suspense
      fallback={
        <main className="min-h-screen bg-ink text-chalk flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 text-turf animate-spin" />
        </main>
      }
    >
      <PlayMatchContent />
    </React.Suspense>
  );
}

"use client";

import React, { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
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
import { AgeGateModal } from "@/components/AgeGateModal";
import { CameraCheckModal } from "@/components/CameraCheckModal";
import { FriendWaitingView } from "@/components/room/FriendWaitingView";
import { FriendLobbyView } from "@/components/room/FriendLobbyView";
import {
  GameState,
  MatchFormat,
  PlayerId,
  TossCall,
  TossDecision,
  WicketsOption,
  OversOption,
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
  Copy,
  Share2,
  Check,
  ArrowLeft,
  Users,
  Video,
  Gamepad2,
  Loader2,
  ShieldAlert,
  UserX,
  SlidersHorizontal,
  Clock,
  LogOut,
} from "lucide-react";
import { handDetector } from "@/lib/gesture/handDetector";
import type { HandGesture } from "@/lib/gesture/handClassifier";
import { GestureDetectionChip } from "@/components/GestureDetectionChip";
import { useWakeLock } from "@/lib/client/useWakeLock";

interface FriendRoomState {
  roomId: string;
  code: string;
  type: "friend";
  mode: "video" | "game_only";
  format: MatchFormat;
  status: "waiting" | "lobby" | "playing" | "ended";
  host: { guestId: string; name: string; ready: boolean; disconnected?: boolean };
  guest: { guestId: string; name: string; ready: boolean; disconnected?: boolean } | null;
  seriesScore: { [guestId: string]: number };
}

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const rawCode = resolvedParams.code;
  const roomCode = rawCode?.toUpperCase() || "";

  // Guest Identity
  const [guestId, setGuestId] = useState<string>("");
  const [guestName, setGuestName] = useState<string>("");

  // Room & Socket State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<FriendRoomState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Ready & Modals
  const [isReady, setIsReady] = useState<boolean>(false);
  const [showAgeGate, setShowAgeGate] = useState<boolean>(false);
  const [showCameraCheck, setShowCameraCheck] = useState<boolean>(false);
  const [hasCameraChecked, setHasCameraChecked] = useState<boolean>(false);

  // Game Core State
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<PlayerId>("p1");
  const [opponent, setOpponent] = useState<{ guestId: string; name: string } | null>(null);
  const [isInitiator, setIsInitiator] = useState<boolean>(false);

  // Play Turn State
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
    roomState?.mode === "video" &&
    isLocalCameraOn &&
    isOpponentCameraOn &&
    localGestureSetting &&
    opponentGestureSetting;

  // Timer & Emotes & Reporting
  const [timerSeconds, setTimerSeconds] = useState<number>(8);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [receivedEmote, setReceivedEmote] = useState<{ emote: string; id: number } | null>(null);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [layout, setLayout] = useState<"mobile-portrait" | "desktop" | "landscape">("mobile-portrait");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [rematchWaiting, setRematchWaiting] = useState<boolean>(false);

  // Screen Wake Lock during active friend match
  const isMatchActive = roomState?.status === "playing" && !!gameState && gameState.phase !== "match_ended";
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

  const addToast = (message: string, type: ToastMessage["type"] = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  useEffect(() => {
    document.title = `Room ${roomCode} | HandCricketOmegle`;
  }, [roomCode]);

  // Determine layout
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

  // Initialize Guest Info
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
  }, []);

  // Socket Connection & Join
  useEffect(() => {
    if (!guestId || !roomCode) return;

    const s = io({ transports: ["websocket", "polling"] });
    setSocket(s);

    s.on("connect", () => {
      setIsLoading(true);
      setErrorMessage(null);
      const isAgeVerified = localStorage.getItem("hca_age_verified") !== null;

      s.emit("friend:join", {
        code: roomCode,
        guestId,
        name: guestName,
        ageConfirmed: isAgeVerified,
      });
    });

    s.on("friend:state", (data: FriendRoomState) => {
      setIsLoading(false);
      setRoomState(data);

      const isHost = data.host.guestId === guestId;
      const myReady = isHost ? data.host.ready : data.guest?.ready || false;
      setIsReady(myReady);

      // Camera check if in video mode and not yet checked
      if (data.mode === "video" && !hasCameraChecked) {
        const isAgeVerified = localStorage.getItem("hca_age_verified") !== null;
        if (!isAgeVerified) {
          setShowAgeGate(true);
        } else {
          setShowCameraCheck(true);
        }
      }
    });

    s.on("friend:error", (err: { message: string }) => {
      setIsLoading(false);
      setErrorMessage(err.message);
      addToast(err.message, "error");
    });

    s.on("friend:kicked", (data: { message: string }) => {
      addToast(data.message, "warning");
      webrtcManager.cleanup();
      router.push("/");
    });

    s.on("friend:rematch_requested", () => {
      addToast("Friend requested a rematch! Tap Rematch to start.", "info");
    });

    s.on("friend:partner_left", (data: { message: string }) => {
      addToast(data.message, "warning");
      webrtcManager.cleanup();
    });

    // Match Start
    s.on(
      "match:found",
      (data: {
        roomId: string;
        mode: "video" | "game_only";
        format: MatchFormat;
        isInitiator: boolean;
        opponent: { guestId: string; name: string };
        seriesScore?: { [guestId: string]: number };
      }) => {
        setIsInitiator(data.isInitiator);
        setOpponent(data.opponent);
        const myRole: PlayerId = data.isInitiator ? "p1" : "p2";
        setMyPlayerId(myRole);

        addToast(`Match starting against ${data.opponent.name}!`, "success");

        if (data.mode === "video") {
          const pref = localStorage.getItem("hca_show_to_camera") !== "false";
          setLocalGestureSetting(pref);
          webrtcManager.toggleGestureMode(pref);
          webrtcManager.startPeerSession(s, data.isInitiator);
        }

        const p1Name = data.isInitiator ? "You" : data.opponent.name;
        const p2Name = data.isInitiator ? data.opponent.name : "You";
        const initialGame = createInitialGameState(data.format, p1Name, p2Name, "p1");
        setGameState(initialGame);
        setRematchWaiting(false);
      }
    );

    // WebRTC toggles from partner
    webrtcManager.onOpponentCameraToggle = (enabled) => {
      setIsOpponentCameraOn(enabled);
    };
    webrtcManager.onOpponentGestureToggle = (enabled) => {
      setOpponentGestureSetting(enabled);
    };

    s.on(
      "game:rematch_start",
      (data: { roomId: string; isInitiator: boolean; seriesScore: { [guestId: string]: number } }) => {
        setRematchWaiting(false);
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

        if (roomState) {
          const p1Name = data.isInitiator ? "You" : opponent?.name || "Friend";
          const p2Name = data.isInitiator ? opponent?.name || "Friend" : "You";
          const initialGame = createInitialGameState(roomState.format, p1Name, p2Name, "p1");
          setGameState(initialGame);
          addToast("Rematch started!", "success");
        }
      }
    );

    s.on("game:series_update", (data: { seriesScore: { [guestId: string]: number } }) => {
      setRoomState((prev) => (prev ? { ...prev, seriesScore: data.seriesScore } : prev));
    });

    s.on("match:partner_disconnected", (data: { message: string }) => {
      addToast(data.message, "warning");
    });

    // Game Events
    s.on("game:toss_call", (payload: { call: TossCall }) => {
      setGameState((prev) => (prev ? submitTossCall(prev, payload.call) : prev));
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

        // Check if match just ended
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
  }, [guestId, roomCode]);

  const startTurnCountdown = () => {
    stopTurnCountdown();
    setTurnStage("pick");
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
        handDetector.start(video);
      } else {
        setTimeout(startDetectionWhenReady, 150);
      }
    };

    handDetector.onDetectionChange = (res) => {
      if (!isMounted) return;
      setDetectedGesture(res.gesture);
      setGestureProgress(res.progress);
      setGestureHint(res.hint);
      setIsLowLight(!!res.isLowLight);

      if (res.locked && res.lockedNumber) {
        handleConfirmBallPick(res.lockedNumber);
      }
    };

    startDetectionWhenReady();

    return () => {
      isMounted = false;
      handDetector.stop();
    };
  }, [turnStage, isUserLocked, isGestureModeActive]);

  const handleCopyCode = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      addToast(`Room code ${roomCode} copied to clipboard!`, "success");
    }
  };

  const handleShareLink = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/room/${roomCode}` : "";
    if (navigator?.share) {
      try {
        await navigator.share({
          title: "Join HandCricketOmegle Room Duel",
          text: `Join my private HandCricketOmegle room with code ${roomCode}!`,
          url,
        });
        return;
      } catch (e) {}
    }

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      addToast("Room link copied to clipboard!", "success");
    }
  };

  const handleToggleReady = () => {
    const next = !isReady;
    setIsReady(next);
    socket?.emit("friend:ready", { ready: next });
  };

  const handleHostFormatUpdate = (format: MatchFormat) => {
    socket?.emit("friend:format:update", { format });
  };

  const handleHostKick = (targetGuestId: string) => {
    socket?.emit("friend:kick", { targetGuestId });
    addToast("Player kicked.", "info");
  };

  const handleRematchVote = () => {
    setRematchWaiting(true);
    socket?.emit("friend:rematch");
  };

  const handleChangeFormat = () => {
    socket?.emit("friend:change_format");
    setGameState(null);
  };

  const handleLeaveRoom = () => {
    socket?.emit("friend:leave");
    webrtcManager.cleanup();
    handDetector.destroy();
    router.push("/");
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

  const handleTossCall = (call: TossCall) => {
    setGameState((prev) => (prev ? submitTossCall(prev, call) : prev));
    socket?.emit("game:toss_call", { call });
  };

  const handleTossPick = (num: number) => {
    setGameState((prev) => (prev ? submitTossPick(prev, myPlayerId, num) : prev));
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

  const handleStartInnings2 = () => {
    setGameState((prev) => {
      if (!prev) return prev;
      const next = startSecondInnings(prev);
      startTurnCountdown();
      return next;
    });
  };

  // Series score string derivation
  const getSeriesScoreString = () => {
    if (!roomState) return "";
    const myScore = roomState.seriesScore[guestId] || 0;
    const oppGuestId = opponent?.guestId;
    const oppScore = oppGuestId ? roomState.seriesScore[oppGuestId] || 0 : 0;
    return `Series: You ${myScore} - ${oppScore} ${opponent?.name || "Friend"}`;
  };

  // 1. ERROR SCREEN
  if (errorMessage) {
    return (
      <main className="min-h-screen bg-ink text-chalk flex flex-col justify-center items-center p-4 select-none">
        <div className="w-full max-w-sm bg-surface border border-line rounded-[12px] p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full border border-ball/40 bg-ball/10 flex items-center justify-center text-ball mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="font-heading font-black text-2xl uppercase tracking-tight text-chalk">
            Cannot Join Room
          </h2>
          <p className="text-sm text-ball font-medium">{errorMessage}</p>
          <div className="pt-2">
            <Button variant="primary" fullWidth onClick={() => router.push("/")}>
              Back to Lobby
            </Button>
          </div>
        </div>
        <Toast toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
      </main>
    );
  }

  // 2. LOADING SCREEN
  if (isLoading || !roomState) {
    return (
      <main className="min-h-screen bg-ink text-chalk flex flex-col justify-center items-center p-4 select-none">
        <div className="w-full max-w-sm bg-surface border border-line rounded-[12px] p-6 text-center space-y-4">
          <Loader2 className="w-8 h-8 text-turf animate-spin mx-auto" />
          <h2 className="font-heading font-black text-xl uppercase tracking-tight text-chalk">
            Entering Room {roomCode}...
          </h2>
          <p className="text-xs text-muted">Connecting to secure duel room...</p>
        </div>
      </main>
    );
  }

  const isHost = roomState.host.guestId === guestId;

  // 3. WAITING SCREEN (Host alone in room)
  if (roomState.status === "waiting" && !roomState.guest) {
    return (
      <FriendWaitingView
        code={roomState.code}
        format={roomState.format}
        mode={roomState.mode}
        copiedCode={copiedCode}
        copiedLink={copiedLink}
        onCopyCode={handleCopyCode}
        onShareLink={handleShareLink}
        onLeaveRoom={handleLeaveRoom}
        toasts={toasts}
        onDismissToast={(id) => setToasts((t) => t.filter((x) => x.id !== id))}
      />
    );
  }

  // 4. PRE-GAME LOBBY INSIDE THE ROOM (Both players joined, waiting for both to be Ready)
  if (roomState.status === "lobby" || (roomState.status === "waiting" && roomState.guest && !gameState)) {
    const canChangeFormat = isHost && (!roomState.host.ready || !roomState.guest?.ready);

    return (
      <FriendLobbyView
        code={roomState.code}
        isHost={isHost}
        isReady={isReady}
        host={roomState.host}
        guest={roomState.guest}
        format={roomState.format}
        canChangeFormat={canChangeFormat}
        onCopyCode={handleCopyCode}
        onToggleReady={handleToggleReady}
        onLeaveRoom={handleLeaveRoom}
        onHostKick={handleHostKick}
        onFormatUpdate={handleHostFormatUpdate}
        toasts={toasts}
        onDismissToast={(id) => setToasts((t) => t.filter((x) => x.id !== id))}
      />
    );
  }

  // 5. LIVE GAME ARENA (Playing or Match Ended inside Friend Room)
  if (!gameState || !opponent) {
    return (
      <main className="min-h-screen bg-ink text-chalk flex flex-col justify-center items-center p-4 select-none">
        <Loader2 className="w-8 h-8 text-turf animate-spin" />
      </main>
    );
  }

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
      {/* TOP HEADER */}
      <header className="w-full flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs pb-1">
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="flex items-center gap-1.5 text-muted hover:text-chalk py-1 px-2.5 rounded-full border border-line bg-surface"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Leave</span>
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

          {/* Running Series Score Badge */}
          <div className="text-[11px] font-heading font-black tracking-wider text-turf bg-surface px-2.5 py-1 rounded-full border border-turf/40 uppercase">
            {getSeriesScoreString()}
          </div>
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

      {/* VIDEO TILES: In friend room, isFriendRoom=true skips auto-blur */}
      {roomState.mode === "video" && opponent && (
        <VideoTiles
          layout={layout}
          opponentGuestId={opponent.guestId}
          opponentName={opponent.name}
          isFirstMatchForGuest={false}
          isFriendRoom={true}
          onNextOpponent={() => {}}
          onBlockOpponent={() => {}}
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
            isFriendRoom={true}
            seriesScoreText={getSeriesScoreString()}
            onRematch={handleRematchVote}
            rematchWaiting={rematchWaiting}
            onChangeFormat={handleChangeFormat}
            onLeaveRoom={handleLeaveRoom}
            isHost={isHost}
          />
        </div>
      )}

      {/* PHASE 4: ACTIVE PLAYING ARENA */}
      {(gameState.phase === "innings_1" || gameState.phase === "innings_2") && (
        <section
          className="w-full my-2 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 relative"
          aria-label="Private Friend Duel Arena"
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

      {/* BOTTOM NUMBERPAD & EMOTES */}
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

        <div className="flex items-center justify-center gap-2">
          {["👏", "🔥", "😅", "🏏"].map((emote) => (
            <button
              key={emote}
              onClick={() => socket?.emit("game:emote", { emote })}
              className="px-2 py-1 bg-surface hover:bg-surface-2 border border-line rounded-full text-base transition-transform hover:scale-110 active:scale-95"
            >
              {emote}
            </button>
          ))}
        </div>

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

      {/* Safety Modals for Video Mode */}
      <AgeGateModal
        isOpen={showAgeGate}
        onConfirm={() => {
          setShowAgeGate(false);
          setShowCameraCheck(true);
        }}
        onDecline={() => {
          setShowAgeGate(false);
          router.push("/");
        }}
      />

      <CameraCheckModal
        isOpen={showCameraCheck}
        initialMode={roomState.mode}
        onReady={() => {
          setShowCameraCheck(false);
          setHasCameraChecked(true);
        }}
        onCancel={() => {
          setShowCameraCheck(false);
          router.push("/");
        }}
      />

      {isReportOpen && (
        <ReportModal
          isOpen={isReportOpen}
          reporterGuestId={guestId}
          reportedGuestId={opponent.guestId}
          roomId={roomState.roomId}
          remoteVideoRef={remoteVideoRef}
          onClose={() => setIsReportOpen(false)}
          onReportSubmitted={() => {
            setIsReportOpen(false);
            handleLeaveRoom();
          }}
        />
      )}

      <Toast toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </main>
  );
}

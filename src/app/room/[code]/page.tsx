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
import { getClientAbly } from "@/lib/client/ablyClient";

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
  const rawCode = resolvedParams.code?.trim().toUpperCase() || "";
  const roomCode = rawCode.startsWith("HC-") ? rawCode.slice(3) : rawCode.startsWith("HC") && rawCode.length > 6 ? rawCode.slice(2) : rawCode;

  // Guest Identity
  const [guestId, setGuestId] = useState<string>("");
  const [guestName, setGuestName] = useState<string>("");

  // Room & Socket State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<FriendRoomState | null>(null);
  const roomStateRef = useRef<FriendRoomState | null>(null);

  const updateRoomState = (
    updater: FriendRoomState | null | ((prev: FriendRoomState | null) => FriendRoomState | null)
  ) => {
    setRoomState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      roomStateRef.current = next;
      return next;
    });
  };
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
  const myPlayerIdRef = useRef<PlayerId>("p1");

  const updateMyPlayerId = (role: PlayerId) => {
    myPlayerIdRef.current = role;
    setMyPlayerId(role);
  };
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
  const latestDetectedGestureRef = useRef<HandGesture | null>(null);
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

  // Initialize Guest Info with server session sync & localStorage fallback
  useEffect(() => {
    // Check if this tab is the room creator
    const isCreatorTab =
      typeof window !== "undefined" &&
      sessionStorage.getItem("hca_created_room") === roomCode;

    // Check if this browser created this room recently in another tab
    const isOtherTabOfCreator =
      !isCreatorTab &&
      typeof window !== "undefined" &&
      localStorage.getItem("hca_last_created_room") === roomCode;

    const tabGid =
      typeof window !== "undefined" ? sessionStorage.getItem("hca_tab_guest_id") : null;
    const tabGName =
      typeof window !== "undefined" ? sessionStorage.getItem("hca_tab_guest_name") : null;

    if (tabGid) {
      setGuestId(tabGid);
      setGuestName(tabGName || `Player ${tabGid.slice(-4).toUpperCase()}`);
      return;
    }

    if (isCreatorTab) {
      const storedId = localStorage.getItem("hca_guest_id");
      const storedName = localStorage.getItem("hca_guest_name");
      const finalId =
        storedId || `g_host_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const finalName = storedName || `Host ${finalId.slice(-4).toUpperCase()}`;
      sessionStorage.setItem("hca_tab_guest_id", finalId);
      sessionStorage.setItem("hca_tab_guest_name", finalName);
      setGuestId(finalId);
      setGuestName(finalName);
      return;
    }

    if (isOtherTabOfCreator) {
      // Distinct guest ID so 2 tabs on the same computer can duel as host and guest!
      const finalId = `g_friend_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const finalName = `Friend ${finalId.slice(-4).toUpperCase()}`;
      sessionStorage.setItem("hca_tab_guest_id", finalId);
      sessionStorage.setItem("hca_tab_guest_name", finalName);
      setGuestId(finalId);
      setGuestName(finalName);
      return;
    }

    let gid: string | null = localStorage.getItem("hca_guest_id");
    let gName: string | null = localStorage.getItem("hca_guest_name");

    fetch("/api/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.guestId && typeof data.guestId === "string") {
          gid = data.guestId;
          localStorage.setItem("hca_guest_id", data.guestId);
          sessionStorage.setItem("hca_tab_guest_id", data.guestId);
          setGuestId(data.guestId);
        }
        if (data?.guestName && typeof data.guestName === "string") {
          gName = data.guestName;
          localStorage.setItem("hca_guest_name", data.guestName);
          sessionStorage.setItem("hca_tab_guest_name", data.guestName);
          setGuestName(data.guestName);
        }
      })
      .catch(() => {})
      .finally(() => {
        const finalId = gid || `g_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        localStorage.setItem("hca_guest_id", finalId);
        sessionStorage.setItem("hca_tab_guest_id", finalId);
        setGuestId(finalId);

        const finalName = gName || `Guest ${finalId.slice(-4).toUpperCase()}`;
        localStorage.setItem("hca_guest_name", finalName);
        sessionStorage.setItem("hca_tab_guest_name", finalName);
        setGuestName(finalName);
      });
  }, [roomCode]);

  // REST & Ably Synchronizer for Serverless Deployments (Vercel)
  useEffect(() => {
    if (!guestId || !roomCode) return;

    let isSubscribed = true;
    let roomChannel: any = null;

    // 1. Initial join via REST API
    const joinServerlessRoom = async () => {
      try {
        const isAgeVerified =
          typeof window !== "undefined"
            ? localStorage.getItem("hca_age_verified") !== "false"
            : true;

        const res = await fetch(`/api/room/${roomCode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "join",
            guestId,
            name: guestName,
            ageConfirmed: isAgeVerified,
          }),
        });

        const data = await res.json();
        if (!isSubscribed) return;

        if (res.ok && data.room) {
          setIsLoading(false);
          updateRoomState(data.room);
          const isHost = data.room.host.guestId === guestId;
          const myReady = isHost ? data.room.host.ready : data.room.guest?.ready || false;
          setIsReady(myReady);
        } else if (res.status === 404) {
          setIsLoading(false);
          setErrorMessage(data.error || "Room not found or expired.");
        }
      } catch (err) {
        console.warn("[Friend Room] Serverless join check:", err);
      }
    };

    joinServerlessRoom();

    // 2. Realtime sync via Ably channel `room:${roomCode}`
    try {
      const ably = getClientAbly();
      if (ably?.channels) {
        roomChannel = ably.channels.get(`room:${roomCode}`);

        roomChannel.subscribe("friend:state", (msg: any) => {
          if (!isSubscribed || !msg.data) return;
          const data: FriendRoomState = msg.data;
          setIsLoading(false);
          updateRoomState(data);

          const isHost = data.host.guestId === guestId;
          const myReady = isHost ? data.host.ready : data.guest?.ready || false;
          setIsReady(myReady);
        });

        roomChannel.subscribe("friend:kicked", (msg: any) => {
          if (!isSubscribed || !msg.data) return;
          if (msg.data.targetGuestId === guestId) {
            addToast(msg.data.message || "You were removed from the room.", "warning");
            webrtcManager.cleanup();
            router.push("/");
          }
        });

        roomChannel.subscribe("match:found", (msg: any) => {
          if (!isSubscribed || !msg.data) return;
          const data = msg.data;
          const isInitiator = data.hostId === guestId;
          setIsInitiator(isInitiator);
          const opp = isInitiator ? data.p2 : data.p1;
          setOpponent(opp);
          const myRole: PlayerId = isInitiator ? "p1" : "p2";
          updateMyPlayerId(myRole);

          addToast(`Match starting against ${opp.name}!`, "success");

          const p1Name = isInitiator ? "You" : opp.name;
          const p2Name = isInitiator ? opp.name : "You";
          const initialGame = createInitialGameState(data.format, p1Name, p2Name, "p1");
          setGameState(initialGame);
          setRematchWaiting(false);
        });
      }
    } catch (e) {
      console.warn("[Ably Room Sync] error:", e);
    }

    // 3. Fallback polling for status when in lobby (every 3s)
    const pollInterval = setInterval(async () => {
      if (!isSubscribed) return;
      try {
        const res = await fetch(`/api/room/${roomCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.room && isSubscribed) {
            updateRoomState(data.room);
            const isHost = data.room.host.guestId === guestId;
            setIsReady(isHost ? data.room.host.ready : data.room.guest?.ready || false);
          }
        }
      } catch {}
    }, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
      if (roomChannel) {
        try {
          roomChannel.unsubscribe();
        } catch {}
      }
    };
  }, [guestId, roomCode, guestName, router]);

  // Socket Connection & Join (Node.js runtime server fallback)
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
      updateRoomState(data);

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
      // Only set error if we don't already have valid roomState from REST/Ably/previous state
      if (!roomStateRef.current) {
        setIsLoading(false);
        setErrorMessage(err.message);
        addToast(err.message, "error");
      }
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
        updateMyPlayerId(myRole);

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

        if (roomStateRef.current) {
          const p1Name = data.isInitiator ? "You" : opponent?.name || "Friend";
          const p2Name = data.isInitiator ? opponent?.name || "Friend" : "You";
          const initialGame = createInitialGameState(roomStateRef.current.format, p1Name, p2Name, "p1");
          setGameState(initialGame);
          addToast("Rematch started!", "success");
        }
      }
    );

    s.on("game:series_update", (data: { seriesScore: { [guestId: string]: number } }) => {
      updateRoomState((prev) => (prev ? { ...prev, seriesScore: data.seriesScore } : prev));
    });

    s.on("match:partner_disconnected", (data: { message: string }) => {
      addToast(data.message, "warning");
    });

    // Game Events
    s.on("game:toss_call", (payload: { call: TossCall }) => {
      setGameState((prev) => (prev ? submitTossCall(prev, payload.call) : prev));
    });

    s.on("game:toss_pick", (payload: { pick: number; pickerId?: PlayerId }) => {
      setGameState((prev) => {
        if (!prev) return prev;
        const picker: PlayerId =
          payload.pickerId || (myPlayerIdRef.current === "p1" ? "p2" : "p1");
        return submitTossPick(prev, picker, payload.pick);
      });
    });

    s.on("game:toss_decision", (payload: { role: TossDecision; winner?: PlayerId }) => {
      setGameState((prev) => {
        if (!prev) return prev;
        if (prev.phase !== "toss_decision") {
          console.warn("[toss_decision] Received toss_decision while in phase:", prev.phase);
          const winner: PlayerId =
            payload.winner || prev.tossWinner || (myPlayerIdRef.current === "p1" ? "p2" : "p1");
          const stateWithWinner = { ...prev, tossWinner: winner, phase: "toss_decision" as const };
          const next = submitTossDecision(stateWithWinner, payload.role);
          startTurnCountdown();
          return next;
        }
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

      const currentRole = myPlayerIdRef.current;
      const myPick = currentRole === "p1" ? payload.p1Pick : payload.p2Pick;
      const theirPick = currentRole === "p1" ? payload.p2Pick : payload.p1Pick;

      setUserPick(myPick);
      setOpponentPick(theirPick);

      setGameState((prev) => {
        if (!prev) return prev;
        const activeInnings = prev.currentInnings === 1 ? prev.innings1 : prev.innings2!;
        const isUserBatting = activeInnings.battingPlayer === currentRole;

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
              : nextState.winner === currentRole
              ? guestId
              : opponent?.guestId;
          s.emit("game:match_complete", { winnerGuestId });
          webrtcManager.stopLocalStream();
          handDetector.stop();
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
  }, [guestId, roomCode]);

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

  const displayCode = roomCode.startsWith("HC-") ? roomCode : `HC-${roomCode}`;

  const handleCopyCode = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(displayCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      addToast(`Room code ${displayCode} copied to clipboard!`, "success");
    }
  };

  const handleShareLink = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/room/${roomCode}` : "";
    if (navigator?.share) {
      try {
        await navigator.share({
          title: "Join HandCricketOmegle Room Duel",
          text: `Join my private HandCricketOmegle room with code ${displayCode}!`,
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
    socket?.emit("friend:ready", { ready: next, guestId });
    fetch(`/api/room/${roomCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ready", ready: next, guestId }),
    }).catch(() => {});
  };

  const handleHostFormatUpdate = (format: MatchFormat) => {
    socket?.emit("friend:format:update", { format });
    fetch(`/api/room/${roomCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "format", format, guestId }),
    }).catch(() => {});
  };

  const handleHostKick = (targetGuestId: string) => {
    socket?.emit("friend:kick", { targetGuestId });
    fetch(`/api/room/${roomCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "kick", targetGuestId, guestId }),
    }).catch(() => {});
    addToast("Player kicked.", "info");
  };

  const handleRematchVote = () => {
    setRematchWaiting(true);
    socket?.emit("friend:rematch");
    fetch(`/api/room/${roomCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rematch", guestId }),
    }).catch(() => {});
  };

  const handleChangeFormat = () => {
    socket?.emit("friend:change_format");
    setGameState(null);
  };

  const handleLeaveRoom = () => {
    socket?.emit("friend:leave");
    fetch(`/api/room/${roomCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "leave", guestId }),
    }).catch(() => {});
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
    const currentRole = myPlayerIdRef.current;
    setGameState((prev) => (prev ? submitTossPick(prev, currentRole, num) : prev));
    socket?.emit("game:toss_pick", { pick: num, pickerId: currentRole });
  };

  const handleTossDecision = (role: TossDecision) => {
    const currentRole = myPlayerIdRef.current;
    setGameState((prev) => {
      if (!prev) return prev;
      const next = submitTossDecision(prev, role);
      startTurnCountdown();
      return next;
    });
    socket?.emit("game:toss_decision", { role, winner: currentRole });
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
            userPlayerId={myPlayerId}
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

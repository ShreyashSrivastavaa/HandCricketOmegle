import { create } from "zustand";
import type { GameState, MatchFormat, PlayerId, BallOutcome, MatchMode } from "../game/types";
import {
  DEFAULT_SUDDEN_DEATH_FORMAT,
  CLASSIC_FORMAT,
  DEFAULT_ENDLESS_FORMAT,
  ENDLESS_PRO_FORMAT,
  getRandomPick,
} from "../game/engine";
import { getClientAbly } from "../client/ablyClient";
import {
  playBatHitSound,
  playBoundarySound,
  playWicketSound,
  playClickSound,
  triggerHaptic,
} from "../client/audio";
import type { HandTileState } from "@/components/HandTile";
import type { FloatingReaction } from "@/components/EmojiReactions";
import { webrtcManager } from "../webrtc/webrtcManager";

export type AppScreen = "landing" | "searching" | "toss" | "match" | "innings_break" | "result";

interface LiveMatchStore {
  // Navigation screen
  screen: AppScreen;
  setScreen: (screen: AppScreen) => void;

  // Guest Identity
  guestId: string;
  guestName: string;
  setGuestName: (name: string) => void;

  // Match Config
  mode: MatchMode;
  setMode: (mode: MatchMode) => void;
  endlessVariant: "standard" | "pro";
  setEndlessVariant: (variant: "standard" | "pro") => void;
  personalBest: number;
  setPersonalBest: (pb: number) => void;

  // Video & Gesture Controls
  isVideoCallActive: boolean;
  setIsVideoCallActive: (active: boolean) => void;
  isGestureMode: boolean;
  setIsGestureMode: (enabled: boolean) => void;
  isPaused: boolean;
  togglePause: () => void;

  // Active Match Info
  matchId: string | null;
  userRole: PlayerId;
  opponentName: string;
  isBotMatch: boolean;
  gameState: GameState | null;

  // Realtime & Presence
  opponentPresent: boolean;
  opponentDisconnectSeconds: number | null; // 15s forfeit grace countdown

  // In-Game Turn & Reveal
  userPick: number | null;
  isUserLocked: boolean;
  opponentPick: number | null;
  opponentTileState: HandTileState;
  userTileState: HandTileState;
  revealCountdown: number | null;
  outcomeText: string | null;
  isOutcomeWicket: boolean;
  screenShake: boolean;
  currentBallIndex: number;

  // 10s Ball Timer
  timerSeconds: number;
  isTimerActive: boolean;

  // Reactions
  activeReactions: FloatingReaction[];

  // Modals
  isRulesOpen: boolean;
  setIsRulesOpen: (open: boolean) => void;
  isReportOpen: boolean;
  setIsReportOpen: (open: boolean) => void;

  // Actions
  initGuestSession: () => Promise<void>;
  startMatchmaking: (playVsBot?: boolean) => Promise<void>;
  cancelMatchmaking: () => Promise<void>;
  submitTossCall: (call: "odd" | "even") => Promise<void>;
  submitTossPick: (pick: number) => Promise<void>;
  submitTossDecision: (decision: "bat" | "bowl") => Promise<void>;
  submitBallPick: (pick: number) => Promise<void>;
  startSecondInnings: () => Promise<void>;
  sendReaction: (emoji: string) => Promise<void>;
  forfeitCurrentMatch: (reason?: string) => Promise<void>;
  resetToLanding: () => void;
}

export const useLiveMatchStore = create<LiveMatchStore>((set, get) => {
  let ballTimerInterval: NodeJS.Timeout | null = null;
  let disconnectTimerInterval: NodeJS.Timeout | null = null;
  let queuePollInterval: NodeJS.Timeout | null = null;
  let matchSyncInterval: NodeJS.Timeout | null = null;
  let activeAblyChannel: any = null;
  let userPrivateChannel: any = null;
  let guestSessionPromise: Promise<void> | null = null;

  const clearQueuePoll = () => {
    if (queuePollInterval) {
      clearInterval(queuePollInterval);
      queuePollInterval = null;
    }
  };

  const clearMatchSync = () => {
    if (matchSyncInterval) {
      clearInterval(matchSyncInterval);
      matchSyncInterval = null;
    }
  };

  const clearBallTimer = () => {
    if (ballTimerInterval) {
      clearInterval(ballTimerInterval);
      ballTimerInterval = null;
    }
  };

  const clearDisconnectTimer = () => {
    if (disconnectTimerInterval) {
      clearInterval(disconnectTimerInterval);
      disconnectTimerInterval = null;
    }
    set({ opponentDisconnectSeconds: null });
  };

  const startBallTimer = () => {
    clearBallTimer();
    set({ timerSeconds: 10, isTimerActive: true });

    ballTimerInterval = setInterval(() => {
      const state = get();
      if (!state.isTimerActive || state.isUserLocked || state.screen !== "match") {
        return;
      }

      if (state.timerSeconds <= 1) {
        clearBallTimer();
        set({ timerSeconds: 0, isTimerActive: false });
        // Timeout auto-pick!
        const autoPick = getRandomPick();
        get().submitBallPick(autoPick);
      } else {
        set({ timerSeconds: state.timerSeconds - 1 });
      }
    }, 1000);
  };

  const startDisconnectGraceTimer = () => {
    clearDisconnectTimer();
    set({ opponentDisconnectSeconds: 15 });

    disconnectTimerInterval = setInterval(() => {
      const state = get();
      if (state.opponentDisconnectSeconds === null || state.screen !== "match") {
        clearDisconnectTimer();
        return;
      }

      if (state.opponentDisconnectSeconds <= 1) {
        clearDisconnectTimer();
        // 15 seconds elapsed: opponent forfeits
        get().forfeitCurrentMatch("Opponent lost connection");
      } else {
        set({ opponentDisconnectSeconds: state.opponentDisconnectSeconds - 1 });
      }
    }, 1000);
  };

  let isResolvingBall = false;

  const handleBallResolution = (data: {
    p1Pick: number;
    p2Pick: number;
    outcome: BallOutcome;
    gameState: GameState;
    ballIndex: number;
  }) => {
    const { p1Pick, p2Pick, outcome, gameState, ballIndex } = data;
    if (isResolvingBall) return;
    isResolvingBall = true;

    const state = get();
    const isUserP1 = state.userRole === "p1";
    const userPickVal = isUserP1 ? p1Pick : p2Pick;
    const opponentPickVal = isUserP1 ? p2Pick : p1Pick;

    clearBallTimer();

    // 3.. 2.. 1.. Reveal countdown animation
    set({
      revealCountdown: 3,
      opponentTileState: "revealing",
      userTileState: "revealing",
    });

    setTimeout(() => set({ revealCountdown: 2 }), 350);
    setTimeout(() => set({ revealCountdown: 1 }), 700);

    setTimeout(() => {
      // Play sound & haptic based on outcome
      if (outcome.isWicket) {
        playWicketSound();
        set({ screenShake: true });
        setTimeout(() => set({ screenShake: false }), 450);
      } else if (outcome.runsScored === 4 || outcome.runsScored === 6) {
        playBoundarySound(outcome.runsScored);
      } else {
        playBatHitSound();
      }

      const isWicket = outcome.isWicket;
      const userTileState: HandTileState = isWicket ? "out" : outcome.runsScored > 0 ? "scored" : "revealed";
      const opponentTileState: HandTileState = isWicket ? "out" : outcome.runsScored > 0 ? "scored" : "revealed";

      set({
        revealCountdown: null,
        opponentPick: opponentPickVal,
        userPick: userPickVal,
        opponentTileState,
        userTileState,
        outcomeText: isWicket ? "OUT!" : outcome.runsScored === 6 ? "SIX!" : outcome.runsScored === 4 ? "FOUR!" : `+${outcome.runsScored} RUNS`,
        isOutcomeWicket: isWicket,
        gameState,
        currentBallIndex: ballIndex + 1,
      });

      // After 2.0s outcome banner, prepare for next ball or transition screen
      setTimeout(() => {
        isResolvingBall = false;
        const latestState = get().gameState;
        if (!latestState) return;

        // Track Personal Best and leaderboard in Endless mode
        if (latestState.format.isEndless) {
          const activeInnings =
            latestState.currentInnings === 1 ? latestState.innings1 : latestState.innings2;
          const isUserBatting = activeInnings?.battingPlayer === get().userRole;
          if (isUserBatting && activeInnings) {
            const userScore = activeInnings.score;
            const pb = get().personalBest;
            if (userScore > pb) {
              get().setPersonalBest(userScore);
              fetch("/api/leaderboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  guestId: get().guestId,
                  guestName: get().guestName,
                  score: userScore,
                  balls: activeInnings.balls,
                  strikeStreak: activeInnings.strikeStreak,
                }),
              }).catch(() => {});
            }
          }
        }

        if (latestState.phase === "match_ended") {
          set({ screen: "result", outcomeText: null });
        } else if (latestState.phase === "innings_break") {
          set({ screen: "innings_break", outcomeText: null });
        } else if (latestState.phase === "super_over") {
          set({
            userPick: null,
            isUserLocked: false,
            opponentPick: null,
            opponentTileState: "empty",
            userTileState: "empty",
            outcomeText: "SUPER OVER!",
            isOutcomeWicket: false,
          });
          startBallTimer();
        } else {
          // Next ball
          set({
            userPick: null,
            isUserLocked: false,
            opponentPick: null,
            opponentTileState: "empty",
            userTileState: "empty",
            outcomeText: null,
            isOutcomeWicket: false,
          });
          startBallTimer();
        }
      }, 2000);
    }, 1050);
  };

  const setupMatchChannel = (matchId: string) => {
    try {
      const ably = getClientAbly();
      if (activeAblyChannel) {
        try {
          activeAblyChannel.unsubscribe();
          activeAblyChannel.presence.leave().catch(() => {});
        } catch {}
      }

      const channel = ably.channels.get(`match:${matchId}`);
      activeAblyChannel = channel;

      // Enter presence
      const { guestId, guestName, isBotMatch } = get();
      channel.presence.enter({ guestId, guestName }).catch(() => {});

      // Track opponent presence if not bot
      if (!isBotMatch) {
        channel.presence.subscribe("leave", (member: any) => {
          if (member.clientId !== guestId) {
            set({ opponentPresent: false });
            startDisconnectGraceTimer();
          }
        });

        channel.presence.subscribe("enter", (member: any) => {
          if (member.clientId !== guestId) {
            set({ opponentPresent: true });
            clearDisconnectTimer();
          }
        });

        // Set up WebRTC peer session over Ably for multiplayer video
        const isInitiator = get().userRole === "p1";
        webrtcManager.startAblyPeerSession(channel, guestId, isInitiator).catch((err) => {
          console.warn("[LiveMatchStore] Failed to start Ably WebRTC peer session:", err);
        });
      }

      // Ball resolved event
      channel.subscribe("ball-resolved", (msg: any) => {
        handleBallResolution(msg.data);
      });

      // Player locked event
      channel.subscribe("player-locked", (msg: any) => {
        const { lockedGuestId } = msg.data;
        if (lockedGuestId !== get().guestId) {
          set({ opponentTileState: "locked" });
        }
      });

      // Toss events
      channel.subscribe("toss-call-submitted", (msg: any) => {
        set({ gameState: msg.data.gameState });
      });

      channel.subscribe("toss-pick-submitted", (msg: any) => {
        const { gameState } = msg.data;
        set({ gameState });
      });

      channel.subscribe("toss-decision-submitted", (msg: any) => {
        const { gameState } = msg.data;
        set({ gameState, screen: "match" });
        startBallTimer();
      });

      // Second innings started
      channel.subscribe("second-innings-started", (msg: any) => {
        set({
          gameState: msg.data.gameState,
          screen: "match",
          userPick: null,
          isUserLocked: false,
          opponentPick: null,
          opponentTileState: "empty",
          userTileState: "empty",
          outcomeText: null,
        });
        startBallTimer();
      });

      // Match forfeit
      channel.subscribe("match-forfeited", (msg: any) => {
        clearBallTimer();
        clearDisconnectTimer();
        set({
          gameState: msg.data.gameState,
          screen: "result",
        });
      });

      // Reaction emoji
      channel.subscribe("reaction", (msg: any) => {
        const { emoji, senderGuestId } = msg.data;
        const isSelf = senderGuestId === get().guestId;
        const newReaction: FloatingReaction = {
          id: `react_${Date.now()}_${Math.random()}`,
          emoji,
          isSelf,
          x: Math.floor(Math.random() * 60) + 20,
        };

        set((s) => ({
          activeReactions: [...s.activeReactions.slice(-8), newReaction],
        }));

        setTimeout(() => {
          set((s) => ({
            activeReactions: s.activeReactions.filter((r) => r.id !== newReaction.id),
          }));
        }, 2600);
      });

      // Set up background sync interval for live multiplayer matches
      clearMatchSync();
      if (!isBotMatch) {
        matchSyncInterval = setInterval(async () => {
          const currentScreen = get().screen;
          if (currentScreen !== "toss" && currentScreen !== "match" && currentScreen !== "innings_break") {
            clearMatchSync();
            return;
          }
          try {
            const res = await fetch(`/api/match/${matchId}/move`);
            if (res.ok) {
              const data = await res.json();
              if (data.gameState) {
                const localState = get().gameState;
                if (currentScreen === "toss") {
                  if (
                    data.gameState.tossCall !== localState?.tossCall ||
                    data.gameState.phase !== localState?.phase ||
                    JSON.stringify(data.gameState.tossPicks) !== JSON.stringify(localState?.tossPicks)
                  ) {
                    set({ gameState: data.gameState });
                    if (data.gameState.phase === "innings_1") {
                      setTimeout(() => {
                        if (get().screen === "toss") {
                          set({ screen: "match" });
                          startBallTimer();
                        }
                      }, 1800);
                    }
                  }
                } else if (currentScreen === "match") {
                  if (data.gameState.phase === "innings_break" && localState?.phase !== "innings_break") {
                    set({ gameState: data.gameState, screen: "innings_break" });
                  } else if (data.gameState.phase === "match_ended" && localState?.phase !== "match_ended") {
                    set({ gameState: data.gameState, screen: "result" });
                  }
                } else if (currentScreen === "innings_break") {
                  if (data.gameState.phase === "innings_2") {
                    set({
                      gameState: data.gameState,
                      screen: "match",
                      userPick: null,
                      isUserLocked: false,
                      opponentPick: null,
                      opponentTileState: "empty",
                      userTileState: "empty",
                      outcomeText: null,
                    });
                    startBallTimer();
                  }
                }
              }
            }
          } catch {}
        }, 1500);
      }
    } catch (err) {
      console.error("[Ably Channel Setup] Error:", err);
    }
  };

  return {
    screen: "landing",
    setScreen: (screen) => set({ screen }),

    guestId: "",
    guestName: "SwiftTiger42",
    setGuestName: (guestName) => set({ guestName }),

    mode: "sudden_death",
    setMode: (mode) => set({ mode }),

    endlessVariant: "standard",
    setEndlessVariant: (endlessVariant) => set({ endlessVariant }),

    personalBest:
      typeof window !== "undefined"
        ? Number(localStorage.getItem("hand_cricket_endless_pb") || "0")
        : 0,
    setPersonalBest: (personalBest) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("hand_cricket_endless_pb", String(personalBest));
      }
      set({ personalBest });
    },

    isVideoCallActive: true,
    setIsVideoCallActive: (isVideoCallActive) => set({ isVideoCallActive }),

    isGestureMode: true,
    setIsGestureMode: (isGestureMode) => set({ isGestureMode }),

    isPaused: false,
    togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

    matchId: null,
    userRole: "p1",
    opponentName: "Opponent",
    isBotMatch: false,
    gameState: null,

    opponentPresent: true,
    opponentDisconnectSeconds: null,

    userPick: null,
    isUserLocked: false,
    opponentPick: null,
    opponentTileState: "empty",
    userTileState: "empty",
    revealCountdown: null,
    outcomeText: null,
    isOutcomeWicket: false,
    screenShake: false,
    currentBallIndex: 0,

    timerSeconds: 10,
    isTimerActive: false,

    activeReactions: [],

    isRulesOpen: false,
    setIsRulesOpen: (isRulesOpen) => set({ isRulesOpen }),
    isReportOpen: false,
    setIsReportOpen: (isReportOpen) => set({ isReportOpen }),

    initGuestSession: async () => {
      if (guestSessionPromise) return guestSessionPromise;

      guestSessionPromise = (async () => {
        try {
          let tabGuestId = typeof window !== "undefined" ? sessionStorage.getItem("hca_tab_guest_id") : null;
          let tabGuestName = typeof window !== "undefined" ? sessionStorage.getItem("hca_tab_guest_name") : null;

          const res = await fetch("/api/session");
          if (res.ok) {
            const data = await res.json();
            if (!tabGuestId && typeof window !== "undefined" && data.guestId) {
              tabGuestId = data.guestId;
              sessionStorage.setItem("hca_tab_guest_id", data.guestId);
            }
            if (!tabGuestName && typeof window !== "undefined" && data.guestName) {
              tabGuestName = data.guestName;
              sessionStorage.setItem("hca_tab_guest_name", data.guestName);
            }
            set({
              guestId: tabGuestId || data.guestId || "guest",
              guestName: tabGuestName || data.guestName || "Player",
            });
          }
        } catch (err) {
          console.warn("[Session] Could not fetch session:", err);
        }
      })();

      try {
        await guestSessionPromise;
      } finally {
        guestSessionPromise = null;
      }
    },

    startMatchmaking: async (playVsBot = false) => {
      clearBallTimer();
      clearDisconnectTimer();
      clearQueuePoll();
      clearMatchSync();

      const { mode } = get();
      set({ screen: "searching" });

      let { guestName, guestId } = get();
      if (!guestId) {
        await get().initGuestSession();
        ({ guestName, guestId } = get());
      }
      if (!guestId && typeof window !== "undefined") {
        guestId =
          sessionStorage.getItem("hca_tab_guest_id") ||
          localStorage.getItem("hca_guest_id") ||
          "";
        if (guestId) set({ guestId });
      }
      if (get().screen !== "searching") return;

      try {
        const res = await fetch("/api/queue/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            playVsBot,
            guestName,
            guestId: guestId || undefined,
            ageConfirmed: true,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error("[Matchmaking] Join failed:", errData);
          clearQueuePoll();
          set({ screen: "landing" });
          return;
        }

        const data = await res.json();

        const onMatchJoined = (matchData: {
          matchId: string;
          role?: "p1" | "p2";
          opponentName?: string;
          isBot?: boolean;
        }) => {
          clearQueuePoll();
          if (get().screen !== "searching") return;

          const format =
            mode === "endless"
              ? get().endlessVariant === "pro"
                ? ENDLESS_PRO_FORMAT
                : DEFAULT_ENDLESS_FORMAT
              : mode === "classic"
              ? CLASSIC_FORMAT
              : DEFAULT_SUDDEN_DEATH_FORMAT;

          set({
            matchId: matchData.matchId,
            userRole: matchData.role || "p1",
            opponentName: matchData.opponentName || "Opponent",
            isBotMatch: !!matchData.isBot,
            screen: "toss",
            gameState: {
              format,
              phase: "toss_call",
              player1Name: matchData.role === "p1" ? (guestName || "Player") : (matchData.opponentName || "Opponent"),
              player2Name: matchData.role === "p1" ? (matchData.opponentName || "Opponent") : (guestName || "Player"),
              tossCaller: "p1",
              tossCall: null,
              tossPicks: {},
              tossWinner: null,
              tossDecision: null,
              currentInnings: 1,
              innings1: {
                battingPlayer: "p1",
                bowlingPlayer: "p2",
                score: 0,
                wickets: 0,
                balls: 0,
                overHistory: [],
                currentOver: [],
              },
              innings2: null,
              lastOutcome: null,
              winner: null,
              resultSummary: null,
            },
          });
          setupMatchChannel(matchData.matchId);
        };

        if (data.status === "matched") {
          onMatchJoined(data);
          return;
        }

        // Status is "queued": listen on private channel for match-found
        const ably = getClientAbly();
        const currentGuestId = get().guestId || guestId;
        if (userPrivateChannel) {
          try {
            userPrivateChannel.unsubscribe();
          } catch {}
        }

        userPrivateChannel = ably.channels.get(`user:${currentGuestId}`);
        userPrivateChannel.subscribe("match-found", (msg: any) => {
          onMatchJoined(msg.data);
        });

        // Fail-safe queue polling: checks /api/queue/status every 1s
        queuePollInterval = setInterval(async () => {
          if (get().screen !== "searching") {
            clearQueuePoll();
            return;
          }
          try {
            const checkRes = await fetch(
              `/api/queue/status?guestId=${encodeURIComponent(currentGuestId)}`
            );
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (checkData.status === "matched") {
                onMatchJoined(checkData);
              }
            }
          } catch {}
        }, 1000);
      } catch (err) {
        console.error("[Matchmaking] Error joining queue:", err);
        clearQueuePoll();
        set({ screen: "landing" });
      }
    },

    cancelMatchmaking: async () => {
      clearQueuePoll();
      clearMatchSync();
      if (userPrivateChannel) {
        try {
          userPrivateChannel.unsubscribe();
        } catch {}
      }
      const { mode } = get();
      set({ screen: "landing" });
      try {
        await fetch("/api/queue/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode }),
        });
      } catch {}
    },

    submitTossCall: async (call) => {
      const { matchId } = get();
      if (!matchId) return;

      try {
        const res = await fetch(`/api/match/${matchId}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "toss",
            action: { type: "call", value: call },
          }),
        });
        const data = await res.json();
        if (data.gameState) {
          set({ gameState: data.gameState });
        }
      } catch (err) {
        console.error("[Toss Call] Error:", err);
      }
    },

    submitTossPick: async (pick) => {
      const { matchId, userRole } = get();
      if (!matchId) return;

      set((s) => ({
        gameState: s.gameState
          ? {
              ...s.gameState,
              tossPicks: { ...s.gameState.tossPicks, [userRole]: pick },
            }
          : null,
      }));

      try {
        const res = await fetch(`/api/match/${matchId}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "toss",
            action: { type: "pick", value: pick },
          }),
        });
        const data = await res.json();
        if (data.gameState) {
          set({ gameState: data.gameState });
          if (data.gameState.phase === "innings_1") {
            setTimeout(() => {
              if (get().screen === "toss") {
                set({ screen: "match" });
                startBallTimer();
              }
            }, 1800);
          }
        }
      } catch (err) {
        console.error("[Toss Pick] Error:", err);
      }
    },

    submitTossDecision: async (decision) => {
      const { matchId } = get();
      if (!matchId) return;

      try {
        const res = await fetch(`/api/match/${matchId}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "toss",
            action: { type: "decision", value: decision },
          }),
        });
        const data = await res.json();
        if (data.gameState) {
          set({ gameState: data.gameState, screen: "match" });
          startBallTimer();
        }
      } catch (err) {
        console.error("[Toss Decision] Error:", err);
      }
    },

    submitBallPick: async (pick) => {
      const { matchId, currentBallIndex, isUserLocked } = get();
      if (!matchId || isUserLocked) return;

      triggerHaptic("light");
      set({ userPick: pick, isUserLocked: true, userTileState: "locked" });

      try {
        const res = await fetch(`/api/match/${matchId}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "ball",
            ballIndex: currentBallIndex,
            pick,
          }),
        });
        const data = await res.json();
        if (data.status === "resolved" && data.gameState && data.outcome) {
          const isUserP1 = get().userRole === "p1";
          handleBallResolution({
            p1Pick: data.p1Pick ?? (isUserP1 ? pick : (data.outcome.batterPick ?? 1)),
            p2Pick: data.p2Pick ?? (isUserP1 ? (data.outcome.bowlerPick ?? 1) : pick),
            outcome: data.outcome,
            gameState: data.gameState,
            ballIndex: currentBallIndex,
          });
        }
      } catch (err) {
        console.error("[Ball Pick] Error submitting move:", err);
      }
    },

    startSecondInnings: async () => {
      const { matchId } = get();
      if (!matchId) return;

      try {
        const res = await fetch(`/api/match/${matchId}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "start_innings_2" }),
        });
        const data = await res.json();
        if (data.gameState) {
          set({
            gameState: data.gameState,
            screen: "match",
            userPick: null,
            isUserLocked: false,
            opponentPick: null,
            opponentTileState: "empty",
            userTileState: "empty",
            outcomeText: null,
          });
          startBallTimer();
        }
      } catch (err) {
        console.error("[Start Innings 2] Error:", err);
      }
    },

    sendReaction: async (emoji) => {
      const { matchId } = get();
      if (!matchId) return;
      try {
        await fetch(`/api/match/${matchId}/react`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        });
      } catch {}
    },

    forfeitCurrentMatch: async (reason = "You left the match") => {
      clearBallTimer();
      clearDisconnectTimer();
      clearQueuePoll();
      clearMatchSync();
      webrtcManager.cleanup();

      const { matchId } = get();
      if (matchId) {
        try {
          await fetch(`/api/match/${matchId}/leave`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason }),
          });
        } catch {}
      }
      set({ screen: "landing", matchId: null });
    },

    resetToLanding: () => {
      clearBallTimer();
      clearDisconnectTimer();
      clearQueuePoll();
      clearMatchSync();
      webrtcManager.cleanup();
      if (activeAblyChannel) {
        try {
          activeAblyChannel.unsubscribe();
          activeAblyChannel.presence.leave().catch(() => {});
        } catch {}
        activeAblyChannel = null;
      }
      set({
        screen: "landing",
        matchId: null,
        gameState: null,
        userPick: null,
        isUserLocked: false,
        opponentPick: null,
        opponentTileState: "empty",
        userTileState: "empty",
        outcomeText: null,
        activeReactions: [],
      });
    },
  };
});

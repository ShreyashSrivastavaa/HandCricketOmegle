import { create } from "zustand";
import {
  GameState,
  MatchFormat,
  PlayerId,
  TossCall,
  TossDecision,
  WicketsOption,
  OversOption,
} from "../game-core/types";
import {
  createInitialGameState,
  submitTossCall as engineSubmitTossCall,
  submitTossPick as engineSubmitTossPick,
  submitTossDecision as engineSubmitTossDecision,
  applyBall as engineApplyBall,
  startSecondInnings as engineStartSecondInnings,
} from "../game-core/engine";
import {
  getBotBallPick,
  getBotTossPick,
  getBotTossDecision,
} from "../game-core/bot";
import type { HandTileState } from "../../components/HandTile";
import type { ToastMessage } from "../../components/Toast";
import { playBatHitSound, playBoundarySound, playWicketSound } from "../client/audio";

export type LobbyState = "idle" | "searching" | "matched" | "no-one-found-after-20s";

interface GameStore {
  // Lobby matchmaking state
  lobbyState: LobbyState;
  searchElapsedSeconds: number;
  matchedCountdown: number;

  // Match Format
  format: MatchFormat;
  setFormat: (format: MatchFormat) => void;
  setWickets: (w: WicketsOption) => void;
  setOvers: (o: OversOption) => void;

  // Active game
  gameState: GameState | null;
  userPlayerId: PlayerId;
  botPlayerId: PlayerId;

  // In-game turn state
  userPick: number | null;
  isUserLocked: boolean;
  botPick: number | null;
  isBotLocked: boolean;

  // Reveal & Outcome
  userTileState: HandTileState;
  botTileState: HandTileState;
  revealCountdown: number | null; // 3, 2, 1
  outcomeText: string | null;
  isOutcomeWicket: boolean;
  screenShake: boolean;

  // 8s Turn timer
  timerSeconds: number;
  isTimerActive: boolean;

  // Settings
  tapToLock: boolean;
  toggleTapToLock: () => void;

  // Feedback Toasts
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastMessage["type"]) => void;
  removeToast: (id: string) => void;

  // Lobby actions
  startSearching: () => void;
  cancelSearching: () => void;
  keepSearching: () => void;
  simulateMatchFound: () => void;

  // Match lifecycle
  startBotMatch: (customFormat?: MatchFormat) => void;
  resetToLobby: () => void;
  rematch: () => void;

  // Toss actions
  callToss: (call: TossCall) => void;
  pickTossNumber: (num: number) => void;
  chooseTossDecision: (decision: TossDecision) => void;

  // Gameplay actions
  selectUserNumber: (num: number) => void;
  confirmUserLock: () => void;
  triggerAutoPick: () => void;
  startInnings2: () => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  let turnTimerInterval: NodeJS.Timeout | null = null;
  let searchTimerInterval: NodeJS.Timeout | null = null;

  const clearTurnTimer = () => {
    if (turnTimerInterval) {
      clearInterval(turnTimerInterval);
      turnTimerInterval = null;
    }
  };

  const clearSearchTimer = () => {
    if (searchTimerInterval) {
      clearInterval(searchTimerInterval);
      searchTimerInterval = null;
    }
  };

  const startTurnTimer = () => {
    clearTurnTimer();
    set({ timerSeconds: 8, isTimerActive: true });

    turnTimerInterval = setInterval(() => {
      const state = get();
      if (!state.isTimerActive || state.userTileState !== "empty") {
        return;
      }

      if (state.timerSeconds <= 1) {
        clearTurnTimer();
        set({ timerSeconds: 0, isTimerActive: false });
        get().triggerAutoPick();
      } else {
        set({ timerSeconds: state.timerSeconds - 1 });
      }
    }, 1000);
  };

  return {
    lobbyState: "idle",
    searchElapsedSeconds: 0,
    matchedCountdown: 2,

    format: { maxWickets: 2, maxOvers: 2 },
    setFormat: (format) => set({ format }),
    setWickets: (maxWickets) => set((s) => ({ format: { ...s.format, maxWickets } })),
    setOvers: (maxOvers) => set((s) => ({ format: { ...s.format, maxOvers } })),

    gameState: null,
    userPlayerId: "p1",
    botPlayerId: "p2",

    userPick: null,
    isUserLocked: false,
    botPick: null,
    isBotLocked: false,

    userTileState: "empty",
    botTileState: "empty",
    revealCountdown: null,
    outcomeText: null,
    isOutcomeWicket: false,
    screenShake: false,

    timerSeconds: 8,
    isTimerActive: false,
    tapToLock: false,
    toasts: [],

    toggleTapToLock: () => set((s) => ({ tapToLock: !s.tapToLock })),

    addToast: (message, type = "info") => {
      const id = `${Date.now()}-${Math.random()}`;
      set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
      setTimeout(() => {
        get().removeToast(id);
      }, 3500);
    },

    removeToast: (id) =>
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    // Matchmaking UI states
    startSearching: () => {
      clearSearchTimer();
      set({ lobbyState: "searching", searchElapsedSeconds: 0 });

      searchTimerInterval = setInterval(() => {
        const current = get().searchElapsedSeconds + 1;
        set({ searchElapsedSeconds: current });

        if (current >= 20) {
          clearSearchTimer();
          set({ lobbyState: "no-one-found-after-20s" });
        }
      }, 1000);
    },

    cancelSearching: () => {
      clearSearchTimer();
      set({ lobbyState: "idle", searchElapsedSeconds: 0 });
    },

    keepSearching: () => {
      get().startSearching();
    },

    simulateMatchFound: () => {
      clearSearchTimer();
      set({ lobbyState: "matched", matchedCountdown: 2 });

      const countdownInterval = setInterval(() => {
        const count = get().matchedCountdown - 1;
        set({ matchedCountdown: count });

        if (count <= 0) {
          clearInterval(countdownInterval);
          get().startBotMatch();
        }
      }, 1000);
    },

    resetToLobby: () => {
      clearTurnTimer();
      clearSearchTimer();
      set({
        lobbyState: "idle",
        gameState: null,
        userPick: null,
        isUserLocked: false,
        botPick: null,
        isBotLocked: false,
        userTileState: "empty",
        botTileState: "empty",
        revealCountdown: null,
        outcomeText: null,
        isOutcomeWicket: false,
        screenShake: false,
        isTimerActive: false,
      });
    },

    startBotMatch: (customFormat) => {
      clearTurnTimer();
      clearSearchTimer();
      const matchFormat = customFormat || get().format;
      const initialGame = createInitialGameState(
        matchFormat,
        "You",
        "Bot Arena",
        "p1"
      );

      set({
        lobbyState: "idle",
        format: matchFormat,
        gameState: initialGame,
        userPick: null,
        isUserLocked: false,
        botPick: null,
        isBotLocked: false,
        userTileState: "empty",
        botTileState: "empty",
        revealCountdown: null,
        outcomeText: null,
        isOutcomeWicket: false,
        screenShake: false,
        timerSeconds: 8,
        isTimerActive: false,
      });
    },

    // TOSS
    callToss: (call) => {
      const { gameState } = get();
      if (!gameState || gameState.phase !== "toss_call") return;

      const next = engineSubmitTossCall(gameState, call);
      set({ gameState: next });

      const botPick = getBotTossPick();
      const withBotPick = engineSubmitTossPick(next, "p2", botPick);
      set({ gameState: withBotPick });
    },

    pickTossNumber: (num) => {
      const { gameState } = get();
      if (!gameState || gameState.phase !== "toss_pick") return;

      try {
        const next = engineSubmitTossPick(gameState, "p1", num);
        set({ gameState: next });

        if (next.phase === "toss_decision" && next.tossWinner === "p2") {
          setTimeout(() => {
            const botDecision = getBotTossDecision();
            const startedState = engineSubmitTossDecision(next, botDecision);
            set({ gameState: startedState });
            get().addToast(`Bot won toss and elected to ${botDecision.toUpperCase()} first.`, "info");
            startTurnTimer();
          }, 800);
        }
      } catch (err: unknown) {
        console.error(err);
      }
    },

    chooseTossDecision: (decision) => {
      const { gameState } = get();
      if (!gameState || gameState.phase !== "toss_decision") return;

      const next = engineSubmitTossDecision(gameState, decision);
      set({ gameState: next });
      get().addToast(`You won toss and elected to ${decision.toUpperCase()} first.`, "success");
      startTurnTimer();
    },

    selectUserNumber: (num) => {
      const { isUserLocked, userTileState } = get();
      if (isUserLocked || userTileState !== "empty") return;
      set({ userPick: num });
    },

    confirmUserLock: () => {
      const { userPick, isUserLocked, userTileState, gameState } = get();
      if (!userPick || isUserLocked || userTileState !== "empty" || !gameState) return;

      set({
        isUserLocked: true,
        userTileState: "locked",
      });

      // Bot pick (secret, no cheating)
      const botNumber = getBotBallPick(gameState);
      const botDelay = Math.floor(Math.random() * 400) + 150;

      setTimeout(() => {
        set({
          botPick: botNumber,
          isBotLocked: true,
          botTileState: "locked",
          isTimerActive: false,
        });
        clearTurnTimer();

        // Reveal sequence: both locked -> 3-2-1 tick -> both hands appear together
        set({
          userTileState: "revealing",
          botTileState: "revealing",
          revealCountdown: 3,
        });

        setTimeout(() => {
          set({ revealCountdown: 2 });
          setTimeout(() => {
            set({ revealCountdown: 1 });
            setTimeout(() => {
              // REVEAL TICK: both hands appear together!
              set({ revealCountdown: null });

              const currentG = get().gameState!;
              const activeInnings = currentG.currentInnings === 1 ? currentG.innings1 : currentG.innings2!;
              const isUserBatting = activeInnings.battingPlayer === "p1";

              const batterPick = isUserBatting ? userPick : botNumber;
              const bowlerPick = isUserBatting ? botNumber : userPick;

              const { nextState, outcome } = engineApplyBall(currentG, batterPick, bowlerPick);

              if (outcome.isWicket) {
                playWicketSound();
              } else if (outcome.runsScored === 4 || outcome.runsScored === 6) {
                playBoundarySound(outcome.runsScored);
              } else {
                playBatHitSound();
              }

              let outcomeDisplay = "";
              if (outcome.isWicket) {
                outcomeDisplay = "OUT!";
              } else if (outcome.runsScored === 6) {
                outcomeDisplay = "SIX! +6";
              } else if (outcome.runsScored === 4) {
                outcomeDisplay = "FOUR! +4";
              } else {
                outcomeDisplay = `+${outcome.runsScored}`;
              }

              // Set outcome states: 'out' (red outline) or 'scored' (amber)
              let uState: HandTileState = "revealed";
              let bState: HandTileState = "revealed";

              if (outcome.isWicket) {
                uState = isUserBatting ? "out" : "revealed";
                bState = isUserBatting ? "revealed" : "out";
              } else {
                uState = isUserBatting ? "scored" : "revealed";
                bState = isUserBatting ? "revealed" : "scored";
              }

              set({
                gameState: nextState,
                outcomeText: outcomeDisplay,
                isOutcomeWicket: outcome.isWicket,
                screenShake: outcome.isWicket,
                userTileState: uState,
                botTileState: bState,
              });

              // OUT 200ms screen shake
              if (outcome.isWicket) {
                setTimeout(() => set({ screenShake: false }), 200);
              }

              // Next ball after 1.2s
              setTimeout(() => {
                const updated = get().gameState!;
                if (
                  updated.phase === "match_ended" ||
                  updated.phase === "innings_break"
                ) {
                  set({
                    userPick: null,
                    isUserLocked: false,
                    botPick: null,
                    isBotLocked: false,
                    userTileState: "empty",
                    botTileState: "empty",
                    outcomeText: null,
                  });
                } else {
                  set({
                    userPick: null,
                    isUserLocked: false,
                    botPick: null,
                    isBotLocked: false,
                    userTileState: "empty",
                    botTileState: "empty",
                    outcomeText: null,
                  });
                  startTurnTimer();
                }
              }, 1200);
            }, 300);
          }, 300);
        }, 300);
      }, botDelay);
    },

    triggerAutoPick: () => {
      const { isUserLocked, userTileState } = get();
      if (isUserLocked || userTileState !== "empty") return;

      const randomPick = Math.floor(Math.random() * 6) + 1;
      get().addToast(`Turn timer expired! Auto-picked ${randomPick}.`, "warning");
      set({ userPick: randomPick });
      get().confirmUserLock();
    },

    startInnings2: () => {
      const { gameState } = get();
      if (!gameState || gameState.phase !== "innings_break") return;

      const next = engineStartSecondInnings(gameState);
      set({
        gameState: next,
        userPick: null,
        isUserLocked: false,
        botPick: null,
        isBotLocked: false,
        userTileState: "empty",
        botTileState: "empty",
        outcomeText: null,
      });
      startTurnTimer();
    },

    rematch: () => {
      const { format } = get();
      get().startBotMatch(format);
    },
  };
});

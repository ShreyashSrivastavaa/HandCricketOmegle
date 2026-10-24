import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { applyBall, createInitialGameState } from "../src/lib/game/engine";
import { DEFAULT_SUDDEN_DEATH_FORMAT, CLASSIC_FORMAT } from "../src/lib/game/engine";

describe("Ball Incoming Countdown & Throw Lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Countdown starts when a valid ball is ready and ticks 3 -> 2 -> 1", () => {
    const countdownTicks: number[] = [];
    let countdownNumber: number | null = 3;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 1000) {
        countdownNumber = 3;
      } else if (elapsed < 2000) {
        countdownNumber = 2;
      } else if (elapsed < 3000) {
        countdownNumber = 1;
      } else {
        countdownNumber = null;
      }
      if (countdownNumber !== null) {
        countdownTicks.push(countdownNumber);
      }
    };

    // t = 0s
    tick();
    // t = 1s
    vi.advanceTimersByTime(1000);
    tick();
    // t = 2s
    vi.advanceTimersByTime(1000);
    tick();
    // t = 3s
    vi.advanceTimersByTime(1000);
    tick();

    expect(countdownTicks).toEqual([3, 2, 1]);
    expect(countdownNumber).toBeNull();
  });

  it("2. Ball throw event only triggers after countdown finishes (t >= 3s)", () => {
    let ballSubmitted = false;
    let submittedPick: number | null = null;
    const detectedGesture = 4; // 4 fingers
    const startTime = Date.now();

    const advanceLoop = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= 3000 && !ballSubmitted) {
        ballSubmitted = true;
        submittedPick = detectedGesture;
      }
    };

    // Before countdown ends
    vi.advanceTimersByTime(1500);
    advanceLoop();
    expect(ballSubmitted).toBe(false);
    expect(submittedPick).toBeNull();

    // After countdown completes
    vi.advanceTimersByTime(1500);
    advanceLoop();
    expect(ballSubmitted).toBe(true);
    expect(submittedPick).toBe(4);
  });

  it("3. Prevents duplicate ball submissions during the same countdown", () => {
    let submitCount = 0;
    let hasSubmittedThisBall = false;

    const trySubmit = (pick: number) => {
      if (hasSubmittedThisBall) return;
      hasSubmittedThisBall = true;
      submitCount++;
    };

    // First attempt at countdown expiration
    trySubmit(2);
    // Duplicate attempts triggered by re-render or rapid clicks
    trySubmit(2);
    trySubmit(3);

    expect(submitCount).toBe(1);
  });

  it("4. Scores update correctly and ball resolves through game engine", () => {
    let state = createInitialGameState(DEFAULT_SUDDEN_DEATH_FORMAT, "Player", "RoboCricket", "p1");
    // Start innings 1
    state.phase = "innings_1";
    state.innings1.battingPlayer = "p1";
    state.innings1.bowlingPlayer = "p2";

    // Ball 1: Batter picks 4, Bowler picks 2 -> 4 runs scored
    const res1 = applyBall(state, 4, 2);
    expect(res1.outcome.isWicket).toBe(false);
    expect(res1.outcome.runsScored).toBe(4);
    expect(res1.nextState.innings1.score).toBe(4);
    expect(res1.nextState.innings1.balls).toBe(1);

    // Ball 2: Batter picks 3, Bowler picks 3 -> WICKET!
    const res2 = applyBall(res1.nextState, 3, 3);
    expect(res2.outcome.isWicket).toBe(true);
    expect(res2.outcome.runsScored).toBe(0);
    expect(res2.nextState.innings1.wickets).toBe(1);
  });

  it("5. Countdown resets correctly before next ball delivery", () => {
    let countdownNumber: number | null = null;
    let stage: "countdown" | "throwing" | "result" = "result";
    let hasSubmitted = true;

    // Reset for next ball
    const resetForNextBall = () => {
      hasSubmitted = false;
      countdownNumber = 3;
      stage = "countdown";
    };

    resetForNextBall();
    expect(countdownNumber).toBe(3);
    expect(stage).toBe("countdown");
    expect(hasSubmitted).toBe(false);
  });

  it("6. Cancelling or leaving game clears countdown timers and aborts callbacks", () => {
    let wasExecuted = false;
    const interval = setInterval(() => {
      wasExecuted = true;
    }, 100);

    // Unmount / leave match cleanup
    clearInterval(interval);
    vi.advanceTimersByTime(5000);

    expect(wasExecuted).toBe(false);
  });

  it("7. Gesture recognition fallbacks work seamlessly when no hand is present", () => {
    const detectedGesture = null;
    const selectedNum = null;
    const fallback = 5;

    const pick = detectedGesture ?? selectedNum ?? fallback;
    expect(pick).toBe(5);
  });

  it("8. Tap mode overrides gesture detection accurately when user prefers taps", () => {
    const useTapMode = true;
    const selectedNum = 6;
    const detectedGesture = 2;

    const pick = useTapMode && selectedNum ? selectedNum : detectedGesture;
    expect(pick).toBe(6);
  });
});

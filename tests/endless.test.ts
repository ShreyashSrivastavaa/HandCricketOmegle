import { describe, it, expect } from "vitest";
import {
  createInitialGameState,
  submitTossCall,
  submitTossPick,
  submitTossDecision,
  startSecondInnings,
  applyBall,
  applySuperOverBall,
  getRemainingBalls,
  getRequiredRunRate,
  DEFAULT_ENDLESS_FORMAT,
  ENDLESS_PRO_FORMAT,
} from "../src/lib/game/engine";
import {
  MODE_CONFIGS,
} from "../src/lib/game/types";

describe("Endless Mode Game Engine & Rules", () => {
  function setupMatch(format = DEFAULT_ENDLESS_FORMAT) {
    let state = createInitialGameState(format, "Player 1", "Player 2", "p1");
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 1);
    state = submitTossPick(state, "p2", 2); // sum = 3 (odd) -> p1 wins toss
    return submitTossDecision(state, "bat"); // p1 bats, p2 bowls
  }

  describe("Mode Configuration", () => {
    it("has endless mode registered in MODE_CONFIGS", () => {
      expect(MODE_CONFIGS.endless).toBeDefined();
      expect(MODE_CONFIGS.endless.endless).toBe(true);
      expect(MODE_CONFIGS.endless.wickets).toBe(1);
      expect(MODE_CONFIGS.endless.variants?.[0].wickets).toBe(1);
      expect(MODE_CONFIGS.endless.variants?.[1].wickets).toBe(3);
    });

    it("creates an endless game state with infinite balls remaining and 1 wicket default", () => {
      const state = setupMatch(DEFAULT_ENDLESS_FORMAT);

      expect(state.format.isEndless).toBe(true);
      expect(state.format.maxWickets).toBe(1);
      expect(getRemainingBalls(state)).toBe(Infinity);
      expect(getRequiredRunRate(state)).toBeNull();
    });

    it("creates an Endless Pro game state with 3 wickets", () => {
      const state = setupMatch(ENDLESS_PRO_FORMAT);

      expect(state.format.maxWickets).toBe(3);
      expect(state.format.isEndless).toBe(true);
    });
  });

  describe("Endless Scoring & Streaks", () => {
    it("accumulates runs, balls, boundaries, and strike streak each ball without over limit", () => {
      let state = setupMatch(DEFAULT_ENDLESS_FORMAT);

      // Ball 1: Batter 4, Bowler 2 -> 4 runs, 1 ball, 1 four, streak 1
      let res = applyBall(state, 4, 2);
      state = res.nextState;
      expect(res.outcome.runsScored).toBe(4);
      expect(state.innings1.score).toBe(4);
      expect(state.innings1.balls).toBe(1);
      expect(state.innings1.fours).toBe(1);
      expect(state.innings1.strikeStreak).toBe(1);
      expect(state.innings1.bestStreak).toBe(1);
      expect(state.phase).toBe("innings_1");

      // Ball 2: Batter 6, Bowler 1 -> 6 runs (total 10), 2 balls, 1 six, streak 2
      res = applyBall(state, 6, 1);
      state = res.nextState;
      expect(state.innings1.score).toBe(10);
      expect(state.innings1.balls).toBe(2);
      expect(state.innings1.sixes).toBe(1);
      expect(state.innings1.strikeStreak).toBe(2);
      expect(state.innings1.bestStreak).toBe(2);

      // Play 15 balls without being out (beyond standard 2 overs = 12 balls)
      for (let i = 0; i < 13; i++) {
        state = applyBall(state, 3, 2).nextState;
      }
      expect(state.innings1.balls).toBe(15);
      expect(state.innings1.score).toBe(10 + 13 * 3);
      // Innings should still be active because wickets = 0!
      expect(state.phase).toBe("innings_1");
    });

    it("resets strikeStreak when wicket falls in multi-wicket Endless Pro", () => {
      let state = setupMatch(ENDLESS_PRO_FORMAT); // 3 wickets

      state = applyBall(state, 4, 2).nextState; // 4 runs, streak 1
      state = applyBall(state, 6, 1).nextState; // 6 runs, streak 2
      expect(state.innings1.strikeStreak).toBe(2);
      expect(state.innings1.bestStreak).toBe(2);

      // Wicket 1
      state = applyBall(state, 3, 3).nextState;
      expect(state.innings1.wickets).toBe(1);
      expect(state.innings1.strikeStreak).toBe(0); // streak reset
      expect(state.innings1.bestStreak).toBe(2); // best preserved
      expect(state.phase).toBe("innings_1"); // Still batting (2 wickets left)

      // Streak starts again
      state = applyBall(state, 5, 1).nextState;
      expect(state.innings1.strikeStreak).toBe(1);
      expect(state.innings1.bestStreak).toBe(2);
    });
  });

  describe("Innings Transitions & Chaser Target", () => {
    it("transitions to innings_break then innings_2 when batter is out in standard 1-wicket Endless", () => {
      let state = setupMatch(DEFAULT_ENDLESS_FORMAT);

      // P1 scores 15 runs
      state = applyBall(state, 5, 2).nextState;
      state = applyBall(state, 6, 1).nextState;
      state = applyBall(state, 4, 3).nextState;

      // P1 gets OUT (4 == 4)
      state = applyBall(state, 4, 4).nextState;

      expect(state.phase).toBe("innings_break");
      expect(state.innings1.score).toBe(15);
      expect(state.innings1.wickets).toBe(1);
      expect(state.innings2?.target).toBe(16); // Target is runs + 1

      // Transition to innings 2
      state = startSecondInnings(state);
      expect(state.phase).toBe("innings_2");
      expect(state.innings2?.battingPlayer).toBe("p2");
    });

    it("chaser wins immediately when surpassing target", () => {
      let state = setupMatch(DEFAULT_ENDLESS_FORMAT);

      // Innings 1: 10 runs then out
      state = applyBall(state, 5, 1).nextState;
      state = applyBall(state, 5, 2).nextState;
      state = applyBall(state, 2, 2).nextState; // Out! Target = 11

      expect(state.phase).toBe("innings_break");
      expect(state.innings2?.target).toBe(11);

      // Innings 2: P2 chases
      state = startSecondInnings(state);
      expect(state.phase).toBe("innings_2");

      state = applyBall(state, 6, 3).nextState;
      expect(state.innings2?.score).toBe(6);
      expect(state.phase).toBe("innings_2");

      // P2 scores another 6 runs -> total 12 > 11 target
      state = applyBall(state, 6, 1).nextState;
      expect(state.innings2?.score).toBe(12);
      expect(state.phase).toBe("match_ended");
      expect(state.winner).toBe("p2");
      expect(state.resultSummary).toContain("Player 2 won");
    });

    it("defending player wins when chaser is out before reaching target", () => {
      let state = setupMatch(DEFAULT_ENDLESS_FORMAT);

      // Innings 1: 20 runs then out
      state = applyBall(state, 6, 1).nextState;
      state = applyBall(state, 6, 2).nextState;
      state = applyBall(state, 5, 3).nextState;
      state = applyBall(state, 3, 4).nextState;
      state = applyBall(state, 1, 1).nextState; // Out! Target = 21

      state = startSecondInnings(state);
      expect(state.innings2?.target).toBe(21);

      // Innings 2: P2 scores 10 runs then gets out
      state = applyBall(state, 6, 2).nextState;
      state = applyBall(state, 4, 1).nextState;
      state = applyBall(state, 3, 3).nextState; // Out!

      expect(state.phase).toBe("match_ended");
      expect(state.winner).toBe("p1");
      expect(state.resultSummary).toContain("Player 1 won by 10 runs");
    });
  });

  describe("Endless Tie & 1-Ball Super-Over Decider", () => {
    it("transitions to super_over if chaser matches target - 1 and gets out (tie)", () => {
      let state = setupMatch(DEFAULT_ENDLESS_FORMAT);

      // P1 scores 8 runs then out
      state = applyBall(state, 5, 1).nextState;
      state = applyBall(state, 3, 2).nextState;
      state = applyBall(state, 1, 1).nextState; // Target = 9

      state = startSecondInnings(state);

      // P2 scores 8 runs then out
      state = applyBall(state, 6, 1).nextState;
      state = applyBall(state, 2, 3).nextState; // 8 runs
      state = applyBall(state, 4, 4).nextState; // Out! Scores are equal (8 vs 8)

      expect(state.phase).toBe("super_over");
      expect(state.superOver).toBeDefined();
      expect(state.superOver?.batterId).toBe("p1");
      expect(state.superOver?.bowlerId).toBe("p2");
    });

    it("resolves super_over in one ball if batter scores runs without wicket", () => {
      let state = setupMatch(DEFAULT_ENDLESS_FORMAT);

      // Tie setup
      state = applyBall(state, 6, 1).nextState;
      state = applyBall(state, 1, 1).nextState; // p1 = 6 runs
      state = startSecondInnings(state);
      state = applyBall(state, 6, 2).nextState;
      state = applyBall(state, 3, 3).nextState; // p2 = 6 runs, tie -> super_over

      expect(state.phase).toBe("super_over");

      // Super Over Ball: P1 picks 5, P2 picks 2
      // P1 scores 5 runs, not out!
      state = applySuperOverBall(state, 5, 2).nextState;
      expect(state.phase).toBe("match_ended");
      expect(state.winner).toBe("p1");
      expect(state.resultSummary).toContain("Super-Over");
    });

    it("resolves super_over as bowler win if batter gets out on the decider ball", () => {
      let state = setupMatch(DEFAULT_ENDLESS_FORMAT);

      // Tie setup
      state = applyBall(state, 6, 1).nextState;
      state = applyBall(state, 1, 1).nextState;
      state = startSecondInnings(state);
      state = applyBall(state, 6, 2).nextState;
      state = applyBall(state, 3, 3).nextState;

      expect(state.phase).toBe("super_over");

      // Super over decider: Batter picks 4, Bowler picks 4 -> OUT!
      state = applySuperOverBall(state, 4, 4).nextState;
      expect(state.phase).toBe("match_ended");
      expect(state.winner).toBe("p2"); // Bowler wins!
      expect(state.resultSummary).toContain("taking a wicket on the Super-Over ball");
    });
  });
});

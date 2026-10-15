import { describe, it, expect } from "vitest";
import {
  createInitialGameState,
  resolveToss,
  submitTossCall,
  submitTossPick,
  submitTossDecision,
  startSecondInnings,
  applyBall,
  forfeitMatch,
  gameReducer,
  getRandomPick,
  formatOvers,
  getRequiredRuns,
  getRemainingBalls,
  getRequiredRunRate,
  DEFAULT_SUDDEN_DEATH_FORMAT,
  CLASSIC_FORMAT,
} from "../src/lib/game/engine";

describe("Hand Cricket Engine", () => {
  describe("Toss Resolution", () => {
    it("caller calls odd and sum is odd -> caller wins toss", () => {
      // p1 calls odd, p1=3, p2=4 -> sum=7 (odd) -> p1 wins
      const res = resolveToss("p1", "odd", 3, 4);
      expect(res.winner).toBe("p1");
      expect(res.sum).toBe(7);
      expect(res.isOdd).toBe(true);
    });

    it("caller calls odd and sum is even -> opponent wins toss", () => {
      // p1 calls odd, p1=2, p2=4 -> sum=6 (even) -> p2 wins
      const res = resolveToss("p1", "odd", 2, 4);
      expect(res.winner).toBe("p2");
      expect(res.sum).toBe(6);
      expect(res.isOdd).toBe(false);
    });

    it("caller calls even and sum is even -> caller wins toss", () => {
      // p2 calls even, p1=4, p2=2 -> sum=6 (even) -> p2 wins
      const res = resolveToss("p2", "even", 4, 2);
      expect(res.winner).toBe("p2");
      expect(res.sum).toBe(6);
      expect(res.isOdd).toBe(false);
    });

    it("caller calls even and sum is odd -> opponent wins toss", () => {
      // p1 calls even, p1=1, p2=6 -> sum=7 (odd) -> p2 wins
      const res = resolveToss("p1", "even", 1, 6);
      expect(res.winner).toBe("p2");
      expect(res.sum).toBe(7);
      expect(res.isOdd).toBe(true);
    });

    it("advances through toss phases correctly", () => {
      let state = createInitialGameState(DEFAULT_SUDDEN_DEATH_FORMAT, "Alice", "Bob", "p1");
      expect(state.phase).toBe("toss_call");

      // 1. Submit call
      state = submitTossCall(state, "odd");
      expect(state.phase).toBe("toss_pick");
      expect(state.tossCall).toBe("odd");

      // 2. Submit picks
      state = submitTossPick(state, "p1", 5);
      expect(state.phase).toBe("toss_pick"); // waiting for p2
      expect(state.tossPicks.p1).toBe(5);

      state = submitTossPick(state, "p2", 2); // sum = 7 (odd) -> p1 wins
      expect(state.phase).toBe("toss_decision");
      expect(state.tossWinner).toBe("p1");

      // 3. Toss decision: p1 chooses to bat
      state = submitTossDecision(state, "bat");
      expect(state.phase).toBe("innings_1");
      expect(state.innings1.battingPlayer).toBe("p1");
      expect(state.innings1.bowlingPlayer).toBe("p2");
    });

    it("assigns roles correctly when toss winner bowls", () => {
      let state = createInitialGameState(DEFAULT_SUDDEN_DEATH_FORMAT, "Alice", "Bob", "p1");
      state = submitTossCall(state, "odd");
      state = submitTossPick(state, "p1", 1);
      state = submitTossPick(state, "p2", 2); // sum = 3 (odd) -> p1 wins
      state = submitTossDecision(state, "bowl");

      expect(state.innings1.battingPlayer).toBe("p2");
      expect(state.innings1.bowlingPlayer).toBe("p1");
    });
  });

  describe("Ball Delivery & Scoring", () => {
    function setupMatch(format = DEFAULT_SUDDEN_DEATH_FORMAT) {
      let state = createInitialGameState(format, "Alice", "Bob", "p1");
      state = submitTossCall(state, "odd");
      state = submitTossPick(state, "p1", 1);
      state = submitTossPick(state, "p2", 2);
      return submitTossDecision(state, "bat"); // p1 bats, p2 bowls
    }

    it("scores batter pick when picks are different", () => {
      const state = setupMatch();
      const { nextState, outcome } = applyBall(state, 6, 2);

      expect(outcome.isWicket).toBe(false);
      expect(outcome.runsScored).toBe(6);
      expect(nextState.innings1.score).toBe(6);
      expect(nextState.innings1.wickets).toBe(0);
      expect(nextState.innings1.balls).toBe(1);
      expect(outcome.commentary).toContain("SIX");
    });

    it("triggers OUT when batter and bowler picks match", () => {
      const state = setupMatch();
      const { nextState, outcome } = applyBall(state, 4, 4);

      expect(outcome.isWicket).toBe(true);
      expect(outcome.runsScored).toBe(0);
      expect(nextState.innings1.wickets).toBe(1);
      expect(outcome.commentary).toContain("OUT!");
    });

    it("rejects invalid pick values", () => {
      const state = setupMatch();
      expect(() => applyBall(state, 0, 3)).toThrow();
      expect(() => applyBall(state, 7, 3)).toThrow();
      expect(() => applyBall(state, 3.5, 3)).toThrow();
    });
  });

  describe("Match Formats: Sudden Death vs Classic", () => {
    function setupMatch(format = DEFAULT_SUDDEN_DEATH_FORMAT) {
      let state = createInitialGameState(format, "Alice", "Bob", "p1");
      state = submitTossCall(state, "odd");
      state = submitTossPick(state, "p1", 1);
      state = submitTossPick(state, "p2", 2);
      return submitTossDecision(state, "bat");
    }

    it("Sudden Death (1 wicket): innings ends immediately on first wicket", () => {
      let state = setupMatch(DEFAULT_SUDDEN_DEATH_FORMAT);
      expect(state.format.maxWickets).toBe(1);

      // Score a boundary first
      state = applyBall(state, 4, 1).nextState;
      expect(state.phase).toBe("innings_1");
      expect(state.innings1.score).toBe(4);

      // Wicket falls
      const { nextState, outcome } = applyBall(state, 3, 3);
      expect(outcome.isWicket).toBe(true);
      expect(outcome.isInningsComplete).toBe(true);
      expect(nextState.phase).toBe("innings_break");
      expect(nextState.innings1.wickets).toBe(1);
      expect(nextState.innings2?.target).toBe(5); // 4 + 1
    });

    it("Classic Mode (2 wickets, 2 overs): innings continues after 1st wicket", () => {
      let state = setupMatch(CLASSIC_FORMAT);
      expect(state.format.maxWickets).toBe(2);

      // First wicket falls
      state = applyBall(state, 2, 2).nextState;
      expect(state.phase).toBe("innings_1");
      expect(state.innings1.wickets).toBe(1);

      // Score runs
      state = applyBall(state, 5, 1).nextState;
      expect(state.innings1.score).toBe(5);

      // Second wicket falls -> All out!
      state = applyBall(state, 6, 6).nextState;
      expect(state.phase).toBe("innings_break");
      expect(state.innings1.wickets).toBe(2);
      expect(state.innings2?.target).toBe(6);
    });

    it("Innings completes when overs limit is reached", () => {
      // 1 over = 6 balls
      let state = setupMatch({ mode: "classic", maxWickets: 2, maxOvers: 1 });
      for (let i = 0; i < 6; i++) {
        state = applyBall(state, 2, 1).nextState;
      }
      expect(state.phase).toBe("innings_break");
      expect(state.innings1.balls).toBe(6);
      expect(state.innings1.score).toBe(12);
      expect(state.innings2?.target).toBe(13);
    });
  });

  describe("Innings 2 Chase Scenarios", () => {
    function setupInnings2(runsInInnings1: number = 6) {
      let state = createInitialGameState(DEFAULT_SUDDEN_DEATH_FORMAT, "Alice", "Bob", "p1");
      state = submitTossCall(state, "odd");
      state = submitTossPick(state, "p1", 1);
      state = submitTossPick(state, "p2", 2);
      state = submitTossDecision(state, "bat"); // p1 bats in Innings 1

      // Score runsInInnings1 (e.g. 6 runs: batter picks 6, bowler picks 1)
      if (runsInInnings1 > 0) {
        const firstOverScore = Math.min(6, runsInInnings1);
        const bowlerPick = firstOverScore === 1 ? 2 : 1;
        state = applyBall(state, firstOverScore, bowlerPick).nextState;
      }
      // Now wicket falls: batter 3, bowler 3 -> all out in Sudden Death
      state = applyBall(state, 3, 3).nextState;
      expect(state.phase).toBe("innings_break");

      // Start innings 2 (p2 now bats, chasing)
      return startSecondInnings(state);
    }

    it("Chaser wins immediately upon reaching or exceeding target", () => {
      // Innings 1 scores 6 -> Target is 7
      let state = setupInnings2(6);
      expect(state.phase).toBe("innings_2");
      expect(state.innings2?.target).toBe(7);
      expect(state.innings2?.battingPlayer).toBe("p2");

      // Ball 1: p2 hits 6
      state = applyBall(state, 6, 1).nextState;
      expect(state.phase).toBe("innings_2");

      // Ball 2: p2 hits 2 (6 + 2 = 8 >= 7) -> Win!
      const { nextState, outcome } = applyBall(state, 2, 1);
      expect(outcome.isMatchComplete).toBe(true);
      expect(nextState.phase).toBe("match_ended");
      expect(nextState.winner).toBe("p2");
      expect(nextState.resultSummary).toContain("Bob won");
    });

    it("Defending team wins when chaser gets all out before target", () => {
      // Innings 1 scores 6 -> Target is 7
      let state = setupInnings2(6);

      // Chaser scores 4
      state = applyBall(state, 4, 1).nextState;
      expect(state.innings2?.score).toBe(4);

      // Chaser gets out (Sudden Death = 1 wicket)
      const { nextState, outcome } = applyBall(state, 5, 5);
      expect(outcome.isMatchComplete).toBe(true);
      expect(nextState.phase).toBe("match_ended");
      expect(nextState.winner).toBe("p1"); // Alice defended successfully
      expect(nextState.resultSummary).toContain("Alice won by 2 runs");
    });

    it("Match is TIED when chaser is all out with exactly equal score", () => {
      // Innings 1 scored 5 -> Target is 6
      let state = setupInnings2(5);

      // Chaser scores 5
      state = applyBall(state, 5, 1).nextState;
      expect(state.innings2?.score).toBe(5);

      // Chaser gets out on next ball (scores are 5 vs 5)
      const { nextState, outcome } = applyBall(state, 3, 3);
      expect(outcome.isMatchComplete).toBe(true);
      expect(nextState.phase).toBe("match_ended");
      expect(nextState.winner).toBe("tie");
      expect(nextState.resultSummary).toBe("Match Tied! Scores are level.");
    });
  });

  describe("Reducer API & Timeout Auto-Pick", () => {
    it("handles gameReducer actions", () => {
      let state = createInitialGameState();
      expect(state.phase).toBe("toss_call");

      state = gameReducer(state, { type: "SUBMIT_TOSS_CALL", call: "even" });
      expect(state.phase).toBe("toss_pick");

      state = gameReducer(state, { type: "SUBMIT_TOSS_PICK", playerId: "p1", pick: 4 });
      state = gameReducer(state, { type: "SUBMIT_TOSS_PICK", playerId: "p2", pick: 2 });
      expect(state.phase).toBe("toss_decision");
      expect(state.tossWinner).toBe("p1"); // 4+2=6 (even)

      state = gameReducer(state, { type: "SUBMIT_TOSS_DECISION", decision: "bat" });
      expect(state.phase).toBe("innings_1");

      state = gameReducer(state, { type: "APPLY_BALL", batterPick: 4, bowlerPick: 1 });
      expect(state.innings1.score).toBe(4);
    });

    it("handles timeout auto-pick for toss", () => {
      let state = createInitialGameState();
      state = submitTossCall(state, "odd");
      expect(state.phase).toBe("toss_pick");

      state = gameReducer(state, { type: "TIMEOUT_AUTO_PICK", playerId: "p1" });
      expect(state.tossPicks.p1).toBeGreaterThanOrEqual(1);
      expect(state.tossPicks.p1).toBeLessThanOrEqual(6);
    });

    it("getRandomPick returns integer between 1 and 6", () => {
      for (let i = 0; i < 50; i++) {
        const pick = getRandomPick();
        expect(pick).toBeGreaterThanOrEqual(1);
        expect(pick).toBeLessThanOrEqual(6);
        expect(Number.isInteger(pick)).toBe(true);
      }
    });

    it("handles player forfeit properly", () => {
      let state = createInitialGameState();
      state = forfeitMatch(state, "p1", "Connection timed out");
      expect(state.phase).toBe("match_ended");
      expect(state.winner).toBe("p2");
      expect(state.isForfeit).toBe(true);
      expect(state.resultSummary).toContain("won by forfeit");
    });
  });

  describe("Helper Functions", () => {
    it("formats overs correctly", () => {
      expect(formatOvers(0)).toBe("0.0");
      expect(formatOvers(1)).toBe("0.1");
      expect(formatOvers(5)).toBe("0.5");
      expect(formatOvers(6)).toBe("1.0");
      expect(formatOvers(11)).toBe("1.5");
      expect(formatOvers(12)).toBe("2.0");
    });

    it("calculates required runs and balls remaining", () => {
      let state = createInitialGameState({ mode: "classic", maxWickets: 2, maxOvers: 2 });
      state = submitTossCall(state, "odd");
      state = submitTossPick(state, "p1", 1);
      state = submitTossPick(state, "p2", 2);
      state = submitTossDecision(state, "bat");

      expect(getRemainingBalls(state)).toBe(12);

      // Play 2 balls
      state = applyBall(state, 4, 1).nextState;
      state = applyBall(state, 6, 2).nextState;
      expect(getRemainingBalls(state)).toBe(10);
    });
  });
});

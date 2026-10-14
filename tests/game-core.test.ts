import { describe, it, expect } from "vitest";
import {
  createInitialGameState,
  submitTossCall,
  submitTossPick,
  submitTossDecision,
  applyBall,
  startSecondInnings,
  formatOvers,
  resolveToss,
} from "../src/lib/game-core/engine";
import {
  getBotBallPick,
  getBotTossCall,
  getBotTossPick,
  getBotTossDecision,
} from "../src/lib/game-core/bot";

describe("game-core Engine", () => {
  it("resolves toss correctly: odd/even logic", () => {
    // caller called odd, sum is 3 (odd) -> p1 wins
    const toss1 = resolveToss("p1", "odd", 1, 2);
    expect(toss1.winner).toBe("p1");
    expect(toss1.isOdd).toBe(true);

    // caller called even, sum is 5 (odd) -> p2 wins
    const toss2 = resolveToss("p1", "even", 2, 3);
    expect(toss2.winner).toBe("p2");
    expect(toss2.isOdd).toBe(true);
  });

  it("handles runs scoring when batter and bowler picks differ", () => {
    let state = createInitialGameState({ maxWickets: 2, maxOvers: 2 });
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 1);
    state = submitTossPick(state, "p2", 2);
    state = submitTossDecision(state, "bat"); // p1 bats

    const { nextState, outcome } = applyBall(state, 4, 1);
    expect(outcome.isWicket).toBe(false);
    expect(outcome.runsScored).toBe(4);
    expect(nextState.innings1.score).toBe(4);
    expect(nextState.innings1.wickets).toBe(0);
    expect(nextState.innings1.balls).toBe(1);
  });

  it("handles OUT (wicket) when batter and bowler picks are identical", () => {
    let state = createInitialGameState({ maxWickets: 2, maxOvers: 2 });
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 1);
    state = submitTossPick(state, "p2", 2);
    state = submitTossDecision(state, "bat");

    const { nextState, outcome } = applyBall(state, 5, 5);
    expect(outcome.isWicket).toBe(true);
    expect(outcome.runsScored).toBe(0);
    expect(nextState.innings1.score).toBe(0);
    expect(nextState.innings1.wickets).toBe(1);
  });

  it("tracks over completion after 6 legal deliveries", () => {
    let state = createInitialGameState({ maxWickets: 2, maxOvers: 2 });
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 1);
    state = submitTossPick(state, "p2", 2);
    state = submitTossDecision(state, "bat");

    for (let i = 1; i <= 6; i++) {
      state = applyBall(state, 2, 1).nextState;
    }

    expect(state.innings1.balls).toBe(6);
    expect(state.innings1.overHistory.length).toBe(1);
    expect(state.innings1.overHistory[0].length).toBe(6);
    expect(state.innings1.currentOver.length).toBe(0);
    expect(formatOvers(state.innings1.balls)).toBe("1.0");
  });

  it("handles innings end by wickets (all out)", () => {
    let state = createInitialGameState({ maxWickets: 2, maxOvers: 2 });
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 1);
    state = submitTossPick(state, "p2", 2);
    state = submitTossDecision(state, "bat");

    state = applyBall(state, 4, 4).nextState; // Wicket 1
    expect(state.phase).toBe("innings_1");

    state = applyBall(state, 6, 6).nextState; // Wicket 2 -> all out
    expect(state.phase).toBe("innings_break");
    expect(state.innings1.wickets).toBe(2);
    expect(state.innings2?.target).toBe(1); // 0 + 1
  });

  it("handles innings end by overs", () => {
    let state = createInitialGameState({ maxWickets: 3, maxOvers: 1 }); // 6 balls
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 1);
    state = submitTossPick(state, "p2", 2);
    state = submitTossDecision(state, "bat");

    for (let i = 0; i < 6; i++) {
      state = applyBall(state, 3, 1).nextState;
    }

    expect(state.phase).toBe("innings_break");
    expect(state.innings1.score).toBe(18);
    expect(state.innings2?.target).toBe(19);
  });

  it("handles target reached mid-over in Innings 2", () => {
    let state = createInitialGameState({ maxWickets: 2, maxOvers: 2 });
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 1);
    state = submitTossPick(state, "p2", 2);
    state = submitTossDecision(state, "bat");

    // Innings 1: P1 scores 8 runs then gets all out
    state = applyBall(state, 4, 1).nextState;
    state = applyBall(state, 4, 2).nextState;
    state = applyBall(state, 3, 3).nextState;
    state = applyBall(state, 5, 5).nextState; // all out

    expect(state.innings1.score).toBe(8);
    expect(state.innings2?.target).toBe(9);

    // Innings 2: P2 chases target 9
    state = startSecondInnings(state);
    expect(state.phase).toBe("innings_2");

    // Ball 1: P2 scores 6
    state = applyBall(state, 6, 1).nextState;
    expect(state.phase).toBe("innings_2");

    // Ball 2 (mid-over): P2 scores 4 (6 + 4 = 10 >= 9)
    const { nextState, outcome } = applyBall(state, 4, 2);
    expect(outcome.isMatchComplete).toBe(true);
    expect(nextState.phase).toBe("match_ended");
    expect(nextState.winner).toBe("p2");
    expect(nextState.resultSummary).toMatch(/Bot Arena won by 2 wickets/);
  });

  it("handles match tie when scores are equal at end of Innings 2", () => {
    let state = createInitialGameState({ maxWickets: 1, maxOvers: 1 });
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 1);
    state = submitTossPick(state, "p2", 2);
    state = submitTossDecision(state, "bat");

    // P1 scores 5 then out
    state = applyBall(state, 5, 1).nextState;
    state = applyBall(state, 2, 2).nextState; // out

    expect(state.innings1.score).toBe(5);
    state = startSecondInnings(state);

    // P2 scores 5 then out (level scores: 5 vs 5)
    state = applyBall(state, 5, 2).nextState;
    state = applyBall(state, 3, 3).nextState; // out

    expect(state.phase).toBe("match_ended");
    expect(state.winner).toBe("tie");
    expect(state.resultSummary).toBe("Match Tied! Scores are level.");
  });
});

describe("game-core Bot", () => {
  it("bot never repeats the same pick 3+ times in a row", () => {
    let state = createInitialGameState({ maxWickets: 2, maxOvers: 2 });
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 1);
    state = submitTossPick(state, "p2", 2);
    state = submitTossDecision(state, "bat"); // bot is bowling (p2)

    // Simulate two consecutive balls where bot picked 4
    state = applyBall(state, 1, 4).nextState;
    state = applyBall(state, 2, 4).nextState;

    // The bot's next pick must NOT be 4!
    for (let testRun = 0; testRun < 20; testRun++) {
      const nextBotPick = getBotBallPick(state);
      expect(nextBotPick).not.toBe(4);
      expect(nextBotPick).toBeGreaterThanOrEqual(1);
      expect(nextBotPick).toBeLessThanOrEqual(6);
    }
  });

  it("bot picks are valid and does not cheat (authoritative blind pick)", () => {
    const state = createInitialGameState();
    const tossPick = getBotTossPick();
    expect(tossPick).toBeGreaterThanOrEqual(1);
    expect(tossPick).toBeLessThanOrEqual(6);

    const tossCall = getBotTossCall();
    expect(["odd", "even"]).toContain(tossCall);

    const tossDec = getBotTossDecision();
    expect(["bat", "bowl"]).toContain(tossDec);
  });
});

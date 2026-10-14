import { describe, it, expect } from "vitest";
import {
  createInitialGameState,
  submitTossCall,
  submitTossPick,
  submitTossDecision,
  applyBall,
  startSecondInnings,
  formatOvers,
} from "../src/lib/game-core/engine";
import {
  getBotBallPick,
  getBotTossCall,
  getBotTossPick,
  getBotTossDecision,
} from "../src/lib/game-core/bot";

describe("game.test Legacy Suite", () => {
  it("Toss: caller calls odd and sum is odd -> caller wins", () => {
    let state = createInitialGameState({ maxWickets: 2, maxOvers: 2 }, "Player 1", "Player 2", "p1");
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 3);
    state = submitTossPick(state, "p2", 4);

    expect(state.tossWinner).toBe("p1");
    expect(state.phase).toBe("toss_decision");
  });

  it("Toss: caller calls even and sum is odd -> other player wins", () => {
    let state = createInitialGameState({ maxWickets: 2, maxOvers: 2 }, "Player 1", "Player 2", "p1");
    state = submitTossCall(state, "even");
    state = submitTossPick(state, "p1", 2);
    state = submitTossPick(state, "p2", 3);

    expect(state.tossWinner).toBe("p2");
    expect(state.phase).toBe("toss_decision");
  });

  it("Toss decision sets batting and bowling roles", () => {
    let state = createInitialGameState({ maxWickets: 2, maxOvers: 2 }, "P1", "P2", "p1");
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 3);
    state = submitTossPick(state, "p2", 2);
    state = submitTossDecision(state, "bat");

    expect(state.phase).toBe("innings_1");
    expect(state.innings1.battingPlayer).toBe("p1");
    expect(state.innings1.bowlingPlayer).toBe("p2");
  });

  it("applyBall: Batter scores runs when picks differ", () => {
    let state = createInitialGameState({ maxWickets: 2, maxOvers: 2 });
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 1);
    state = submitTossPick(state, "p2", 2);
    state = submitTossDecision(state, "bat");

    const { nextState, outcome } = applyBall(state, 4, 2);
    expect(outcome.isWicket).toBe(false);
    expect(outcome.runsScored).toBe(4);
    expect(nextState.innings1.score).toBe(4);
    expect(nextState.innings1.wickets).toBe(0);
    expect(nextState.innings1.balls).toBe(1);
  });

  it("applyBall: Out when batter and bowler picks are identical", () => {
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

  it("applyBall: Over completion moves balls into overHistory", () => {
    let state = createInitialGameState({ maxWickets: 2, maxOvers: 2 });
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 1);
    state = submitTossPick(state, "p2", 2);
    state = submitTossDecision(state, "bat");

    for (let b = 1; b <= 6; b++) {
      state = applyBall(state, 1, 2).nextState;
    }

    expect(state.innings1.balls).toBe(6);
    expect(state.innings1.score).toBe(6);
    expect(state.innings1.overHistory.length).toBe(1);
    expect(state.innings1.overHistory[0].length).toBe(6);
    expect(state.innings1.currentOver.length).toBe(0);
    expect(formatOvers(state.innings1.balls)).toBe("1.0");
  });

  it("applyBall: Innings 1 ends when all wickets fall", () => {
    let state = createInitialGameState({ maxWickets: 2, maxOvers: 2 });
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 1);
    state = submitTossPick(state, "p2", 2);
    state = submitTossDecision(state, "bat");

    state = applyBall(state, 3, 3).nextState;
    expect(state.phase).toBe("innings_1");

    state = applyBall(state, 6, 6).nextState;
    expect(state.phase).toBe("innings_break");
    expect(state.innings1.wickets).toBe(2);
    expect(state.innings2?.target).toBe(1);
  });

  it("applyBall: Innings 1 ends when max overs are reached", () => {
    let state = createInitialGameState({ maxWickets: 3, maxOvers: 1 });
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 1);
    state = submitTossPick(state, "p2", 2);
    state = submitTossDecision(state, "bat");

    for (let i = 0; i < 6; i++) {
      state = applyBall(state, 4, 1).nextState;
    }

    expect(state.phase).toBe("innings_break");
    expect(state.innings1.score).toBe(24);
    expect(state.innings2?.target).toBe(25);
  });

  it("applyBall: Innings 2 Target chase victory by wickets", () => {
    let state = createInitialGameState({ maxWickets: 2, maxOvers: 1 });
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 1);
    state = submitTossPick(state, "p2", 2);
    state = submitTossDecision(state, "bat");

    state = applyBall(state, 5, 1).nextState;
    state = applyBall(state, 2, 2).nextState;
    state = applyBall(state, 4, 4).nextState;

    state = startSecondInnings(state);
    state = applyBall(state, 6, 2).nextState;

    expect(state.phase).toBe("match_ended");
    expect(state.winner).toBe("p2");
    expect(state.resultSummary).toMatch(/Bot Arena won by 2 wickets/);
  });

  it("applyBall: Innings 2 Defending team victory by runs", () => {
    let state = createInitialGameState({ maxWickets: 1, maxOvers: 1 });
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 1);
    state = submitTossPick(state, "p2", 2);
    state = submitTossDecision(state, "bat");

    state = applyBall(state, 6, 1).nextState;
    state = applyBall(state, 4, 2).nextState;
    state = applyBall(state, 3, 3).nextState;

    state = startSecondInnings(state);
    state = applyBall(state, 4, 1).nextState;
    state = applyBall(state, 2, 2).nextState;

    expect(state.phase).toBe("match_ended");
    expect(state.winner).toBe("p1");
    expect(state.resultSummary).toMatch(/You won by 6 runs/);
  });

  it("applyBall: Match Tied when scores are level at end of Innings 2", () => {
    let state = createInitialGameState({ maxWickets: 1, maxOvers: 1 });
    state = submitTossCall(state, "odd");
    state = submitTossPick(state, "p1", 1);
    state = submitTossPick(state, "p2", 2);
    state = submitTossDecision(state, "bat");

    state = applyBall(state, 6, 1).nextState;
    state = applyBall(state, 3, 3).nextState;

    state = startSecondInnings(state);
    state = applyBall(state, 6, 2).nextState;
    state = applyBall(state, 4, 4).nextState;

    expect(state.phase).toBe("match_ended");
    expect(state.winner).toBe("tie");
    expect(state.resultSummary).toBe("Match Tied! Scores are level.");
  });
});

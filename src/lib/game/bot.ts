import type { GameState, BallOutcome } from "./types.ts";

/**
 * Intelligent weighted bot logic for Hand Cricket.
 * Analyzes match context, current run rates, recent player picks, and psychological tendencies.
 */
export function getBotTossCall(): "odd" | "even" {
  return Math.random() < 0.5 ? "odd" : "even";
}

export function getBotTossPick(): number {
  // Balanced random pick between 1 and 6 for toss
  return Math.floor(Math.random() * 6) + 1;
}

export function getBotTossDecision(): "bat" | "bowl" {
  // In hand cricket, batting first is traditionally preferred to set a high target
  return Math.random() < 0.75 ? "bat" : "bowl";
}

/**
 * Calculates weighted random pick for bot during an active ball.
 */
export function getBotBallPick(state: GameState): number {
  const isSecondInnings = state.currentInnings === 2;
  const activeInnings = isSecondInnings ? state.innings2! : state.innings1;
  const isBotBatting = activeInnings.battingPlayer === "p2";

  // Base weights for numbers 1 to 6
  // Numbers 1-6 indexed 0-5
  const weights: number[] = [10, 10, 10, 10, 10, 10];

  // Collect history of recent player picks and outcomes
  const recentBalls: BallOutcome[] = [
    ...activeInnings.overHistory.flat(),
    ...activeInnings.currentOver,
  ].slice(-6);

  const lastBall = recentBalls[recentBalls.length - 1];
  const lastPlayerPick = lastBall
    ? isBotBatting
      ? lastBall.bowlerPick
      : lastBall.batterPick
    : null;
  const lastBotPick = lastBall
    ? isBotBatting
      ? lastBall.batterPick
      : lastBall.bowlerPick
    : null;

  if (isBotBatting) {
    // === BOT IS BATTING ===
    if (isSecondInnings && activeInnings.target) {
      const runsNeeded = Math.max(0, activeInnings.target - activeInnings.score);
      const ballsLeft = Math.max(1, state.format.maxOvers * 6 - activeInnings.balls);
      const rrr = (runsNeeded / ballsLeft) * 6;

      if (runsNeeded <= 2) {
        // Just need 1 or 2 runs to win - pick safe 1 or 2, don't risk high numbers
        weights[0] += 25; // 1
        weights[1] += 20; // 2
      } else if (rrr > 8) {
        // High pressure chase: Bot needs boundaries (4s and 6s)
        weights[3] += 18; // 4
        weights[5] += 22; // 6
        weights[2] += 8;  // 3
      } else {
        // Moderate chase: balanced aggression (3, 4, 5, 6)
        weights[2] += 12; // 3
        weights[3] += 15; // 4
        weights[4] += 10; // 5
        weights[5] += 14; // 6
      }
    } else {
      // First innings batting: aim for healthy total with balanced spread
      weights[3] += 14; // 4
      weights[5] += 16; // 6
      weights[1] += 10; // 2
      weights[2] += 8;  // 3
    }

    // Psychological variation: Bot avoids repeating its own previous pick to evade bowler
    if (lastBotPick) {
      weights[lastBotPick - 1] = Math.max(2, weights[lastBotPick - 1] - 8);
    }
  } else {
    // === BOT IS BOWLING (Trying to match batter's pick) ===
    if (lastPlayerPick) {
      // Humans often avoid immediately repeating the exact same number
      // So reduce weight on immediate repeat, boost neighboring numbers
      weights[lastPlayerPick - 1] = Math.max(3, weights[lastPlayerPick - 1] - 6);

      // Boost common alternatives (opposites or boundaries)
      if (lastPlayerPick === 6) {
        weights[3] += 8; // human often switches from 6 to 4 or 1
        weights[0] += 8;
      } else if (lastPlayerPick === 1) {
        weights[1] += 6;
        weights[5] += 6;
      }
    }

    if (isSecondInnings && activeInnings.target) {
      const runsNeeded = Math.max(0, activeInnings.target - activeInnings.score);
      const ballsLeft = Math.max(1, state.format.maxOvers * 6 - activeInnings.balls);
      const rrr = (runsNeeded / ballsLeft) * 6;

      if (runsNeeded <= 2) {
        // Batter will likely nudge 1 or 2
        weights[0] += 20;
        weights[1] += 16;
      } else if (rrr > 7) {
        // Batter is desperate for 4 or 6: Bowler anticipates boundaries
        weights[3] += 18; // 4
        weights[5] += 20; // 6
      }
    } else {
      // First innings bowling: anticipate boundaries
      weights[3] += 12; // 4
      weights[5] += 14; // 6
      weights[0] += 8;  // 1
    }
  }

  // Pick weighted random number (1-6)
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let randomVal = Math.random() * totalWeight;

  for (let i = 0; i < weights.length; i++) {
    randomVal -= weights[i];
    if (randomVal <= 0) {
      return i + 1;
    }
  }

  return Math.floor(Math.random() * 6) + 1;
}

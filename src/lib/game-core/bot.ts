import type { GameState, BallOutcome } from "./types";

/**
 * Intelligent weighted bot logic for Hand Cricket Arena.
 * Rules:
 * - Weighted random distribution
 * - Strictly avoids repeating the same number 3+ times in a row
 * - No cheating: never reads the player's current pick before locking
 */
export function getBotTossCall(): "odd" | "even" {
  return Math.random() < 0.5 ? "odd" : "even";
}

export function getBotTossPick(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function getBotTossDecision(): "bat" | "bowl" {
  return Math.random() < 0.75 ? "bat" : "bowl";
}

/**
 * Generates an authoritative blind pick (1-6) for the bot.
 * Takes ONLY public past game state. Never accesses the player's current pending pick.
 */
export function getBotBallPick(state: GameState): number {
  const isSecondInnings = state.currentInnings === 2;
  const activeInnings = isSecondInnings ? state.innings2! : state.innings1;
  const isBotBatting = activeInnings.battingPlayer === "p2";

  // Base weights for 1 to 6
  const weights: number[] = [10, 10, 10, 10, 10, 10];

  // Extract past deliveries history
  const allPastBalls: BallOutcome[] = [
    ...activeInnings.overHistory.flat(),
    ...activeInnings.currentOver,
  ];

  // Bot's own past picks
  const pastBotPicks = allPastBalls.map((b) =>
    isBotBatting ? b.batterPick : b.bowlerPick
  );

  const n = pastBotPicks.length;
  let forbiddenRepeatNum: number | null = null;

  // STRICT RULE: Avoid repeating the same number 3+ times in a row
  if (n >= 2 && pastBotPicks[n - 1] === pastBotPicks[n - 2]) {
    forbiddenRepeatNum = pastBotPicks[n - 1];
  } else if (n >= 1) {
    const lastNum = pastBotPicks[n - 1];
    weights[lastNum - 1] = Math.max(2, weights[lastNum - 1] - 6);
  }

  // Tactical situation weighting
  if (isBotBatting) {
    if (isSecondInnings && activeInnings.target) {
      const runsNeeded = Math.max(0, activeInnings.target - activeInnings.score);
      const ballsLeft = Math.max(1, state.format.maxOvers * 6 - activeInnings.balls);
      const rrr = (runsNeeded / ballsLeft) * 6;

      if (runsNeeded <= 2) {
        weights[0] += 25; // 1
        weights[1] += 20; // 2
      } else if (rrr > 8) {
        weights[3] += 18; // 4
        weights[5] += 22; // 6
      } else {
        weights[2] += 12; // 3
        weights[3] += 15; // 4
        weights[5] += 14; // 6
      }
    } else {
      weights[3] += 12; // 4
      weights[5] += 15; // 6
      weights[1] += 8;  // 2
    }
  } else {
    // Bot is Bowling
    if (isSecondInnings && activeInnings.target) {
      const runsNeeded = Math.max(0, activeInnings.target - activeInnings.score);
      const ballsLeft = Math.max(1, state.format.maxOvers * 6 - activeInnings.balls);
      const rrr = (runsNeeded / ballsLeft) * 6;

      if (runsNeeded <= 2) {
        weights[0] += 20;
        weights[1] += 16;
      } else if (rrr > 7) {
        weights[3] += 18;
        weights[5] += 20;
      }
    } else {
      weights[3] += 12;
      weights[5] += 14;
      weights[0] += 8;
    }
  }

  // Final enforce: strictly zero-out forbidden repeated pick
  if (forbiddenRepeatNum !== null) {
    weights[forbiddenRepeatNum - 1] = 0;
  }

  // Select weighted random number
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) {
    // If all zeroed out, choose any valid number other than the forbidden repeat
    const valid = [1, 2, 3, 4, 5, 6].filter((x) => x !== forbiddenRepeatNum);
    return valid[Math.floor(Math.random() * valid.length)];
  }

  let randomVal = Math.random() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    randomVal -= weights[i];
    if (randomVal <= 0) {
      return i + 1;
    }
  }

  return Math.floor(Math.random() * 6) + 1;
}

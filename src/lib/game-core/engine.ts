export * from "../game/engine";
import { createInitialGameState as baseCreateInitialGameState } from "../game/engine";
import type { MatchFormat, PlayerId, GameState } from "../game/types";

export function createInitialGameState(
  format?: MatchFormat,
  player1Name: string = "You",
  player2Name: string = "Bot Arena",
  tossCaller: PlayerId = "p1"
): GameState {
  return baseCreateInitialGameState(format, player1Name, player2Name, tossCaller);
}

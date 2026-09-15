// core/ — pure deterministic simulation (tech-spec §3).
// No three.js, no DOM, no wall clock, no Math.random. Fixed ticks (rate
// resolved from tuning.json, tech-spec §10 — no hardcoded tick constant here).

import { DIRECTION_VECTORS, type Command } from './commands';
import type { SimEvent } from './events';
import type { Level, LevelEntities } from './level';
import { type PlayerState, resolveMovement } from './player';
import { parseLevel, type TileGrid } from './tileGrid';
import type { ResolvedTuning } from './tuning';

const EMPTY_ENTITIES: LevelEntities = { diamonds: [], sacks: [], bank: null, spawners: [] };

export interface GameState {
  seed: number;
  tick: number;
  grid: TileGrid;
  player: PlayerState;
  tuning: ResolvedTuning;
  entities: LevelEntities;
}

/** Mulberry32 — small, fast, seedable PRNG for deterministic sim randomness. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGameState(
  seed: number,
  levelRows: readonly string[],
  tuning: ResolvedTuning,
  entities: LevelEntities = EMPTY_ENTITIES,
): GameState {
  const { grid, playerStart } = parseLevel(levelRows, tuning.rockHitsToClear);
  return { seed, tick: 0, grid, player: playerStart, tuning, entities };
}

/** Builds core state + entity placements straight from a loaded level (tech-spec §10). */
export function createGameStateFromLevel(seed: number, level: Level, tuning: ResolvedTuning): GameState {
  return createGameState(seed, level.rows, tuning, level.entities);
}

function latestMoveDirection(commands: readonly Command[]): { dx: number; dy: number } | null {
  let latest: { dx: number; dy: number } | null = null;
  for (const command of commands) {
    if (command.type === 'move') {
      latest = DIRECTION_VECTORS[command.direction];
    }
  }
  return latest;
}

export function advanceTick(
  state: GameState,
  commands: readonly Command[] = [],
): { state: GameState; events: SimEvent[] } {
  const direction = latestMoveDirection(commands);
  const tickDt = 1 / state.tuning.tickRate;
  const { grid, player, events } = resolveMovement(state.grid, state.player, direction, tickDt, state.tuning.playerSpeed);

  return {
    state: { ...state, tick: state.tick + 1, grid, player },
    events,
  };
}

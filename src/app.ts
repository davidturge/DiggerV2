// Composition root for the scaffold app (not core/ — this may touch platform
// concerns later). Builds the exact same state/tick pipeline main.ts boots,
// kept DOM-free so it's covered by app.test.ts instead of a browser harness.

import tuningDocument from '../data/tuning.json';
import w101Document from '../data/levels/w1-01.json';
import type { Command } from './core/commands';
import type { SimEvent } from './core/events';
import type { Level } from './core/level';
import { parseLevelDocument } from './core/level';
import { advanceTick, createGameState, createGameStateFromLevel, type GameState } from './core/sim';
import type { Difficulty, ResolvedTuning, TuningData } from './core/tuning';
import { parseTuningDocument, resolveTuning } from './core/tuning';

// Grey-box demo level: a short east-then-south corridor through dirt and one
// rock face, just enough to prove digging, movement, and collision are wired.
export const DEMO_LEVEL: readonly string[] = ['RRRRRR', 'RPDRRR', 'RR  RR', 'RRRRRR'];

const DEMO_COMMANDS: readonly Command[] = [{ type: 'move', direction: 'e' }];
const DEMO_TICKS = 30;

// Difficulty is a player-chosen setting that will live in the save system
// (tracker/tickets/011, not yet built) — default to medium until that lands.
export const DEFAULT_DIFFICULTY: Difficulty = 'medium';

export const TUNING_DATA: TuningData = parseTuningDocument(tuningDocument);

/** World 1, Level 1 — the real, playable collection level (tech-spec §10). */
export function loadWorld1Level1(): Level {
  return parseLevelDocument(w101Document);
}

const WORLD_1_LEVEL_1 = loadWorld1Level1();

/** Resolved tuning (defaults ← difficulty ← this level's overrides) that main.ts boots with. */
export const DEFAULT_TUNING: ResolvedTuning = resolveTuning(
  TUNING_DATA,
  DEFAULT_DIFFICULTY,
  WORLD_1_LEVEL_1.tuningOverrides,
);

/** Builds the real initial game state — grid + entity placements — that src/main.ts boots. */
export function createInitialGameState(): GameState {
  return createGameStateFromLevel(1, WORLD_1_LEVEL_1, DEFAULT_TUNING);
}

export interface DemoResult {
  state: GameState;
  events: SimEvent[];
}

export function runDemoTicks(): DemoResult {
  let state = createGameState(1, DEMO_LEVEL, DEFAULT_TUNING);
  const events: SimEvent[] = [];
  for (let i = 0; i < DEMO_TICKS; i++) {
    const result = advanceTick(state, DEMO_COMMANDS);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}

export function describeDemo(): string {
  const { state, events } = runDemoTicks();
  const tilesDug = events.filter((e) => e.type === 'tile-dug').length;
  return (
    `Digger Versus scaffold — sim ready (seed ${state.seed}, ${state.tuning.tickRate} ticks/s, ` +
    `tick ${state.tick}, player at (${state.player.x.toFixed(2)}, ${state.player.y.toFixed(2)}), ` +
    `${tilesDug} tile(s) dug)`
  );
}

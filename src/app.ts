// Composition root for the scaffold app (not core/ — this may touch platform
// concerns later). Builds the exact same state/tick pipeline main.ts boots,
// kept DOM-free so it's covered by app.test.ts instead of a browser harness.

import type { Command } from './core/commands';
import type { SimEvent } from './core/events';
import { advanceTick, createGameState, type GameState, TICK_RATE } from './core/sim';

// Grey-box demo level: a short east-then-south corridor through dirt and one
// rock face, just enough to prove digging, movement, and collision are wired.
export const DEMO_LEVEL: readonly string[] = ['RRRRRR', 'RPDRRR', 'RR  RR', 'RRRRRR'];

const DEMO_COMMANDS: readonly Command[] = [{ type: 'move', direction: 'e' }];
const DEMO_TICKS = 30;

export interface DemoResult {
  state: GameState;
  events: SimEvent[];
}

export function runDemoTicks(): DemoResult {
  let state = createGameState(1, DEMO_LEVEL);
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
    `Digger Versus scaffold — sim ready (seed ${state.seed}, ${TICK_RATE} ticks/s, ` +
    `tick ${state.tick}, player at (${state.player.x.toFixed(2)}, ${state.player.y.toFixed(2)}), ` +
    `${tilesDug} tile(s) dug)`
  );
}

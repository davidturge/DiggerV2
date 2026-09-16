import { describe, expect, it } from 'vitest';
import {
  describeDemo,
  runDemoTicks,
  runSackDemoTicks,
  createInitialGameState,
  DEFAULT_TUNING,
  loadWorld1Level1,
  TUNING_DATA,
} from './app';
import type { Direction8 } from './core/commands';
import type { SimEvent } from './core/events';
import { evaluateStars } from './core/levelProgress';
import { advanceTick, type GameState } from './core/sim';
import { resolveTuning } from './core/tuning';

// Runs the exact composition src/main.ts boots (createGameState + advanceTick
// over DEMO_LEVEL) — proves the core sim is actually wired into the app entry
// point, not just exercised by core/'s own unit tests.
describe('app demo composition', () => {
  it('digs through dirt and rock and moves the player while running', () => {
    const { state, events } = runDemoTicks();

    expect(events.some((e) => e.type === 'tile-dug' && e.tileType === 'dirt')).toBe(true);
    expect(events.some((e) => e.type === 'tile-dug' && e.tileType === 'rock')).toBe(true);
    expect(events.some((e) => e.type === 'player-moved')).toBe(true);
    expect(state.player.x).toBeGreaterThan(1.5);
  });

  it('produces a human-readable summary reflecting real sim output', () => {
    const summary = describeDemo();
    expect(summary).toContain('sim ready');
    expect(summary).toMatch(/\d+ tile\(s\) dug/);
    expect(summary).not.toMatch(/0 tile\(s\) dug/);
  });
});

// Runs the exact composition src/main.ts boots for the real game (issue #4):
// createInitialGameState() loads data/levels/w1-01.json + data/tuning.json
// through the same core/level + core/tuning modules, not a hand-built
// harness. These assertions target BEHAVIOR (resolved numbers actually
// driving sim output), not just "it boots without throwing" — a boot-only
// check wouldn't catch tuning.json being loaded but silently unused.
describe('real level + tuning composition (main.ts boot path)', () => {
  it('builds the grid and entity placements straight from the authored w1-01 level', () => {
    const state = createInitialGameState();
    const level = loadWorld1Level1();

    expect(state.grid.width).toBe(level.rows[0]?.length);
    expect(state.grid.height).toBe(level.rows.length);
    expect(state.entities.diamonds.length).toBeGreaterThan(0);
    expect(state.entities.bank).not.toBeNull();
    expect(state.entities).toEqual(level.entities);
  });

  it('resolves tuning from data/tuning.json (defaults + difficulty + this level\'s overrides), not a hardcoded shortcut', () => {
    const level = loadWorld1Level1();
    const expected = resolveTuning(TUNING_DATA, 'medium', level.tuningOverrides);

    expect(DEFAULT_TUNING).toEqual(expected);
    expect(createInitialGameState().tuning).toEqual(expected);
  });

  it('the resolved tuning numbers actually drive simulation output (speed + tick rate, not just shape)', () => {
    let state = createInitialGameState();
    const startX = state.player.x;
    const move = [{ type: 'move' as const, direction: 'e' as const }];
    const ticks = 10;
    const events = [];

    for (let i = 0; i < ticks; i++) {
      const result = advanceTick(state, move);
      state = result.state;
      events.push(...result.events);
    }

    const expectedDx = state.tuning.playerSpeed * (1 / state.tuning.tickRate) * ticks;
    expect(state.player.x).toBeCloseTo(startX + expectedDx, 5);
    expect(events.some((e) => e.type === 'tile-dug' && e.tileType === 'dirt')).toBe(true);
  });
});

// Runs the exact composition src/main.ts boots (createGameState + advanceTick
// over SACK_DEMO_LEVEL, resolved with the real data/tuning.json via
// DEFAULT_TUNING) — proves the gold-sack lifecycle (issue #6) is live in the
// production tick path, not just exercised by core/sacks.test.ts's unit
// tests. NOTE: data/levels/w1-01.json (the real World 1 Level 1 the game
// actually boots into) has no "G" sacks placed on its grid — that's a
// level-authoring/content decision, not a code gap — so this demo, like
// runDemoTicks()'s grey-box corridor for digging, is what stands in for a
// real level exercising the feature.
describe('sack demo composition (issue #6)', () => {
  it('undermining a sack by digging its support starts the wobble telegraph and it lands intact once the digger is clear', () => {
    const { events, state } = runSackDemoTicks();

    expect(events).toContainEqual({ type: 'sack-wobble-started', col: 1, row: 1 });
    expect(events).toContainEqual({ type: 'sack-landed', col: 1, row: 2, tilesFallen: 1, brokeApart: false });
    expect(events.some((e) => e.type === 'player-crushed')).toBe(false);
    expect(state.sacks).toEqual([{ id: 0, col: 1, row: 2, status: 'resting', elapsedMs: 0, fallOriginRow: 1 }]);
  });

  it('drives the wobble timer from the real data/tuning.json sackWobbleMs, not a hardcoded shortcut', () => {
    expect(DEFAULT_TUNING.sackWobbleMs).toBeGreaterThan(0);
    expect(DEFAULT_TUNING.sackFallTilesPerSecond).toBeGreaterThan(0);

    const { state } = runSackDemoTicks();
    expect(state.tuning.sackWobbleMs).toBe(DEFAULT_TUNING.sackWobbleMs);
    expect(state.tuning.sackFallTilesPerSecond).toBe(DEFAULT_TUNING.sackFallTilesPerSecond);
  });
});

// Greedy 8-way step toward a target — w1-01's interior has no rock walls to
// route around, just dirt to auto-dig through, so "always step the direction
// that reduces distance" reaches any tile without a real pathfinder.
function directionToward(dx: number, dy: number): Direction8 | null {
  const EPS = 0.02;
  const sx = dx > EPS ? 1 : dx < -EPS ? -1 : 0;
  const sy = dy > EPS ? 1 : dy < -EPS ? -1 : 0;
  if (sx === 0 && sy === 0) return null;
  if (sx === 1 && sy === 1) return 'se';
  if (sx === 1 && sy === -1) return 'ne';
  if (sx === -1 && sy === 1) return 'sw';
  if (sx === -1 && sy === -1) return 'nw';
  if (sx === 1) return 'e';
  if (sx === -1) return 'w';
  return sy === 1 ? 's' : 'n';
}

function walkToward(
  start: GameState,
  target: { x: number; y: number },
  maxTicks: number,
): { state: GameState; events: SimEvent[] } {
  let state = start;
  const events: SimEvent[] = [];
  for (let i = 0; i < maxTicks; i++) {
    const dx = target.x - state.player.x;
    const dy = target.y - state.player.y;
    if (Math.hypot(dx, dy) < 0.2) break;
    const direction = directionToward(dx, dy);
    const result = advanceTick(state, direction ? [{ type: 'move', direction }] : []);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}

// Runs pickup/deposit/carry-weight/level-completion/stars — issue #5's core
// systems — through the exact composition main.ts boots (createInitialGameState
// + advanceTick over the real data/levels/w1-01.json), not a hand-built
// harness, per this issue's reachability requirement. Death/respawn/spill
// (core/deathRespawn.ts) are NOT exercised here: nothing in the sim can yet
// kill the player (no sacks/enemies exist — those land in future issues), so
// that sub-feature has no live production trigger to wire into. It is
// implemented and covered by direct headless tests
// (src/core/deathRespawn.test.ts) instead, as this issue explicitly asks for.
describe('diamonds, bank, and level completion on the real w1-01 level (main.ts boot path)', () => {
  it('collects and banks every diamond end to end, completing the level and earning at least 2 stars', () => {
    let state = createInitialGameState();
    const level = loadWorld1Level1();
    const bank = level.entities.bank;
    if (!bank) throw new Error('w1-01 must have a bank for this test to be meaningful');

    const allEvents: SimEvent[] = [];
    for (const diamond of level.entities.diamonds) {
      const leg = walkToward(state, { x: diamond.col + 0.5, y: diamond.row + 0.5 }, 800);
      state = leg.state;
      allEvents.push(...leg.events);
    }
    const finalLeg = walkToward(state, { x: bank.col + 0.5, y: bank.row + 0.5 }, 800);
    state = finalLeg.state;
    allEvents.push(...finalLeg.events);

    expect(allEvents.filter((e) => e.type === 'diamond-picked-up')).toHaveLength(level.entities.diamonds.length);
    expect(state.bankedDiamonds).toBe(level.entities.diamonds.length);
    expect(state.carriedDiamonds).toBe(0);
    expect(state.diamonds).toEqual([]);
    expect(state.completed).toBe(true);
    expect(allEvents.some((e) => e.type === 'level-complete')).toBe(true);
    expect(allEvents.some((e) => e.type === 'level-up')).toBe(true);

    const elapsedMs = (state.tick / state.tuning.tickRate) * 1000;
    const stars = evaluateStars(level.starThresholds, level.parTimeMs, { diamondsBankedPercent: 100, elapsedMs });
    expect(stars).toBeGreaterThanOrEqual(2); // fully collecting always clears the 2-star (≥80%) threshold
  });

  it('slows the player down as it carries more diamonds toward the bank (design.md §2.8)', () => {
    const state = createInitialGameState();
    const level = loadWorld1Level1();
    const firstDiamond = level.entities.diamonds[0];
    if (!firstDiamond) throw new Error('w1-01 must have at least one diamond for this test to be meaningful');

    const lightTick = advanceTick(state, [{ type: 'move', direction: 'e' }]);
    const lightDx = lightTick.state.player.x - state.player.x;

    const heavyState = { ...state, carriedDiamonds: 20 };
    const heavyTick = advanceTick(heavyState, [{ type: 'move', direction: 'e' }]);
    const heavyDx = heavyTick.state.player.x - heavyState.player.x;

    expect(heavyDx).toBeLessThan(lightDx);
  });
});

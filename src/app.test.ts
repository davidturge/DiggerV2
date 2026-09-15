import { describe, expect, it } from 'vitest';
import { describeDemo, runDemoTicks, createInitialGameState, DEFAULT_TUNING, loadWorld1Level1, TUNING_DATA } from './app';
import { advanceTick } from './core/sim';
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

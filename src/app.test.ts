import { describe, expect, it } from 'vitest';
import { describeDemo, runDemoTicks } from './app';

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

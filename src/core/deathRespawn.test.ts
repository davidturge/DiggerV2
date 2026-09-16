import { describe, expect, it } from 'vitest';
import { isInvulnerable, killPlayer, spillDiamonds } from './deathRespawn';
import type { TileGrid } from './tileGrid';
import type { ResolvedTuning } from './tuning';

const TUNING: ResolvedTuning = {
  tickRate: 30,
  playerSpeed: 4.5,
  rockHitsToClear: 2,
  carryWeightPerDiamond: 0.03,
  carryWeightMinMultiplier: 0.4,
  respawnInvulnerabilityMs: 1500,
  sackWobbleMs: 1800,
  sackFallTilesPerSecond: 6,
};

const GRID: TileGrid = { width: 10, height: 10, cells: [] };

describe('spillDiamonds', () => {
  it('drops one ground diamond per carried diamond, near the death position', () => {
    const spilled = spillDiamonds({ x: 5, y: 5 }, 3, 100, GRID);
    expect(spilled).toHaveLength(3);
    expect(spilled.map((d) => d.id)).toEqual([100, 101, 102]);
    for (const diamond of spilled) {
      expect(Math.hypot(diamond.x - 5, diamond.y - 5)).toBeLessThan(2);
    }
  });

  it('drops nothing when nothing was carried', () => {
    expect(spillDiamonds({ x: 5, y: 5 }, 0, 0, GRID)).toEqual([]);
  });

  it('keeps every spilled diamond within the grid bounds, even at the edge', () => {
    const spilled = spillDiamonds({ x: 0.5, y: 0.5 }, 12, 0, GRID);
    for (const diamond of spilled) {
      expect(diamond.x).toBeGreaterThanOrEqual(0.5);
      expect(diamond.x).toBeLessThanOrEqual(GRID.width - 0.5);
      expect(diamond.y).toBeGreaterThanOrEqual(0.5);
      expect(diamond.y).toBeLessThanOrEqual(GRID.height - 0.5);
    }
  });

  it('is deterministic for the same inputs (no wall-clock/RNG in core)', () => {
    expect(spillDiamonds({ x: 5, y: 5 }, 7, 0, GRID)).toEqual(spillDiamonds({ x: 5, y: 5 }, 7, 0, GRID));
  });
});

describe('killPlayer', () => {
  const respawnPoint = { x: 1.5, y: 1.5 };
  const diamonds = [{ id: 0, x: 8.5, y: 8.5 }];
  const deathPosition = { x: 5.5, y: 5.5 };

  function input(overrides: { carriedDiamonds: number; tick: number }) {
    return { grid: GRID, diamonds, nextDiamondId: 1, deathPosition, respawnPoint, tuning: TUNING, ...overrides };
  }

  it('spills every carried diamond onto the ground at the death position', () => {
    const result = killPlayer(input({ carriedDiamonds: 4, tick: 90 }));
    expect(result.diamonds).toHaveLength(diamonds.length + 4);
    expect(result.diamonds.slice(0, 1)).toEqual(diamonds);
    expect(result.nextDiamondId).toBe(5);
  });

  it('resets carried count to zero and moves the player to the fixed respawn point', () => {
    const result = killPlayer(input({ carriedDiamonds: 4, tick: 90 }));
    expect(result.carriedDiamonds).toBe(0);
    expect(result.player).toEqual(respawnPoint);
  });

  it('grants a brief invulnerability window sized from tuning.respawnInvulnerabilityMs', () => {
    const result = killPlayer(input({ carriedDiamonds: 0, tick: 90 }));
    const expectedTicks = Math.round((TUNING.respawnInvulnerabilityMs / 1000) * TUNING.tickRate);
    expect(result.invulnerableUntilTick).toBe(90 + expectedTicks);
  });

  it('emits player-died and player-respawned events', () => {
    const result = killPlayer(input({ carriedDiamonds: 2, tick: 0 }));
    expect(result.events).toEqual([
      { type: 'player-died', x: 5.5, y: 5.5, spilledCount: 2 },
      { type: 'player-respawned', x: respawnPoint.x, y: respawnPoint.y },
    ]);
  });
});

describe('isInvulnerable', () => {
  it('is true strictly before the invulnerability window ends', () => {
    expect(isInvulnerable(100, 50)).toBe(true);
    expect(isInvulnerable(100, 99)).toBe(true);
  });

  it('is false once the current tick reaches the window end', () => {
    expect(isInvulnerable(100, 100)).toBe(false);
    expect(isInvulnerable(100, 150)).toBe(false);
  });
});

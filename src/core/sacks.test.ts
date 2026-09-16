import { describe, expect, it } from 'vitest';
import { parseLevel } from './tileGrid';
import { createSackStates, resolveSackPush, sackBlockedCells, updateSackPhysics, type SackState } from './sacks';

const TUNING = { sackWobbleMs: 1000, sackFallTilesPerSecond: 5 };
const FALL_STEP_S = 1 / TUNING.sackFallTilesPerSecond;

function grid(rows: readonly string[]) {
  return parseLevel(rows, 2).grid;
}

describe('createSackStates', () => {
  it('starts every sack resting at its level-file placement', () => {
    const sacks = createSackStates([{ col: 2, row: 1 }, { col: 5, row: 3 }]);
    expect(sacks).toEqual([
      { id: 0, col: 2, row: 1, status: 'resting', elapsedMs: 0, fallOriginRow: 1 },
      { id: 1, col: 5, row: 3, status: 'resting', elapsedMs: 0, fallOriginRow: 3 },
    ]);
  });
});

describe('sackBlockedCells', () => {
  it('reports the cell of every sack regardless of status', () => {
    const sacks: SackState[] = [
      { id: 0, col: 1, row: 1, status: 'resting', elapsedMs: 0, fallOriginRow: 1 },
      { id: 1, col: 3, row: 4, status: 'falling', elapsedMs: 0, fallOriginRow: 2 },
    ];
    expect(sackBlockedCells(sacks)).toEqual(new Set(['1,1', '3,4']));
  });
});

describe('undermining and wobble', () => {
  it('stays resting while the cell below is solid ground', () => {
    const g = grid(['RRR', 'RGR', 'RDR', 'RRR']);
    const sacks = createSackStates([{ col: 1, row: 1 }]);
    const result = updateSackPhysics(g, sacks, { x: 0, y: 0 }, FALL_STEP_S, TUNING);
    expect(result.sacks).toEqual(sacks);
    expect(result.events).toEqual([]);
  });

  it('starts wobbling with sack-wobble-started once the support cell is dug out, and does not fall immediately', () => {
    const g = grid(['RRR', 'RGR', 'R R', 'RRR']); // tunnel directly below the sack
    const sacks = createSackStates([{ col: 1, row: 1 }]);
    const result = updateSackPhysics(g, sacks, { x: 0, y: 0 }, FALL_STEP_S, TUNING);

    expect(result.events).toContainEqual({ type: 'sack-wobble-started', col: 1, row: 1 });
    expect(result.sacks).toEqual([{ id: 0, col: 1, row: 1, status: 'wobbling', elapsedMs: 0, fallOriginRow: 1 }]);
  });

  it('only transitions to falling once the wobble timer (tuning) elapses', () => {
    const g = grid(['RRR', 'RGR', 'R R', 'RRR']);
    let sacks = createSackStates([{ col: 1, row: 1 }]);
    let result = updateSackPhysics(g, sacks, { x: 0, y: 0 }, FALL_STEP_S, TUNING); // -> wobbling
    sacks = result.sacks;

    // Almost, but not quite, the full wobble duration.
    result = updateSackPhysics(g, sacks, { x: 0, y: 0 }, TUNING.sackWobbleMs / 1000 - 0.01, TUNING);
    expect(result.sacks[0]?.status).toBe('wobbling');
    expect(result.events).toEqual([]);
    sacks = result.sacks;

    result = updateSackPhysics(g, sacks, { x: 0, y: 0 }, 0.02, TUNING);
    expect(result.sacks[0]?.status).toBe('falling');
  });
});

describe('falling and landing', () => {
  function wobbleThenFallOnce(rows: readonly string[]) {
    const g = grid(rows);
    let sacks = createSackStates([{ col: 1, row: 1 }]);
    let result = updateSackPhysics(g, sacks, { x: 0, y: 0 }, FALL_STEP_S, TUNING); // start wobbling
    sacks = result.sacks;
    result = updateSackPhysics(g, sacks, { x: 0, y: 0 }, TUNING.sackWobbleMs / 1000, TUNING); // -> falling
    return { grid: g, sacks: result.sacks };
  }

  it('falls tile-by-tile: one fall step per fall-speed interval, not instantly', () => {
    const { grid: g, sacks: falling } = wobbleThenFallOnce(['RRR', 'RGR', 'R R', 'R R', 'R R', 'RRR']);
    // Half a fall-step: shouldn't have moved yet.
    const result = updateSackPhysics(g, falling, { x: 0, y: 0 }, FALL_STEP_S / 2, TUNING);
    expect(result.sacks[0]).toMatchObject({ row: 1, status: 'falling' });
  });

  it('lands intact (no break) after falling exactly 1 tile', () => {
    // Sack at row 1 falls into row 2 (tunnel), then row 3 is dirt -> lands after 1 tile.
    const { grid: g, sacks: falling } = wobbleThenFallOnce(['RRR', 'RGR', 'R R', 'RDR', 'RRR']);

    // Step 1: moves into row 2, still falling. Step 2: blocked by dirt at row 3 -> lands.
    let sacks = falling;
    let result = updateSackPhysics(g, sacks, { x: 0, y: 0 }, FALL_STEP_S, TUNING);
    sacks = result.sacks;
    expect(sacks[0]).toMatchObject({ row: 2, status: 'falling' });

    result = updateSackPhysics(g, sacks, { x: 0, y: 0 }, FALL_STEP_S, TUNING);

    expect(result.sacks).toEqual([{ id: 0, col: 1, row: 2, status: 'resting', elapsedMs: 0, fallOriginRow: 1 }]);
    expect(result.events).toContainEqual({ type: 'sack-landed', col: 1, row: 2, tilesFallen: 1, brokeApart: false });
    expect(result.goldPieces).toEqual([]);
  });

  it('breaks into collectable gold pieces after falling 2+ tiles', () => {
    // Sack falls from row 1 through rows 2 and 3 (tunnel), landing on dirt at row 4 -> 2 tiles fallen.
    const { grid: g, sacks: falling } = wobbleThenFallOnce(['RRR', 'RGR', 'R R', 'R R', 'RDR', 'RRR']);
    let sacks = falling;
    let events = [] as ReturnType<typeof updateSackPhysics>['events'];
    let goldPieces = [] as ReturnType<typeof updateSackPhysics>['goldPieces'];

    for (let i = 0; i < 3; i++) {
      const result = updateSackPhysics(g, sacks, { x: 0, y: 0 }, FALL_STEP_S, TUNING);
      sacks = result.sacks;
      events = events.concat(result.events);
      goldPieces = goldPieces.concat(result.goldPieces);
    }

    expect(sacks).toEqual([]); // the sack itself is gone, broken apart
    expect(events).toContainEqual({ type: 'sack-landed', col: 1, row: 3, tilesFallen: 2, brokeApart: true });
    expect(goldPieces).toEqual([
      { col: 1, row: 3 },
      { col: 1, row: 3 },
    ]);
  });

  it('crushes the player on contact while falling (enemies hook into this same check in #8)', () => {
    const { grid: g, sacks: falling } = wobbleThenFallOnce(['RRR', 'RGR', 'R R', 'R R', 'RRR']);
    // Player standing in the cell the sack is about to fall into.
    const result = updateSackPhysics(g, falling, { x: 1.5, y: 2.5 }, FALL_STEP_S, TUNING);
    expect(result.events).toContainEqual({ type: 'player-crushed', col: 1, row: 2 });
  });

  it('does not crush a player standing elsewhere', () => {
    const { grid: g, sacks: falling } = wobbleThenFallOnce(['RRR', 'RGR', 'R R', 'R R', 'RRR']);
    const result = updateSackPhysics(g, falling, { x: 10, y: 10 }, FALL_STEP_S, TUNING);
    expect(result.events.some((e) => e.type === 'player-crushed')).toBe(false);
  });
});

describe('chain undermining', () => {
  it('undermining the bottom sack eventually starts the sack stacked above it wobbling too', () => {
    // Two sacks stacked at (1,1) and (1,2); dig out the floor below the stack (1,3 is tunnel).
    const g = grid(['RRR', 'RGR', 'RGR', 'R R', 'RRR']);
    let sacks = createSackStates([{ col: 1, row: 1 }, { col: 1, row: 2 }]);
    const player = { x: 0, y: 0 };
    let allEvents = [] as ReturnType<typeof updateSackPhysics>['events'];

    // Tick 1: bottom sack (row 2) is unsupported (row 3 is tunnel) and starts wobbling.
    // Top sack (row 1) is still supported by the bottom sack sitting at row 2.
    let result = updateSackPhysics(g, sacks, player, FALL_STEP_S, TUNING);
    sacks = result.sacks;
    allEvents = allEvents.concat(result.events);
    expect(sacks.find((s) => s.row === 2)?.status).toBe('wobbling');
    expect(sacks.find((s) => s.row === 1)?.status).toBe('resting');

    // Advance past the wobble timer: bottom sack starts falling and leaves row 2.
    result = updateSackPhysics(g, sacks, player, TUNING.sackWobbleMs / 1000, TUNING);
    sacks = result.sacks;
    allEvents = allEvents.concat(result.events);
    const bottom = sacks.find((s) => s.fallOriginRow === 2);
    expect(bottom?.status).toBe('falling');

    // One fall step: the bottom sack actually moves out of row 2 into row 3.
    // The top sack's support check this same tick still sees the pre-tick
    // snapshot (bottom sack still "at" row 2), so it's still resting here.
    result = updateSackPhysics(g, sacks, player, FALL_STEP_S, TUNING);
    sacks = result.sacks;
    allEvents = allEvents.concat(result.events);
    expect(sacks.find((s) => s.col === 1 && s.fallOriginRow === 1)?.status).toBe('resting');

    // Next tick: row 2 is now genuinely empty (no tile support, no sack there
    // anymore) — the top sack loses support and starts wobbling in turn.
    result = updateSackPhysics(g, sacks, player, FALL_STEP_S, TUNING);
    sacks = result.sacks;
    allEvents = allEvents.concat(result.events);
    const top = sacks.find((s) => s.col === 1 && s.fallOriginRow === 1);
    expect(top?.status).toBe('wobbling');
    expect(allEvents.filter((e) => e.type === 'sack-wobble-started')).toHaveLength(2);
  });
});

describe('horizontal push', () => {
  it('moves a resting sack one cell when the far side is open tunnel', () => {
    const g = grid(['RRRRR', 'RPG R', 'RRRRR']);
    const sacks = createSackStates([{ col: 2, row: 1 }]);
    const events: Parameters<typeof resolveSackPush>[4] = [];
    const next = resolveSackPush(g, sacks, { x: 1.5, y: 1.5 }, { dx: 1, dy: 0 }, events);

    expect(next).toEqual([{ id: 0, col: 3, row: 1, status: 'resting', elapsedMs: 0, fallOriginRow: 1 }]);
    expect(events).toContainEqual({ type: 'sack-pushed', fromCol: 2, fromRow: 1, toCol: 3, toRow: 1 });
  });

  it('refuses to push into a solid tile', () => {
    const g = grid(['RRRR', 'RPGR', 'RRRR']);
    const sacks = createSackStates([{ col: 2, row: 1 }]);
    const events: Parameters<typeof resolveSackPush>[4] = [];
    const next = resolveSackPush(g, sacks, { x: 1.5, y: 1.5 }, { dx: 1, dy: 0 }, events);

    expect(next).toEqual(sacks);
    expect(events).toEqual([]);
  });

  it('refuses to push into a cell already occupied by another sack', () => {
    const g = grid(['RRRRR', 'RPGGR', 'RRRRR']);
    const sacks = createSackStates([{ col: 2, row: 1 }, { col: 3, row: 1 }]);
    const events: Parameters<typeof resolveSackPush>[4] = [];
    const next = resolveSackPush(g, sacks, { x: 1.5, y: 1.5 }, { dx: 1, dy: 0 }, events);

    expect(next).toEqual(sacks);
    expect(events).toEqual([]);
  });

  it('never pushes on a vertical or diagonal move', () => {
    const g = grid(['RRRR', 'R R ', 'RPG ', 'RRRR']);
    const sacks = createSackStates([{ col: 2, row: 2 }]);

    for (const direction of [{ dx: 0, dy: -1 }, { dx: 1, dy: -1 }] as const) {
      const events: Parameters<typeof resolveSackPush>[4] = [];
      const next = resolveSackPush(g, sacks, { x: 1.5, y: 2.5 }, direction, events);
      expect(next).toEqual(sacks);
      expect(events).toEqual([]);
    }
  });

  it('does not push a sack that is already wobbling or falling', () => {
    const g = grid(['RRRR', 'RPG ', 'RRRR']);
    const sacks: SackState[] = [{ id: 0, col: 2, row: 1, status: 'wobbling', elapsedMs: 0, fallOriginRow: 1 }];
    const events: Parameters<typeof resolveSackPush>[4] = [];
    const next = resolveSackPush(g, sacks, { x: 1.5, y: 1.5 }, { dx: 1, dy: 0 }, events);

    expect(next).toEqual(sacks);
    expect(events).toEqual([]);
  });
});

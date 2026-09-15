import { describe, expect, it } from 'vitest';
import type { Command } from './commands';
import { advanceTick, createGameState, createRng } from './sim';
import type { ResolvedTuning } from './tuning';

const TUNING: ResolvedTuning = { tickRate: 30, playerSpeed: 4.5, rockHitsToClear: 2 };

describe('sim scaffold', () => {
  it('advances ticks immutably', () => {
    const s0 = createGameState(42, ['RRR', 'RPR', 'RRR'], TUNING);
    const { state: s1 } = advanceTick(s0, []);
    expect(s0.tick).toBe(0);
    expect(s1.tick).toBe(1);
  });

  it('rng is deterministic for a given seed', () => {
    const a = createRng(1234);
    const b = createRng(1234);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
    expect(createRng(1)()).not.toBe(createRng(2)());
  });
});

describe('level parsing', () => {
  it('places the player at the P marker, centered in its tile', () => {
    const state = createGameState(1, ['RRRR', 'RPRR', 'RRRR'], TUNING);
    expect(state.player).toEqual({ x: 1.5, y: 1.5 });
  });
});

describe('digging', () => {
  it('auto-digs dirt on cell entry and emits tile-dug', () => {
    let state = createGameState(1, ['RRRR', 'RPDR', 'RRRR'], TUNING);
    const move: Command[] = [{ type: 'move', direction: 'e' }];
    const allEvents = [];
    for (let i = 0; i < 12; i++) {
      const result = advanceTick(state, move);
      state = result.state;
      allEvents.push(...result.events);
    }

    const dugCol2 = state.grid.cells[1 * state.grid.width + 2];
    expect(dugCol2).toEqual({ type: 'tunnel', rockHitsRemaining: 0 });
    expect(allEvents).toContainEqual({ type: 'tile-dug', col: 2, row: 1, tileType: 'dirt' });
    expect(allEvents.some((e) => e.type === 'player-moved')).toBe(true);
  });
});

describe('rock', () => {
  it('takes exactly 2 dig-hits to clear, blocking movement until then', () => {
    let state = createGameState(1, ['RRRR', 'PR R', 'RRRR'], TUNING);
    const move: Command[] = [{ type: 'move', direction: 'e' }];

    // Tick 1: closes the gap to the rock face, no collision yet.
    ({ state } = advanceTick(state, move));
    expect(state.player.x).toBeCloseTo(0.65, 5);
    const cellAfterTick1 = state.grid.cells[1 * state.grid.width + 1];
    expect(cellAfterTick1).toEqual({ type: 'rock', rockHitsRemaining: 2 });

    // Tick 2: first dig-hit against the rock; still blocked.
    let result = advanceTick(state, move);
    state = result.state;
    expect(state.player.x).toBeCloseTo(0.65, 5);
    let cell = state.grid.cells[1 * state.grid.width + 1];
    expect(cell).toEqual({ type: 'rock', rockHitsRemaining: 1 });
    expect(result.events).not.toContainEqual(expect.objectContaining({ type: 'tile-dug' }));

    // Tick 3: second dig-hit clears the rock to tunnel; still blocked this tick.
    result = advanceTick(state, move);
    state = result.state;
    expect(state.player.x).toBeCloseTo(0.65, 5);
    cell = state.grid.cells[1 * state.grid.width + 1];
    expect(cell).toEqual({ type: 'tunnel', rockHitsRemaining: 0 });
    expect(result.events).toContainEqual({ type: 'tile-dug', col: 1, row: 1, tileType: 'rock' });

    // Tick 4: rock is gone, player moves through.
    ({ state } = advanceTick(state, move));
    expect(state.player.x).toBeGreaterThan(0.65);
  });

  it('never takes more than one dig-hit per tick, even when approached diagonally at a corner', () => {
    // Rock at (2,2) with open orthogonal neighbors (2,1) and (1,2) — a diagonal
    // 'se' approach can overlap the rock from both the x-pass and y-pass of a
    // single tick's axis resolution; that must still only count as one hit.
    let state = createGameState(1, ['RRRRR', 'RP  R', 'R RRR', 'RRRRR'], TUNING);
    const move: Command[] = [{ type: 'move', direction: 'se' }];

    let sawFirstHit = false;
    for (let i = 0; i < 10; i++) {
      const result = advanceTick(state, move);
      state = result.state;
      const digEvents = result.events.filter((e) => e.type === 'tile-dug');
      expect(digEvents.length).toBeLessThanOrEqual(1);
      const rockCell = state.grid.cells[2 * state.grid.width + 2];
      if (rockCell?.type === 'rock' && rockCell.rockHitsRemaining === 1) {
        expect(sawFirstHit).toBe(false); // must observe the 1-hit state before it clears
        sawFirstHit = true;
      }
    }
    expect(sawFirstHit).toBe(true);
    expect(state.grid.cells[2 * state.grid.width + 2]).toEqual({ type: 'tunnel', rockHitsRemaining: 0 });
  });
});

describe('collision', () => {
  it('blocks movement at the grid bounds', () => {
    let state = createGameState(1, ['RRRR', 'P  R', 'RRRR'], TUNING);
    const move: Command[] = [{ type: 'move', direction: 'w' }];

    for (let i = 0; i < 10; i++) {
      ({ state } = advanceTick(state, move));
    }

    expect(state.player.x).toBeGreaterThanOrEqual(0);
    // Settles against the west wall and stays put.
    const settledX = state.player.x;
    ({ state } = advanceTick(state, move));
    expect(state.player.x).toBe(settledX);
  });
});

describe('diagonal gap', () => {
  it('refuses to corner-cut between two rock tiles touching at a point', () => {
    const rows = ['RRRR', 'RPRR', 'RR R', 'RRRR'];
    let state = createGameState(1, rows, TUNING);
    const startX = state.player.x;
    const startY = state.player.y;
    const move: Command[] = [{ type: 'move', direction: 'se' }];

    for (let i = 0; i < 10; i++) {
      const result = advanceTick(state, move);
      state = result.state;
      expect(result.events).toEqual([]);
    }

    expect(state.player.x).toBe(startX);
    expect(state.player.y).toBe(startY);
  });
});

describe('shoot / useAbility', () => {
  it('are accepted as no-op stubs', () => {
    const state = createGameState(1, ['RRR', 'RPR', 'RRR'], TUNING);
    const { state: s1 } = advanceTick(state, [{ type: 'shoot' }, { type: 'useAbility' }]);
    expect(s1.player).toEqual(state.player);
    expect(s1.tick).toBe(1);
  });
});

describe('determinism', () => {
  it('same seed + same commands = same state', () => {
    const rows = ['RRRRRR', 'RP DRR', 'RR  RR', 'RRRRRR'];
    const commands: Command[][] = [
      [{ type: 'move', direction: 'e' }],
      [{ type: 'move', direction: 'e' }],
      [{ type: 'move', direction: 'se' }],
      [{ type: 'move', direction: 's' }],
      [{ type: 'shoot' }],
      [{ type: 'move', direction: 'e' }],
    ];

    function run() {
      let state = createGameState(7, rows, TUNING);
      const events = [];
      for (let i = 0; i < 30; i++) {
        const cmd = commands[i % commands.length] ?? [];
        const result = advanceTick(state, cmd);
        state = result.state;
        events.push(...result.events);
      }
      return { state, events };
    }

    const runA = run();
    const runB = run();
    expect(runA.state).toEqual(runB.state);
    expect(runA.events).toEqual(runB.events);
  });
});

describe('vertical movement', () => {
  // Regression: the y-axis resolveAxis call had its candidate/perpendicular
  // arguments swapped, so pure n/s never moved and diagonals bent downward.
  const CROSS = ['RRRRR', 'RR RR', 'RRPRR', 'RR RR', 'RRRRR'];

  it.each([
    ['n', -1],
    ['s', 1],
  ] as const)('moving %s changes y in that direction and leaves x alone', (direction, sign) => {
    let state = createGameState(1, CROSS, TUNING);
    const start = state.player;
    for (let i = 0; i < 5; i++) {
      state = advanceTick(state, [{ type: 'move', direction }]).state;
    }
    expect(Math.sign(state.player.y - start.y)).toBe(sign);
    expect(state.player.x).toBe(start.x);
  });

  it('moving ne goes up and to the right', () => {
    let state = createGameState(1, ['RRRRRR', 'RR   R', 'RR   R', 'RRP  R', 'RRRRRR'], TUNING);
    const start = state.player;
    for (let i = 0; i < 5; i++) {
      state = advanceTick(state, [{ type: 'move', direction: 'ne' }]).state;
    }
    expect(state.player.x).toBeGreaterThan(start.x);
    expect(state.player.y).toBeLessThan(start.y);
  });
});

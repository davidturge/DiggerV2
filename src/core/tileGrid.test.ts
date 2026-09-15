import { describe, expect, it } from 'vitest';
import { getCell, parseLevel } from './tileGrid';

const ROCK_HITS_TO_CLEAR = 2;

describe('parseLevel', () => {
  it('maps the legend to tile types', () => {
    const { grid } = parseLevel(['RD '], ROCK_HITS_TO_CLEAR);
    expect(getCell(grid, 0, 0)).toEqual({ type: 'rock', rockHitsRemaining: ROCK_HITS_TO_CLEAR });
    expect(getCell(grid, 1, 0)).toEqual({ type: 'dirt', rockHitsRemaining: 0 });
    expect(getCell(grid, 2, 0)).toEqual({ type: 'tunnel', rockHitsRemaining: 0 });
  });

  it('maps entity markers (diamond/sack/bank/spawner) to open tunnel tiles', () => {
    const { grid } = parseLevel(['*GBs'], ROCK_HITS_TO_CLEAR);
    expect(getCell(grid, 0, 0)).toEqual({ type: 'tunnel', rockHitsRemaining: 0 });
    expect(getCell(grid, 1, 0)).toEqual({ type: 'tunnel', rockHitsRemaining: 0 });
    expect(getCell(grid, 2, 0)).toEqual({ type: 'tunnel', rockHitsRemaining: 0 });
    expect(getCell(grid, 3, 0)).toEqual({ type: 'tunnel', rockHitsRemaining: 0 });
  });

  it('applies the given rockHitsToClear to rock cells', () => {
    const { grid } = parseLevel(['R'], 5);
    expect(getCell(grid, 0, 0)).toEqual({ type: 'rock', rockHitsRemaining: 5 });
  });

  it('defaults the player start to the center tile (not a grid line) when no P marker is present', () => {
    const { grid, playerStart } = parseLevel(['DDDD', 'DDDD'], ROCK_HITS_TO_CLEAR);
    expect(playerStart).toEqual({
      x: Math.floor(grid.width / 2) + 0.5,
      y: Math.floor(grid.height / 2) + 0.5,
    });
  });

  it('rejects an unknown legend character', () => {
    expect(() => parseLevel(['RXR'], ROCK_HITS_TO_CLEAR)).toThrow(/unknown tile/i);
  });

  it('rejects rows of inconsistent length', () => {
    expect(() => parseLevel(['RRR', 'RR'], ROCK_HITS_TO_CLEAR)).toThrow(/length/i);
  });

  it('rejects a level with more than one P start marker', () => {
    expect(() => parseLevel(['RPRR', 'RPRR'], ROCK_HITS_TO_CLEAR)).toThrow(/duplicate.*P/i);
  });
});

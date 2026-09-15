import { describe, expect, it } from 'vitest';
import { parseLevel } from '../core/tileGrid';
import { buildTileIndex, collectTilePositions, tileKey } from './tileInstances';

describe('collectTilePositions', () => {
  it('collects only cells of the requested type, in row-major order', () => {
    const { grid } = parseLevel(['RD ', 'DDR']);
    expect(collectTilePositions(grid, 'dirt')).toEqual([
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
    ]);
    expect(collectTilePositions(grid, 'rock')).toEqual([
      { col: 0, row: 0 },
      { col: 2, row: 1 },
    ]);
  });

  it('returns an empty list when the type is absent', () => {
    const { grid } = parseLevel(['   ']);
    expect(collectTilePositions(grid, 'rock')).toEqual([]);
  });
});

describe('buildTileIndex', () => {
  it('assigns sequential InstancedMesh indices matching input order', () => {
    const positions = [
      { col: 1, row: 0 },
      { col: 0, row: 1 },
    ];
    const index = buildTileIndex(positions);
    expect(index.get(tileKey(1, 0))).toBe(0);
    expect(index.get(tileKey(0, 1))).toBe(1);
  });

  it('returns undefined for a position that was never collected (e.g. already-dug tunnel)', () => {
    const index = buildTileIndex([{ col: 0, row: 0 }]);
    expect(index.get(tileKey(5, 5))).toBeUndefined();
  });
});

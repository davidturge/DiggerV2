import { describe, expect, it } from 'vitest';
import { toEntityWorldPositions } from './entityInstances';
import { tileCenterWorldX, tileCenterWorldY } from './worldSpace';

describe('toEntityWorldPositions', () => {
  it('maps each grid position to its tile-center world position, in input order', () => {
    const positions = [
      { col: 2, row: 1 },
      { col: 5, row: 3 },
    ];
    expect(toEntityWorldPositions(positions)).toEqual([
      { x: tileCenterWorldX(2), y: tileCenterWorldY(1) },
      { x: tileCenterWorldX(5), y: tileCenterWorldY(3) },
    ]);
  });

  it('returns an empty list for an empty input', () => {
    expect(toEntityWorldPositions([])).toEqual([]);
  });
});

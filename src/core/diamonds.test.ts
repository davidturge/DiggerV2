import { describe, expect, it } from 'vitest';
import { placeDiamonds, resolvePickup } from './diamonds';

describe('placeDiamonds', () => {
  it('centers each grid-marker position in its tile and assigns sequential ids', () => {
    const diamonds = placeDiamonds([{ col: 2, row: 1 }, { col: 5, row: 3 }]);
    expect(diamonds).toEqual([
      { id: 0, x: 2.5, y: 1.5 },
      { id: 1, x: 5.5, y: 3.5 },
    ]);
  });

  it('returns an empty array for a level with no diamonds', () => {
    expect(placeDiamonds([])).toEqual([]);
  });
});

describe('resolvePickup', () => {
  it('picks up a diamond the player is standing on and removes it from the ground list', () => {
    const diamonds = placeDiamonds([{ col: 2, row: 1 }]);
    const result = resolvePickup(diamonds, { x: 2.5, y: 1.5 });
    expect(result.pickedUp).toEqual([{ id: 0, x: 2.5, y: 1.5 }]);
    expect(result.diamonds).toEqual([]);
  });

  it('leaves diamonds out of pickup radius untouched', () => {
    const diamonds = placeDiamonds([{ col: 2, row: 1 }, { col: 10, row: 10 }]);
    const result = resolvePickup(diamonds, { x: 2.5, y: 1.5 });
    expect(result.pickedUp).toEqual([{ id: 0, x: 2.5, y: 1.5 }]);
    expect(result.diamonds).toEqual([{ id: 1, x: 10.5, y: 10.5 }]);
  });

  it('picks up every diamond overlapping the player in one call', () => {
    const diamonds = placeDiamonds([{ col: 2, row: 1 }, { col: 2, row: 2 }]);
    // Standing right on the boundary between the two tiles overlaps both pickup radii.
    const result = resolvePickup(diamonds, { x: 2.5, y: 2.0 });
    expect(result.pickedUp).toHaveLength(2);
    expect(result.diamonds).toEqual([]);
  });

  it('is a no-op when there are no diamonds', () => {
    const result = resolvePickup([], { x: 0, y: 0 });
    expect(result).toEqual({ diamonds: [], pickedUp: [] });
  });
});

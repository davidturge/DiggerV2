import { describe, expect, it } from 'vitest';
import { tileCenterWorldX, tileCenterWorldY, toWorldX, toWorldY } from './worldSpace';

describe('grid-space to world-space conversion', () => {
  it('keeps x unchanged (no mirroring on the horizontal axis)', () => {
    expect(toWorldX(3.5)).toBe(3.5);
  });

  it('mirrors y (core is y-down, three.js world space is y-up)', () => {
    expect(toWorldY(3.5)).toBe(-3.5);
  });

  it('centers a tile column/row at grid-coordinate + 0.5 before mirroring', () => {
    expect(tileCenterWorldX(0)).toBe(0.5);
    expect(tileCenterWorldY(0)).toBe(-0.5);
    expect(tileCenterWorldY(4)).toBe(-4.5);
  });
});

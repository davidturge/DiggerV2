import { describe, expect, it } from 'vitest';
import { clampAlpha, interpolateVec2, lerp } from './interpolation';

describe('lerp', () => {
  it('returns a at alpha 0 and b at alpha 1', () => {
    expect(lerp(2, 10, 0)).toBe(2);
    expect(lerp(2, 10, 1)).toBe(10);
  });

  it('returns the midpoint at alpha 0.5', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});

describe('clampAlpha', () => {
  it('passes values already in [0, 1] through unchanged', () => {
    expect(clampAlpha(0.3)).toBe(0.3);
  });

  it('clamps below 0 up to 0', () => {
    expect(clampAlpha(-0.5)).toBe(0);
  });

  it('clamps above 1 down to 1', () => {
    expect(clampAlpha(1.5)).toBe(1);
  });
});

describe('interpolateVec2', () => {
  it('blends between the previous and current sim states', () => {
    const prev = { x: 0, y: 0 };
    const curr = { x: 10, y: -4 };
    expect(interpolateVec2(prev, curr, 0.25)).toEqual({ x: 2.5, y: -1 });
  });

  it('clamps out-of-range alpha so a slow catch-up frame never overshoots', () => {
    const prev = { x: 0, y: 0 };
    const curr = { x: 10, y: 10 };
    expect(interpolateVec2(prev, curr, 1.4)).toEqual({ x: 10, y: 10 });
    expect(interpolateVec2(prev, curr, -0.4)).toEqual({ x: 0, y: 0 });
  });
});

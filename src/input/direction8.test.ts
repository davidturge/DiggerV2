import { describe, expect, it } from 'vitest';
import { angleToDirection8, computeDirection8 } from './direction8';

describe('angleToDirection8', () => {
  it.each([
    [0, 'e'],
    [Math.PI / 4, 'se'],
    [Math.PI / 2, 's'],
    [(3 * Math.PI) / 4, 'sw'],
    [Math.PI, 'w'],
    [-Math.PI, 'w'],
    [(-3 * Math.PI) / 4, 'nw'],
    [-Math.PI / 2, 'n'],
    [-Math.PI / 4, 'ne'],
  ])('snaps %f radians to %s', (angle, expected) => {
    expect(angleToDirection8(angle)).toBe(expected);
  });

  it('wraps a full turn back to the same direction', () => {
    expect(angleToDirection8(2 * Math.PI)).toBe('e');
    expect(angleToDirection8(2 * Math.PI + Math.PI / 2)).toBe('s');
  });

  it('rounds boundary angles to the nearer octant', () => {
    const halfway = Math.PI / 8;
    expect(angleToDirection8(halfway - 0.01)).toBe('e');
    expect(angleToDirection8(halfway + 0.01)).toBe('se');
  });
});

describe('computeDirection8', () => {
  it('returns null inside the dead zone', () => {
    expect(computeDirection8(1, 1, 10)).toBeNull();
    expect(computeDirection8(0, 0, 10)).toBeNull();
  });

  it('treats the dead zone boundary itself (magnitude === deadZone) as outside it', () => {
    expect(computeDirection8(10, 0, 10)).toBe('e');
  });

  it('snaps once past the dead zone', () => {
    expect(computeDirection8(10.01, 0, 10)).toBe('e');
  });

  it('snaps a diagonal drag to the nearest compass direction', () => {
    expect(computeDirection8(30, 30, 10)).toBe('se');
    expect(computeDirection8(-30, -30, 10)).toBe('nw');
  });
});

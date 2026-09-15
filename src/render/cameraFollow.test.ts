import { describe, expect, it } from 'vitest';
import { smoothFollow } from './cameraFollow';

describe('smoothFollow', () => {
  it('does not move when dt is 0', () => {
    expect(smoothFollow(0, 10, 8, 0)).toBe(0);
  });

  it('moves toward the target without overshooting', () => {
    const next = smoothFollow(0, 10, 8, 1 / 30);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(10);
  });

  it('converges arbitrarily close to the target over sustained time', () => {
    let value = 0;
    for (let i = 0; i < 300; i++) {
      value = smoothFollow(value, 10, 8, 1 / 30);
    }
    expect(value).toBeCloseTo(10, 3);
  });

  it('is a no-op once already at the target', () => {
    expect(smoothFollow(5, 5, 8, 1 / 30)).toBeCloseTo(5);
  });
});

import { describe, expect, it } from 'vitest';
import { advanceTick, createGameState, createRng, TICK_RATE } from './sim';

describe('sim scaffold', () => {
  it('runs at 30 ticks per second', () => {
    expect(TICK_RATE).toBe(30);
  });

  it('advances ticks immutably', () => {
    const s0 = createGameState(42);
    const s1 = advanceTick(s0);
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

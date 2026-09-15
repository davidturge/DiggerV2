import { describe, expect, it } from 'vitest';
import { stepFixedTimestep } from './fixedTimestepLoop';

const TICK_DT = 1 / 30;

describe('stepFixedTimestep', () => {
  it('does not step when the frame delta has not reached a full tick', () => {
    const step = (n: number) => n + 1;
    const result = stepFixedTimestep(0, TICK_DT / 2, TICK_DT, 5, 0, step);
    expect(result.steppedTicks).toBe(0);
    expect(result.state).toBe(0);
    expect(result.accumulator).toBeCloseTo(TICK_DT / 2);
  });

  it('steps exactly once when the frame delta equals one tick', () => {
    const step = (n: number) => n + 1;
    const result = stepFixedTimestep(0, TICK_DT, TICK_DT, 5, 0, step);
    expect(result.steppedTicks).toBe(1);
    expect(result.state).toBe(1);
    expect(result.accumulator).toBeCloseTo(0);
  });

  it('steps multiple ticks to consume a multi-tick frame delta', () => {
    const step = (n: number) => n + 1;
    const result = stepFixedTimestep(0, TICK_DT * 3, TICK_DT, 5, 0, step);
    expect(result.steppedTicks).toBe(3);
    expect(result.state).toBe(3);
    expect(result.accumulator).toBeCloseTo(0);
  });

  it('carries a partial leftover accumulator forward to the next frame', () => {
    const step = (n: number) => n + 1;
    const result = stepFixedTimestep(0, TICK_DT * 1.5, TICK_DT, 5, 0, step);
    expect(result.steppedTicks).toBe(1);
    expect(result.accumulator).toBeCloseTo(TICK_DT * 0.5);
  });

  it('clamps catch-up at maxCatchupTicks and drops the rest of the backlog (no spiral of death)', () => {
    const step = (n: number) => n + 1;
    // a 10-second stall would demand ~300 ticks; the clamp must cap the work
    // done in a single frame and discard the un-runnable backlog rather than
    // letting the accumulator grow without bound.
    const result = stepFixedTimestep(0, 10, TICK_DT, 5, 0, step);
    expect(result.steppedTicks).toBe(5);
    expect(result.state).toBe(5);
    expect(result.accumulator).toBeLessThan(TICK_DT);
    expect(result.accumulator).toBeGreaterThanOrEqual(0);
  });

  it('threads accumulated state through every step call in order', () => {
    const calls: number[] = [];
    const step = (n: number) => {
      calls.push(n);
      return n + 10;
    };
    const result = stepFixedTimestep(0, TICK_DT * 3, TICK_DT, 5, 100, step);
    expect(calls).toEqual([100, 110, 120]);
    expect(result.state).toBe(130);
  });
});

// render/ — fixed-timestep accumulator bridging variable-rate rAF frames to
// the fixed-rate core sim ("Fix Your Timestep", tech-spec §3, §4).

export interface FixedStepResult<S> {
  state: S;
  accumulator: number;
  steppedTicks: number;
}

/**
 * Advances `state` by zero or more fixed-size ticks to consume `frameDt` of
 * newly-elapsed real time. Caps ticks run in one call at `maxCatchupTicks`
 * and, if still behind after that cap, drops the remaining backlog instead
 * of letting the accumulator grow without bound — the clamp that prevents a
 * slow frame from spiraling into ever-slower frames.
 */
export function stepFixedTimestep<S>(
  accumulator: number,
  frameDt: number,
  tickDt: number,
  maxCatchupTicks: number,
  state: S,
  step: (state: S) => S,
): FixedStepResult<S> {
  let acc = accumulator + frameDt;
  let next = state;
  let steppedTicks = 0;

  while (acc >= tickDt && steppedTicks < maxCatchupTicks) {
    next = step(next);
    acc -= tickDt;
    steppedTicks++;
  }

  if (acc >= tickDt) {
    acc = acc % tickDt;
  }

  return { state: next, accumulator: acc, steppedTicks };
}

// core/ — pure deterministic simulation (tech-spec §3).
// No three.js, no DOM, no wall clock, no Math.random. Fixed 30Hz ticks.

export const TICK_RATE = 30;

export interface GameState {
  seed: number;
  tick: number;
}

/** Mulberry32 — small, fast, seedable PRNG for deterministic sim randomness. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGameState(seed: number): GameState {
  return { seed, tick: 0 };
}

export function advanceTick(state: GameState): GameState {
  return { ...state, tick: state.tick + 1 };
}

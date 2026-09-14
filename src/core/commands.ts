// core/ — command types (tech-spec §3). Input translates touch/keys into these;
// touch never mutates state directly.

export type Direction8 = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export type Command =
  | { type: 'move'; direction: Direction8 }
  | { type: 'shoot' }
  | { type: 'useAbility' };

/** Unit vectors per compass direction; y+ is down (matches row-major grid). */
export const DIRECTION_VECTORS: Record<Direction8, { dx: number; dy: number }> = {
  n: { dx: 0, dy: -1 },
  ne: { dx: Math.SQRT1_2, dy: -Math.SQRT1_2 },
  e: { dx: 1, dy: 0 },
  se: { dx: Math.SQRT1_2, dy: Math.SQRT1_2 },
  s: { dx: 0, dy: 1 },
  sw: { dx: -Math.SQRT1_2, dy: Math.SQRT1_2 },
  w: { dx: -1, dy: 0 },
  nw: { dx: -Math.SQRT1_2, dy: -Math.SQRT1_2 },
};

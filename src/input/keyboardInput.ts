// input/ — WASD → Command bridge (tech-spec §3, §5): keyboard is the
// desktop-dev input path, translated into the same `move` command the touch
// joystick produces; input never mutates state directly.

import type { Direction8 } from '../core/commands';

export type HeldKeys = ReadonlySet<string>;

const KEY_TO_AXIS: Record<string, { dx: number; dy: number }> = {
  w: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  a: { dx: -1, dy: 0 },
  d: { dx: 1, dy: 0 },
};

const VECTOR_TO_DIRECTION: Record<string, Direction8> = {
  '0,-1': 'n',
  '1,-1': 'ne',
  '1,0': 'e',
  '1,1': 'se',
  '0,1': 's',
  '-1,1': 'sw',
  '-1,0': 'w',
  '-1,-1': 'nw',
};

export function directionFromKeys(keys: HeldKeys): Direction8 | null {
  let dx = 0;
  let dy = 0;
  for (const key of keys) {
    const axis = KEY_TO_AXIS[key.toLowerCase()];
    if (!axis) continue;
    dx += axis.dx;
    dy += axis.dy;
  }
  dx = Math.sign(dx);
  dy = Math.sign(dy);
  if (dx === 0 && dy === 0) return null;
  return VECTOR_TO_DIRECTION[`${dx},${dy}`] ?? null;
}

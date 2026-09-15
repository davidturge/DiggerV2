// input/ — joystick angle→direction snapping (tech-spec §5: 8-way snap steering).
// Pure geometry, no DOM; touch/keyboard adapters call this to turn a drag vector
// or key combo into a Direction8 before it becomes a `move` command.

import type { Direction8 } from '../core/commands';

// Index i holds the direction for angle i * 45°, using atan2(dy, dx) with y+
// down — the same convention as core/commands.ts's DIRECTION_VECTORS.
const OCTANTS: readonly Direction8[] = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];

/** Snaps an angle (radians, atan2(dy, dx) convention) to the nearest compass direction. */
export function angleToDirection8(angleRadians: number): Direction8 {
  const twoPi = Math.PI * 2;
  const normalized = ((angleRadians % twoPi) + twoPi) % twoPi;
  const index = Math.round(normalized / (Math.PI / 4)) % OCTANTS.length;
  return OCTANTS[index]!;
}

/**
 * Turns a drag/key vector into a snapped Direction8, or null if it falls
 * inside the dead zone (tech-spec §5's joystick dead zone).
 */
export function computeDirection8(dx: number, dy: number, deadZone: number): Direction8 | null {
  const magnitude = Math.hypot(dx, dy);
  if (magnitude < deadZone) return null;
  return angleToDirection8(Math.atan2(dy, dx));
}

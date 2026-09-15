// core/ — diamond pickup (tech-spec §6, design.md §2.7): diamonds placed from
// the level file become ground entities; overlapping one collects it into the
// player's carried (undeposited) count. Deposit lives in bank.ts.

import { PLAYER_RADIUS, type PlayerState } from './player';
import type { EntityPosition } from './level';

/** Tiles; small enough that a diamond visually needs to be approached, not just be in the same tile. */
export const DIAMOND_RADIUS = 0.18;

export const PICKUP_RADIUS = PLAYER_RADIUS + DIAMOND_RADIUS;

export interface DiamondState {
  id: number;
  x: number;
  y: number;
}

/** Builds the initial ground diamonds from a level's authored marker positions, centered in their tile. */
export function placeDiamonds(positions: readonly EntityPosition[]): DiamondState[] {
  return positions.map((position, id) => ({ id, x: position.col + 0.5, y: position.row + 0.5 }));
}

export interface PickupResult {
  diamonds: DiamondState[];
  pickedUp: DiamondState[];
}

/** Splits ground diamonds into those the player just overlapped and those still on the ground. */
export function resolvePickup(diamonds: readonly DiamondState[], player: PlayerState): PickupResult {
  const remaining: DiamondState[] = [];
  const pickedUp: DiamondState[] = [];
  for (const diamond of diamonds) {
    const distance = Math.hypot(diamond.x - player.x, diamond.y - player.y);
    if (distance <= PICKUP_RADIUS) {
      pickedUp.push(diamond);
    } else {
      remaining.push(diamond);
    }
  }
  return { diamonds: remaining, pickedUp };
}

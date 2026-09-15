// render/ — pure world-position mapping for level entity placements
// (diamonds/sacks/bank/spawners, tech-spec §10). Kept separate from
// sceneBuilder.ts so this math is unit-testable without a WebGL context.

import { tileCenterWorldX, tileCenterWorldY } from './worldSpace';
import type { EntityPosition } from '../core/level';

export interface EntityWorldPosition {
  x: number;
  y: number;
}

export function toEntityWorldPositions(positions: readonly EntityPosition[]): EntityWorldPosition[] {
  return positions.map((position) => ({
    x: tileCenterWorldX(position.col),
    y: tileCenterWorldY(position.row),
  }));
}

// render/ — grid-space ↔ world-space conversion (tech-spec §4). The core sim
// uses row-major grid coordinates with y+ down (core/commands.ts); three.js
// world space keeps y+ up, so rendering mirrors the y axis. Kept separate
// from sceneBuilder (which needs three.js) so the mapping itself stays
// headless-testable.

export function toWorldX(gridX: number): number {
  return gridX;
}

export function toWorldY(gridY: number): number {
  return -gridY;
}

export function tileCenterWorldX(col: number): number {
  return toWorldX(col + 0.5);
}

export function tileCenterWorldY(row: number): number {
  return toWorldY(row + 0.5);
}

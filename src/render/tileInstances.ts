// render/ — pure indexing for InstancedMesh tile rendering (tech-spec §4):
// one InstancedMesh per diggable tile type; digging hides an instance by
// index in O(1) (scale-to-zero) rather than rebuilding geometry
// (tracker/research/threejs-android-performance.md §1).

import { getCell, type TileGrid, type TileType } from '../core/tileGrid';

export interface TilePosition {
  col: number;
  row: number;
}

export function tileKey(col: number, row: number): string {
  return `${col},${row}`;
}

export function collectTilePositions(grid: TileGrid, type: TileType): TilePosition[] {
  const positions: TilePosition[] = [];
  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      if (getCell(grid, col, row)?.type === type) {
        positions.push({ col, row });
      }
    }
  }
  return positions;
}

export function buildTileIndex(positions: readonly TilePosition[]): ReadonlyMap<string, number> {
  const index = new Map<string, number>();
  positions.forEach((position, i) => index.set(tileKey(position.col, position.row), i));
  return index;
}

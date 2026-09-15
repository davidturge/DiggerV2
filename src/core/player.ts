// core/ — continuous player position over the tile grid: 8-direction movement,
// per-axis collision vs rock/bounds/blockedCells, auto-dig on cell entry, no
// corner-cutting through diagonal gaps (tech-spec §3, §6; corner rule per
// tech-spec §7). blockedCells is a generic extra-solid-cell set — core/sacks.ts
// feeds it sack occupancy so a resting/wobbling/falling sack blocks movement
// the same way rock does, without this module needing to know what a sack is.

import { getCell, inBounds, isBlocking, setCell, type TileGrid } from './tileGrid';
import type { SimEvent } from './events';

/** Tiles; ~1/3 of a tile so the digger reads as sized-to-tunnel-width. */
export const PLAYER_RADIUS = 0.34;

export interface PlayerState {
  x: number;
  y: number;
}

interface TileRef {
  col: number;
  row: number;
}

interface MoveResult {
  grid: TileGrid;
  player: PlayerState;
  events: SimEvent[];
}

function overlappedCells(x: number, y: number, radius: number): TileRef[] {
  const minCol = Math.floor(x - radius);
  const maxCol = Math.floor(x + radius);
  const minRow = Math.floor(y - radius);
  const maxRow = Math.floor(y + radius);
  const cells: TileRef[] = [];
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      cells.push({ col, row });
    }
  }
  return cells;
}

function findBlockers(
  grid: TileGrid,
  x: number,
  y: number,
  radius: number,
  blockedCells: ReadonlySet<string>,
): { blocked: boolean; blockers: TileRef[] } {
  const blockers: TileRef[] = [];
  let blocked = false;
  for (const { col, row } of overlappedCells(x, y, radius)) {
    if (!inBounds(grid, col, row)) {
      blocked = true;
      continue;
    }
    if (isBlocking(getCell(grid, col, row)) || blockedCells.has(`${col},${row}`)) {
      blocked = true;
      blockers.push({ col, row });
    }
  }
  return { blocked, blockers };
}

function applyDigHit(grid: TileGrid, col: number, row: number, events: SimEvent[]): TileGrid {
  const cell = getCell(grid, col, row);
  if (!cell || cell.type !== 'rock') return grid;
  const rockHitsRemaining = cell.rockHitsRemaining - 1;
  if (rockHitsRemaining <= 0) {
    events.push({ type: 'tile-dug', col, row, tileType: 'rock' });
    return setCell(grid, col, row, { type: 'tunnel', rockHitsRemaining: 0 });
  }
  return setCell(grid, col, row, { type: 'rock', rockHitsRemaining });
}

/**
 * Resolves movement along one axis: blocked cells register a dig-hit, open
 * cells commit the candidate coordinate. `hitThisTick` is shared between the
 * x- and y-axis calls so a rock tile whose footprint overlaps both candidate
 * positions (common right at a corner) only takes one hit per tick, not two.
 */
function resolveAxis(
  grid: TileGrid,
  candidate: number,
  perpendicular: number,
  axis: 'x' | 'y',
  radius: number,
  events: SimEvent[],
  hitThisTick: Set<string>,
  blockedCells: ReadonlySet<string>,
): { grid: TileGrid; value: number | null } {
  const x = axis === 'x' ? candidate : perpendicular;
  const y = axis === 'x' ? perpendicular : candidate;
  const { blocked, blockers } = findBlockers(grid, x, y, radius, blockedCells);
  if (!blocked) {
    return { grid, value: candidate };
  }
  let nextGrid = grid;
  for (const b of blockers) {
    const key = `${b.col},${b.row}`;
    if (hitThisTick.has(key)) continue;
    hitThisTick.add(key);
    nextGrid = applyDigHit(nextGrid, b.col, b.row, events);
  }
  return { grid: nextGrid, value: null };
}

function autoDig(grid: TileGrid, x: number, y: number, radius: number, events: SimEvent[]): TileGrid {
  let next = grid;
  for (const { col, row } of overlappedCells(x, y, radius)) {
    if (!inBounds(next, col, row)) continue;
    const cell = getCell(next, col, row);
    if (cell?.type === 'dirt') {
      events.push({ type: 'tile-dug', col, row, tileType: 'dirt' });
      next = setCell(next, col, row, { type: 'tunnel', rockHitsRemaining: 0 });
    }
  }
  return next;
}

/**
 * Diagonal movement is only allowed when both orthogonal neighbors are open
 * (tech-spec §7's no-corner-cutting rule, applied to the player too) — blocks
 * squeezing through the point where two rock tiles touch corner-to-corner.
 */
function isDiagonalBlockedByCorner(
  grid: TileGrid,
  player: PlayerState,
  dx: number,
  dy: number,
  blockedCells: ReadonlySet<string>,
): boolean {
  if (dx === 0 || dy === 0) return false;
  const col = Math.floor(player.x);
  const row = Math.floor(player.y);
  const sideCol = col + Math.sign(dx);
  const sideRow = row + Math.sign(dy);
  const horizontalBlocked =
    !inBounds(grid, sideCol, row) || isBlocking(getCell(grid, sideCol, row)) || blockedCells.has(`${sideCol},${row}`);
  const verticalBlocked =
    !inBounds(grid, col, sideRow) || isBlocking(getCell(grid, col, sideRow)) || blockedCells.has(`${col},${sideRow}`);
  return horizontalBlocked && verticalBlocked;
}

const NO_BLOCKED_CELLS: ReadonlySet<string> = new Set();

export function resolveMovement(
  grid: TileGrid,
  player: PlayerState,
  direction: { dx: number; dy: number } | null,
  dt: number,
  playerSpeed: number,
  blockedCells: ReadonlySet<string> = NO_BLOCKED_CELLS,
): MoveResult {
  const events: SimEvent[] = [];
  if (!direction || (direction.dx === 0 && direction.dy === 0)) {
    return { grid, player, events };
  }

  const { dx, dy } = direction;
  if (isDiagonalBlockedByCorner(grid, player, dx, dy, blockedCells)) {
    return { grid, player, events };
  }

  let nextGrid = grid;
  let x = player.x;
  let y = player.y;
  const hitThisTick = new Set<string>();

  if (dx !== 0) {
    const candidateX = x + dx * playerSpeed * dt;
    const resolved = resolveAxis(nextGrid, candidateX, y, 'x', PLAYER_RADIUS, events, hitThisTick, blockedCells);
    nextGrid = resolved.grid;
    if (resolved.value !== null) x = resolved.value;
  }

  if (dy !== 0) {
    const candidateY = y + dy * playerSpeed * dt;
    const resolved = resolveAxis(nextGrid, candidateY, x, 'y', PLAYER_RADIUS, events, hitThisTick, blockedCells);
    nextGrid = resolved.grid;
    if (resolved.value !== null) y = resolved.value;
  }

  nextGrid = autoDig(nextGrid, x, y, PLAYER_RADIUS, events);

  if (x !== player.x || y !== player.y) {
    events.push({ type: 'player-moved', x, y });
  }

  return { grid: nextGrid, player: { x, y }, events };
}

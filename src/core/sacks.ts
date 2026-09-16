// core/ — gold sack lifecycle (design.md §2.4, tech-spec §6): undermine
// (support cell dug out) → wobble telegraph → falls tile-by-tile → lands
// intact (1 tile) or breaks into collectable gold (≥2 tiles); horizontal
// push shoves a resting sack one cell. Sacks occupy their cell as a solid —
// they block movement/pushing (core/player.ts's blockedCells) and support
// any sack resting directly above them, which is how digging out the bottom
// of a stack chains into the sack above losing support too (one tick later,
// once the mover has actually left the cell).

import type { SimEvent } from './events';
import type { EntityPosition } from './level';
import { getCell, inBounds, type TileGrid } from './tileGrid';

export type SackStatus = 'resting' | 'wobbling' | 'falling';

export interface SackState {
  readonly id: number;
  readonly col: number;
  readonly row: number;
  readonly status: SackStatus;
  /** ms accumulated in the current status; meaningless once status is 'resting'. */
  readonly elapsedMs: number;
  /** Row the current fall began from — lets landing compute tiles fallen. */
  readonly fallOriginRow: number;
}

export interface GoldPiece {
  readonly col: number;
  readonly row: number;
}

interface PlayerLike {
  readonly x: number;
  readonly y: number;
}

interface SackTuning {
  readonly sackWobbleMs: number;
  readonly sackFallTilesPerSecond: number;
}

/** A drop of 2+ tiles shatters the sack; a single-tile drop just lands (design.md §2.4). */
const BREAK_MIN_TILES_FALLEN = 2;

export function createSackStates(positions: readonly EntityPosition[]): SackState[] {
  return positions.map((position, index) => ({
    id: index,
    col: position.col,
    row: position.row,
    status: 'resting',
    elapsedMs: 0,
    fallOriginRow: position.row,
  }));
}

function sackAt(sacks: readonly SackState[], col: number, row: number): SackState | undefined {
  return sacks.find((sack) => sack.col === col && sack.row === row);
}

/** True if the cell below (col, row) holds the sack up: dirt, un-cleared rock, the map floor/edge, or another sack still sitting there. */
function isSupported(grid: TileGrid, sacks: readonly SackState[], col: number, row: number): boolean {
  const belowRow = row + 1;
  if (!inBounds(grid, col, belowRow)) return true;
  const belowCell = getCell(grid, col, belowRow);
  if (belowCell && belowCell.type !== 'tunnel') return true;
  return sackAt(sacks, col, belowRow) !== undefined;
}

/** Cells currently occupied by a sack — an extra solid obstacle set for core/player.ts's collision, alongside rock. */
export function sackBlockedCells(sacks: readonly SackState[]): ReadonlySet<string> {
  return new Set(sacks.map((sack) => `${sack.col},${sack.row}`));
}

/**
 * Horizontal push (design.md §2.4): moving straight into a resting sack
 * shoves it one cell further in the same direction, if that cell is open
 * tunnel and unoccupied. Vertical/diagonal contact, and wobbling/falling
 * sacks, just block (handled by sackBlockedCells) — only a stationary sack
 * pushed sideways moves.
 */
export function resolveSackPush(
  grid: TileGrid,
  sacks: readonly SackState[],
  player: PlayerLike,
  direction: { dx: number; dy: number } | null,
  events: SimEvent[],
): SackState[] {
  if (!direction || direction.dy !== 0 || direction.dx === 0) return sacks.slice();

  const dx = Math.sign(direction.dx);
  const playerRow = Math.floor(player.y);
  const targetCol = Math.floor(player.x) + dx;
  const sack = sackAt(sacks, targetCol, playerRow);
  if (!sack || sack.status !== 'resting') return sacks.slice();

  const beyondCol = targetCol + dx;
  const beyondCell = inBounds(grid, beyondCol, playerRow) ? getCell(grid, beyondCol, playerRow) : undefined;
  if (!beyondCell || beyondCell.type !== 'tunnel' || sackAt(sacks, beyondCol, playerRow)) {
    return sacks.slice();
  }

  events.push({ type: 'sack-pushed', fromCol: sack.col, fromRow: sack.row, toCol: beyondCol, toRow: playerRow });
  return sacks.map((s) => (s.id === sack.id ? { ...s, col: beyondCol } : s));
}

export interface SackPhysicsResult {
  sacks: SackState[];
  goldPieces: GoldPiece[];
  events: SimEvent[];
}

/**
 * Per-tick sack system: resting sacks check support, wobbling sacks count
 * down their telegraph, falling sacks step down tile-by-tile (crushing the
 * player on contact — enemies join this same check in #8) until they land,
 * intact or broken apart.
 */
export function updateSackPhysics(
  grid: TileGrid,
  sacks: readonly SackState[],
  player: PlayerLike,
  dt: number,
  tuning: SackTuning,
): SackPhysicsResult {
  const events: SimEvent[] = [];
  const goldPieces: GoldPiece[] = [];
  const dtMs = dt * 1000;
  const fallStepMs = 1000 / tuning.sackFallTilesPerSecond;
  const next: SackState[] = [];

  for (const sack of sacks) {
    if (sack.status === 'resting') {
      if (isSupported(grid, sacks, sack.col, sack.row)) {
        next.push(sack);
      } else {
        events.push({ type: 'sack-wobble-started', col: sack.col, row: sack.row });
        next.push({ ...sack, status: 'wobbling', elapsedMs: 0 });
      }
      continue;
    }

    if (sack.status === 'wobbling') {
      const elapsedMs = sack.elapsedMs + dtMs;
      if (elapsedMs >= tuning.sackWobbleMs) {
        next.push({ ...sack, status: 'falling', elapsedMs: 0, fallOriginRow: sack.row });
      } else {
        next.push({ ...sack, elapsedMs });
      }
      continue;
    }

    // Falling: step down one tile every fallStepMs, checking for a landing
    // spot and a crush at each step (a very high fall speed / low tick rate
    // could otherwise skip over the player's tile within a single tick).
    let current = sack;
    let elapsedMs = sack.elapsedMs + dtMs;
    let landed = false;

    while (elapsedMs >= fallStepMs) {
      const nextRow = current.row + 1;
      const belowCell = inBounds(grid, current.col, nextRow) ? getCell(grid, current.col, nextRow) : undefined;
      const canAdvance = belowCell?.type === 'tunnel' && !sackAt(sacks, current.col, nextRow);
      if (!canAdvance) {
        landed = true;
        break;
      }

      current = { ...current, row: nextRow };
      elapsedMs -= fallStepMs;

      if (Math.floor(player.x) === current.col && Math.floor(player.y) === current.row) {
        events.push({ type: 'player-crushed', col: current.col, row: current.row });
      }
    }

    if (!landed) {
      next.push({ ...current, elapsedMs });
      continue;
    }

    const tilesFallen = current.row - current.fallOriginRow;
    const brokeApart = tilesFallen >= BREAK_MIN_TILES_FALLEN;
    events.push({ type: 'sack-landed', col: current.col, row: current.row, tilesFallen, brokeApart });

    if (brokeApart) {
      for (let i = 0; i < tilesFallen; i++) {
        goldPieces.push({ col: current.col, row: current.row });
      }
    } else {
      next.push({ ...current, status: 'resting', elapsedMs: 0 });
    }
  }

  return { sacks: next, goldPieces, events };
}

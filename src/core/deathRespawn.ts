// core/ — death/respawn (tech-spec §6, design.md §2.7): dying spills every
// carried (undeposited) diamond as re-collectable ground entities and
// returns the player to a fixed respawn point with brief invulnerability.
//
// REACHABILITY NOTE: nothing in the sim can currently kill the player — the
// damage sources design.md §2.7 describes (gold sacks, enemies) aren't built
// yet (sack fall physics and tracker/tickets/009's enemy AI are future
// issues). killPlayer/isInvulnerable are exported, pure, and exercised only
// by this file's headless tests, per this issue's explicit ask — they are
// infrastructure ready for the future hazard systems that will call them
// from advanceTick, not wired into it themselves. This is a real reachability
// gap for the death/respawn/spill sub-feature specifically, flagged here as
// instructed.

import type { DiamondState } from './diamonds';
import type { PlayerState } from './player';
import type { SimEvent } from './events';
import type { TileGrid } from './tileGrid';
import type { ResolvedTuning } from './tuning';

/** Deterministic scatter directions (no RNG in core) — rings expand outward for loads bigger than one lap. */
const SPILL_OFFSETS: readonly { dx: number; dy: number }[] = [
  { dx: 0.5, dy: 0 },
  { dx: 0.35, dy: 0.35 },
  { dx: 0, dy: 0.5 },
  { dx: -0.35, dy: 0.35 },
  { dx: -0.5, dy: 0 },
  { dx: -0.35, dy: -0.35 },
  { dx: 0, dy: -0.5 },
  { dx: 0.35, dy: -0.35 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Drops `count` new ground diamonds around `deathPosition`, clamped inside the grid, with sequential ids from `startId`. */
export function spillDiamonds(
  deathPosition: PlayerState,
  count: number,
  startId: number,
  grid: TileGrid,
): DiamondState[] {
  const spilled: DiamondState[] = [];
  for (let i = 0; i < count; i++) {
    const offset = SPILL_OFFSETS[i % SPILL_OFFSETS.length] ?? { dx: 0, dy: 0 };
    const ring = Math.floor(i / SPILL_OFFSETS.length) + 1;
    const x = clamp(deathPosition.x + offset.dx * ring, 0.5, grid.width - 0.5);
    const y = clamp(deathPosition.y + offset.dy * ring, 0.5, grid.height - 0.5);
    spilled.push({ id: startId + i, x, y });
  }
  return spilled;
}

export interface KillResult {
  diamonds: DiamondState[];
  nextDiamondId: number;
  carriedDiamonds: number;
  player: PlayerState;
  invulnerableUntilTick: number;
  events: SimEvent[];
}

export interface KillPlayerInput {
  grid: TileGrid;
  diamonds: readonly DiamondState[];
  nextDiamondId: number;
  carriedDiamonds: number;
  deathPosition: PlayerState;
  respawnPoint: PlayerState;
  tuning: ResolvedTuning;
  tick: number;
}

/** Spills carried diamonds at the death position and respawns the player at the fixed respawn point with brief invulnerability. */
export function killPlayer(input: KillPlayerInput): KillResult {
  const { grid, diamonds, nextDiamondId, carriedDiamonds, deathPosition, respawnPoint, tuning, tick } = input;
  const spilled = spillDiamonds(deathPosition, carriedDiamonds, nextDiamondId, grid);
  const invulnerabilityTicks = Math.round((tuning.respawnInvulnerabilityMs / 1000) * tuning.tickRate);

  return {
    diamonds: [...diamonds, ...spilled],
    nextDiamondId: nextDiamondId + spilled.length,
    carriedDiamonds: 0,
    player: { ...respawnPoint },
    invulnerableUntilTick: tick + invulnerabilityTicks,
    events: [
      { type: 'player-died', x: deathPosition.x, y: deathPosition.y, spilledCount: spilled.length },
      { type: 'player-respawned', x: respawnPoint.x, y: respawnPoint.y },
    ],
  };
}

export function isInvulnerable(invulnerableUntilTick: number, tick: number): boolean {
  return tick < invulnerableUntilTick;
}

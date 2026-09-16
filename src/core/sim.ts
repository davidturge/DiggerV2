// core/ — pure deterministic simulation (tech-spec §3).
// No three.js, no DOM, no wall clock, no Math.random. Fixed ticks (rate
// resolved from tuning.json, tech-spec §10 — no hardcoded tick constant here).

import { carryWeightMultiplier, resolveDeposit } from './bank';
import { DIRECTION_VECTORS, type Command } from './commands';
import { isInvulnerable, killPlayer } from './deathRespawn';
import { placeDiamonds, resolvePickup, type DiamondState } from './diamonds';
import type { SimEvent } from './events';
import type { Level, LevelEntities, LevelType } from './level';
import { isLevelComplete } from './levelProgress';
import { type PlayerState, resolveMovement } from './player';
import { createSackStates, resolveSackPush, sackBlockedCells, updateSackPhysics, type GoldPiece, type SackState } from './sacks';
import { parseLevel, type TileGrid } from './tileGrid';
import type { ResolvedTuning } from './tuning';

const EMPTY_ENTITIES: LevelEntities = { diamonds: [], sacks: [], bank: null, spawners: [] };

export interface GameState {
  seed: number;
  tick: number;
  grid: TileGrid;
  player: PlayerState;
  tuning: ResolvedTuning;
  entities: LevelEntities;
  /** null outside a real level (e.g. app.ts's grey-box demo) — level completion never applies then. */
  levelType: LevelType | null;
  diamonds: readonly DiamondState[];
  nextDiamondId: number;
  /** Undeposited diamonds — at risk and slowing the player (design.md §2.7-2.8) until banked. */
  carriedDiamonds: number;
  bankedDiamonds: number;
  totalDiamonds: number;
  /** Fixed point death/respawn (core/deathRespawn.ts) returns the player to. */
  respawnPoint: PlayerState;
  invulnerableUntilTick: number;
  completed: boolean;
  sacks: readonly SackState[];
  goldPieces: readonly GoldPiece[];
}

/** Mulberry32 — small, fast, seedable PRNG for deterministic sim randomness. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGameState(
  seed: number,
  levelRows: readonly string[],
  tuning: ResolvedTuning,
  entities: LevelEntities = EMPTY_ENTITIES,
  levelType: LevelType | null = null,
): GameState {
  const { grid, playerStart } = parseLevel(levelRows, tuning.rockHitsToClear);
  const diamonds = placeDiamonds(entities.diamonds);
  return {
    seed,
    tick: 0,
    grid,
    player: playerStart,
    tuning,
    entities,
    levelType,
    diamonds,
    nextDiamondId: diamonds.length,
    carriedDiamonds: 0,
    bankedDiamonds: 0,
    totalDiamonds: entities.diamonds.length,
    respawnPoint: playerStart,
    invulnerableUntilTick: 0,
    completed: false,
    sacks: createSackStates(entities.sacks),
    goldPieces: [],
  };
}

/** Builds core state + entity placements straight from a loaded level (tech-spec §10). */
export function createGameStateFromLevel(seed: number, level: Level, tuning: ResolvedTuning): GameState {
  return createGameState(seed, level.rows, tuning, level.entities, level.type);
}

function latestMoveDirection(commands: readonly Command[]): { dx: number; dy: number } | null {
  let latest: { dx: number; dy: number } | null = null;
  for (const command of commands) {
    if (command.type === 'move') {
      latest = DIRECTION_VECTORS[command.direction];
    }
  }
  return latest;
}

export function advanceTick(
  state: GameState,
  commands: readonly Command[] = [],
): { state: GameState; events: SimEvent[] } {
  const direction = latestMoveDirection(commands);
  const tickDt = 1 / state.tuning.tickRate;
  const events: SimEvent[] = [];

  // Carry weight (issue #5) scales speed; sacks (issue #6) are pushed first so
  // a sack the player shoves this tick is already out of the way, and the rest
  // block movement like rock.
  const speed = state.tuning.playerSpeed * carryWeightMultiplier(state.carriedDiamonds, state.tuning);
  const pushedSacks = resolveSackPush(state.grid, state.sacks, state.player, direction, events);
  const blockedCells = sackBlockedCells(pushedSacks);
  const move = resolveMovement(state.grid, state.player, direction, tickDt, speed, blockedCells);
  events.push(...move.events);

  const physics = updateSackPhysics(move.grid, pushedSacks, move.player, tickDt, state.tuning);
  events.push(...physics.events);

  const pickup = resolvePickup(state.diamonds, move.player);
  for (const diamond of pickup.pickedUp) {
    events.push({ type: 'diamond-picked-up', id: diamond.id, x: diamond.x, y: diamond.y });
  }
  let carriedDiamonds = state.carriedDiamonds + pickup.pickedUp.length;

  const deposit = resolveDeposit(state.entities.bank, move.player, carriedDiamonds, state.bankedDiamonds);
  if (deposit.deposited > 0) {
    events.push({ type: 'diamonds-deposited', count: deposit.deposited, bankedTotal: deposit.bankedDiamonds });
    events.push({ type: 'level-up' });
  }
  carriedDiamonds = deposit.carriedDiamonds;
  const bankedDiamonds = deposit.bankedDiamonds;

  let completed = state.completed;
  if (!completed && isLevelComplete(state.levelType, bankedDiamonds, state.totalDiamonds)) {
    completed = true;
    events.push({ type: 'level-complete', elapsedTicks: state.tick + 1 });
  }

  // A landing sack crushing the player is the first thing in the sim that can
  // kill (design.md §2.4): spill what's carried and respawn (issue #5's
  // deathRespawn), unless still inside the post-respawn grace window.
  let player = move.player;
  let diamonds = pickup.diamonds;
  let nextDiamondId = state.nextDiamondId;
  let invulnerableUntilTick = state.invulnerableUntilTick;
  const crushed = physics.events.some((e) => e.type === 'player-crushed');
  if (crushed && !isInvulnerable(state.invulnerableUntilTick, state.tick)) {
    const death = killPlayer({
      grid: move.grid,
      diamonds,
      nextDiamondId,
      carriedDiamonds,
      deathPosition: move.player,
      respawnPoint: state.respawnPoint,
      tuning: state.tuning,
      tick: state.tick + 1,
    });
    player = death.player;
    diamonds = death.diamonds;
    nextDiamondId = death.nextDiamondId;
    carriedDiamonds = death.carriedDiamonds;
    invulnerableUntilTick = death.invulnerableUntilTick;
    events.push(...death.events);
  }

  return {
    state: {
      ...state,
      tick: state.tick + 1,
      grid: move.grid,
      player,
      sacks: physics.sacks,
      goldPieces: [...state.goldPieces, ...physics.goldPieces],
      diamonds,
      nextDiamondId,
      carriedDiamonds,
      bankedDiamonds,
      invulnerableUntilTick,
      completed,
    },
    events,
  };
}

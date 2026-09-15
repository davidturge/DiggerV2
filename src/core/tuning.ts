// core/ — tuning.json layering resolver (tech-spec §10, tracker/tickets/007):
// every gameplay number (speeds, dig rates, tick rate) lives in data, not
// code. Resolution order: global defaults ← difficulty multipliers ← the
// loaded level's own per-level overrides. Difficulty is data, not code.

import { isPlainObject, requireFiniteNumber } from './validation';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface TuningDefaults {
  tickRate: number;
  playerSpeed: number;
  rockHitsToClear: number;
  /** Wobble telegraph duration (design.md §2.4) between a sack losing support and it starting to fall. */
  sackWobbleMs: number;
  /** Fall speed once a sack drops, in tiles/second (tile-by-tile, tech-spec §6). */
  sackFallTilesPerSecond: number;
}

export type ResolvedTuning = TuningDefaults;

const TUNING_KEYS = [
  'tickRate',
  'playerSpeed',
  'rockHitsToClear',
  'sackWobbleMs',
  'sackFallTilesPerSecond',
] as const satisfies readonly (keyof TuningDefaults)[];

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

export type DifficultyMultipliers = Readonly<Partial<Record<keyof TuningDefaults, number>>>;

export interface TuningData {
  defaults: TuningDefaults;
  difficulty: Readonly<Record<Difficulty, DifficultyMultipliers>>;
}

/** Every tuning number here divides or multiplies gameplay math (e.g. `1 / tickRate`) — zero or negative silently produces Infinity/NaN instead of a clear load-time error. */
function readPositiveFiniteNumber(source: Record<string, unknown>, key: string, context: string): number {
  const value = requireFiniteNumber(source[key], 'tuning', `${context}.${key}`);
  if (value <= 0) {
    throw new Error(`tuning: "${context}.${key}" must be a positive number, got ${value}`);
  }
  return value;
}

function parseDefaults(data: unknown): TuningDefaults {
  if (!isPlainObject(data)) {
    throw new Error('tuning: "defaults" must be an object');
  }
  return {
    tickRate: readPositiveFiniteNumber(data, 'tickRate', 'defaults'),
    playerSpeed: readPositiveFiniteNumber(data, 'playerSpeed', 'defaults'),
    rockHitsToClear: readPositiveFiniteNumber(data, 'rockHitsToClear', 'defaults'),
    sackWobbleMs: readPositiveFiniteNumber(data, 'sackWobbleMs', 'defaults'),
    sackFallTilesPerSecond: readPositiveFiniteNumber(data, 'sackFallTilesPerSecond', 'defaults'),
  };
}

function parseMultipliers(data: unknown, tier: Difficulty): DifficultyMultipliers {
  if (!isPlainObject(data)) {
    throw new Error(`tuning: difficulty.${tier} must be an object`);
  }
  const multipliers: Partial<Record<keyof TuningDefaults, number>> = {};
  for (const key of Object.keys(data)) {
    if (!(TUNING_KEYS as readonly string[]).includes(key)) {
      throw new Error(`tuning: difficulty.${tier} has unknown key "${key}"`);
    }
    multipliers[key as keyof TuningDefaults] = readPositiveFiniteNumber(data, key, `difficulty.${tier}`);
  }
  return multipliers;
}

/** Validates a raw tuning.json document; throws with a clear message on any malformed file. */
export function parseTuningDocument(data: unknown): TuningData {
  if (!isPlainObject(data)) {
    throw new Error('tuning: document must be an object');
  }
  const defaults = parseDefaults(data.defaults);

  if (!isPlainObject(data.difficulty)) {
    throw new Error('tuning: "difficulty" must be an object with easy/medium/hard keys');
  }
  const difficulty = {} as Record<Difficulty, DifficultyMultipliers>;
  for (const tier of DIFFICULTIES) {
    if (!(tier in data.difficulty)) {
      throw new Error(`tuning: difficulty is missing the "${tier}" tier`);
    }
    difficulty[tier] = parseMultipliers(data.difficulty[tier], tier);
  }

  return { defaults, difficulty };
}

/**
 * Resolves final gameplay numbers for a tick: defaults ← the selected
 * difficulty's multipliers (multiplicative) ← the level's own overrides
 * (absolute, always win).
 */
export function resolveTuning(
  tuning: TuningData,
  difficulty: Difficulty,
  overrides: Readonly<Record<string, number>> = {},
): ResolvedTuning {
  const multipliers = tuning.difficulty[difficulty];
  const resolved = { ...tuning.defaults };

  for (const key of TUNING_KEYS) {
    const multiplier = multipliers[key];
    if (multiplier !== undefined) {
      resolved[key] = resolved[key] * multiplier;
    }
  }

  for (const key of Object.keys(overrides)) {
    if (!(TUNING_KEYS as readonly string[]).includes(key)) {
      throw new Error(`tuning: level override has unknown key "${key}"`);
    }
    const value = overrides[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new Error(`tuning: level override "${key}" must be a positive number, got ${JSON.stringify(value)}`);
    }
    resolved[key as keyof TuningDefaults] = value;
  }

  return resolved;
}

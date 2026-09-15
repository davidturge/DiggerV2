// core/ — level file schema (tech-spec §10, tracker/tickets/007): one JSON
// document per level — an ASCII tile grid plus structured fields (id, name,
// world, level type + params, spawner configs, star thresholds, par time).
// TS-typed and validated at load; throws with a clear message on any
// malformed file.

import { ENTITY_MARKERS, validateGridRows } from './tileGrid';
import { isPlainObject, requireFiniteNumber } from './validation';

export type LevelType = 'collection' | 'escape' | 'puzzle' | 'chase' | 'boss';

const LEVEL_TYPES: readonly LevelType[] = ['collection', 'escape', 'puzzle', 'chase', 'boss'];

export interface EntityPosition {
  col: number;
  row: number;
}

export interface SpawnerConfig extends EntityPosition {
  intervalMs: number;
  rampMs: number;
  cap: number;
}

export interface LevelEntities {
  diamonds: readonly EntityPosition[];
  sacks: readonly EntityPosition[];
  bank: EntityPosition | null;
  spawners: readonly SpawnerConfig[];
}

export interface StarThresholds {
  /** Diamond collection percentage (0–100] required for the 2nd star. */
  diamondPercentForStar2: number;
}

export interface Level {
  id: string;
  name: string;
  world: number;
  type: LevelType;
  params: Readonly<Record<string, unknown>>;
  rows: readonly string[];
  entities: LevelEntities;
  starThresholds: StarThresholds;
  parTimeMs: number;
  tuningOverrides: Readonly<Record<string, number>>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`level: "${field}" must be a non-empty string, got ${JSON.stringify(value)}`);
  }
  return value;
}

function requirePositiveInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`level: "${field}" must be a positive integer, got ${JSON.stringify(value)}`);
  }
  return value;
}

function parseType(data: Record<string, unknown>): LevelType {
  const type = data.type;
  if (typeof type !== 'string' || !LEVEL_TYPES.includes(type as LevelType)) {
    throw new Error(`level: "type" must be one of ${LEVEL_TYPES.join(', ')}, got ${JSON.stringify(type)}`);
  }
  return type as LevelType;
}

function parseParams(data: Record<string, unknown>): Readonly<Record<string, unknown>> {
  const raw = data.params ?? {};
  if (!isPlainObject(raw)) {
    throw new Error('level: "params" must be an object');
  }
  return raw;
}

function parseGridRows(data: Record<string, unknown>): readonly string[] {
  const grid = data.grid;
  if (!Array.isArray(grid) || grid.length === 0 || !grid.every((row) => typeof row === 'string')) {
    throw new Error('level: "grid" must be a non-empty array of strings');
  }
  validateGridRows(grid); // throws with row/legend/duplicate-start details
  if (!grid.some((row) => row.includes('P'))) {
    throw new Error('level: grid must contain exactly one "P" player start marker');
  }
  return grid;
}

function collectMarkerPositions(rows: readonly string[], marker: string): EntityPosition[] {
  const positions: EntityPosition[] = [];
  rows.forEach((row, rowIndex) => {
    for (let col = 0; col < row.length; col++) {
      if (row.charAt(col) === marker) positions.push({ col, row: rowIndex });
    }
  });
  return positions;
}

function parseSpawnerConfigs(data: Record<string, unknown>): SpawnerConfig[] {
  const spawners = data.spawners ?? [];
  if (!Array.isArray(spawners)) {
    throw new Error('level: "spawners" must be an array');
  }
  return spawners.map((entry, index) => {
    if (!isPlainObject(entry)) {
      throw new Error(`level: spawners[${index}] must be an object`);
    }
    return {
      col: requireFiniteNumber(entry.col, 'level', `spawners[${index}].col`),
      row: requireFiniteNumber(entry.row, 'level', `spawners[${index}].row`),
      intervalMs: requireFiniteNumber(entry.intervalMs, 'level', `spawners[${index}].intervalMs`),
      rampMs: requireFiniteNumber(entry.rampMs, 'level', `spawners[${index}].rampMs`),
      cap: requireFiniteNumber(entry.cap, 'level', `spawners[${index}].cap`),
    };
  });
}

function positionKey(position: EntityPosition): string {
  return `${position.col},${position.row}`;
}

function crossValidateSpawners(rows: readonly string[], spawners: readonly SpawnerConfig[]): void {
  const markerPositions = collectMarkerPositions(rows, ENTITY_MARKERS.spawner);
  const markerKeys = new Set(markerPositions.map(positionKey));
  const configKeys = new Set(spawners.map(positionKey));

  for (const marker of markerPositions) {
    if (!configKeys.has(positionKey(marker))) {
      throw new Error(`level: spawner marker at (${marker.col}, ${marker.row}) has no matching spawners[] entry`);
    }
  }
  for (const config of spawners) {
    if (!markerKeys.has(positionKey(config))) {
      throw new Error(`level: spawners[] entry at (${config.col}, ${config.row}) has no matching "s" grid marker`);
    }
  }
  // Grid markers are inherently unique per cell, so a spawner count above the
  // marker count can only mean a duplicate spawners[] entry for one marker
  // (the per-item checks above pass either way, since Set membership hides dupes).
  if (spawners.length > markerPositions.length) {
    throw new Error(
      `level: spawners[] has ${spawners.length} entries but the grid has only ${markerPositions.length} "s" markers (duplicate entry?)`,
    );
  }
}

function parseEntities(rows: readonly string[], spawners: readonly SpawnerConfig[]): LevelEntities {
  crossValidateSpawners(rows, spawners);
  const bankPositions = collectMarkerPositions(rows, ENTITY_MARKERS.bank);
  if (bankPositions.length > 1) {
    throw new Error(`level: grid may contain at most one "B" bank marker, found ${bankPositions.length}`);
  }
  return {
    diamonds: collectMarkerPositions(rows, ENTITY_MARKERS.diamond),
    sacks: collectMarkerPositions(rows, ENTITY_MARKERS.sack),
    bank: bankPositions[0] ?? null,
    spawners,
  };
}

function parseStarThresholds(data: Record<string, unknown>): StarThresholds {
  const raw = data.starThresholds;
  if (!isPlainObject(raw)) {
    throw new Error('level: "starThresholds" must be an object');
  }
  const diamondPercentForStar2 = requireFiniteNumber(raw.diamondPercentForStar2, 'level', 'starThresholds.diamondPercentForStar2');
  if (diamondPercentForStar2 <= 0 || diamondPercentForStar2 > 100) {
    throw new Error(
      `level: "starThresholds.diamondPercentForStar2" must be within (0, 100], got ${diamondPercentForStar2}`,
    );
  }
  return { diamondPercentForStar2 };
}

function parseTuningOverrides(data: Record<string, unknown>): Readonly<Record<string, number>> {
  const raw = data.tuningOverrides ?? {};
  if (!isPlainObject(raw)) {
    throw new Error('level: "tuningOverrides" must be an object');
  }
  const overrides: Record<string, number> = {};
  for (const key of Object.keys(raw)) {
    overrides[key] = requireFiniteNumber(raw[key], 'level', `tuningOverrides.${key}`);
  }
  return overrides;
}

/** Validates a raw level JSON document; throws with a clear message on any malformed file. */
export function parseLevelDocument(data: unknown): Level {
  if (!isPlainObject(data)) {
    throw new Error('level: document must be an object');
  }

  const id = requireString(data.id, 'id');
  const name = requireString(data.name, 'name');
  const world = requirePositiveInteger(data.world, 'world');
  const type = parseType(data);
  const params = parseParams(data);
  const rows = parseGridRows(data);
  const spawners = parseSpawnerConfigs(data);
  const entities = parseEntities(rows, spawners);

  if (type === 'collection' && entities.diamonds.length === 0) {
    throw new Error('level: a "collection" type level must have at least one diamond ("*") on the grid');
  }

  const starThresholds = parseStarThresholds(data);
  const parTimeMs = requireFiniteNumber(data.parTimeMs, 'level', 'parTimeMs');
  if (parTimeMs <= 0) {
    throw new Error(`level: "parTimeMs" must be positive, got ${parTimeMs}`);
  }
  const tuningOverrides = parseTuningOverrides(data);

  return { id, name, world, type, params, rows, entities, starThresholds, parTimeMs, tuningOverrides };
}

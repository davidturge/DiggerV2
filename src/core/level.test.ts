import { describe, expect, it } from 'vitest';
import { parseLevelDocument } from './level';

function validDocument(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'w1-01',
    name: 'First Dig',
    world: 1,
    type: 'collection',
    grid: ['RRRR', 'RP*R', 'RBGR', 'RRRR'],
    spawners: [],
    starThresholds: { diamondPercentForStar2: 80 },
    parTimeMs: 90000,
    ...overrides,
  };
}

describe('parseLevelDocument — happy path', () => {
  it('parses required fields', () => {
    const level = parseLevelDocument(validDocument());
    expect(level.id).toBe('w1-01');
    expect(level.name).toBe('First Dig');
    expect(level.world).toBe(1);
    expect(level.type).toBe('collection');
    expect(level.rows).toEqual(['RRRR', 'RP*R', 'RBGR', 'RRRR']);
    expect(level.starThresholds).toEqual({ diamondPercentForStar2: 80 });
    expect(level.parTimeMs).toBe(90000);
  });

  it('extracts entity placements from the ASCII grid', () => {
    const level = parseLevelDocument(validDocument());
    expect(level.entities.diamonds).toEqual([{ col: 2, row: 1 }]);
    expect(level.entities.sacks).toEqual([{ col: 2, row: 2 }]);
    expect(level.entities.bank).toEqual({ col: 1, row: 2 });
  });

  it('defaults params/spawners/tuningOverrides when omitted', () => {
    const doc = validDocument();
    delete doc.spawners;
    const level = parseLevelDocument(doc);
    expect(level.params).toEqual({});
    expect(level.entities.spawners).toEqual([]);
    expect(level.tuningOverrides).toEqual({});
  });

  it('cross-validates a spawner marker against its matching config entry', () => {
    const level = parseLevelDocument(
      validDocument({
        grid: ['RRRRR', 'RP*sR', 'RRRRR'],
        spawners: [{ col: 3, row: 1, intervalMs: 4000, rampMs: 1000, cap: 3 }],
      }),
    );
    expect(level.entities.spawners).toEqual([{ col: 3, row: 1, intervalMs: 4000, rampMs: 1000, cap: 3 }]);
  });

  it('accepts explicit params and tuningOverrides', () => {
    const level = parseLevelDocument(validDocument({ params: { escapeHint: true }, tuningOverrides: { playerSpeed: 5 } }));
    expect(level.params).toEqual({ escapeHint: true });
    expect(level.tuningOverrides).toEqual({ playerSpeed: 5 });
  });
});

describe('parseLevelDocument — malformed input', () => {
  it('rejects a non-object document', () => {
    expect(() => parseLevelDocument(null)).toThrow(/level/i);
    expect(() => parseLevelDocument('nope')).toThrow(/level/i);
  });

  it('rejects a missing or non-string id', () => {
    const doc = validDocument();
    delete doc.id;
    expect(() => parseLevelDocument(doc)).toThrow(/\bid\b/i);
    expect(() => parseLevelDocument(validDocument({ id: 5 }))).toThrow(/\bid\b/i);
  });

  it('rejects a non-positive-integer world', () => {
    expect(() => parseLevelDocument(validDocument({ world: 0 }))).toThrow(/world/i);
    expect(() => parseLevelDocument(validDocument({ world: 1.5 }))).toThrow(/world/i);
  });

  it('rejects an unknown level type', () => {
    expect(() => parseLevelDocument(validDocument({ type: 'sandbox' }))).toThrow(/type/i);
  });

  it('rejects a missing grid', () => {
    const doc = validDocument();
    delete doc.grid;
    expect(() => parseLevelDocument(doc)).toThrow(/grid/i);
  });

  it('propagates an unknown tile character from the shared grid validator', () => {
    expect(() => parseLevelDocument(validDocument({ grid: ['RRRR', 'RPXR', 'RRRR'] }))).toThrow(/unknown tile/i);
  });

  it('propagates a duplicate player start marker', () => {
    expect(() => parseLevelDocument(validDocument({ grid: ['RPRR', 'RPRR'] }))).toThrow(/duplicate.*P/i);
  });

  it('rejects a grid with no player start marker', () => {
    expect(() => parseLevelDocument(validDocument({ grid: ['RRRR', 'R  R', 'RRRR'] }))).toThrow(/player start/i);
  });

  it('rejects more than one bank marker', () => {
    expect(() => parseLevelDocument(validDocument({ grid: ['RRRRR', 'RPBBR', 'RRRRR'] }))).toThrow(/bank/i);
  });

  it('rejects a spawner marker with no matching config entry', () => {
    expect(() => parseLevelDocument(validDocument({ grid: ['RRRRR', 'RP*sR', 'RRRRR'], spawners: [] }))).toThrow(
      /spawner/i,
    );
  });

  it('rejects a spawner config entry with no matching grid marker', () => {
    expect(() =>
      parseLevelDocument(
        validDocument({ spawners: [{ col: 3, row: 1, intervalMs: 4000, rampMs: 1000, cap: 3 }] }),
      ),
    ).toThrow(/spawner/i);
  });

  it('rejects a duplicate spawners[] entry for a single grid marker', () => {
    expect(() =>
      parseLevelDocument(
        validDocument({
          grid: ['RRRRR', 'RP*sR', 'RRRRR'],
          spawners: [
            { col: 3, row: 1, intervalMs: 4000, rampMs: 1000, cap: 3 },
            { col: 3, row: 1, intervalMs: 9999, rampMs: 1, cap: 1 },
          ],
        }),
      ),
    ).toThrow(/spawner/i);
  });

  it('rejects a non-object params value', () => {
    expect(() => parseLevelDocument(validDocument({ params: 'not-an-object' }))).toThrow(/params/i);
  });

  it('rejects a collection-type level with zero diamonds', () => {
    expect(() => parseLevelDocument(validDocument({ grid: ['RRRR', 'RPGR', 'RRRR'] }))).toThrow(/diamond/i);
  });

  it('rejects an out-of-range star threshold', () => {
    expect(() => parseLevelDocument(validDocument({ starThresholds: { diamondPercentForStar2: 150 } }))).toThrow(
      /diamondPercentForStar2/i,
    );
  });

  it('rejects a non-positive parTimeMs', () => {
    expect(() => parseLevelDocument(validDocument({ parTimeMs: 0 }))).toThrow(/parTimeMs/i);
  });

  it('rejects a non-numeric tuningOverrides value', () => {
    expect(() => parseLevelDocument(validDocument({ tuningOverrides: { playerSpeed: 'fast' } }))).toThrow(
      /playerSpeed/i,
    );
  });
});

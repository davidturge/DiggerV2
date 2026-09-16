import { describe, expect, it } from 'vitest';
import { parseTuningDocument, resolveTuning, type TuningData } from './tuning';

const VALID_DOCUMENT = {
  defaults: {
    tickRate: 30,
    playerSpeed: 4.5,
    rockHitsToClear: 2,
    carryWeightPerDiamond: 0.03,
    carryWeightMinMultiplier: 0.4,
    respawnInvulnerabilityMs: 1500,
  },
  difficulty: {
    easy: { playerSpeed: 0.9 },
    medium: {},
    hard: { playerSpeed: 1.1 },
  },
};

describe('parseTuningDocument', () => {
  it('parses a valid document', () => {
    const tuning = parseTuningDocument(VALID_DOCUMENT);
    expect(tuning.defaults).toEqual(VALID_DOCUMENT.defaults);
    expect(tuning.difficulty.hard).toEqual({ playerSpeed: 1.1 });
  });

  it('rejects a non-object document', () => {
    expect(() => parseTuningDocument(null)).toThrow(/tuning/i);
    expect(() => parseTuningDocument('nope')).toThrow(/tuning/i);
  });

  it('rejects a missing defaults section', () => {
    const doc: Record<string, unknown> = { ...VALID_DOCUMENT };
    delete doc.defaults;
    expect(() => parseTuningDocument(doc)).toThrow(/defaults/i);
  });

  it('rejects a non-finite default value', () => {
    const doc = { ...VALID_DOCUMENT, defaults: { ...VALID_DOCUMENT.defaults, playerSpeed: 'fast' } };
    expect(() => parseTuningDocument(doc)).toThrow(/playerSpeed/i);
  });

  it('rejects a missing difficulty tier', () => {
    const difficulty: Record<string, unknown> = { ...VALID_DOCUMENT.difficulty };
    delete difficulty.hard;
    const doc = { ...VALID_DOCUMENT, difficulty };
    expect(() => parseTuningDocument(doc)).toThrow(/hard/i);
  });

  it('rejects an unknown key inside a difficulty multiplier set', () => {
    const doc = { ...VALID_DOCUMENT, difficulty: { ...VALID_DOCUMENT.difficulty, hard: { madeUpKey: 2 } } };
    expect(() => parseTuningDocument(doc)).toThrow(/madeUpKey/i);
  });

  it('rejects a non-finite multiplier value', () => {
    const doc = { ...VALID_DOCUMENT, difficulty: { ...VALID_DOCUMENT.difficulty, hard: { playerSpeed: 'fast' } } };
    expect(() => parseTuningDocument(doc)).toThrow(/playerSpeed/i);
  });

  it('rejects a zero or negative default value (would divide-by-zero/invert downstream, e.g. 1 / tickRate)', () => {
    expect(() => parseTuningDocument({ ...VALID_DOCUMENT, defaults: { ...VALID_DOCUMENT.defaults, tickRate: 0 } })).toThrow(
      /tickRate/i,
    );
    expect(() =>
      parseTuningDocument({ ...VALID_DOCUMENT, defaults: { ...VALID_DOCUMENT.defaults, playerSpeed: -1 } }),
    ).toThrow(/playerSpeed/i);
  });

  it('rejects a zero or negative difficulty multiplier', () => {
    const doc = { ...VALID_DOCUMENT, difficulty: { ...VALID_DOCUMENT.difficulty, hard: { playerSpeed: 0 } } };
    expect(() => parseTuningDocument(doc)).toThrow(/playerSpeed/i);
  });
});

describe('resolveTuning', () => {
  const tuning: TuningData = parseTuningDocument(VALID_DOCUMENT);

  it('resolves plain defaults when there is no multiplier or override', () => {
    expect(resolveTuning(tuning, 'medium')).toEqual(VALID_DOCUMENT.defaults);
  });

  it('layers a difficulty multiplier on top of the default', () => {
    const resolved = resolveTuning(tuning, 'hard');
    expect(resolved.playerSpeed).toBeCloseTo(4.5 * 1.1, 5);
    // Keys with no multiplier for this tier are untouched.
    expect(resolved.tickRate).toBe(30);
    expect(resolved.rockHitsToClear).toBe(2);
  });

  it('lets a per-level override win over both the default and the difficulty multiplier', () => {
    const resolved = resolveTuning(tuning, 'hard', { playerSpeed: 9 });
    expect(resolved.playerSpeed).toBe(9);
  });

  it('rejects an unknown override key with a clear message', () => {
    expect(() => resolveTuning(tuning, 'medium', { notAKnownKey: 1 })).toThrow(/notAKnownKey/i);
  });

  it('rejects a zero or negative override value (would divide-by-zero/invert downstream)', () => {
    expect(() => resolveTuning(tuning, 'medium', { tickRate: 0 })).toThrow(/tickRate/i);
    expect(() => resolveTuning(tuning, 'medium', { playerSpeed: -2 })).toThrow(/playerSpeed/i);
  });
});

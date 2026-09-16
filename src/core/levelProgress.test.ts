import { describe, expect, it } from 'vitest';
import { evaluateStars, isLevelComplete } from './levelProgress';

describe('isLevelComplete', () => {
  it('is complete once every diamond is banked on a collection level', () => {
    expect(isLevelComplete('collection', 10, 10)).toBe(true);
  });

  it('is not complete while diamonds remain unbanked', () => {
    expect(isLevelComplete('collection', 9, 10)).toBe(false);
  });

  it('is never complete for a level with zero diamonds (malformed input, not a real collection level)', () => {
    expect(isLevelComplete('collection', 0, 0)).toBe(false);
  });

  it('does not apply to non-collection level types (out of scope for this issue)', () => {
    expect(isLevelComplete('escape', 10, 10)).toBe(false);
    expect(isLevelComplete('puzzle', 10, 10)).toBe(false);
    expect(isLevelComplete('chase', 10, 10)).toBe(false);
    expect(isLevelComplete('boss', 10, 10)).toBe(false);
  });

  it('does not apply when the state has no level (e.g. the demo composition)', () => {
    expect(isLevelComplete(null, 10, 10)).toBe(false);
  });
});

describe('evaluateStars', () => {
  const starThresholds = { diamondPercentForStar2: 80 };
  const parTimeMs = 90000;

  it('awards 1 star for finishing under the 2-star collection threshold', () => {
    expect(evaluateStars(starThresholds, parTimeMs, { diamondsBankedPercent: 50, elapsedMs: 50000 })).toBe(1);
  });

  it('awards 2 stars for meeting the collection threshold but missing par time', () => {
    expect(evaluateStars(starThresholds, parTimeMs, { diamondsBankedPercent: 80, elapsedMs: 95000 })).toBe(2);
  });

  it('awards 3 stars for meeting the collection threshold and beating par time', () => {
    expect(evaluateStars(starThresholds, parTimeMs, { diamondsBankedPercent: 100, elapsedMs: 60000 })).toBe(3);
  });

  it('does not award 3 stars from beating par time alone, without the collection threshold', () => {
    expect(evaluateStars(starThresholds, parTimeMs, { diamondsBankedPercent: 50, elapsedMs: 1000 })).toBe(1);
  });

  it('treats exactly meeting the threshold/par time as a pass (inclusive boundaries)', () => {
    expect(evaluateStars(starThresholds, parTimeMs, { diamondsBankedPercent: 80, elapsedMs: 90000 })).toBe(3);
  });
});

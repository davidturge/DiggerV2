import { describe, expect, it } from 'vitest';
import { carryWeightMultiplier, resolveDeposit } from './bank';
import type { ResolvedTuning } from './tuning';

const TUNING: ResolvedTuning = {
  tickRate: 30,
  playerSpeed: 4.5,
  rockHitsToClear: 2,
  carryWeightPerDiamond: 0.03,
  carryWeightMinMultiplier: 0.4,
  respawnInvulnerabilityMs: 1500,
};

describe('resolveDeposit', () => {
  const bank = { col: 4, row: 1 };

  it('converts carried diamonds to banked score when standing on the bank', () => {
    const result = resolveDeposit(bank, { x: 4.5, y: 1.5 }, 5, 10);
    expect(result).toEqual({ carriedDiamonds: 0, bankedDiamonds: 15, deposited: 5 });
  });

  it('does nothing when the player is away from the bank', () => {
    const result = resolveDeposit(bank, { x: 0.5, y: 0.5 }, 5, 10);
    expect(result).toEqual({ carriedDiamonds: 5, bankedDiamonds: 10, deposited: 0 });
  });

  it('does nothing when the player is carrying nothing, even on the bank', () => {
    const result = resolveDeposit(bank, { x: 4.5, y: 1.5 }, 0, 10);
    expect(result).toEqual({ carriedDiamonds: 0, bankedDiamonds: 10, deposited: 0 });
  });

  it('does nothing when the level has no bank', () => {
    const result = resolveDeposit(null, { x: 4.5, y: 1.5 }, 5, 10);
    expect(result).toEqual({ carriedDiamonds: 5, bankedDiamonds: 10, deposited: 0 });
  });
});

describe('carryWeightMultiplier', () => {
  it('is 1 (full speed) when carrying nothing', () => {
    expect(carryWeightMultiplier(0, TUNING)).toBe(1);
  });

  it('scales down gradually with each carried diamond', () => {
    expect(carryWeightMultiplier(5, TUNING)).toBeCloseTo(1 - 5 * 0.03, 5);
    expect(carryWeightMultiplier(10, TUNING)).toBeCloseTo(1 - 10 * 0.03, 5);
  });

  it('never drops below the configured floor, however much is carried', () => {
    expect(carryWeightMultiplier(1000, TUNING)).toBe(0.4);
  });
});

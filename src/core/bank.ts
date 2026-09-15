// core/ — the bank/deposit point and carry-weight slowdown (tech-spec §6,
// design.md §2.7-2.8): undeposited diamonds are at risk and slow the
// carrier; depositing them at the bank converts carried → banked score.

import { PLAYER_RADIUS, type PlayerState } from './player';
import type { EntityPosition } from './level';
import type { ResolvedTuning } from './tuning';

export const BANK_RADIUS = 0.5;

export interface DepositResult {
  carriedDiamonds: number;
  bankedDiamonds: number;
  deposited: number;
}

/** Deposits the player's full carried count into the bank when standing on it; otherwise a no-op. */
export function resolveDeposit(
  bank: EntityPosition | null,
  player: PlayerState,
  carriedDiamonds: number,
  bankedDiamonds: number,
): DepositResult {
  if (!bank || carriedDiamonds <= 0) {
    return { carriedDiamonds, bankedDiamonds, deposited: 0 };
  }
  const bankCenter = { x: bank.col + 0.5, y: bank.row + 0.5 };
  const distance = Math.hypot(player.x - bankCenter.x, player.y - bankCenter.y);
  if (distance > PLAYER_RADIUS + BANK_RADIUS) {
    return { carriedDiamonds, bankedDiamonds, deposited: 0 };
  }
  return { carriedDiamonds: 0, bankedDiamonds: bankedDiamonds + carriedDiamonds, deposited: carriedDiamonds };
}

/** Movement speed multiplier for the given carried count (design.md §2.8: gradual, never fully stopping). */
export function carryWeightMultiplier(carriedDiamonds: number, tuning: ResolvedTuning): number {
  return Math.max(tuning.carryWeightMinMultiplier, 1 - carriedDiamonds * tuning.carryWeightPerDiamond);
}

// core/ — level completion + star evaluation (tech-spec §10, design.md §7.3):
// collection levels finish once every diamond is banked; stars grade how
// well, per tracker/tickets/007 ("1★ finish · 2★ ≥80% diamonds · 3★ + beat par time").

import type { LevelType, StarThresholds } from './level';

/** Collection levels (design.md §7.3) finish once every diamond is banked. Other types are out of this issue's scope. */
export function isLevelComplete(levelType: LevelType | null, bankedDiamonds: number, totalDiamonds: number): boolean {
  if (levelType !== 'collection') return false;
  return totalDiamonds > 0 && bankedDiamonds >= totalDiamonds;
}

export type StarCount = 1 | 2 | 3;

export interface StarEvaluationInput {
  /** 0-100 — diamonds banked as a percentage of the level's total. */
  diamondsBankedPercent: number;
  elapsedMs: number;
}

/** Call once a level is complete — finishing always earns at least 1 star. */
export function evaluateStars(
  starThresholds: StarThresholds,
  parTimeMs: number,
  input: StarEvaluationInput,
): StarCount {
  if (input.diamondsBankedPercent < starThresholds.diamondPercentForStar2) return 1;
  if (input.elapsedMs <= parTimeMs) return 3;
  return 2;
}

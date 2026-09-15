// render/ — render-side interpolation between the last two sim states
// (tech-spec §3, §4): the renderer blends prev→curr sim state by
// `alpha = accumulator / TICK_DT` so motion reads smoothly even though
// render fps and the fixed sim tick rate are decoupled.

export interface Vec2 {
  x: number;
  y: number;
}

export function clampAlpha(alpha: number): number {
  if (alpha < 0) return 0;
  if (alpha > 1) return 1;
  return alpha;
}

export function lerp(a: number, b: number, alpha: number): number {
  return a + (b - a) * alpha;
}

export function interpolateVec2(prev: Vec2, curr: Vec2, alpha: number): Vec2 {
  const t = clampAlpha(alpha);
  return { x: lerp(prev.x, curr.x, t), y: lerp(prev.y, curr.y, t) };
}

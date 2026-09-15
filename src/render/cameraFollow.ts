// render/ — smooth camera follow (tech-spec §4): exponential smoothing keeps
// the camera gliding after the player rather than snapping to it every tick.

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function smoothFollow(
  current: number,
  target: number,
  smoothingPerSecond: number,
  dt: number,
): number {
  const t = clamp01(1 - Math.exp(-smoothingPerSecond * dt));
  return current + (target - current) * t;
}

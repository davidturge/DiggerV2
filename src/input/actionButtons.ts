// input/ — bottom-right button cluster's pure state (tech-spec §5 / ticket
// 006): Shoot's heat-gauge ring + Ability's cooldown sweep. The heat/cooldown
// values are visual stubs driven by a local timer — real heat state lands
// with issue #7's sim; this only proves the button → command pipeline and
// gives the ring/sweep something to show. See touchControls.ts for the DOM
// glue that creates the buttons and wires real pointer events into this.

import type { CommandQueue } from './commandQueue';

/** Visual stub for the shoot button's heat-gauge ring — not sim state (issue #7 owns that). */
export class HeatGaugeStub {
  private heat = 0;

  constructor(
    private readonly perShotHeat = 0.25,
    private readonly coolPerSecond = 0.2,
  ) {}

  /** Returns false (no shot fired) if the gauge is jammed. */
  shoot(): boolean {
    if (this.jammed) return false;
    this.heat = Math.min(1, this.heat + this.perShotHeat);
    return true;
  }

  update(dtSeconds: number): void {
    this.heat = Math.max(0, this.heat - this.coolPerSecond * dtSeconds);
  }

  get value(): number {
    return this.heat;
  }

  get jammed(): boolean {
    return this.heat >= 1;
  }
}

/** Visual stub for the ability button's radial cooldown sweep. */
export class CooldownStub {
  private remaining = 0;

  constructor(private readonly durationSeconds: number) {}

  get ready(): boolean {
    return this.remaining <= 0;
  }

  /** Starts the cooldown; returns false if it was already running. */
  trigger(): boolean {
    if (!this.ready) return false;
    this.remaining = this.durationSeconds;
    return true;
  }

  update(dtSeconds: number): void {
    this.remaining = Math.max(0, this.remaining - dtSeconds);
  }

  /** 0 right after triggering, 1 once ready again — the sweep fill fraction. */
  get progress(): number {
    if (this.durationSeconds <= 0) return 1;
    return 1 - this.remaining / this.durationSeconds;
  }
}

export class ActionButtons {
  readonly heat = new HeatGaugeStub();
  readonly ability = new CooldownStub(3);

  constructor(private readonly queue: CommandQueue) {}

  pressShoot(): void {
    if (this.heat.shoot()) this.queue.enqueue({ type: 'shoot' });
  }

  pressAbility(): void {
    if (this.ability.trigger()) this.queue.enqueue({ type: 'useAbility' });
  }

  /** Advances the visual stubs; call once per sim tick. */
  update(dtSeconds: number): void {
    this.heat.update(dtSeconds);
    this.ability.update(dtSeconds);
  }
}

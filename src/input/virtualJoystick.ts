// input/ — fixed virtual joystick, bottom-left (tech-spec §5 / ticket 006):
// dead zone + 8-way snap, anchored (not floating), multi-touch safe (tracks
// its own pointerId and ignores other simultaneous touches, e.g. a button
// press on the other thumb). This is the pure state machine, no DOM — see
// touchControls.ts for the DOM glue that creates the on-screen base/knob and
// wires real pointer events into it.

import { computeDirection8 } from './direction8';
import type { CommandQueue } from './commandQueue';

export const JOYSTICK_DEAD_ZONE_PX = 12;
export const JOYSTICK_MAX_RADIUS_PX = 52;

export interface Point {
  x: number;
  y: number;
}

/** Pure fixed-origin joystick pointer state machine — no DOM. */
export class VirtualJoystick {
  private activePointerId: number | null = null;
  private knobOffset: Point = { x: 0, y: 0 };

  constructor(
    private readonly queue: CommandQueue,
    // A function, not a fixed Point: the DOM base/knob are pinned to the
    // viewport with CSS (self-correcting on resize/orientation change), so
    // the pointer math must re-read the origin fresh on every touch instead
    // of baking in the innerHeight seen at attach time.
    private readonly origin: () => Point,
    private readonly deadZone = JOYSTICK_DEAD_ZONE_PX,
    private readonly maxRadius = JOYSTICK_MAX_RADIUS_PX,
  ) {}

  get isActive(): boolean {
    return this.activePointerId !== null;
  }

  /** Knob offset from the base center, clamped to maxRadius — for rendering only. */
  get knobPosition(): Point {
    return this.knobOffset;
  }

  get currentDirection() {
    return computeDirection8(this.knobOffset.x, this.knobOffset.y, this.deadZone);
  }

  /** First touch on the joystick zone claims it; concurrent touches elsewhere are unaffected. */
  handlePointerDown(pointerId: number, point: Point): void {
    if (this.activePointerId !== null) return;
    this.activePointerId = pointerId;
    this.applyPoint(point);
  }

  handlePointerMove(pointerId: number, point: Point): void {
    if (pointerId !== this.activePointerId) return;
    this.applyPoint(point);
  }

  handlePointerUp(pointerId: number): void {
    if (pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.knobOffset = { x: 0, y: 0 };
    this.queue.setTouchMoveDirection(null);
  }

  private applyPoint(point: Point): void {
    const origin = this.origin();
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    const magnitude = Math.hypot(dx, dy);
    const scale = magnitude > this.maxRadius ? this.maxRadius / magnitude : 1;
    this.knobOffset = { x: dx * scale, y: dy * scale };
    this.queue.setTouchMoveDirection(this.currentDirection);
  }
}

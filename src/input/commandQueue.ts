// input/ — the seam every input adapter (touch joystick, touch buttons) writes
// into and the app composition root (main.ts) reads from once per tick
// (tech-spec §3: "commands in"). Move is continuous — the joystick reports its
// currently-held direction, re-read every tick — while shoot/useAbility are
// one-shot, queued on press and cleared on drain. Keyboard stays a separate,
// polled `directionFromKeys` path (see input/keyboardInput.ts) rather than
// pushing through this queue; main.ts merges the two.

import type { Command, Direction8 } from '../core/commands';

export class CommandQueue {
  private oneShot: Command[] = [];
  private touchMoveDirection: Direction8 | null = null;

  /** The touch joystick's currently-held direction; null when the stick isn't active or is in the dead zone. */
  get moveDirection(): Direction8 | null {
    return this.touchMoveDirection;
  }

  setTouchMoveDirection(direction: Direction8 | null): void {
    this.touchMoveDirection = direction;
  }

  /** Queues a one-shot command (shoot/useAbility) fired by a button press. */
  enqueue(command: Command): void {
    this.oneShot.push(command);
  }

  /** Drains and clears the queued one-shot commands. Call once per tick. */
  drainOneShot(): Command[] {
    const commands = this.oneShot;
    this.oneShot = [];
    return commands;
  }
}

import { describe, expect, it } from 'vitest';
import { CommandQueue } from './commandQueue';

describe('CommandQueue', () => {
  it('starts with no held direction and nothing queued', () => {
    const queue = new CommandQueue();
    expect(queue.moveDirection).toBeNull();
    expect(queue.drainOneShot()).toEqual([]);
  });

  it('reports the currently held touch move direction until cleared', () => {
    const queue = new CommandQueue();
    queue.setTouchMoveDirection('ne');
    expect(queue.moveDirection).toBe('ne');
    queue.setTouchMoveDirection(null);
    expect(queue.moveDirection).toBeNull();
  });

  it('queues one-shot commands and clears them once drained', () => {
    const queue = new CommandQueue();
    queue.enqueue({ type: 'shoot' });
    queue.enqueue({ type: 'useAbility' });

    expect(queue.drainOneShot()).toEqual([{ type: 'shoot' }, { type: 'useAbility' }]);
    expect(queue.drainOneShot()).toEqual([]);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { registerContextLossHandlers } from './contextLoss';

// Node's built-in EventTarget satisfies the ContextLossTarget shape, so this
// stays headless — no real WebGL canvas needed to prove the wiring is correct.
describe('registerContextLossHandlers', () => {
  it('prevents the default recovery behavior and calls onLost on context loss', () => {
    const target = new EventTarget();
    const onLost = vi.fn();
    const onRestored = vi.fn();
    registerContextLossHandlers(target, { onLost, onRestored });

    const event = new Event('webglcontextlost', { cancelable: true });
    target.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onLost).toHaveBeenCalledOnce();
    expect(onRestored).not.toHaveBeenCalled();
  });

  it('calls onRestored on context restore', () => {
    const target = new EventTarget();
    const onLost = vi.fn();
    const onRestored = vi.fn();
    registerContextLossHandlers(target, { onLost, onRestored });

    target.dispatchEvent(new Event('webglcontextrestored'));

    expect(onRestored).toHaveBeenCalledOnce();
    expect(onLost).not.toHaveBeenCalled();
  });
});

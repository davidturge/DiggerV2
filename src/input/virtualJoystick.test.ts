import { describe, expect, it } from 'vitest';
import { CommandQueue } from './commandQueue';
import { VirtualJoystick } from './virtualJoystick';

const ORIGIN = { x: 100, y: 200 };

describe('VirtualJoystick', () => {
  it('is inactive with a centered knob and no direction before any touch', () => {
    const queue = new CommandQueue();
    const joystick = new VirtualJoystick(queue, () => ORIGIN);

    expect(joystick.isActive).toBe(false);
    expect(joystick.knobPosition).toEqual({ x: 0, y: 0 });
    expect(joystick.currentDirection).toBeNull();
  });

  it('claims a pointer on down and reports the snapped direction into the queue', () => {
    const queue = new CommandQueue();
    const joystick = new VirtualJoystick(queue, () => ORIGIN, 10, 50);

    joystick.handlePointerDown(1, { x: ORIGIN.x + 30, y: ORIGIN.y });

    expect(joystick.isActive).toBe(true);
    expect(joystick.currentDirection).toBe('e');
    expect(queue.moveDirection).toBe('e');
  });

  it('ignores a second pointer while the first is active (multi-touch safe)', () => {
    const queue = new CommandQueue();
    const joystick = new VirtualJoystick(queue, () => ORIGIN, 10, 50);

    joystick.handlePointerDown(1, { x: ORIGIN.x + 30, y: ORIGIN.y });
    joystick.handlePointerDown(2, { x: ORIGIN.x, y: ORIGIN.y + 30 });

    expect(joystick.currentDirection).toBe('e');
    joystick.handlePointerMove(2, { x: ORIGIN.x, y: ORIGIN.y - 30 });
    expect(joystick.currentDirection).toBe('e');
  });

  it('stays within the dead zone right after a touch lands near the origin', () => {
    const queue = new CommandQueue();
    const joystick = new VirtualJoystick(queue, () => ORIGIN, 10, 50);

    joystick.handlePointerDown(1, { x: ORIGIN.x + 3, y: ORIGIN.y });

    expect(joystick.currentDirection).toBeNull();
    expect(queue.moveDirection).toBeNull();
  });

  it('clamps the knob offset to the max radius while following the drag direction', () => {
    const queue = new CommandQueue();
    const joystick = new VirtualJoystick(queue, () => ORIGIN, 10, 50);

    joystick.handlePointerDown(1, { x: ORIGIN.x + 200, y: ORIGIN.y });

    expect(joystick.knobPosition.x).toBeCloseTo(50);
    expect(joystick.knobPosition.y).toBeCloseTo(0);
  });

  it('releases on pointer up, recentering the knob and clearing the queue direction', () => {
    const queue = new CommandQueue();
    const joystick = new VirtualJoystick(queue, () => ORIGIN, 10, 50);

    joystick.handlePointerDown(1, { x: ORIGIN.x + 30, y: ORIGIN.y });
    joystick.handlePointerUp(1);

    expect(joystick.isActive).toBe(false);
    expect(joystick.knobPosition).toEqual({ x: 0, y: 0 });
    expect(joystick.currentDirection).toBeNull();
    expect(queue.moveDirection).toBeNull();
  });

  it('ignores an up event for a pointer that never claimed the stick', () => {
    const queue = new CommandQueue();
    const joystick = new VirtualJoystick(queue, () => ORIGIN, 10, 50);

    joystick.handlePointerDown(1, { x: ORIGIN.x + 30, y: ORIGIN.y });
    joystick.handlePointerUp(99);

    expect(joystick.isActive).toBe(true);
    expect(joystick.currentDirection).toBe('e');
  });

  it('re-reads the origin on every touch instead of caching it at construction', () => {
    const queue = new CommandQueue();
    let origin = ORIGIN;
    const joystick = new VirtualJoystick(queue, () => origin, 10, 50);

    origin = { x: 300, y: 400 };
    joystick.handlePointerDown(1, { x: origin.x + 30, y: origin.y });

    expect(joystick.currentDirection).toBe('e');
    expect(queue.moveDirection).toBe('e');
  });

  it('re-snaps the direction as the drag moves', () => {
    const queue = new CommandQueue();
    const joystick = new VirtualJoystick(queue, () => ORIGIN, 10, 50);

    joystick.handlePointerDown(1, { x: ORIGIN.x + 30, y: ORIGIN.y });
    expect(joystick.currentDirection).toBe('e');

    joystick.handlePointerMove(1, { x: ORIGIN.x, y: ORIGIN.y + 30 });
    expect(joystick.currentDirection).toBe('s');
    expect(queue.moveDirection).toBe('s');
  });
});

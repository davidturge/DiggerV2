// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { ActionButtons } from './actionButtons';
import { attachActionButtons, attachTouchJoystick, JOYSTICK_MARGIN_PX, JOYSTICK_MAX_RADIUS_PX } from './touchControls';
import { CommandQueue } from './commandQueue';

describe('attachTouchJoystick (DOM)', () => {
  it('creates the zone, base, and knob visuals in the given root', () => {
    const root = document.createElement('div');
    const queue = new CommandQueue();

    const handle = attachTouchJoystick(root, queue);

    expect(root.querySelector('[data-testid="joystick-zone"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="joystick-base"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="joystick-knob"]')).not.toBeNull();
    handle.destroy();
  });

  it('drives real move commands into the queue from real pointer events, multi-touch safe', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const queue = new CommandQueue();
    const handle = attachTouchJoystick(root, queue);
    const zone = root.querySelector('[data-testid="joystick-zone"]')!;

    const origin = {
      x: JOYSTICK_MARGIN_PX + JOYSTICK_MAX_RADIUS_PX,
      y: window.innerHeight - JOYSTICK_MARGIN_PX - JOYSTICK_MAX_RADIUS_PX,
    };
    zone.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 7,
        clientX: origin.x + 40,
        clientY: origin.y,
        bubbles: true,
      }),
    );
    expect(queue.moveDirection).toBe('e');

    // A second, simultaneous touch (e.g. a button press) must not steal the stick.
    zone.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 8, clientX: origin.x, clientY: origin.y - 40, bubbles: true }),
    );
    expect(queue.moveDirection).toBe('e');

    zone.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, bubbles: true }));
    expect(queue.moveDirection).toBeNull();

    handle.destroy();
    root.remove();
  });

  it('tracks a real innerHeight change instead of using the height captured at attach time', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const queue = new CommandQueue();
    const originalInnerHeight = window.innerHeight;
    const handle = attachTouchJoystick(root, queue);
    const zone = root.querySelector('[data-testid="joystick-zone"]')!;

    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight + 300 });
    const newOriginY = window.innerHeight - JOYSTICK_MARGIN_PX - JOYSTICK_MAX_RADIUS_PX;

    zone.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 3,
        clientX: JOYSTICK_MARGIN_PX + JOYSTICK_MAX_RADIUS_PX + 40,
        clientY: newOriginY,
        bubbles: true,
      }),
    );

    expect(queue.moveDirection).toBe('e');

    handle.destroy();
    root.remove();
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
  });

  it('removes its elements and listeners on destroy', () => {
    const root = document.createElement('div');
    const queue = new CommandQueue();
    const handle = attachTouchJoystick(root, queue);

    handle.destroy();

    expect(root.querySelector('[data-testid="joystick-base"]')).toBeNull();
    expect(root.querySelector('[data-testid="joystick-zone"]')).toBeNull();
  });
});

describe('attachActionButtons (DOM)', () => {
  it('creates shoot, ability, and a disabled reserved slot', () => {
    const root = document.createElement('div');
    const queue = new CommandQueue();
    const actionButtons = new ActionButtons(queue);

    const handle = attachActionButtons(root, actionButtons);

    const shoot = root.querySelector('[data-testid="shoot-button"]');
    const ability = root.querySelector('[data-testid="ability-button"]');
    const reserved = root.querySelector('[data-testid="reserved-slot"]') as HTMLButtonElement | null;
    expect(shoot).not.toBeNull();
    expect(ability).not.toBeNull();
    expect(reserved?.disabled).toBe(true);

    handle.destroy();
  });

  it('a real pointerdown on the shoot button enqueues a shoot command', () => {
    const root = document.createElement('div');
    const queue = new CommandQueue();
    const actionButtons = new ActionButtons(queue);
    const handle = attachActionButtons(root, actionButtons);

    const shoot = root.querySelector('[data-testid="shoot-button"]')!;
    shoot.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(queue.drainOneShot()).toEqual([{ type: 'shoot' }]);
    handle.destroy();
  });

  it('a real pointerdown on the ability button enqueues useAbility, gated by cooldown', () => {
    const root = document.createElement('div');
    const queue = new CommandQueue();
    const actionButtons = new ActionButtons(queue);
    const handle = attachActionButtons(root, actionButtons);

    const ability = root.querySelector('[data-testid="ability-button"]')!;
    ability.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    ability.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(queue.drainOneShot()).toEqual([{ type: 'useAbility' }]);
    handle.destroy();
  });

  it('renders the heat gauge and cooldown sweep as conic-gradient fills reflecting state', () => {
    const root = document.createElement('div');
    const queue = new CommandQueue();
    const actionButtons = new ActionButtons(queue);
    const handle = attachActionButtons(root, actionButtons);

    actionButtons.pressShoot();
    handle.render();

    const shoot = root.querySelector('[data-testid="shoot-button"]') as HTMLButtonElement;
    expect(shoot.style.background).toContain('conic-gradient');
    handle.destroy();
  });
});

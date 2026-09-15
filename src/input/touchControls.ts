// input/ — DOM glue for the touch controls (tech-spec §5 / ticket 006): the
// fixed bottom-left joystick and bottom-right Shoot/Ability/reserved button
// cluster. Wires real pointer events into the pure VirtualJoystick/
// ActionButtons state machines; main.ts composes this the same way it
// composes the render/*.ts pieces.

import { VirtualJoystick, JOYSTICK_MAX_RADIUS_PX, type Point } from './virtualJoystick';
import type { ActionButtons } from './actionButtons';
import type { CommandQueue } from './commandQueue';

export { JOYSTICK_MAX_RADIUS_PX };

export const JOYSTICK_MARGIN_PX = 28;

/** Runtime gesture-nav / notch insets (tech-spec §5: "query at runtime"). */
export interface SafeAreaInsets {
  left: number;
  bottom: number;
}

/**
 * Reads the safe-area insets by letting the browser resolve CSS `env()` on a
 * throwaway probe. Returns 0s where env() is unsupported (desktop, jsdom).
 */
export function readSafeAreaInsets(): SafeAreaInsets {
  const probe = document.createElement('div');
  Object.assign(probe.style, {
    position: 'fixed',
    visibility: 'hidden',
    paddingLeft: 'env(safe-area-inset-left, 0px)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  });
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = {
    left: parseFloat(style.paddingLeft) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
  };
  probe.remove();
  return insets;
}

/**
 * Where the joystick's center sits for a given viewport. The DOM base/knob
 * and the pointer math BOTH derive from this one function, so the drawn
 * center and the dead-zone center can't drift apart by the inset height
 * (they did when the visuals used CSS env() but the math used innerHeight).
 */
export function computeJoystickOrigin(viewportHeight: number, insets: SafeAreaInsets): Point {
  return {
    x: insets.left + JOYSTICK_MARGIN_PX + JOYSTICK_MAX_RADIUS_PX,
    y: viewportHeight - insets.bottom - JOYSTICK_MARGIN_PX - JOYSTICK_MAX_RADIUS_PX,
  };
}

export interface TouchJoystickHandle {
  /** Refreshes the knob's on-screen position from current pointer state; call once per animation frame. */
  render(): void;
  destroy(): void;
}

/**
 * Creates the fixed joystick's DOM (a wide bottom-left drag zone so the thumb
 * doesn't have to land exactly on the visible base, plus the base/knob visuals)
 * and wires pointer events into a VirtualJoystick backed by `queue`.
 */
export function attachTouchJoystick(root: HTMLElement, queue: CommandQueue): TouchJoystickHandle {
  // Insets are re-probed only on resize/orientation change (the probe touches
  // the DOM); innerHeight is read live on every touch so the origin tracks
  // the viewport even when no resize event fired (see the dom test).
  let insets = readSafeAreaInsets();
  const joystickOrigin = (): Point => computeJoystickOrigin(window.innerHeight, insets);
  const joystick = new VirtualJoystick(queue, joystickOrigin);

  const zone = document.createElement('div');
  zone.dataset.testid = 'joystick-zone';
  Object.assign(zone.style, {
    position: 'fixed',
    left: '0',
    bottom: '0',
    width: '45%',
    height: '60%',
    touchAction: 'none',
  });

  const base = document.createElement('div');
  base.dataset.testid = 'joystick-base';
  const baseDiameter = JOYSTICK_MAX_RADIUS_PX * 2;
  Object.assign(base.style, {
    position: 'fixed',
    width: `${baseDiameter}px`,
    height: `${baseDiameter}px`,
    marginLeft: `${-JOYSTICK_MAX_RADIUS_PX}px`,
    marginTop: `${-JOYSTICK_MAX_RADIUS_PX}px`,
    borderRadius: '50%',
    border: '2px solid rgba(239, 231, 218, 0.35)',
    background: 'rgba(30, 24, 19, 0.4)',
    pointerEvents: 'none',
  });

  const knob = document.createElement('div');
  knob.dataset.testid = 'joystick-knob';
  Object.assign(knob.style, {
    position: 'fixed',
    width: '46px',
    height: '46px',
    marginLeft: '-23px',
    marginTop: '-23px',
    borderRadius: '50%',
    background: '#e0a458',
    pointerEvents: 'none',
  });

  root.append(zone, base, knob);

  // Pin the visuals to the same origin the pointer math uses; re-run whenever
  // the viewport (and therefore the insets) can have changed.
  const layout = (): void => {
    insets = readSafeAreaInsets();
    const origin = joystickOrigin();
    for (const el of [base, knob]) {
      el.style.left = `${origin.x}px`;
      el.style.top = `${origin.y}px`;
    }
  };
  layout();
  window.addEventListener('resize', layout);

  const onPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    joystick.handlePointerDown(event.pointerId, { x: event.clientX, y: event.clientY });
    zone.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent): void => {
    joystick.handlePointerMove(event.pointerId, { x: event.clientX, y: event.clientY });
  };
  const onPointerEnd = (event: PointerEvent): void => {
    joystick.handlePointerUp(event.pointerId);
    zone.releasePointerCapture?.(event.pointerId);
  };

  zone.addEventListener('pointerdown', onPointerDown);
  zone.addEventListener('pointermove', onPointerMove);
  zone.addEventListener('pointerup', onPointerEnd);
  zone.addEventListener('pointercancel', onPointerEnd);

  return {
    render(): void {
      const offset = joystick.knobPosition;
      knob.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
    },
    destroy(): void {
      window.removeEventListener('resize', layout);
      zone.removeEventListener('pointerdown', onPointerDown);
      zone.removeEventListener('pointermove', onPointerMove);
      zone.removeEventListener('pointerup', onPointerEnd);
      zone.removeEventListener('pointercancel', onPointerEnd);
      zone.remove();
      base.remove();
      knob.remove();
    },
  };
}

const BUTTON_MARGIN_PX = 24;
const BUTTON_GAP_PX = 14;
const SHOOT_DIAMETER_PX = 84;
const ABILITY_DIAMETER_PX = 64;
const RESERVED_DIAMETER_PX = 64;

function circleButton(diameter: number, testId: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.dataset.testid = testId;
  Object.assign(button.style, {
    position: 'fixed',
    right: `calc(env(safe-area-inset-right, 0px) + ${BUTTON_MARGIN_PX}px)`,
    bottom: `calc(env(safe-area-inset-bottom, 0px) + ${BUTTON_MARGIN_PX}px)`,
    width: `${diameter}px`,
    height: `${diameter}px`,
    borderRadius: '50%',
    border: '2px solid rgba(58, 49, 40, 0.8)',
    color: '#efe7da',
    touchAction: 'none',
  });
  return button;
}

export interface ActionButtonsHandle {
  render(): void;
  destroy(): void;
}

/** Creates the Shoot/Ability/reserved DOM buttons and wires presses into `actionButtons`. */
export function attachActionButtons(root: HTMLElement, actionButtons: ActionButtons): ActionButtonsHandle {
  const shoot = circleButton(SHOOT_DIAMETER_PX, 'shoot-button');
  shoot.textContent = 'Shoot';

  const ability = circleButton(ABILITY_DIAMETER_PX, 'ability-button');
  ability.textContent = 'Ability';
  // Up-and-inward from Shoot (tech-spec §5 / research §1) — the only direction
  // with screen room to grow for a corner-anchored primary button.
  ability.style.right = `calc(env(safe-area-inset-right, 0px) + ${BUTTON_MARGIN_PX + SHOOT_DIAMETER_PX + BUTTON_GAP_PX}px)`;
  ability.style.bottom = `calc(env(safe-area-inset-bottom, 0px) + ${BUTTON_MARGIN_PX + SHOOT_DIAMETER_PX - ABILITY_DIAMETER_PX}px)`;

  const reserved = circleButton(RESERVED_DIAMETER_PX, 'reserved-slot');
  reserved.disabled = true;
  reserved.style.opacity = '0.25';
  reserved.style.right = `calc(env(safe-area-inset-right, 0px) + ${BUTTON_MARGIN_PX + SHOOT_DIAMETER_PX + BUTTON_GAP_PX}px)`;
  reserved.style.bottom = `calc(env(safe-area-inset-bottom, 0px) + ${BUTTON_MARGIN_PX + SHOOT_DIAMETER_PX + BUTTON_GAP_PX}px)`;

  root.append(shoot, ability, reserved);

  const onShootDown = (event: PointerEvent): void => {
    event.preventDefault();
    actionButtons.pressShoot();
  };
  const onAbilityDown = (event: PointerEvent): void => {
    event.preventDefault();
    actionButtons.pressAbility();
  };
  shoot.addEventListener('pointerdown', onShootDown);
  ability.addEventListener('pointerdown', onAbilityDown);

  return {
    render(): void {
      const heatDeg = Math.round(actionButtons.heat.value * 360);
      shoot.style.background = `conic-gradient(#c94a2e ${heatDeg}deg, rgba(30, 24, 19, 0.85) ${heatDeg}deg)`;

      const cooldownDeg = Math.round(actionButtons.ability.progress * 360);
      ability.style.background = `conic-gradient(#6fae4e ${cooldownDeg}deg, rgba(30, 24, 19, 0.85) ${cooldownDeg}deg)`;
    },
    destroy(): void {
      shoot.removeEventListener('pointerdown', onShootDown);
      ability.removeEventListener('pointerdown', onAbilityDown);
      shoot.remove();
      ability.remove();
      reserved.remove();
    },
  };
}

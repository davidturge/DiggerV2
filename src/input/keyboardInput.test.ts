import { describe, expect, it } from 'vitest';
import { directionFromKeys } from './keyboardInput';

describe('directionFromKeys', () => {
  it('returns null when no movement keys are held', () => {
    expect(directionFromKeys(new Set())).toBeNull();
    expect(directionFromKeys(new Set(['q']))).toBeNull();
  });

  it('maps single WASD keys to their compass direction', () => {
    expect(directionFromKeys(new Set(['w']))).toBe('n');
    expect(directionFromKeys(new Set(['s']))).toBe('s');
    expect(directionFromKeys(new Set(['a']))).toBe('w');
    expect(directionFromKeys(new Set(['d']))).toBe('e');
  });

  it('combines two adjacent keys into a diagonal', () => {
    expect(directionFromKeys(new Set(['w', 'd']))).toBe('ne');
    expect(directionFromKeys(new Set(['w', 'a']))).toBe('nw');
    expect(directionFromKeys(new Set(['s', 'd']))).toBe('se');
    expect(directionFromKeys(new Set(['s', 'a']))).toBe('sw');
  });

  it('cancels out opposing keys held together', () => {
    expect(directionFromKeys(new Set(['w', 's']))).toBeNull();
    expect(directionFromKeys(new Set(['a', 'd']))).toBeNull();
    expect(directionFromKeys(new Set(['w', 's', 'a', 'd']))).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(directionFromKeys(new Set(['W']))).toBe('n');
  });
});

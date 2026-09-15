import { describe, expect, it } from 'vitest';
import { ActionButtons } from './actionButtons';
import { CommandQueue } from './commandQueue';

describe('ActionButtons', () => {
  it('enqueues a shoot command on press and raises the heat gauge', () => {
    const queue = new CommandQueue();
    const buttons = new ActionButtons(queue);

    buttons.pressShoot();

    expect(queue.drainOneShot()).toEqual([{ type: 'shoot' }]);
    expect(buttons.heat.value).toBeGreaterThan(0);
  });

  it('jams the shoot button once heat maxes out, dropping further presses', () => {
    const queue = new CommandQueue();
    const buttons = new ActionButtons(queue);

    for (let i = 0; i < 20; i++) buttons.pressShoot();

    expect(buttons.heat.jammed).toBe(true);
    const commandsSoFar = queue.drainOneShot();
    buttons.pressShoot();
    expect(queue.drainOneShot()).toEqual([]);
    expect(commandsSoFar.length).toBeGreaterThan(0);
  });

  it('cools down over time and can fire again once unjammed', () => {
    const queue = new CommandQueue();
    const buttons = new ActionButtons(queue);
    for (let i = 0; i < 20; i++) buttons.pressShoot();
    queue.drainOneShot();
    expect(buttons.heat.jammed).toBe(true);

    buttons.update(10);

    expect(buttons.heat.jammed).toBe(false);
    buttons.pressShoot();
    expect(queue.drainOneShot()).toEqual([{ type: 'shoot' }]);
  });

  it('enqueues useAbility on press and gates a second press until the cooldown finishes', () => {
    const queue = new CommandQueue();
    const buttons = new ActionButtons(queue);

    buttons.pressAbility();
    buttons.pressAbility();

    expect(queue.drainOneShot()).toEqual([{ type: 'useAbility' }]);
    expect(buttons.ability.ready).toBe(false);
  });

  it('re-arms the ability once its cooldown elapses', () => {
    const queue = new CommandQueue();
    const buttons = new ActionButtons(queue);

    buttons.pressAbility();
    queue.drainOneShot();
    buttons.update(100);

    expect(buttons.ability.ready).toBe(true);
    buttons.pressAbility();
    expect(queue.drainOneShot()).toEqual([{ type: 'useAbility' }]);
  });
});

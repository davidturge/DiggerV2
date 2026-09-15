// Production entry point (index.html boots this). Wires keyboard + touch
// input → command queue → fixed-timestep core ticks → render-side
// interpolation → three.js scene, per tech-spec §3/§4/§5.
//
// REACHABILITY NOTE: this file cannot run under vitest with a real WebGL
// context — there is no headless-GL in the project's test environment
// (checked for issue #2). Every piece of non-trivial logic this file
// composes (the fixed-timestep accumulator, render interpolation,
// camera-follow smoothing, WASD→direction mapping, tile-instance indexing,
// webglcontextlost/restored wiring, and — new in issue #3 — the touch
// joystick/button DOM wiring) is factored into src/render/*.ts and
// src/input/*.ts and covered by unit tests instead. The touch pieces
// (src/input/touchControls.ts's attachTouchJoystick/attachActionButtons) are
// exercised under jsdom with real PointerEvents in
// src/input/touchControls.dom.test.ts, dispatched at this file's actual
// fixed joystick origin/geometry — the exact functions main.ts calls below,
// not a hand-built harness. This file itself is a thin composition of those
// tested pieces plus the actual three.js/DOM calls, and needs manual/browser
// verification (`npm run dev`) that a human should do. This mirrors
// app.ts/app.test.ts's role for the core sim in issue #1, but no equivalent
// full-file headless harness is possible here because three.js requires a
// real canvas/WebGL context.

import * as THREE from 'three';
import { DEMO_LEVEL } from './app';
import type { Command } from './core/commands';
import type { SimEvent } from './core/events';
import { advanceTick, createGameState, TICK_RATE, type GameState } from './core/sim';
import { ActionButtons } from './input/actionButtons';
import { CommandQueue } from './input/commandQueue';
import { directionFromKeys } from './input/keyboardInput';
import { attachActionButtons, attachTouchJoystick } from './input/touchControls';
import { smoothFollow } from './render/cameraFollow';
import { registerContextLossHandlers } from './render/contextLoss';
import { stepFixedTimestep } from './render/fixedTimestepLoop';
import { interpolateVec2 } from './render/interpolation';
import { buildScene, type SceneHandle } from './render/sceneBuilder';
import { toWorldX, toWorldY } from './render/worldSpace';

const TICK_DT = 1 / TICK_RATE;
const MAX_CATCHUP_TICKS = 5;
const MAX_FRAME_DT = 0.25; // guards against a huge dt after a tab/app was backgrounded
const CAMERA_FOLLOW_PER_SECOND = 8;
const DEVICE_PIXEL_RATIO_CAP = 2;

const container = document.getElementById('app');
if (container) {
  boot(container);
}

function boot(container: HTMLElement): void {
  container.textContent = '';

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, DEVICE_PIXEL_RATIO_CAP));
  container.appendChild(renderer.domElement);

  let gameState: GameState = createGameState(1, DEMO_LEVEL);
  let prevPlayer = gameState.player;
  let currPlayer = gameState.player;
  let sceneHandle: SceneHandle = buildScene(gameState.grid, gameState.player);

  function resize(): void {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    sceneHandle.resize(width / height);
  }
  window.addEventListener('resize', resize);
  resize();

  const heldKeys = new Set<string>();
  window.addEventListener('keydown', (event) => heldKeys.add(event.key.toLowerCase()));
  window.addEventListener('keyup', (event) => heldKeys.delete(event.key.toLowerCase()));

  // Touch: fixed joystick bottom-left + Shoot/Ability/reserved cluster
  // bottom-right (tech-spec §5). Keyboard stays a separate, polled fallback —
  // the touch stick's held direction takes priority over it when active.
  const commandQueue = new CommandQueue();
  const actionButtons = new ActionButtons(commandQueue);
  const joystickHandle = attachTouchJoystick(container, commandQueue);
  const actionButtonsHandle = attachActionButtons(container, actionButtons);

  function applyEvents(events: readonly SimEvent[]): void {
    for (const event of events) {
      if (event.type === 'tile-dug') {
        sceneHandle.hideTile(event.tileType, event.col, event.row);
      }
    }
  }

  function tick(state: GameState): GameState {
    prevPlayer = state.player;
    actionButtons.update(TICK_DT);
    const direction = commandQueue.moveDirection ?? directionFromKeys(heldKeys);
    const commands: Command[] = commandQueue.drainOneShot();
    if (direction) commands.push({ type: 'move', direction });
    const { state: nextState, events } = advanceTick(state, commands);
    applyEvents(events);
    return nextState;
  }

  let accumulator = 0;
  let running = true;
  let lastTime: number | null = null;

  registerContextLossHandlers(renderer.domElement, {
    onLost: () => {
      running = false;
    },
    onRestored: () => {
      // Rebuild the entire render layer from the sim's current state — never
      // assume three.js silently recovers GPU resources on its own
      // (tracker/research/threejs-android-performance.md §3).
      sceneHandle.dispose();
      sceneHandle = buildScene(gameState.grid, gameState.player);
      resize();
      accumulator = 0;
      lastTime = null;
      running = true;
      requestAnimationFrame(frame);
    },
  });

  function frame(now: number): void {
    if (!running) return;
    if (lastTime === null) lastTime = now;
    const frameDt = Math.min((now - lastTime) / 1000, MAX_FRAME_DT);
    lastTime = now;

    const result = stepFixedTimestep(accumulator, frameDt, TICK_DT, MAX_CATCHUP_TICKS, gameState, tick);
    gameState = result.state;
    accumulator = result.accumulator;
    currPlayer = gameState.player;

    const alpha = accumulator / TICK_DT;
    const interpolated = interpolateVec2(prevPlayer, currPlayer, alpha);
    const playerWorldX = toWorldX(interpolated.x);
    const playerWorldY = toWorldY(interpolated.y);

    sceneHandle.player.position.x = playerWorldX;
    sceneHandle.player.position.y = playerWorldY;
    sceneHandle.playerShadow.position.x = playerWorldX;
    sceneHandle.playerShadow.position.y = playerWorldY;

    sceneHandle.camera.position.x = smoothFollow(
      sceneHandle.camera.position.x,
      playerWorldX,
      CAMERA_FOLLOW_PER_SECOND,
      frameDt,
    );
    sceneHandle.camera.position.y = smoothFollow(
      sceneHandle.camera.position.y,
      playerWorldY,
      CAMERA_FOLLOW_PER_SECOND,
      frameDt,
    );

    joystickHandle.render();
    actionButtonsHandle.render();

    renderer.render(sceneHandle.scene, sceneHandle.camera);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

// Production entry point (index.html boots this). Wires keyboard input →
// command queue → fixed-timestep core ticks → render-side interpolation →
// three.js scene, per tech-spec §3/§4.
//
// REACHABILITY NOTE: this file cannot run under vitest — there is no
// DOM/WebGL context in the project's node test environment (no jsdom, no
// headless-GL, checked for issue #2). Every piece of non-trivial logic this
// file composes (the fixed-timestep accumulator, render interpolation,
// camera-follow smoothing, WASD→direction mapping, tile-instance indexing,
// and webglcontextlost/restored wiring) is factored into src/render/*.ts and
// covered by headless unit tests instead — this file itself is a thin
// composition of those tested pieces plus the actual three.js/DOM calls, and
// needs manual/browser verification (`npm run dev`) that a human should do.
// This mirrors app.ts/app.test.ts's role for the core sim in issue #1, but
// no equivalent headless harness is possible here because three.js requires
// a real canvas/WebGL context.

import * as THREE from 'three';
import { DEMO_LEVEL } from './app';
import type { Command } from './core/commands';
import type { SimEvent } from './core/events';
import { advanceTick, createGameState, TICK_RATE, type GameState } from './core/sim';
import { smoothFollow } from './render/cameraFollow';
import { registerContextLossHandlers } from './render/contextLoss';
import { stepFixedTimestep } from './render/fixedTimestepLoop';
import { interpolateVec2 } from './render/interpolation';
import { directionFromKeys } from './render/keyboardInput';
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

  function applyEvents(events: readonly SimEvent[]): void {
    for (const event of events) {
      if (event.type === 'tile-dug') {
        sceneHandle.hideTile(event.tileType, event.col, event.row);
      }
    }
  }

  function tick(state: GameState): GameState {
    prevPlayer = state.player;
    const direction = directionFromKeys(heldKeys);
    const commands: Command[] = direction ? [{ type: 'move', direction }] : [];
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

    renderer.render(sceneHandle.scene, sceneHandle.camera);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

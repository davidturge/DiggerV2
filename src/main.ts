import { createGameState, TICK_RATE } from './core/sim';

// Scaffold entry point. The renderer lands with its own issue; until then this
// proves the phone→dev-server loop and that core is importable from the app.
const app = document.getElementById('app');
if (app) {
  const state = createGameState(42);
  app.textContent = `Digger Versus scaffold — sim ready (seed ${state.seed}, ${TICK_RATE} ticks/s)`;
}

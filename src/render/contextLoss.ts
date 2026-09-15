// render/ — webglcontextlost/restored wiring (tech-spec §4). Three.js does
// not guarantee silent production recovery from context loss (see
// tracker/research/threejs-android-performance.md §3), so the render layer
// must explicitly rebuild itself from the sim's current state on restore.

export interface ContextLossTarget {
  addEventListener(type: 'webglcontextlost' | 'webglcontextrestored', listener: (event: Event) => void): void;
}

export interface ContextLossHandlers {
  onLost: () => void;
  onRestored: () => void;
}

export function registerContextLossHandlers(target: ContextLossTarget, handlers: ContextLossHandlers): void {
  target.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    handlers.onLost();
  });
  target.addEventListener('webglcontextrestored', () => {
    handlers.onRestored();
  });
}

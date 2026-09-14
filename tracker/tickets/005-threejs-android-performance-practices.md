---
id: 5
title: three.js performance on Android WebView
labels: [wayfinder:research]
status: closed
assignee: claude (research agent)
blocked-by: []
---

## Question

What performance practices must the tech spec bake in from day one so the game holds 60fps (or a stable 30) on mid-range Android phones inside a Capacitor WebView?

- Draw-call strategy for a tile-based map (instancing/merging for dirt tiles; how many tiles/entities are safe).
- Texture and material budgets; lighting approach (baked vs real-time; how many lights the clay look can afford).
- Known WebView-specific pitfalls vs mobile Chrome (context loss, devicePixelRatio, memory limits) and mitigations.
- Frame pacing: requestAnimationFrame behavior in WebView, decoupling the fixed-timestep sim from render.
- Particle/juice effects (splatter, sparks, screen shake) within mobile budgets.
- What a sensible low-end target device is in 2026 and how to test on it.

## Resolution

Full report (ends with a spec-requirements checklist): [tracker/research/threejs-android-performance.md](../research/threejs-android-performance.md). Key conclusions:

- **Tile map**: `InstancedMesh` per tile-type for O(1) dig updates — never per-tile meshes or whole-buffer merges. Conditional on the [Clay look & camera prototype](003-clay-look-camera-prototype.md)'s "smoothed edges vs per-tile chunks" decision; `BatchedMesh`/chunked-merge are the fallbacks if edges end up autotiled.
- **Lighting**: baked/toon look with ≤3 dynamic lights (max 1 shadow-caster), no point-light shadows. Blob/gradient shadow sprites over real shadow maps for this art style (a reported 20→60fps win).
- **WebView pitfalls**: three.js does *not* guarantee automatic WebGL context-loss recovery — build explicit `webglcontextlost`/`webglcontextrestored` handlers wired to Capacitor's App pause/resume lifecycle. Cap `devicePixelRatio` at 1.5–2. Watch GPU memory via compressed textures.
- **Frame pacing**: fixed-timestep sim + accumulator + render-side interpolation ("Fix Your Timestep"), with clamped catch-up. Target 60fps mid-range; achieve "stable 30" via a frame-time-driven quality ladder, not by skipping rAF callbacks (judders on high-Hz panels).
- **Juice**: pooled, instanced particles (~200–500 cap). Hit-stop and screen shake live in the render layer only — never pause the authoritative sim tick (preserves determinism for future netcode).
- **Target floor for 2026**: Helio G85/G88/G99 or entry Snapdragon 4-series class, Mali-G52/G57, 4GB RAM. Test the real packaged APK via `chrome://inspect`, not mobile Chrome.
- Report flags its own confidence gaps (device-spec sourcing, inferred tile counts, BatchedMesh maturity).


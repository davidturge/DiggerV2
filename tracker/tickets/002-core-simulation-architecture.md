---
id: 2
title: Core simulation architecture
labels: [wayfinder:grilling]
status: closed
assignee: davidturgeman (claude session, 2026-09-14)
blocked-by: []
---

## Question

Decide the shape of the pure, deterministic game core (locked decision: no rendering/DOM code inside it, multiplayer-ready). Concretely:

- Tick model: fixed timestep? What rate? How do inputs enter the sim (input → command queue)?
- State representation: tile grid encoding (dirt / hard rock / tunnel / partial dig), entities (player, slimes, sacks, diamonds, cherry, bank) — ECS, plain objects, or something simpler?
- How the renderer learns what happened: does it diff state, or does the core emit an event stream (sack-wobble-started, diamond-collected, enemy-crushed) for animation/juice triggers?
- Determinism rules: seeded RNG, no floating-point hazards, no wall-clock reads — what conventions guarantee replayability (and future lockstep/rollback netcode)?
- Module boundaries: core / renderer / input / audio / platform (Capacitor) — what may import what?

Resolve by grilling (with domain-modeling): the developer decides trade-offs; agent proposes concrete options. Output feeds directly into the tech spec.

## Resolution

Confirmed by the developer on 2026-09-14:

1. **Fixed timestep**: sim advances at 30 ticks/sec regardless of frame rate; renderer runs at 60fps and interpolates between the last two sim states ("Fix Your Timestep" — also mandated by [three.js performance on Android WebView](005-threejs-android-performance-practices.md)).
2. **Inputs as commands**: touch input is translated to commands (`move(direction)`, `shoot`, `useAbility`) fed into the tick queue — never mutates state directly. This is exactly the interface server-authoritative netcode needs later.
3. **Movement model**: continuous fractional x/y positions moving smoothly in 8 directions, over a **tile-based terrain grid** (dirt/rock/tunnel per cell; a dirt cell clears as the digger passes through; hard rock carries 2 dig-hits). Matches the design doc's "moves smoothly" and the original Digger feel; tile-stepped movement rejected as board-gamey.
4. **Entity representation**: plain TypeScript typed objects — a `GameState` holding arrays of typed entities — updated by pure system functions (`updateSacks(state)`, `updateEnemies(state)`) each tick. **No ECS library**: its benefits (cache-friendly iteration at thousands of entities, free-form composition) don't apply to a ~50-entity fixed-cast game, and it adds learning load and debugging opacity.
5. **Renderer communication, both channels**: renderer reads current state each frame for continuous values (positions), and consumes a one-shot **event stream** (`sack-wobble-started`, `diamond-collected`, `enemy-crushed`) for animations, particles, sounds, haptics.
6. **Determinism level: same-device** — seeded RNG, no `Date.now()`/wall-clock in the core, fixed ticks; ordinary float math allowed. Sufficient for replays, headless testing, and **server-authoritative** multiplayer. **Lockstep netcode is ruled out** (would require bit-exact cross-device math); server-authoritative is the committed future path — it's also the anti-cheat the design doc's fairness principle demands.
7. **Module boundaries**: `core/` (imports nothing from other layers), `render/`, `input/`, `audio/`, `platform/` — enforced by lint rules; the core runs headless in unit tests with no browser.


---
title: Digger Versus — Technical Foundations Map
labels: [wayfinder:map]
status: complete
---

> **Map complete (2026-09-14).** The destination is reached: [documents/tech-spec.md](../documents/tech-spec.md). No open tickets remain; the way to building v1 is clear.

# Digger Versus — Technical Foundations Map

## Destination

A locked technical spec + architecture decisions for building **Digger Versus v1** — the campaign's World 1 (8 levels + The Drill boss + the upgrade-card system) as an offline Android game built with three.js — with the game core kept multiplayer-ready. The spec lives alongside `documents/design.md` and is ready to start building from. Nothing left to decide before implementation begins.

## Notes

- Domain: mobile arcade game (remake of Digger 1983); design fully specified in [documents/design.md](../documents/design.md).
- Developer: solo; strong JavaScript/web experience; no prior game dev; basic backend understanding.
- Skills to consult per ticket type: `mattpocock-skills:grilling` + `mattpocock-skills:domain-modeling` for grilling tickets; `mattpocock-skills:prototype` for prototype tickets; `mattpocock-skills:research` for research tickets.
- Standing preference: plan, don't do — tickets resolve decisions; the build happens after this map.
- Standing preference (set 2026-09-14): game experience first, visual polish later — grey-box until fun; art quality is production work, not a gate on decisions.
- Glossary lives in [CONTEXT.md](../CONTEXT.md).

## Decisions so far

*(Settled during charting, before tickets existed:)*

- **Destination is a tech spec**, not a prototype or build plan.
- **Rendering: three.js.** Babylon.js is equivalent; visual quality here depends on art, not library. Web-native fits the developer's skillset.
- **Language/tooling: TypeScript + Vite.**
- **Game core is a pure, deterministic simulation module** — no rendering/DOM code inside it — so online 1v1 can be added later without a rewrite. Netcode itself is out of scope.
- **Logic is 2D (tile grid); rendering is 3D** (clay-style models, fixed camera). No physics engine — sack fall/wobble, digging, and collisions are tile-grid game rules.
- **Ship order: campaign first**; multiplayer decided later.
- **v1 scope: World 1 complete** (8 levels + The Drill boss + upgrade cards); worlds 2–5 as later updates.
- **v1 is fully offline** — local save only, no backend, no accounts, no ads/IAP.
- **Assets: self-made in Blender (or equivalent).**

<!-- One line per closed ticket is appended below as tickets resolve: -->
- [Android packaging route](tickets/001-android-packaging-route.md): Capacitor — only route with maintained plugins for every need; TWA disqualified (cannot show AdMob ads), Cordova winding down, Tauri's escape hatch is Rust.
- [Blender-to-three.js asset pipeline](tickets/004-blender-to-threejs-asset-pipeline.md): GLB + Meshopt; clay look applied in three.js (matcap) since toon node graphs don't export; low-poly over sculpting; Grant Abbitt's Rogue series as the learning path.
- [three.js performance on Android WebView](tickets/005-threejs-android-performance-practices.md): InstancedMesh tiles, ≤3 lights with blob shadows, explicit context-loss handling, fixed-timestep sim + render interpolation, pixel-ratio cap 1.5–2; 2026 floor = Helio G85-class / 4GB.
- [Core simulation architecture](tickets/002-core-simulation-architecture.md): 30Hz fixed-timestep pure core, command-based input, continuous positions over a tile grid, plain TS objects + system functions (no ECS), state + event stream to the renderer, same-device determinism — future multiplayer is server-authoritative (lockstep ruled out).
- [Clay look & camera prototype](tickets/003-clay-look-camera-prototype.md): "Soft Clay · Lit" — straight-on perspective camera, soft real lighting (matcap as perf fallback), rounded tiles, 16 tiles across; provisional until real Blender assets exist.
- [Touch controls prototype](tickets/006-touch-controls-prototype.md): fixed joystick, 8-way snap steering (diagonal digging kept — original was 4-way), landscape orientation, bottom-right 2–3 button cluster with a heat-gauge ring on Shoot; gesture-nav-safe insets.
- [Enemy AI & pathfinding](tickets/009-enemy-ai-and-pathfinding.md): shared BFS flow field (chase = downhill, flee = uphill), no corner-cutting through diagonal gaps, chase-accuracy knob per difficulty, ramping-trickle spawners, wander when sealed off, one slime entity typed by config.
- [Level data format & authoring workflow](tickets/007-level-format-and-authoring.md): JSON-per-level with ASCII tile grid, hand-authored for v1; global tuning.json layered defaults ← difficulty multipliers ← level overrides; stars = finish / ≥80% diamonds / + par time; no hard timers outside escape types.
- [Upgrade-card system data model](tickets/010-upgrade-card-data-model.md): modifiers layer over tuning.json base stats (cleared at level end), cards as data + named code hooks for specials, seeded 3-card draw, all 15 design-doc cards ship in v1, starting weights 70/25/5.
- [Save system schema](tickets/011-save-system-schema.md): versioned JSON doc in @capacitor/preferences; stars/times, unlocks, settings, tutorial flags; one star set per level across difficulties; saves on completion only, no mid-level saves.
- [The Drill boss implementation approach](tickets/012-drill-boss-approach.md): special entity (no generalized dig capability), greedy straight-line burrow (predictable = lurable), "dropping tunnels" sharpened to telegraphed cave-ins after first hit, re-arming sack alcoves keep the fight winnable.
- [Game feel & juice layer](tickets/013-game-feel-and-juice.md): one render-side effects registry (event → particles/shake/hit-stop/haptic/sound), hit-stop on big moments only, 3s combo window +0.5× per kill capped at 3× (state in sim), haptic tiers, "reduce effects" accessibility toggle.
- [Assemble the technical spec](tickets/008-assemble-technical-spec.md): the destination — all decisions compiled into [documents/tech-spec.md](../documents/tech-spec.md) (15 sections incl. suggested build order); shareable page linked from the ticket.

## Not yet specified

In-scope fog — will graduate into tickets as the frontier advances:

- **Audio** — SFX/music sourcing and Web Audio approach.

## Out of scope

Beyond this map's destination; returns only if the destination is redrawn:

- **Multiplayer stack / netcode / servers / matchmaking** — deferred by explicit decision ("campaign first, decide multiplayer later"). The core-sim purity decision keeps the door open.
- **Monetization** — AdMob ads and cosmetic IAP integration; v1 ships clean and offline.
- **Worlds 2–5** — content and bosses beyond World 1 (Ice, Lava, Water, Core).
- **Global leaderboard / cloud save / accounts** — backend features; arrive with multiplayer if ever.

# Digger Versus — Technical Specification (v1)

Companion to [design.md](design.md). Every decision here was resolved through the wayfinder map at [`tracker/map.md`](../tracker/map.md); each section links its ticket, which holds the full reasoning. Research reports live in [`tracker/research/`](../tracker/research/).

**Status: locked.** This is the build-from document. Changing a decision here means reopening its ticket, not silently diverging.

---

## 1. Scope of v1

*From the charting session and [Level data format](../tracker/tickets/007-level-format-and-authoring.md).*

- **v1 = World 1, complete**: 8 levels (types: collection, escape, puzzle, chase) ending in The Drill boss, plus the upgrade-card system and 3 difficulty levels.
- **Fully offline**: local save only. No backend, no accounts, no ads, no IAP.
- **Platform**: Android via Google Play, packaged with Capacitor.
- **Out of scope for v1** (rules recorded on the map): multiplayer stack/netcode, monetization, worlds 2–5, leaderboards/cloud save.
- **Standing preference**: game experience first, visual polish later — grey-box until fun; art is production work, never a gate.

## 2. Stack

*From charting + [Android packaging route](../tracker/tickets/001-android-packaging-route.md).*

| Layer | Choice | Why (gist) |
|---|---|---|
| Language/build | TypeScript + Vite | Solo JS dev; type safety across many interacting systems |
| Rendering | three.js | WebGL; clay look achievable; web skillset |
| Packaging | **Capacitor** | Only wrapper with maintained plugins for haptics, ads (future), Play Billing (future); TWA cannot show AdMob ads; Cordova winding down; Tauri needs Rust |
| Physics | none | Tile-grid game rules, not simulation |
| Entity framework | none (plain TS) | ~50 entities max; ECS benefits don't apply |
| Backend | none in v1 | Offline by decision |

Key Capacitor plugins: `@capacitor/haptics`, `@capacitor/screen-orientation` (landscape lock), `@capacitor/preferences`.

## 3. Architecture

*From [Core simulation architecture](../tracker/tickets/002-core-simulation-architecture.md).*

```
core/      pure deterministic simulation — imports NOTHING from other layers
render/    three.js; reads core state, consumes core events
input/     touch/keyboard → commands
audio/     consumes core events (production-time)
platform/  Capacitor glue (haptics, save, lifecycle)
```

- **Fixed timestep**: core advances at **30 ticks/sec**; renderer runs at 60fps and interpolates between the last two states ("Fix Your Timestep"). Clamped catch-up prevents spiral-of-death.
- **Commands in**: input produces `move(dir8) | shoot | useAbility` commands queued into ticks. Touch never mutates state.
- **State + events out**: renderer reads state each frame (positions) and consumes one-shot events (`sack-wobble-started`, `enemy-crushed`, …) for effects.
- **Determinism (same-device level)**: seeded RNG, no wall clock in core, fixed ticks. Sufficient for replays, headless tests, and **server-authoritative** multiplayer later. **Lockstep is permanently ruled out** — no fixed-point math burden.
- **Movement**: continuous fractional positions over a tile grid. Dirt clears per-tile as the digger passes; hard rock takes 2 dig-hits.
- Module boundaries enforced by lint rules; core runs headless in unit tests.

## 4. Rendering & Look

*From [Clay look & camera prototype](../tracker/tickets/003-clay-look-camera-prototype.md) and the [performance research](../tracker/research/threejs-android-performance.md).*

- **Look: "Soft Clay · Lit"** — straight-on perspective camera (~35° fov), soft real lighting (`MeshStandardMaterial`, roughness ≈ .85), rounded/beveled tiles, **16 tiles across** the screen, camera follows the player. *Provisional flag: revisit shading once the first real Blender model exists; **matcap is the documented performance fallback**.*
- **Performance rules (day-one, non-negotiable)**:
  - `InstancedMesh` per tile type; O(1) dig updates. Never per-tile draw calls.
  - ≤3 dynamic lights, max 1 shadow-caster; **blob shadows**, not shadow maps.
  - `devicePixelRatio` capped at 1.5–2.
  - Explicit `webglcontextlost/restored` handlers wired to Capacitor pause/resume.
  - Pooled instanced particles, 200–500 budget.
  - Frame-time-driven quality ladder for weak devices (never skip rAF).
- **Target floor (2026)**: Helio G85/G99-class, Mali-G52/G57, 4GB RAM. Test the packaged APK via `chrome://inspect`, not mobile Chrome.

## 5. Controls

*From [Touch controls prototype](../tracker/tickets/006-touch-controls-prototype.md) and the [button conventions research](../tracker/research/mobile-touch-button-conventions.md).*

- **Landscape only** (full map visibility).
- **Fixed virtual joystick** bottom-left; **8-way snap** steering (input rounds to the nearest compass direction — clean, predictable tunnels). Diagonal digging **kept** (a deliberate upgrade; the 1983 original was 4-way).
- Auto-dig while moving; movement speed reduced by carried diamonds per design doc.
- **Button cluster** bottom-right, 2–3 button ceiling: Shoot (~84dp) + ability (~64dp) + one reserved slot. **Shoot wears a heat-gauge ring filling toward a red jam** (the §2.5 heat meter — deliberately not styled as a cooldown); ability gets a radial cooldown sweep in the opposite direction.
- Respect Android **gesture-navigation insets** (query at runtime; `viewport-fit=cover`). Left-hand mirroring: future config flag, not v1.

## 6. Core Game Rules (sim systems)

Direct from [design.md](design.md) §2, structured for the sim: dig/collect, gold sacks (undermine → wobble telegraph → fall → crush; break when falling ≥2 tiles; pushable), heat-meter shooting (kills enemies; slows/pushes players only — matters for future 1v1), cherry → 5s frenzy, the bank (undeposited diamonds at risk + weight slowdown), two ground types.

- **Combo** (*[Game feel & juice](../tracker/tickets/013-game-feel-and-juice.md)*): kills within a **3s window** chain; +0.5× score per kill, **cap 3×**; state lives in the sim (it awards points; server-side-ready), presentation in render.

## 7. Enemies

*From [Enemy AI & pathfinding](../tracker/tickets/009-enemy-ai-and-pathfinding.md).*

- **Shared flow field**: BFS from the player over the tunnel graph a few times per second; chase = step downhill, frenzy-flee = step uphill. One computation serves all enemies.
- **No corner-cutting**: diagonal movement only when both orthogonal neighbors are open; sacks block the graph.
- **Chase-accuracy knob**: wrong-turn chance per difficulty (~25% Easy / ~10% Medium / ~0% Hard).
- **Spawners**: ramping trickle per spawn point (interval shrinks over the level, capped), configured in the level file.
- **Sealed off** → slimes wander reachable tunnels; no wall-camping.
- **One slime entity, typed by data**: Basic/Nimble/Puffy/Swarm differ in config + two hooks (Puffy splits on crush; Swarm spawns grouped).

## 8. The Drill (World 1 Boss)

*From [The Drill boss implementation approach](../tracker/tickets/012-drill-boss-approach.md).*

- **Special entity with its own boss system** — the regular "enemies don't dig" rule stays intact; no generalized dig capability.
- **Greedy straight-line burrow** toward the player (predictable = lurable; the win condition is leading it under sacks). Its tunnels become normal tunnels.
- **3 sack hits to win** (tuning). Escalation per hit: faster, shorter telegraphs, and **cave-ins** activate after hit 1 — ceiling chunks collapse on the player's tile, telegraphed by falling dust. *(Cave-in is the sharpened meaning of the design doc's "dropping tunnels on you" — see CONTEXT.md.)*
- **Re-arming sack alcoves**: fixed arena sack spots regenerate seconds after use; the fight is always winnable.
- Death restarts the boss level (= re-entering level 8).

## 9. Upgrade Cards (campaign only)

*From [Upgrade-card system data model](../tracker/tickets/010-upgrade-card-data-model.md).*

- **Modifiers layer**: base stats from `tuning.json`; each card pushes `{stat, op: add|mult, value}`; systems read effective stats through the stack; level end clears the list (reset is structural).
- **Registry**: numeric cards = pure data; specials add a named code hook (`onHit`, `onKill`, `autoFire`).
- **Draw**: seeded 3-card pick on each bank level-up; rarity per slot (starting weights **70/25/5**); taken one-shots excluded; no in-draw duplicates; no reroll.
- **v1 pool — all 15 doc cards**: Fast Legs, Sharp Drill, Light Armor · Double Shot, Fast Cooling, Heavy Sack · Collection Radius, Double Diamond Value, Deep Pocket · Shield, Fast Respawn, Push Wave · **Legendary:** Lightning, Super Magnet, King Midas.

## 10. Levels, Tuning, Difficulty

*From [Level data format & authoring workflow](../tracker/tickets/007-level-format-and-authoring.md).*

- **One JSON file per level**: ASCII tile grid (`D` dirt · `R` rock · space tunnel · `*` diamond · `G` sack · `B` bank · `s` spawner · `P` start) + structured fields: id, world, level type + params, spawner configs, star thresholds, par time. Variable sizes; TS-typed schema validated at load.
- **Authoring: hand-edit** for v1 (8 levels). The future random-challenge generator emits the same format.
- **`tuning.json`** holds every game number. Layering: **global defaults ← difficulty multipliers (Easy/Medium/Hard) ← per-level overrides**. Difficulty is data, not code.
- **Stars**: 1★ finish · 2★ ≥80% diamonds · 3★ + beat par time. One star set per level across difficulties. No hard timers outside escape/chase types.

## 11. Save System

*From [Save system schema](../tracker/tickets/011-save-system-schema.md).*

One versioned JSON document in `@capacitor/preferences` (`{version: 1, ...}` + load-time migrations). Persists: per-level `{stars, bestTimeMs}`, unlocks (levels/worlds/characters), selected character, difficulty, settings (sound/music/haptics, reduce-effects), tutorial-seen flags. Saves on level completion and settings change only; **no mid-level saves** (app kill restarts the level).

## 12. Game Feel / Juice

*From [Game feel & juice layer](../tracker/tickets/013-game-feel-and-juice.md).*

- **One effects registry** in render: sim event → `{particles, shake, hitStopMs, haptic, sound}`. Sound slots exist now; audio sourcing is the one open (non-blocking) item.
- **Hit-stop ~80ms, big moments only** (sack crushes, boss hits); shot-kills pop without freezing. Hit-stop and shake are render-only — the sim tick never pauses.
- **Haptic tiers**: light (deposit, shot hit) / medium (crush, combo milestone) / heavy (death, boss hit).
- **"Reduce effects"** accessibility setting dampens shake/flash via the registry.

## 13. Asset Pipeline

*From the [Blender pipeline research](../tracker/research/blender-threejs-pipeline.md); assets self-made.*

- **Blender → `.glb`** (Khronos exporter, +Y up, "Actions" animation mode) with **Meshopt** compression. KTX2 textures deferred until profiling demands.
- **Materials swap at load**: glTF only carries PBR — the clay look is applied in three.js by traversing the scene and swapping materials (soft-lit standard per §4; matcap fallback).
- **Rigging**: small hand-built deform-only armatures (avoid Rigify with glTF).
- **Budgets**: heroes ~1,500–4,000 tris, slimes 200–800, boss 3,000–8,000; prefer vertex colors over textures for enemies/props.
- **Clips**: ~6–9 per hero, 3–4 per slime, 8–12 for the boss; `AnimationMixer` + crossfade. Open detail: 8-direction facing vs one rotatable move clip.
- **Learning path**: Grant Abbitt's "Creating a Game Character: The Rogue" (free), then GameDev.tv low-poly characters (optional).

## 14. Suggested Build Order (handoff)

The map's edge — building starts here, in the spirit of "grey-box until fun":

1. Project scaffold (Vite + TS, module boundaries + lint rules, headless core test rig).
2. Grey-box core loop: dig, collect, bank, sacks, heat-shooting — on-screen with placeholder blobs (the touch prototype is the reference, not the codebase — prototypes are throwaway).
3. Controls layer per §5 on a real device.
4. Level loader + `tuning.json`; author level 1.
5. Enemies (flow field, spawners) → levels 2–7 content.
6. Juice registry + combo.
7. Upgrade cards.
8. The Drill + level 8.
9. Art pass (Blender assets replace grey boxes) + audio.
10. Capacitor packaging, device-matrix testing, Play Store internal track.

## 15. Open Items (non-blocking)

- **Audio**: sourcing/format for SFX and music — production-time; the event-stream hooks are already specced.
- **Provisional style flag**: re-judge "Soft Clay · Lit" vs matcap once the first real character model exists.
- **Ability-button offset**: tune on device ("up-and-inward" is the starting candidate).

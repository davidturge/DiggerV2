# CONTEXT.md — Digger Versus Glossary

Canonical terms for this project. Full game design: [documents/design.md](documents/design.md).

- **Core (simulation)**: the pure, deterministic game-logic module — tile grid, entities, rules. Takes inputs + ticks, produces game state and events. Contains no three.js, DOM, or platform code. This separation is what keeps future multiplayer possible.
- **Renderer**: the three.js layer that draws the core's state in 3D (clay style). Reads from the core; never writes game rules.
- **Tick**: one fixed step of the core simulation (30/sec). All game rules advance per tick; rendering frames are a separate, faster clock that interpolates between ticks.
- **Command**: the only way input reaches the core — a typed instruction (`move`, `shoot`, `useAbility`) queued into a tick. Touch handling produces commands; it never touches state.
- **Event (sim event)**: a one-shot fact the core emits during a tick (`sack-wobble-started`, `enemy-crushed`) for the renderer/audio/haptics to react to. Events describe what happened; state describes what is.
- **System (function)**: a pure function run each tick over the `GameState` (e.g., `updateSacks`). Not an ECS — entities are plain typed objects.
- **Tile grid**: the 2D side-view field of cells (dirt, hard rock, tunnel, sack, diamond, bank). All game logic happens here, even though rendering is 3D.
- **Bank / deposit**: the map point where carried diamonds become counted score. Undeposited diamonds are at risk and slow the carrier.
- **Sack (gold sack)**: the primary weapon — wobbles when undermined, then falls; crushes anything beneath; breaks and scatters gold when falling ≥2 tiles.
- **Heat meter**: the rifle's limiter — shots heat it; overheating jams it for seconds.
- **Frenzy**: the 5-second hunter state granted by grabbing the cherry.
- **Upgrade cards**: campaign-only, in-level roguelite picks (3 random cards per bank level-up); reset at level end. No upgrades exist in 1v1.
- **World / level**: campaign structure — a world is 8 levels ending in a boss; v1 = World 1 only.
- **Cave-in**: a Drill-boss attack — destabilized ceiling chunks collapse onto the player's tile, telegraphed by falling dust. (The sharpened meaning of the design doc's "dropping tunnels on you.")

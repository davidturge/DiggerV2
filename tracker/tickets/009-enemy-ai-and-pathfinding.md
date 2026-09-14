---
id: 9
title: Enemy AI & pathfinding
labels: [wayfinder:grilling]
status: closed
assignee: davidturgeman (claude session, 2026-09-14)
blocked-by: []
---

## Question

How do slimes chase the player, given the resolved core model (continuous entity positions over a tile grid, enemies confined to already-dug tunnels — the design doc's foundational "enemies don't dig" rule)? Decide:

- Pathfinding: BFS/A* over the tunnel graph per enemy, recomputed how often? How does a tile-graph path translate to smooth continuous movement (waypoints, steering)?
- Behavior differences per slime type: Basic (slow chase), Nimble (fast), Puffy (splits on crush), Swarm (group movement) — how much shared machinery vs per-type code?
- Spawning: fixed spawn points emitting over time (per design doc) — how spawn rate/caps are expressed in level config.
- How enemies handle dead ends, blocked tunnels (sacks), and the frenzy state (fleeing instead of chasing — inverted pathfinding).
- Difficulty hooks: which AI numbers (speed, spawn rate, aggression) must live in the tuning config.

## Resolution

Decided 2026-09-14:

- **Pathfinding: a shared flow field.** A few times per second the sim BFS-labels every tunnel tile with its distance to the player. Chasing slimes step downhill; fleeing slimes (frenzy) step uphill. One computation serves all enemies and both behaviors.
- **No corner-cutting** (resolves the diagonal-tunnel flag from [Touch controls prototype](006-touch-controls-prototype.md)): diagonal movement between cells is allowed only when both orthogonal neighbors are open; corner-to-corner gaps are not connected. Sacks occupy their cell and block the graph.
- **Chase-accuracy knob**: at junctions a slime has a per-difficulty chance to take a wrong turn (~25% Easy / ~10% Medium / ~0% Hard). Rejects perfect pursuit as oppressive for an all-ages tactical game; gives difficulty a lever beyond speed.
- **Spawning: ramping trickle per spawner** — each spawn point emits every N seconds, N shrinking over the level, up to a cap; all configured in the level file. Discrete waves rejected as wrong rhythm for steady dig-and-collect.
- **Unreachable player: wander.** With no path, slimes roam reachable tunnels until a route opens; no wall-camping.
- **One slime entity, typed by data**: Basic/Nimble/Puffy/Swarm differ only in config (speed, size) plus two hooks — Puffy spawns two minis on crush; Swarm spawns grouped.
- **Config surface**: per-type speed and size, spawn interval/ramp/cap, chase-accuracy per difficulty, flow-field recompute interval.

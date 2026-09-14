---
id: 12
title: The Drill boss implementation approach
labels: [wayfinder:grilling]
status: closed
assignee: davidturgeman (claude session, 2026-09-14)
blocked-by: [9]
---

## Question

World 1's boss is the one enemy that *digs* (burrowing toward the player, leaving tunnels, escalating after each sack hit). Blocked by [Enemy AI & pathfinding](009-enemy-ai-and-pathfinding.md) — decide after the regular-enemy machinery exists on paper. Decide:

- Is the boss a special entity with its own system, or a generalization of the enemy machinery (a "can dig" capability)? (v1 has exactly one digging enemy; worlds 2–5 bosses differ wildly — beware premature generalization.)
- Burrow behavior: how it targets the player through dirt (straight-line dig vs pathfinding that weights dirt as high-cost), and its speed/rage escalation per phase.
- The fight loop: 2–3 sack hits to win, telegraphed attacks, arena layout constraints the level format must support.
- Boss-fight checkpointing per the design doc (death returns to the start of the boss fight, not the world).

## Resolution

Decided 2026-09-14:

- **Special entity, own boss system** — no generalized "can dig" capability; the regular "enemies don't dig" rule stays intact. Worlds 2–5 bosses share too little to justify generalizing now.
- **Burrowing: greedy straight-line toward the player's current position** — readable, relentless, and deliberately lurable: the fight's win condition ("lead it beneath a sack") requires predictable pursuit. Its dug cells become normal tunnels usable by everyone, including the flow field.
- **"Dropping tunnels on you" sharpened → cave-ins**: after taking hits, the Drill's burrowing destabilizes tunnels — ceiling chunks collapse onto the player's position, telegraphed by falling dust before impact.
- **Escalation per hit** (3 hits to win; all values in `tuning.json`): faster movement, shorter telegraph windows, and the cave-in behavior activates after the first hit.
- **Sack economy: re-arming alcoves** — fixed sack positions in the arena regenerate a new sack seconds after use (telegraphed). The fight is always winnable; this boss teaches boss-fighting, so timing is the test, not resource scarcity.
- **Telegraphs**: trembling dirt along its burrow path before a lunge; falling dust before a cave-in; standard sack wobble covers the kill mechanic.
- **Checkpoint**: death restarts the boss level (per [Save system schema](011-save-system-schema.md)).

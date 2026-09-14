---
id: 7
title: Level data format & authoring workflow
labels: [wayfinder:grilling]
status: closed
assignee: davidturgeman (claude session, 2026-09-14)
blocked-by: [2]
---

## Question

How are World 1's 8 levels defined and authored? Blocked by [Core simulation architecture](002-core-simulation-architecture.md) (the format encodes the sim's tile/entity model). Decide:

- Format: JSON schema for tile layout, diamond/sack/spawn/bank placement, level type (collection/escape/puzzle/chase/boss), and per-level tuning.
- Authoring: hand-edit JSON, use an existing tile editor (e.g., Tiled) with an import step, or build a tiny in-browser editor?
- Where the design doc's "all balance numbers in an editable config" requirement lives relative to level files.
- How the random-challenge generator (post-v1 fog) would plug in later without changing the format.

## Resolution

Decided 2026-09-14:

- **Format**: one JSON file per level — an ASCII tile grid (`D` dirt, `R` rock, space tunnel, `*` diamond, `G` sack, `B` bank, `s` spawner, `P` player start) plus structured fields: id, name, world, level type (collection/escape/puzzle/chase/boss) with type-specific params, spawner configs (interval/ramp/cap per [Enemy AI & pathfinding](009-enemy-ai-and-pathfinding.md)), star thresholds, par time. Variable grid sizes; camera scrolls at 16 tiles across. Schema TypeScript-typed, validated at load (fail loudly on startup).
- **Authoring: hand-edit the ASCII JSON** for v1. Tiled and an in-browser editor both rejected as tooling-before-game; revisit only if worlds 2–5 make authoring painful.
- **Tuning**: single global `tuning.json` holding every game number (speeds, cooldowns, heat rates, sack timings, AI numbers), per the design doc's no-hard-coding rule. Layering: global defaults ← difficulty multiplier sets (Easy/Medium/Hard) ← per-level overrides. *(This also resolves the "balance/config format" and "difficulty levels" fog — difficulty is data, not code.)*
- **Stars**: 1★ finish · 2★ finish with ≥80% diamonds · 3★ that plus beat the level's par time. Each star tests a different skill (survive → thoroughness → speed). Best time also recorded.
- **No hard level timer** (non-escape types): par time affects only the 3rd star and records; ramping spawners are the organic pressure. Escape/chase types carry their own built-in timers by design.
- **Random-challenge generator (post-v1)**: emits this same JSON — the format is the contract; no accommodation needed now.

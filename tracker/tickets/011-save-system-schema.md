---
id: 11
title: Save system schema
labels: [wayfinder:grilling]
status: closed
assignee: davidturgeman (claude session, 2026-09-14)
blocked-by: []
---

## Question

The on-device save for offline v1. Small but spec-worthy. Decide:

- What persists: per-level stars (1–3) and best times, level/world unlock state, character unlocks, chosen difficulty, settings (audio, haptics, control options).
- Storage mechanism inside Capacitor: `@capacitor/preferences` vs localStorage vs a JSON file — durability across app updates and WebView data clears.
- Schema versioning/migration approach so later updates (worlds 2–5, multiplayer accounts) don't corrupt old saves.
- Whether mid-level state is ever saved (recommend: no — levels are 2–3 minutes; only completed-level results persist) and what happens on app kill mid-level.

## Resolution

Decided 2026-09-14:

- **Storage**: `@capacitor/preferences`, one versioned JSON document under a single key (native SharedPreferences on Android — survives WebView cache clears; localStorage fallback in browser dev).
- **Schema**: `{ version: 1, ... }` with load-time migration functions for future format evolution.
- **Persists**: per-level `{stars, bestTimeMs}` · unlocked levels/worlds · unlocked characters + selected character · chosen difficulty · settings (sound, music, haptics) · **tutorial/hints-seen flags**. Lifetime stats skipped until a stats screen exists.
- **Stars are one set per level** — earned on any difficulty; difficulty is a freely changeable knob, not a separate progression track. (A future "earned on Hard" badge can be added via schema migration.)
- **Write timing**: on level completion and settings change only. **No mid-level saves** — app kill restarts the level; the boss checkpoint is simply re-entering level 8.

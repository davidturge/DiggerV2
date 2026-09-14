---
id: 10
title: Upgrade-card system data model
labels: [wayfinder:grilling]
status: closed
assignee: davidturgeman (claude session, 2026-09-14)
blocked-by: []
---

## Question

How the campaign's roguelite upgrade cards are represented, given the resolved core (plain typed objects, config-driven tuning). Decide:

- Card definition format: id, rarity, stackability (numeric upgrades repeatable, abilities once), and the *effect* — data-driven stat modifiers vs code hooks per card; where the line sits.
- How the 3-card draw works: rarity weighting, exclusion of already-taken one-shot cards, seeded RNG (core determinism rules apply).
- How active effects modify the sim: a modifiers layer on `GameState` the systems consult, vs mutating base stats (and resetting cleanly at level end).
- The v1 card list: which of the design doc's examples (Fast Legs, Double Shot, Collection Radius, Shield, legendaries…) ship in World 1, and how many cards the pool needs for draws to stay interesting.

## Resolution

Decided 2026-09-14:

- **Effects = a modifiers layer on the run state, never mutated base stats.** Base numbers come from `tuning.json`; each taken card pushes `{stat, op: add|mult, value}` entries; systems read effective stats through the stack. Level end clears the list — reset is structural, not an undo.
- **Cards are data with a code escape hatch**: numeric cards pure data (stat/op/value/rarity/stackable); special cards add a named code hook (`onHit`, `onKill`, `autoFire`). Single card registry file.
- **Draw rules**: seeded RNG per core determinism; rarity rolled per slot with tuning weights; taken one-shot cards excluded; no duplicates within a draw of 3; no reroll/skip in v1.
- **Stacking**: numerics repeatable, linear stacking (diminishing returns available later via tuning); specials once per run.
- **v1 pool: all 15 cards from the design doc** — Movement: Fast Legs, Sharp Drill, Light Armor · Attack: Double Shot, Fast Cooling, Heavy Sack · Economy: Collection Radius, Double Diamond Value, Deep Pocket · Defense: Shield, Fast Respawn, Push Wave · Legendary: Lightning, Super Magnet, King Midas. (Noted trade-off: Lightning is the fiddliest to build; it stays in.)
- **Starting rarity weights**: Common 70 / Rare 25 / Legendary 5 per slot — starting points in `tuning.json`, tuned by playtesting.

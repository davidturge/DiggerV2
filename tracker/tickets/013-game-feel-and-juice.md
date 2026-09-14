---
id: 13
title: Game feel & juice layer
labels: [wayfinder:grilling]
status: closed
assignee: davidturgeman (claude session, 2026-09-14)
blocked-by: []
---

## Question

The design doc calls juiciness "the heart of the fun in killing" — hit-stop, particles, screen shake, haptics, combo feedback. The rendering direction is now decided (soft-lit clay, straight-on perspective). Decide how the juice layer works within the locked architecture:

- Hit-stop and screen shake live in the **render layer only** (the sim tick never pauses — locked by the performance research); define the mechanism: a render-side effects queue consuming sim events.
- Particles: pooled instanced particle budget (~200–500 per the performance research) — which events get which effects (crush splatter, shot sparks, dig crumbs, deposit sparkle)?
- Haptics via `@capacitor/haptics`: which events vibrate, and intensity tiers.
- Combo system: counter/escalation rules from the design doc — where combo state lives (sim, since it awards points) vs its presentation (render).
- Audio hooks ride the same event stream; sourcing/format questions stay in the Audio fog for now.

## Resolution

Decided 2026-09-14:

- **One effects registry**: a render-side data table mapping each sim event to its sensory package — `{particles, shake, hitStopMs, haptic, sound}`. Sound slots exist now; audio sourcing remains fog.
- **Hit-stop & shake are render-only** (sim never pauses, per the performance research); hit-stop capped ~80ms, applied to **big moments only** — sack crushes and boss hits. Ordinary shot-kills pop without freezing, keeping swarm chains smooth.
- **Combo**: kills within a **3s window** chain; score multiplier +0.5× per kill, **cap 3×**; counter color/pitch escalate; reset on lapse. Combo state lives in the sim (it awards points; server-side-ready for future 1v1); presentation is render-side. Numbers in `tuning.json`.
- **Particles**: pooled + instanced, 200–500 budget. Starting event table: dig = crumbs · pickup = sparkle · deposit = burst + light haptic · sack crush = gold splatter + shake + hit-stop + medium haptic · shot kill = pop/sparks · cave-in = dust + shake · death = big shake + heavy haptic · frenzy eat = comic pop.
- **Haptics tiers** light/medium/heavy via `@capacitor/haptics`, governed by the settings toggle.
- **"Reduce effects" accessibility setting** dampens shake/flash — one flag against the registry.

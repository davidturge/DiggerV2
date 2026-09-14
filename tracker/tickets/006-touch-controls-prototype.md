---
id: 6
title: Touch controls prototype
labels: [wayfinder:prototype]
status: closed
assignee: davidturgeman (claude session, 2026-09-14)
blocked-by: [3]
---

## Question

Does the control scheme feel right on a real phone? The design doc specifies a virtual joystick (8-direction movement, auto-dig while moving) plus buttons (shoot, active ability). Prototype on top of the visual-prototype scene (hence blocked by [Clay look & camera prototype](003-clay-look-camera-prototype.md)) and settle:

- Joystick: fixed vs floating (appears where the thumb lands)? Dead zones, 8-direction snapping vs analog?
- Button placement/size for the "measured and tactical" feel; can shoot and ability be comfortably distinct?
- Diagonal digging: is 8-direction digging controllable with a thumb, or does it need assistance (snap-to-tunnel)?
- Landscape vs portrait — which orientation does the map layout and hand grip actually want?

HITL: the developer plays it on their own phone and reacts.

## Assets

- Playable prototype (open on the phone): https://claude.ai/code/artifact/3fb38bef-6def-4b6b-9c3e-f0b2619e2e3b
- Throwaway source: `prototypes/touch-controls-prototype/` (index.html + bundled three.module.js)
- Button-layout research: [tracker/research/mobile-touch-button-conventions.md](../research/mobile-touch-button-conventions.md)

## Resolution

Played on the developer's phone; decided 2026-09-14:

- **Joystick: fixed** (anchored bottom-left), not floating.
- **Steering: 8-way snap** — input rounds to the nearest of 8 compass directions; tunnels come out straight and predictable. Analog rejected as wobbly for a game where tunnels are strategic terrain.
- **Diagonal digging: kept (8-way)** — a conscious re-confirmation of the design doc's modernization; the original 1983 Digger was 4-way only. Flag for later tickets: diagonal tunnels create edge cases for sack-fall logic and enemy pathing that [Enemy AI & pathfinding](009-enemy-ai-and-pathfinding.md) and the sim rules must handle.
- **Orientation: landscape**, locked — "we need to see the full map."
- **Buttons** (from the conventions research): tight bottom-right corner cluster, 2–3 button ceiling — Shoot ~84dp, ability ~64dp, one reserved slot. Shoot carries a **heat-gauge ring filling toward a red jam state** (maps the design doc's heat meter; not a cooldown); the ability button gets a standard radial cooldown sweep in the opposite fill direction. Margins must respect Android's gesture-nav insets (query at runtime in Capacitor; `viewport-fit=cover` required). Ability-button exact offset ("up-and-inward" candidate) is a tune-on-device detail, not a spec decision. Left-handed mirroring: config-flag idea, not v1.

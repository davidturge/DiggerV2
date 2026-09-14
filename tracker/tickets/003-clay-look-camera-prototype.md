---
id: 3
title: Clay look & camera prototype
labels: [wayfinder:prototype]
status: closed
assignee: davidturgeman (claude session, 2026-09-14)
blocked-by: []
---

## Question

What should the game actually look like on screen? Build a cheap throwaway three.js scene to react to: a cross-section tile field (dirt, tunnels, a few diamonds, a sack, one character stand-in) rendered in candidate styles. The decisions it must settle:

- Camera: pure orthographic side view vs slight perspective tilt (2.5D) — which reads best and keeps the tile grid legible?
- Clay look: toon shading vs matcap vs baked soft lighting — which achieves the doc's claymation feel within mobile budgets?
- How dirt removal looks: per-tile chunks disappearing vs smoothed tunnel edges.
- Rough scale: how many tiles fit on a phone screen while staying readable and touch-friendly?

HITL: the developer reacts to variants; the prototype is linked as an asset, not merged.

## Assets

- Live prototype (open on the phone): https://claude.ai/code/artifact/b6e6bf92-39ba-4e0f-95e9-a966535fbeb2
- Throwaway source: `prototypes/clay-look-prototype/` (index.html + bundled three.module.js)

## Resolution

The developer reviewed the live prototype and chose **Look C — "Soft Clay · Lit"** wholesale:

- **Camera**: straight-on perspective (fov ~35°), no tilt. Not orthographic — the mild perspective depth won.
- **Shading**: soft real lighting (`MeshStandardMaterial`, roughness ~0.85, hemisphere + directional light). Note: this overrides the asset-pipeline research's matcap-first recommendation; it fits within the performance budget from [three.js performance on Android WebView](005-threejs-android-performance-practices.md) (≤3 lights, 1 shadow-caster max, blob shadows). **Matcap remains the documented fallback** if low-end profiling forces it.
- **Tile edges**: rounded (beveled) tiles for dug dirt.
- **Scale**: 16 tiles across the screen (the prototype's default, which the choice was made at).
- **Provisional flag**: the shading/style verdict was made against programmer art; revisit once the first real Blender character model exists. During the review the developer also set a standing direction: **game experience first, visual polish later** (grey-box until fun, then art).

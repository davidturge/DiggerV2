---
id: 4
title: Blender-to-three.js asset pipeline
labels: [wayfinder:research]
status: closed
assignee: claude (research agent)
blocked-by: []
---

## Question

Locked decision: assets are self-made in Blender (or equivalent) by a developer with no prior 3D experience. What is the recommended pipeline and learning path?

- Export format and workflow: glTF/GLB best practices for three.js (materials, compression — Draco/Meshopt, texture formats for mobile).
- Rigging and animation: how character/slime animations are authored in Blender and played in three.js (AnimationMixer); how many clips a game like this needs.
- Style feasibility: how solo devs achieve a "clay/claymation" look with beginner Blender skills (sculpt vs low-poly + toon shader); realistic effort estimates.
- Poly/texture budgets for mid-range Android WebView targets.
- Learning path: the shortest credible route for a programmer to Blender competence for stylized low-poly game assets.

## Resolution

Full report: [tracker/research/blender-threejs-pipeline.md](../research/blender-threejs-pipeline.md). Key conclusions:

- **Export**: `.glb` via Blender's Khronos glTF exporter (+Y Up, default "Actions" animation mode — each Blender Action becomes one clip). Compress with **Meshopt** (faster decode than Draco, also compresses animation). Defer KTX2/Basis textures until profiling demands it.
- **Critical gotcha**: glTF only carries PBR materials — Blender toon-shader node graphs do **not** export. Apply the clay look in three.js after load, swapping materials via `gltf.scene.traverse()`: recommended **`MeshMatcapMaterial`** (unlit, cheapest, no lights, reads as clay), with `MeshToonMaterial` (+ NearestFilter gradient map) as the lit alternative.
- **Rigging**: hand-build a small deform-only armature; avoid Rigify (documented friction with glTF's deform-bones-only export).
- **Animation counts**: ~6–9 clips per hero character, 3–4 per slime, 8–12 for the boss; play via `AnimationMixer` + `crossFadeTo`. Open question deliberately left for the tech spec: 8-directional facing clips vs one rotatable "move" clip.
- **Style**: skip sculpted clay — low-poly + matte/matcap shading reads as clay and is far cheaper to learn and render. Skip outlines in v1 (cel-shading convention, ~doubles draw calls).
- **Budgets** (practitioner-sourced): ~1,500–4,000 tris per hero, 200–800 per slime, 3,000–8,000 per boss; most enemies/props texture-free via vertex colors (report documents the exact export chain that silently breaks if any step is missed).
- **Learning path**: Grant Abbitt's free "Creating a Game Character: The Rogue" series (game/export-oriented, unlike the classic Donut tutorial); GameDev.tv low-poly-characters course as optional paid depth.
- **Tooling**: Blender is the clear answer; Blockbench fights the rounded clay aesthetic.


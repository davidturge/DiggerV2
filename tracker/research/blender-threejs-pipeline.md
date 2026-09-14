# Blender → three.js asset pipeline for a solo, no-art-background developer

Research for [ticket 004](../tickets/004-blender-to-threejs-asset-pipeline.md). Target: mid-range
Android phones inside a Capacitor WebView, "clay/claymation" cartoon look, three characters
(Buster/Gemma/Drill), several slime enemy variants (basic/nimble/puffy/swarm), five bosses,
gold sacks, and juicy kill effects (see `documents/design.md`).

Scope note: draw-call/instancing/lighting/frame-pacing performance is covered by
[ticket 005](../tickets/005-threejs-android-performance-practices.md). This report focuses on the
**authoring and export pipeline** — how the assets get made and get into three.js — plus the
per-asset poly/texture budgets that inform what an artist (the developer) should aim for while
modeling.

---

## 1. Export pipeline: Blender → glTF/GLB → three.js

### 1.1 Why glTF/GLB is the right target

glTF 2.0 (binary `.glb`) is the de facto standard interchange format for three.js — it's the
format three.js's own examples, `GLTFExporter`/`GLTFLoader`, and the wider WebGL ecosystem are
built around. Blender bundles a first-party glTF 2.0 exporter as part of core Blender, developed
and maintained by the Khronos Group (`glTF-Blender-IO`, not the Blender Foundation itself —
corrected from an earlier draft of this report):
https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html,
https://github.com/KhronosGroup/glTF-Blender-IO

### 1.2 Blender export settings that matter

- **Format**: export `.glb` (binary, textures embedded) for shipping; use `.gltf` + `.bin` +
  loose textures only during iteration if you want to hand-edit JSON or diff in git.
- **+Y Up**: leave this **on**. glTF's coordinate convention is +Y up; Blender is +Z up. The
  exporter's "+Y Up" transform option handles the conversion — turning it off is "the fastest way
  to a model lying on its side" per community guides.
  (https://github.com/funwithtriangles/blender-to-threejs-export-guide)
- **Apply Modifiers**: turn on for static/prop meshes. Caveat: applying modifiers at export time
  bakes them into the mesh but **breaks shape-key (morph target) export** — if a mesh needs shape
  keys (e.g. squash/stretch face blends), apply modifiers manually in Blender first and leave the
  exporter's "Apply Modifiers" off.
  (https://finepointcgi.io/2023/06/16/how-to-efficiently-export-assets-from-blender-to-your-game-engine/)
- **One armature per glTF file.** Mixing multiple skeletons in one export is a common source of
  broken skinning.
- **Animation Mode**: the current glTF-Blender-IO exporter has an "Animation Mode" dropdown with
  four options: **Actions** (default — every Action on the object, whether active or sitting
  unused in the Action list, is exported as its own separate glTF animation clip),
  **Active Actions Merged** (only the currently-assigned action per object, merged into one clip —
  not useful for a multi-clip character), **NLA Tracks** (exports each NLA track as one animation,
  useful only if you want to *combine* several actions into a single clip), and **Scene** (bakes
  the whole timeline as one animation). **For this project's "one Action = one game-state clip"
  need, the default "Actions" mode already does the right thing** — you do not need to push
  actions into the NLA editor at all. The "Group by NLA Track" checkbox (on by default) only
  matters if multiple actions share an NLA track name and should be merged into one clip; leave it
  at its default and simply keep each animation as its own uniquely-named Action.
  (Cross-referenced across the Blender glTF exporter's documented modes; the older
  push-to-NLA-and-check-a-box workflow described in some 2019-era guides such as
  https://github.com/funwithtriangles/blender-to-threejs-export-guide predates this Animation
  Mode dropdown and is no longer the simplest path — that guide is still useful for its list of
  gotchas below, just not for this specific step.)
- **Known exporter gotcha**: a bone/object whose transform doesn't change across the whole action
  can get exported with degenerate/zero keyframe data. Community workaround: add a tiny keyframe
  variation, or bake the animation ("Sampling" / IK requires "sampled" animation) before export.
- Prefer **JPEG** for exported color textures if you paint with an alpha-less workflow, to keep
  `.glb` size down; PNG only where alpha is required.

Primary sources: Blender's glTF 2.0 exporter is developed and maintained by the Khronos Group
(the `glTF-Blender-IO` repository, https://github.com/KhronosGroup/glTF-Blender-IO), bundled with
Blender; community export guide with concrete gotchas verified against practitioner experience
(https://github.com/funwithtriangles/blender-to-threejs-export-guide); animation-mode behavior
cross-referenced via https://github.com/KhronosGroup/glTF-Blender-Exporter/pull/166 and
https://github.com/godotengine/godot-proposals/issues/11887.

### 1.2b Materials do not round-trip — read this before touching Blender's Shader Editor

This is the single most important thing to know before styling anything: **glTF 2.0 has exactly
one material model, PBR metallic-roughness** — there is no toon/cel material in the spec, no
custom shader graph, nothing.
(https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html,
https://www.khronos.org/gltf/pbr/) Blender's exporter reads **only the Principled BSDF node**
(base color, roughness, metallic, normal map, emission, and a couple of extension-mapped inputs
like Sheen); any other node setup — including the standard "Shader to RGB → Color Ramp" toon-shader
recipe that is the top Google result for "Blender toon shader" — is either ignored or flattened to
a flat gray/default value on export.
(https://github.com/KhronosGroup/glTF-Blender-Exporter/issues/101,
https://github.com/KhronosGroup/glTF-Blender-IO/issues/1488)

**Practical consequence**: do not spend time building a toon shader in Blender's Shader Editor for
final look — it will not survive export. Use Blender materials only to set a plausible **base
color** (and a base-color texture or vertex colors, §3.2), keep roughness/metallic at sensible flat
values, and do all the actual clay/toon *shading* work on the three.js side after load (§3.2/§6
below). Matcap presets in Blender's viewport (§3.2) are for **modeling-time preview only** — they
are a viewport shading mode, not a material, and also do not export.

### 1.3 Compression: Draco vs Meshopt

Both are optional glTF extensions for geometry compression, applied as a **post-process** (either
via the Blender exporter's own Draco checkbox, or via the `glTF-Transform` CLI after export — not
both on the same pass, and always as the *last* step in a processing pipeline since texture
operations can decompress mesh compression).

| | Draco (`KHR_draco_mesh_compression`) | Meshopt (`EXT_meshopt_compression`) |
|---|---|---|
| Compression ratio | Higher — can cut geometry-heavy files by up to ~95% | Lower ratio on its own, but pre-optimizes data so a subsequent gzip/brotli pass compresses very well |
| Decode speed | Slower (heavier WASM decoder) | Considerably faster to decode — matters more on lower-end mobile CPUs |
| Covers | Static geometry only (not morph targets, not animation) | Geometry **and** morph targets **and** keyframe animation |
| Current default | — | Now `gltf-transform optimize`'s default geometry compression |

Recommendation for this project: **Meshopt first**. Faster decode matters directly on mid-range
Android WebView CPUs, it also compresses the animation clips (this project has several
characters × several clips each), and serving `.glb` files behind gzip/Brotli (which any static
host or CDN should already do) gets most of Draco's size win back. Reach for Draco only if a
specific static/high-poly prop's file size is a problem after Meshopt + gzip.
Sources: https://gltf-transform.dev/modules/extensions/classes/EXTMeshoptCompression,
https://github.com/donmccurdy/glTF-Transform/discussions/347,
https://www.utsubo.com/blog/threejs-best-practices-100-tips

CLI reference (`glTF-Transform`, Node-based, MIT-licensed, by the three.js `GLTFLoader`/exporter
co-maintainer Don McCurdy): https://gltf-transform.dev/cli
```
gltf-transform meshopt input.glb output.glb --level medium
gltf-transform optimize input.glb output.glb --compress meshopt --texture-compress webp
```

### 1.4 Textures: KTX2/Basis Universal vs plain PNG/JPEG/WebP

- **KTX2 (with Basis Universal supercompression)** stores textures in a GPU-transcodable container:
  it's decoded once into whatever compressed GPU format the device supports (ETC2/ASTC on
  Android, etc.), which saves both download size and, more importantly, **VRAM** compared to
  shipping raw PNG/JPEG that the GPU has to keep decompressed. three.js's `KTX2Loader` handles this
  and is a prerequisite for glTF's `KHR_texture_basisu` extension.
  (https://threejs.org/docs/pages/KTX2Loader.html)
- Setup requires a WASM transcoder shipped alongside your bundle
  (`three/examples/jsm/libs/basis/`) and calling `loader.detectSupport(renderer)` before load so it
  picks the right target format for that device's GPU.
- **WebView/WASM compatibility**: WebAssembly has been supported in Chromium (and thus Android
  System WebView, which ships in lockstep with Chrome for Android) since Chrome 57 (2017), and
  Capacitor's WebView on any remotely current Android OS will have a recent, evergreen System
  WebView. This is **not** a realistic blocker in 2025/2026.
  (https://developer.chrome.com/docs/webview,
  https://chromium.googlesource.com/chromium/src/+/refs/heads/main/android_webview/docs/web-platform-compatibility.md)
- **Practical recommendation for this project's low-poly clay style**: this game's assets are
  low-poly with small, mostly-flat-color or simple-gradient textures (see §3) — texture VRAM
  pressure is much lower than for a realistic/PBR game. KTX2/Basis is worth adopting eventually
  (and costs nothing at the three.js API level once set up), but it adds a build-pipeline step
  (`toktx`/`basisu` CLI) that's extra friction for a solo beginner's first pass. **Pragmatic path**:
  ship WebP or small JPEG textures first (three.js supports `EXT_texture_webp` natively, no extra
  loader), and only add a KTX2 encode step to the export pipeline if texture VRAM/bandwidth
  becomes a measured problem (this dovetails with the profiling work in ticket 005).

### 1.5 three.js loading-side setup

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

const loader = new GLTFLoader();

// Only needed if any assets use Draco-compressed geometry
const draco = new DRACOLoader();
draco.setDecoderPath('/draco/'); // self-host the decoder, don't hotlink three.js's CDN copy
loader.setDRACOLoader(draco);

// Needed for Meshopt-compressed geometry/animation (recommended default, see 1.3)
loader.setMeshoptDecoder(MeshoptDecoder);

// Only needed if textures are shipped as KTX2 (see 1.4)
const ktx2 = new KTX2Loader();
ktx2.setTranscoderPath('/basis/');
ktx2.detectSupport(renderer);
loader.setKTX2Loader(ktx2);

const gltf = await loader.loadAsync('models/buster.glb');
scene.add(gltf.scene);
// gltf.animations -> AnimationClip[]
```
Sources: https://threejs.org/docs/pages/GLTFLoader.html,
https://threejs.org/docs/pages/KTX2Loader.html, three.js `GLTFLoader.js` source
(https://github.com/mrdoob/three.js/blob/master/examples/jsm/loaders/GLTFLoader.js).

**Important, non-optional step for the clay/toon look**: `GLTFLoader` always constructs
`MeshStandardMaterial` (PBR) for glTF materials — that follows directly from §1.2b (glTF only
speaks PBR metallic-roughness). To get the flat/clay/toon look described in §3, the loaded
materials must be swapped after load, carrying over the base color/texture:

```js
gltf.scene.traverse((obj) => {
  if (!obj.isMesh) return;
  const old = obj.material;
  obj.material = new THREE.MeshToonMaterial({
    map: old.map,          // reuse baked/vertex-painted texture if any
    color: old.color,
    vertexColors: old.vertexColors, // see §3.2 vertex-color gotchas
    gradientMap: threeToneGradient, // see §3.2 — required for banded shading
  });
});
```
This traverse-and-replace step belongs in the pipeline as its own stage (§ "Recommended pipeline"
step 6 below), not as an afterthought — skipping it means the game renders in three.js's default
PBR look, not clay.
(Community pattern references: https://discourse.threejs.org/t/changing-accessing-materials-of-a-gltf-object-individually/13840,
https://discourse.threejs.org/t/can-we-load-gltf-material-is-meshbasicmaterial-instead-of-meshstandardmaterial/36256)

---

## 2. Rigging and animation: Blender → `AnimationMixer`

### 2.1 Authoring in Blender

- Build a simple humanoid/creature armature by hand for anything that needs an export-clean rig.
  **Avoid Rigify for first attempts at export-bound characters.** Rigify is excellent for
  film/animation rigs (it auto-generates a rich control rig with IK/FK switches, face controls,
  etc.) but its control bones are layered on top of separate "deform" bones, and the official
  glTF exporter's "export deforming bones only" option is known to still pull in Rigify's IK/control
  bones or break baked animation when those non-deform bones are stripped — open, unresolved
  friction as of the exporter's current tracker.
  (https://github.com/KhronosGroup/glTF-Blender-IO/issues/2115,
  https://developer.blender.org/T57536)
  A small hand-built armature (10-25 bones for a simple biped/blob character) with **only deform
  bones** avoids this entirely and is squarely within reach for someone with zero rigging
  experience, especially for the game's simple, chunky "clay" characters and single-mesh slimes.
- Author each animation as its own, uniquely-named Blender **Action** in the Action Editor/Dope
  Sheet — with the exporter's default **Animation Mode: Actions** setting, each Action becomes its
  own `AnimationClip` automatically; no NLA pushdown is required for this project's needs (§1.2).
- Known limitation to plan around: three.js's `AnimationMixer` blends multiple simultaneous
  actions by interpolating the *whole* transform, not by layering per-bone (e.g. "upper body
  shoot" + "lower body walk" is not a free blend — it needs either bone masking via
  `AnimationMixer`/`AnimationObjectGroup` tricks, or simply authoring a combined "walk+shoot" clip
  in Blender instead). For a small arcade game, authoring a few combined clips is simpler than
  building a bone-masking system.

### 2.2 Playing clips in three.js

```js
const mixer = new THREE.AnimationMixer(gltf.scene);
const clip = THREE.AnimationClip.findByName(gltf.animations, 'Walk');
const action = mixer.clipAction(clip);
action.play();

// in the render loop
mixer.update(delta);

// transitioning states
currentAction.crossFadeTo(nextAction.play(), 0.2, true);
```
Sources: https://threejs.org/manual/en/animation-system.html,
https://discourse.threejs.org/t/gltfloader-play-all-animations/28802,
https://waelyasmina.net/articles/all-you-need-to-know-about-loading-and-animating-models-in-three-js/

### 2.3 How many clips does this game actually need?

Reading `documents/design.md` against typical small-arcade-game animation sets, per **player
character** (Buster/Gemma/Drill share a rig/skeleton shape where possible so clips can potentially
be retargeted, though each has unique abilities):

| Clip | Why |
|---|---|
| Idle | Baseline |
| Move / Dig | Core loop is constant digging-while-moving |
| Shoot | Rifle mechanic |
| Push sack | Sack-pushing interaction |
| Hit / Stagger | Feedback when shot/pushed by opponent |
| Death / Knockout | Sack crush or frenzy-eaten |
| Ability-unique clip(s) | Buster's Knockback, Gemma's Sprint, Drill's Super Tunnel each probably want at least a short "cast" pose/flourish, even if procedural for the effect itself |

Roughly **6-9 clips per character** is a realistic, generous target — well within a solo
beginner's reach once the rig works, especially since several (idle, hit, death) can be short and
simple.

For **slimes/enemies** (basic, nimble, puffy, swarm — design doc §4.2): idle/move, a "splat" death
clip (or two, since Puffy needs a "split" variant), and possibly a squash-bounce idle loop that
sells the clay/jelly material. 3-4 clips per enemy type; several of these variants can likely
share the base "slime" rig and swap only material/scale.

For **bosses** (design doc §5): given each has 2-3 unique mechanics/phases, budget more like
8-12 clips per boss (idle, move/burrow, telegraph/warning per attack, attack, hit-reaction,
phase-transition, death) — bosses are the most animation-expensive assets by far and should be
scheduled last, after the pipeline is proven on player characters and slimes.

This clip-count estimate is a design-informed judgment call by this researcher, not sourced from
an external reference (no single source addresses "how many animations does an arcade game need");
treat it as a planning estimate to validate once the first character is rigged.

**Open question flagged, not resolved, by this research**: the design's tile grid is described as
a **side-view cross-section** (documents/design.md §2.1) with 8-directional movement (§2.3). A
single "move" clip reused across all 8 directions via root rotation (as this researcher initially
assumed) breaks down for up/down movement in a side view — rotating a walking/digging character
90° to face "up" would visually put them on their back. Whether the renderer needs a
front/side-facing pair of clips with horizontal mirroring, a different per-direction sprite/pose
approach, or a camera angle that makes rotation acceptable, is a **renderer/art-direction decision
for the tech spec**, not something this research can settle — flagging it here so it isn't lost.

---

## 3. Achieving the "clay/claymation" look as a beginner

### 3.1 Two real options, and which one is realistic

1. **Sculpted clay geometry** (actual bumpy, hand-molded-looking surfaces, fingerprint-like
   dents, soft asymmetric forms) — this is what "claymation" literally looks like (Aardman-style).
   Achieving it well requires Blender's sculpt mode, multires/dyntopo workflows, and then
   retopology to get the sculpt down to a game-usable poly count. This is a **real skill ramp**
   (sculpting + retopology are two of the harder skills in the whole 3D toolchain) and is
   overkill for a mobile arcade game's silhouette-readability needs.

2. **Low-poly + toon/gradient shading "read" as clay** — this is what the overwhelming majority of
   successful solo/indie low-poly mobile and web games actually do (games often cited as
   reference points for this aesthetic: *A Short Hike*, *Untitled Goose Game*, *Moving Out*/
   *Overcooked*-style chunky characters). The "clay" impression comes from: soft, rounded/blobby
   low-poly silhouettes (no sharp mechanical edges), flat or gently-gradiented matte shading (no
   specular highlights, which is what makes plastic/metal read as "not clay"), and a warm, slightly
   desaturated color palette. This is achievable with a handful of primitive shapes, extrude/bevel,
   and basic subdivision — squarely within a beginner's first weeks.

**Recommendation: option 2.** It is also dramatically cheaper on both learning-curve and runtime
performance, which matters twice over for this project (solo dev, mid-range Android target).

### 3.2 Concrete techniques

Recall §1.2b: none of this can be authored as a Blender material/shader and exported — it all has
to be applied on the **three.js side**, after `GLTFLoader` hands back default PBR materials, via
the traverse-and-swap step shown in §1.5.

- **`MeshMatcapMaterial` — the strongest single candidate for this project's clay look.** A
  matcap ("material capture") is a single unlit texture of a sphere with lighting/shading
  pre-baked into it; three.js's `MeshMatcapMaterial` samples it by view-space normal, so a "clay"
  or "matte" matcap texture gives an instant, soft, form-revealing, non-shiny clay look with **no
  scene lighting required and no per-pixel lighting math** — it's an unlit material, cheaper than
  both `MeshToonMaterial` (which needs real lights) and PBR. Its known limitations — the shading is
  locked to camera-relative normals (looks slightly "stuck to the screen" on a rotating object;
  can't receive shadows or vary with light position) — are largely moot for this project, whose
  camera is a mostly-fixed side/top view of a tile-based dig field rather than an orbiting-camera
  showcase. Blender itself ships ~24 built-in matcap presets for **viewport preview only**
  (including "clay", "toon", "matte" styles) — useful for judging a model's form while sculpting/
  modeling, but note again these do **not** export; the actual matcap texture used at runtime must
  be supplied directly to three.js's `MeshMatcapMaterial` (free clay-style matcap texture packs
  exist, or a simple one can be painted/generated).
  (https://threejs.org/docs/#api/en/materials/MeshMatcapMaterial,
   https://sbcode.net/threejs/meshmatcapmaterial/)
- **`MeshToonMaterial` — the cel-shaded alternative, if banded/lit shading is preferred over flat
  matcap shading.** It *is* a lit material (needs at least one light in the scene to shade at all)
  and, importantly, needs an explicit `gradientMap` texture (a small 1D ramp, e.g. 3-4 texels) with
  `NearestFilter` set on both `minFilter`/`magFilter` — without a gradient map (or with the default
  linear-filtered one) it renders as smooth/soft shading rather than the banded cel-shaded look;
  this is a common first-try mistake.
  (https://threejs.org/docs/pages/MeshToonMaterial.html, https://sbcode.net/threejs/meshtoonmaterial/)
  Recommendation: **try `MeshMatcapMaterial` first** for its simplicity (no lights, no gradient map
  to get right, cheapest) and only move to `MeshToonMaterial` if the design wants visible
  directional lighting/shadowing on characters that a matcap can't provide.
- **Outlines — recommend skipping, at least for v1.** This researcher's initial citation for
  `OutlineEffect` + `MeshToonMaterial` was, on closer reading, an *unresolved forum bug report*
  ("I can't make outlineEffect even I use this function"), not evidence the combination works
  smoothly out of the box — that claim in an earlier draft of this report was not well supported
  and is corrected here.
  (https://discourse.threejs.org/t/outline-effect-not-work-use-with-meshtoonmaterial/40961)
  More importantly, **ink outlines are a cel-shading/anime convention, not a claymation one** —
  actual claymation (Aardman-style) has no outlines at all; a matte/matcap clay look is arguably
  more on-brief without them. Outlines are also a real mobile cost (`OutlineEffect` and
  duplicate-backface-extrusion techniques both roughly double draw calls for every outlined
  object), which is a bad trade for a game with on-screen swarms of small slime enemies
  (design doc §4.2 "Swarm" type). Recommendation: ship without outlines; revisit only if
  playtesting shows silhouette readability problems that lighting/color contrast can't solve.
- **Vertex colors instead of textures**: a very common low-poly indie technique — paint colors
  directly onto vertices in Blender (fast, no UV unwrapping needed) rather than painting textures.
  This removes UV unwrapping (one of the more tedious beginner skills) from the critical path
  entirely for many props/characters, at the cost of coarser color detail — appropriate for a
  clay/low-poly style where flat color patches are the desired look anyway.
  Three specific things must line up or this silently fails:
  1. In Blender, paint vertex colors on the **Face Corner domain with Byte Color** type (the
     historically reliable combination for the exporter — other domain/type combinations have had
     export bugs in past Blender versions) and make sure every relevant face actually has color
     assigned — an accidentally-empty vertex color layer can export and render as solid black
     without Blender's own viewport showing a hint of the problem.
     (https://projects.blender.org/blender/blender-addons/issues/99005,
      https://discourse.threejs.org/t/blender-3-3-vertex-colors-and-three-js/49531)
  2. The underlying material's **base color must be left white** — three.js multiplies the vertex
     color attribute against `material.color`, so any non-white base color will tint every vertex
     color.
  3. After the material swap in §1.5, explicitly set `vertexColors: true` (or pass through
     `old.vertexColors`) on the replacement `MeshMatcapMaterial`/`MeshToonMaterial` — this is not
     automatic just because the geometry has a color attribute.
     (https://discourse.threejs.org/t/when-exporting-to-gltf-what-color-space-is-used-for-vertex-colors/17642)
- **Palette discipline**: keep color palettes small and warm per design doc's "colorful and
  friendly" brief; gradient-palette tools exist to generate light/dark variants of a base hue
  quickly for beginners without color-theory background.

### 3.3 Effort estimate

A solo beginner following a structured low-poly-character course (see §5) can realistically reach
"can model, texture (vertex-color or simple bake), rig, and export one clean playable low-poly
clay-style character" in **2-4 weeks of part-time learning-by-doing**, based on the scope of the
courses below (each targets exactly this outcome and is a few hours to ~10-15 hours of video).
Rigging/animation adds meaningfully to that timeline the first time through, but the design's own
cast (3 heroes + a handful of slime variants + 5 bosses) is a large content list — the sensible
sequencing is: nail the pipeline on **one simple slime** first (no rig, just squash/stretch shape
keys or simple scale-based animation), then move to a rigged player character, then reuse that
rig's lessons for the rest of the cast.

---

## 4. Poly-count and texture budgets (mid-range Android WebView)

Caveat on sourcing: authoritative first-party guidance (three.js docs, Khronos glTF docs) does
not publish specific triangle-count budgets — these numbers are inherently project- and
device-dependent and Khronos/three.js deliberately avoid prescribing them. The figures below are
triangulated across several practitioner/industry sources (game-dev blogs, polycount.com forum
discussion, WebAR benchmarking write-ups) rather than a single primary spec, and should be treated
as **starting targets to validate by profiling on a real target device**, which is exactly the
subject of ticket 005.

| Asset type | Suggested triangle budget | Notes |
|---|---|---|
| Player character (Buster/Gemma/Drill) | 1,500 – 4,000 tris | Low-poly clay style reads fine well under "hero character" budgets used for more detailed mobile games (5k-15k); this game's camera is likely a fairly zoomed-out side/top view (per design doc's tile-grid framing), so per-character detail matters less than silhouette and color |
| Slime enemy (basic/nimble/puffy/swarm) | 200 – 800 tris | Small, simple blob shapes; many on screen at once (swarm type) so keep these cheap |
| Boss | 3,000 – 8,000 tris | Larger on-screen presence justifies more detail, but still conservative given each boss is a single large draw call, not hundreds of small ones |
| Gold sack / tile props | 50 – 300 tris | Repeated many times per level — instancing (ticket 005) matters more than per-instance poly count here |
| Overall scene triangle budget | roughly 150k-300k tris/frame as a conservative mid-range-Android ceiling | Cross-referenced across low-poly/WebGL budget write-ups; actual ceiling depends heavily on overdraw, shader cost, and draw-call count more than raw triangle count (see ticket 005) |

Texture budgets: given the low-poly/vertex-color-friendly art direction (§3.2), most props and
enemies may need **no texture at all** (vertex colors + toon material). Where textures are used
(hero characters, larger bosses), a **256×256 or 512×512** atlas per character is generous for a
flat/low-detail clay style — this is far below the 1k-2k textures typical of realistic mobile
games, and keeps VRAM pressure low without needing KTX2 in the first iteration (§1.4).

Sources (secondary/practitioner, cross-referenced, not single-sourced):
https://game-ace.com/blog/low-poly-models/, https://polycount.com/discussion/116127/,
https://low-poly.com/blog/polygon-budgets-by-platform-2026,
https://blog.neural4d.com/user-guide/polygon-count-for-3d-game-assets-printing-and-webar/

---

## 5. Shortest credible learning path for a programmer with zero 3D/art experience

The developer's stated end goal is narrow and useful to optimize for: *not* general Blender
mastery, but specifically "**can make stylized low-poly game characters, rig them, animate them,
and export cleanly to glTF**." That argues for skipping generalist/photoreal tutorials in favor of
game-asset-focused ones from the start.

1. **Skip (or heavily skim) the classic Blender Guru "Donut" tutorial.** It's the most
   recommended first Blender tutorial in general
   (https://www.blenderguru.com/posts/blender-donut-v5-tutorial) and does teach genuinely
   transferable fundamentals (interface, modifiers, materials, basic sculpting/shading), but it
   optimizes for photorealistic rendering, not for low-poly game-ready meshes or export — a
   completed Donut is not export-ready and one practitioner account describes having to
   retopologize it down to a usable poly count after finishing. Worth 1-2 evenings for interface
   familiarity if the developer feels totally lost, but **not** the main path.

2. **Primary path — Grant Abbitt, "Creating a Game Character: The Rogue" (free, YouTube).**
   A free, complete series that takes a beginner from a blank scene to a rigged, animated,
   game-ready low-poly character, covering body/face/hands/clothing/hair modeling plus rigging and
   animation basics — i.e., exactly the skill set this ticket needs, at zero cost.
   (https://www.classcentral.com/course/youtube-creating-a-game-character-the-rogue-blender-3-154327,
   Grant Abbitt's channel/course hub: https://www.gabbitt.co.uk/courses). Grant Abbitt is a
   well-established, widely-recommended Blender educator specifically for low-poly/game-asset
   content (also co-creator of the paid GameDev.tv course below).

3. **Optional structured/paid deepening — GameDev.tv "Blender Low Poly Characters: Model Your Own
   Stylized Characters"** (https://gamedev.tv/courses/blender-low-poly-characters). GameDev.tv is a
   well-regarded, programmer-friendly course platform (same publisher behind many Unity/Unreal
   courses aimed at solo/indie devs); this course is explicitly scoped to stylized low-poly
   characters for games, which matches this project's clay-cartoon direction better than
   generalist "learn Blender" courses.

4. **Rig using a small hand-built armature, not Rigify, for the first character or two** (§2.1) —
   simpler mental model, and avoids Rigify's known glTF-export friction. Revisit Rigify later only
   if the cast grows enough that its productivity win outweighs the export cleanup cost.

5. **Learn the export/glTF side directly from `funwithtriangles`'s guide**
   (https://github.com/funwithtriangles/blender-to-threejs-export-guide) — it is short, three.js
   specific, and enumerates almost exactly the gotchas this report surfaced (NLA grouping, +Y up,
   apply-modifiers-vs-shape-keys, static-value bug). Read it once before the first real export
   attempt, not after debugging a broken export.

Realistic total ramp: **a few weeks of part-time evenings** to go from zero to "first clean rigged
low-poly character exported and animating in three.js," following steps 2, 4, 5 above (step 1 is
optional orientation, step 3 is optional depth once the basics are comfortable).

---

## 6. Is there a genuinely better "Blender equivalent" for this niche?

**Blender is the right default for this project.** The one credible alternative worth naming is:

- **Blockbench** — a free, browser/desktop, purpose-built low-poly model editor with a much
  gentler learning curve than Blender, widely used for Minecraft-style/voxel-blocky content, and
  it does export animated models (its own format, plus glTF/OBJ export exists via plugins). It is
  genuinely faster to pick up for **pure box-modeling, blocky/voxel styles**.
  (https://news.ycombinator.com/item?id=33845291,
   https://foro3d.com/en/2026/january/blockbench-vs-professional-software-comparative-analysis-for-low-poly-modeling.html)

Why it's **not** the better choice here: this project's target look is soft, rounded, "clay"
(per design doc: "colorful and friendly," slimes as squash-and-stretch jelly creatures) — the
opposite of Blockbench's native strength, which is hard-edged blocky/cuboid geometry. Blender's
subdivision/bevel/sculpt tools are what produce rounded clay-like forms; recreating that in
Blockbench would fight the tool. Blender also has first-party glTF export, a vastly larger body of
game-asset-specific tutorials (§5), and one tool to learn instead of two (some practitioner
write-ups do suggest a hybrid Blockbench-block-out-then-refine-in-Blender workflow, but that adds
a second tool and export step for no benefit given this project's rounded aesthetic).
No other "Blender equivalent" (Maya, 3ds Max, Cinema4D, ZBrush) offers a meaningfully shorter path
for a beginner solo game-asset workflow — they are all comparable-or-steeper learning curves,
often commercially licensed, with no free/game-specific tutorial ecosystem as deep as Blender's.

**Conclusion: Blender, full stop.** No tool switch is justified by this project's requirements.

---

## Recommended pipeline (summary)

1. **Model** in Blender: low-poly, rounded/soft silhouettes, vertex-color or small (256-512px)
   texture, matte/no-specular look. Learn via Grant Abbitt's free "Rogue" series (§5), skip deep
   sculpting/retopology (§3.1).
2. **Rig** by hand (not Rigify) with a small deform-only bone set for anything that needs
   animation; start with a non-rigged slime (shape-key squash/stretch) to prove the pipeline
   before tackling a rigged biped.
3. **Animate** each state as its own uniquely-named Blender Action (no NLA pushdown needed —
   §2.1); keep clip counts modest (§2.3: ~6-9/character, ~3-4/enemy, more for bosses, scheduled
   last).
4. **Export** `.glb` with +Y Up on, Apply Modifiers on for static meshes only (off + manual apply
   if shape keys are involved), default Animation Mode ("Actions") for animated meshes. Remember
   materials only carry base color/texture through the export (§1.2b) — don't spend Blender
   Shader Editor time on toon/clay shading, it won't survive.
5. **Compress** with `glTF-Transform`'s Meshopt path (`gltf-transform meshopt` /
   `gltf-transform optimize --compress meshopt`) as a build step; defer Draco and KTX2/Basis until
   profiling (ticket 005) shows a specific asset needs them.
6. **Load** in three.js via `GLTFLoader` + `setMeshoptDecoder(MeshoptDecoder)`, then **traverse and
   swap** the default PBR materials for `MeshMatcapMaterial` (recommended first choice — unlit,
   cheapest, no lights/gradient map needed, reads as clay) or `MeshToonMaterial` (if lit/banded
   shading is wanted; needs a `NearestFilter` gradient map and scene lights) — this swap step is
   mandatory, not optional, for the clay look (§1.5, §3.2). Skip outlines for v1 (§3.2). Drive
   states with `AnimationMixer` + named-clip lookup + `crossFadeTo` for transitions.
7. Budget roughly 1,500-4,000 tris for heroes, 200-800 for slimes, 3,000-8,000 for bosses, and
   keep most props/enemies texture-free via vertex colors, being careful with the Face
   Corner/Byte Color + white-base-color + `vertexColors: true` chain (§3.2, §4).

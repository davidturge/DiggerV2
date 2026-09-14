# three.js on Android WebView (Capacitor): performance practices for the tech spec

Research for ticket [005-threejs-android-performance-practices](../tickets/005-threejs-android-performance-practices.md).
Context assumed: pure deterministic tile-grid sim (ticket 002) rendered via three.js in a
Capacitor-wrapped Android WebView (see [001](../tickets/001-android-packaging-route.md) and
project memory `android_packaging_web_game.md` — Capacitor is just the stock Android System
WebView, same Chromium engine as Chrome for Android on API 24+, no extra rendering overhead from
the wrapper itself). Campaign levels are compact, single-screen-ish cross-section maps (design.md),
so tile counts per level are in the hundreds-to-low-thousands, not open-world scale.

---

## 1. Draw-call strategy for the tile map

**Core fact (three.js manual, canonical):** each additional draw call has fixed overhead
regardless of triangle count. The manual's own case study: ~19,000 individual box meshes ran
under 20 fps; merging them into one geometry (with vertex colors to keep per-box identity) hit
60 fps on the same hardware.
https://threejs.org/manual/#en/optimize-lots-of-objects (mirrored copy verified via
https://neofixer.arizona.edu/css/CSSOrbit/asteroidJS/three/manual/en/optimize-lots-of-objects.html)

**Practitioner mobile budget:** keep total scene draw calls under ~100–200 for smooth mobile
frame times; each draw call costs roughly 0.1ms of CPU-side overhead on mobile GPUs, which adds
up fast against a 16.6ms (60fps) or 33ms (30fps) frame budget.
https://www.utsubo.com/blog/threejs-best-practices-100-tips,
https://gist.github.com/iErcann/2a9dfa51ed9fc44854375796c8c24d92

**InstancedMesh vs merged BufferGeometry — the actual tradeoff for a *diggable* tile field:**

- `InstancedMesh` renders N copies of one geometry in a single draw call, storing geometry once
  (lower memory than duplicating verts N times) and is comparatively cheap to update per-instance
  (matrix/color buffer writes) without a full geometry rebuild.
  https://threejsroadmap.com/blog/draw-calls-the-silent-killer (via search snippet; direct fetch
  blocked, treat as corroborating secondary source),
  https://discourse.threejs.org/t/instancedmesh-for-simple-geometries/28658
- Statically merged geometry (`BufferGeometryUtils.mergeGeometries`) is the *cheapest possible*
  option when nothing changes, but merged geometry is expensive to mutate: removing one tile means
  re-merging (or at least re-uploading) the whole buffer, which is exactly the operation this game
  needs constantly (dig = tile disappears). One forum-reported caveat: instancing can occasionally
  be *slower* than plain merged meshes for very complex per-instance geometry/shaders due to driver
  instancing overhead — this matters less here since a dirt-tile cube/block is trivially simple
  geometry. https://github.com/mrdoob/three.js/issues/30352

**Recommendation for the spec — conditional on ticket 003's tile-visual decision:**
- **If dug tiles are visually uniform cubes/blocks per tile-type** (ticket 003's "per-tile chunks
  disappearing" option): represent the diggable grid as one (or a small handful, one per
  tile-type/material — dirt vs hard rock) `InstancedMesh` covering the whole level's tile capacity.
  Toggling a tile "dug" is an O(1) instance-matrix update (scale to zero, or swap-remove the last
  live instance into the dug slot and decrement `mesh.count`) — no full-buffer rebuild, no
  draw-call growth as dirt disappears. This is the standard voxel/tile-engine pattern (cf.
  chunked-merge approaches in Minecraft-likes) but simpler here because level sizes are small
  (an estimate, not a figure from design.md — inferred from "compact," single-screen-ish campaign
  maps: likely hundreds to ~1-2k tiles per level, not open-world), so a single InstancedMesh per
  material easily fits within one GPU draw call each.
- **If ticket 003 instead lands on "smoothed tunnel edges"** (autotiled/marching-squares-style
  geometry that varies per neighbor configuration), a single uniform InstancedMesh no longer
  covers it, since each tile's geometry depends on its dug/undug neighbors. Fallback options, in
  order of preference: (a) one `InstancedMesh` per edge-variant "tile shape" (still only a handful
  of shapes/draw calls total, since edge configurations are a small enumerable set); (b)
  `BatchedMesh` (three.js's newer draw-call-batching primitive, still stabilizing —
  https://github.com/mrdoob/three.js/issues/22376 — which explicitly supports per-instance
  visibility toggling, i.e. exactly the dig operation, while allowing different geometries per
  instance); (c) chunked merged geometry (divide the level into e.g. 8×8-tile chunks, pre-merge
  each chunk's geometry, and on dig only rebuild the affected chunk rather than the whole level) —
  bounded, infrequent rebuild cost instead of a per-tile InstancedMesh. This decision should be
  revisited once ticket 003 resolves; don't lock the tile-rendering approach into the spec before
  that prototype answers the geometry-variation question.
- Do **not** merge the *entire* level's live dirt geometry into one static BufferGeometry updated
  per-dig — the whole-buffer rebuild cost/complexity isn't worth it at this map scale regardless of
  which visual option above is chosen; keep any merging scoped to small chunks if merging is used
  at all.
- For every other repeated entity type (slimes, diamonds, sacks, particles) use one `InstancedMesh`
  per type rather than one `Mesh` per entity — keeps entity rendering at a handful of draw calls
  regardless of how many are alive.
- **Realistic safe counts:** hundreds of simultaneously-rendered dirt/rock tiles (rendered as 1-2
  draw calls via instancing) is trivial on mid-range Android; tens of concurrent dynamic entities
  (slimes, sacks, diamonds, bullets) is comfortable when each type is instanced. Target an overall
  scene draw-call count in the **~50–80 range** at gameplay-busy moments (tile field + entities +
  particles + any UI overlay meshes), leaving headroom under the ~100–200 mobile ceiling for
  variance across OEM GPUs.

---

## 2. Material/lighting budget for the toon/clay look

**Baked wins on mobile, real-time lighting is the biggest single GPU cost when used carelessly:**
real-time lights + shadows can consume more GPU time than everything else in the frame combined —
every light adds per-pixel lighting work to every lit fragment, and every *shadow-casting* light
adds a whole extra render pass (a full re-render of shadow-casting geometry from the light's view).
https://gist.github.com/iErcann/2a9dfa51ed9fc44854375796c8c24d92,
https://discourse.threejs.org/t/how-to-optimize-shadow-rendering-in-three-js-for-better-performance/64681

**Concrete budget hierarchy (corroborated across sources):**
- `AmbientLight` / `HemisphereLight` — essentially free; use as the lighting base.
- One `DirectionalLight` as the sole shadow-casting "key light" — acceptable (one extra shadow
  pass). This matches an orthographic/2.5D side-view camera (ticket 003) well, since the shadow
  camera frustum can be tightly fit to the always-visible tile field instead of needing cascades.
- 2–3 additional **non-shadow** accent lights (point/spot) for juice moments (cherry glow, sack
  impact flash) — a practical mobile ceiling is **~3 or fewer dynamic lights total**; beyond that,
  bake or fake it with emissive materials / sprites instead of real lights.
- **Avoid shadow-casting PointLights entirely** — a shadow-casting point light renders the scene
  6 times (one per cubemap face), e.g. two shadow point lights over 10 objects = 120 extra draw
  calls. This is called out explicitly as unsuitable for production mobile use.
  https://gist.github.com/iErcann/2a9dfa51ed9fc44854375796c8c24d92
- Shadow map resolution: start at 512×512 (or even 256 for distant/secondary shadows) — shadow map
  memory cost grows quadratically with resolution, and the discourse consensus is 256–512 is
  the practical mobile ceiling. Disable `shadow.autoUpdate` and re-render shadows only when
  something actually moves in the shadow-relevant volume if most of the frame is static dirt.
  https://discourse.threejs.org/t/how-to-optimize-shadow-rendering-in-three-js-for-better-performance/64681,
  https://dev.to/outriding/mastering-shadows-in-threejs-setup-configuration-and-optimization-39nn.
  When shadow maps are used, prefer `THREE.BasicShadowMap` over the default `PCFSoftShadowMap`
  (cheaper, unfiltered/hard-edged) on mid/low tiers, and set `antialias: false` on the
  `WebGLRenderer` for those tiers too — MSAA is a meaningful fragment-cost multiplier on mobile
  GPUs for little payoff on a stylized toon look.
- **Consider skipping shadow maps entirely via blob/gradient shadow sprites.** A discourse thread
  specifically motivated by mobile performance reports 20fps with a real directional-light shadow
  map jumping to 60fps by replacing it with simple instanced circular-gradient-texture planes
  projected under each entity ("blob shadows") —
  https://discourse.threejs.org/t/super-fast-dynamic-but-basic-shadows/74506. This eliminates
  shadow-map render passes entirely (adds only one more InstancedMesh, no new shadow pass), suits a
  stylized clay look better than a low-res real shadow map, and is worth prototyping alongside
  ticket 003's clay-look pass as the default rather than a fallback.

**Toon/clay look specifically:** three.js's built-in `MeshToonMaterial` (gradient-map-based cel
shading, `NearestFilter` on the gradient texture) is the direct low-cost path to the "clay/cartoon"
look mentioned in the design doc, and it still works with the light budget above.
https://threejs.org/docs/pages/MeshToonMaterial.html. `MeshMatcapMaterial` is a cheaper fallback
tier worth prototyping (ticket 003 already compares toon vs matcap vs baked soft lighting): matcap
bakes the entire lighting response into a single texture lookup and needs **zero real-time
lights at all**, which is the safest option if a lowest-end device tier needs a further-reduced
mode. For the diggable dirt specifically, baking soft AO/lighting into vertex colors or a baked
texture (rather than driving it from real dynamic lights) keeps the biggest, always-on part of the
scene cheap regardless of the dynamic-light budget above.

---

## 3. Android WebView-specific pitfalls vs mobile Chrome

**WebGL context loss is real and more aggressive in WebView than in a Chrome tab.** Root causes
reported: GPU memory exhaustion (too many/too-large textures), driver resets, extended
backgrounding, and OS-level low-memory reclaiming of the GPU surface when the hosting Activity is
paused. There is a documented Chromium regression specifically for Android WebView context loss
starting around Chromium 106: https://issues.chromium.org/issues/40249037. General mechanism
reference (authoritative, not mobile-specific): MDN on `webglcontextlost`/`webglcontextrestored`
and the `WEBGL_lose_context` extension —
https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_lose_context/loseContext,
https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextrestored_event.

**Important nuance — don't assume three.js auto-recovers for you.** Some secondary/forum sources
claim recent three.js "handles this automatically," but the official docs only expose
`forceContextLoss()`/`forceContextRestore()` as *test/simulation* helpers
(https://threejs.org/docs/pages/WebGLRenderer.html) and say nothing about guaranteed silent
production recovery. A real forum thread reporting production context-loss crashes on
Android/iOS WebViews found no built-in fix and root-caused it to RAM pressure, not a three.js bug:
https://discourse.threejs.org/t/how-to-fix-context-lost-android-iphone-ios/56829. **Treat context
loss/restore as something the spec must explicitly design for**, not something to rely on the
engine to paper over — see recommendation below (this is made easy here because the deterministic
sim, per ticket 002, is the source of truth and the renderer is meant to be a disposable
projection of it).

**devicePixelRatio / canvas resolution:** using the raw `window.devicePixelRatio` on modern
high-density Android panels (often 2.5–3x) multiplies fragment-shader cost accordingly and is a
commonly reported mobile performance cliff. Standard mitigation:
`renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))` (some sources say cap at 2, others
recommend 1–1.5 as the "safe bet" for weaker GPUs) — clamp and, ideally, make it a tunable that can
step down further under sustained frame-time pressure.
https://discourse.threejs.org/t/animate-low-performance-on-mobile-with-window-devicepixelratio-resize/23628,
https://moldstud.com/articles/p-creating-responsive-threejs-scenes-for-mobile-devices-a-complete-guide

**GPU memory limits:** budget-tier Android GPUs commonly have well under 1GB of usable GPU
memory, shared with the rest of the system. Practical mitigations: use compressed GPU texture
formats (KTX2/Basis Universal via the glTF pipeline, relevant to ticket 004's Blender→three.js
pipeline) instead of raw PNG/JPEG decoded to RGBA8 on the GPU; keep texture atlas sizes modest
(e.g., budget the whole game's live texture memory in the tens of MB, not hundreds); avoid
per-mesh unique large textures for entities that are instanced. Background on mobile GPU memory
constraints: https://webgl2fundamentals.org/webgl/lessons/webgl-cross-platform-issues.html,
https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices.

**Capacitor/WebView-specific quirks (distinct from generic mobile Chrome advice):**
- Capacitor's WebView is the OEM/Play-Store-updated Android System WebView, updated independently
  of the OS since ~2017, generally tracking a recent Chromium — but OEM-locked or
  enterprise-managed devices can pin an old WebView version. Add a startup capability check
  (attempt WebGL2 context, fall back or warn) rather than assuming WebGL2 is guaranteed.
  https://chromium.googlesource.com/chromium/src/+/HEAD/android_webview/docs/web-platform-compatibility.md
- Hardware acceleration must stay enabled for the WebView surface — disabling it (a workaround seen
  in some unrelated WebView crash reports for React Native's WebView) would break WebGL entirely;
  Capacitor's default Activity config keeps hardware acceleration on, but this is worth an explicit
  regression check if any native Android customization is added later.
  https://github.com/react-native-webview/react-native-webview/issues/575
- Real Capacitor Android jank reports in the wild are mostly about **CSS/DOM scroll and animation**
  competing with the WebView's compositor (GitHub `ionic-team/capacitor` discussion #3899 and issue
  #4187), not about the WebGL canvas rendering path itself. Mitigation: ship the game as a single
  fullscreen, non-scrolling canvas with no competing CSS-animated DOM layers, which the
  Capacitor/Android game shell should already want for immersive fullscreen anyway.
  https://github.com/ionic-team/capacitor/discussions/3899,
  https://github.com/ionic-team/capacitor/issues/4187
- Backgrounding behavior differs from a browser tab: a Capacitor app's Activity can be paused (and
  its GPU surface reclaimed under memory pressure) more aggressively than a desktop/mobile Chrome
  tab. The spec should hook Capacitor's `App` plugin `pause`/`resume` lifecycle events (not just
  `visibilitychange`) to explicitly suspend the render loop and the sim clock together, and to
  detect/handle a context loss that may have happened while backgrounded.

---

## 4. Frame pacing: rAF, fixed-timestep sim, interpolation

**Answering the ticket's "60fps or a stable 30" directly:** design for both, with one mechanism.
Because the sim is fixed-timestep and the renderer interpolates between sim states (below), the
*render* framerate is decoupled from the *sim* tick rate — a 30fps-rendering device is not running
a "different, cheaper simulation," it's just presenting fewer interpolated frames of the same
deterministic sim. Recommendation: pick one fixed sim tick rate for determinism/netcode purposes
(a decision that belongs to ticket 002, not this one) and let render framerate degrade gracefully
per-device: target 60fps on mid-range+ hardware, treat a *stable* (not janky) 30fps as the accepted
floor on the low-end target device from §6, achieved via the quality-reduction ladder below rather
than by changing the sim.

**WebView-specific pitfall this creates:** you cannot simply "request 30Hz" from
`requestAnimationFrame` — rAF fires at the display's native refresh rate (60Hz, or 90/120Hz on
newer mid-range panels), so a deliberately-throttled 30fps means skipping every other rAF callback.
Done naively (e.g. a modulo counter that renders every 2nd callback) this produces visible judder
on a 60Hz panel because the skipped-frame cadence isn't synced to vsync the way native frame-pacing
APIs are. If a device needs to run at a reduced framerate for thermal/battery reasons, prefer
reducing *rendering cost* (resolution, particles, shadows — see the quality ladder below) over
literally dropping rAF callbacks, and only drop callbacks as a last resort with care taken to keep
the interpolation alpha consistent so motion doesn't stutter.

**requestAnimationFrame in a WebView:** Chromium throttles/pauses rAF callbacks when the page (or
WebView) is not visible or backgrounded, as part of general background-tab/timer throttling; this
applies to Android WebView as one of the Blink-based surfaces.
https://groups.google.com/a/chromium.org/g/scheduler-dev/c/_SRHebxivJs,
https://developer.chrome.com/blog/timer-throttling-in-chrome-88,
https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame. Practical
consequence: don't rely on rAF firing at a steady cadence while backgrounded — treat any large gap
in `performance.now()` deltas (from being paused/resumed) as a signal to reset pacing state, not
something to "catch up" on frame-by-frame.

**Fixed-timestep simulation decoupled from rendering — the standard, well-established pattern**
(the canonical reference is Glenn Fiedler's "Fix Your Timestep!"):
https://gafferongames.com/post/fix_your_timestep/. Mechanics:
- Maintain an accumulator of real elapsed time; each rAF callback adds `dt` to it, then the sim
  advances in fixed-size steps (`while (accumulator >= FIXED_DT) { step(); accumulator -= FIXED_DT }`)
  so the deterministic sim (ticket 002) always advances by the same tick size regardless of
  render framerate variance across devices/refresh rates.
- **Clamp the max catch-up per frame** (e.g., cap at some small number of steps, or clamp the
  incoming `dt` itself) to avoid the classic "spiral of death" where a slow/janked frame causes the
  accumulator to try to run many sim steps in one rAF, making the next frame even slower.
  https://gafferongames.com/post/fix_your_timestep/,
  https://jakubtomsu.github.io/posts/fixed_timestep_without_interpolation/
- **Render-side interpolation:** the renderer keeps the previous and current sim state and renders
  a blend using `alpha = accumulator / FIXED_DT`, so motion looks smooth even though the display
  refresh rate and the sim tick rate are independent (relevant since Android devices vary from
  60Hz to 90/120Hz panels while a deterministic sim tick should stay fixed for
  determinism/multiplayer, per ticket 002's lockstep/rollback ambitions).
  https://kirbysayshi.com/2013/09/24/interpolated-physics-rendering.html,
  https://simplified.media/guides/fixed-timestep-loops
- On Capacitor `resume`, reset the accumulator to zero (don't fast-forward through backgrounded
  wall-clock time) — this also naturally covers the rAF-throttling behavior above.

---

## 5. Particles and "juice" within mobile budgets

**Instancing, not per-particle meshes.** Never spawn one `Mesh`/`Sprite` object per particle;
render all particles of a given effect through one `InstancedMesh` (or `THREE.Points`, or a small
custom GPU buffer) so the draw-call count doesn't scale with particle count. GPU-driven particle
approaches report handling on the order of a million points at 60fps versus CPU-per-particle
approaches choking around ten thousand — the gap matters even at the much smaller counts this game
needs. https://www.suboorkhan.com/blogs/particle-systems-threejs-webgl-shaders,
example libraries built on this pattern: `three.quarks` (GPU instancing internally),
`three-particles`, `THREE.GPUParticleSystem`.

**Object pooling on the CPU/JS side** is the standard mitigation for GC-pause jank from
allocate/dispose churn on every splatter/spark burst — preallocate a fixed-size pool of particle
slots per effect type and recycle rather than `new`/dispose per kill event. This matches the design
doc's frequent juice triggers (crush splatter, shot sparks, combo pops) which will fire often
during normal play.

**Recommended concrete budget:** a hard cap of on the order of a few hundred live particles total
across all active effects (e.g., 200–500), rendered through a handful of pooled `InstancedMesh`
buffers (one per particle "type": splatter, spark, dust), keeping particle rendering at a small,
fixed number of extra draw calls regardless of how many kills/effects are queued simultaneously.

**Screen shake and hit-stop are essentially free from a rendering-budget standpoint** — screen
shake is just a camera-transform perturbation and hit-stop is a brief freeze/slowdown of time
advancement, neither adds geometry or draw calls. The one design constraint worth flagging for the
spec (tying back to ticket 002): because the sim is meant to be deterministic and
lockstep/rollback-ready for the 1v1 mode, **hit-stop/juice timing should be implemented as a
render-layer effect (freezing/slowing the *presentation* of interpolated frames) rather than by
pausing the authoritative fixed-timestep sim clock itself**, so it never introduces cross-client
non-determinism in networked play.

---

## 6. Sensible 2026 low-end Android target + how to test

**Market context (2026):** the *sub-$200* Android segment is shrinking sharply (sub-$100 shipments
down ~60% in a recent quarter, broader budget segment forecast to fall double digits in emerging
markets), while devices that remain in that band increasingly use "high-spec/low-cost" SoCs
(e.g., 8GB RAM configurations) even at low price points, particularly in India/SEA — the target
markets most likely to still be running true low-end hardware.
https://www.androidauthority.com/smartphone-android-phones-2026-forecast-3703694/,
https://www.idc.com/resource-center/blog/worldwide-smartphone-market-to-decline-13-9-in-2026-as-memory-crisis-and-us-iran-war-constrain-growth/

**GPU-tier caution — corrected/downgraded from an earlier misattribution.** An initial search
surfaced a claim that Mali-G52/G57/Imagination BXM/PowerVR GPUs are "flagged for crashes, black
screens, freezing" — tracing that claim back, it originated on a page listing *Genshin Impact's*
(a native Unity game, not WebGL) unsupported-hardware list, so it should **not** be cited as a
WebGL-specific finding. What *is* independently verifiable: there is a real, documented
**Unity WebGL** black-screen bug on Mali GPUs tied to Linear color space handling
(https://issuetracker.unity3d.com/issues/webgl-the-player-displays-a-black-screen-when-it-is-built-with-the-linear-color-space-and-opened-on-a-device-with-a-mali-gpu),
which shows Mali driver/WebGL interaction bugs of this class do exist in the wild, even though it's
not the same engine or confirmed for three.js specifically. Treat this GPU tier primarily as **the
practical performance floor** (weakest common GPU still in active circulation in the target
markets), and treat driver-bug risk as "plausible, verify on real device" rather than a confirmed
three.js-specific hazard — the mitigation (own a real device in this tier, test the actual game on
it) is the same either way.

**Practical 2026 low-end target recommendation:** a device roughly 2–3 years old at the low end of
"still commonly sold," e.g. a MediaTek Helio G85/G88/G99-class or entry Snapdragon 4-series SoC,
Mali-G52/G57-class GPU, 4GB RAM, 1080p-class display — concretely something in the Samsung Galaxy
A0x/A1x line or a budget Redmi/POCO/Infinix model with one of those chipsets. This sits well below
the "budget gaming phone" tier (Snapdragon 7+/8s-class, which is a materially better bar) that 2026
buying guides describe, and is closer to what a free-to-play, ad-monetized, all-ages game (per the
design doc) will actually see a meaningful chunk of its install base running on.
https://electronics.alibaba.com/buyingguides/helio-g99-guide-is-it-right-for-your-next-budget-phone,
https://electronics.alibaba.com/buyingguides/budget-gaming-phone-2026-what%E2%80%99s-worth-it

**How to test, concretely:**
- Test on **real hardware, not an emulator** — emulator GPU passthrough doesn't represent real
  mobile driver/thermal behavior.
- Enable WebView debugging in dev builds only:
  `WebView.setWebContentsDebuggingEnabled(true)` gated behind a debug flag, then connect via
  `chrome://inspect` on a USB-connected dev machine to get full Chrome DevTools (Performance,
  Rendering, Memory panels) against the actual packaged Capacitor WebView — this is the official,
  supported path and is different from just testing the page in mobile Chrome, since it exercises
  the real Activity lifecycle. https://developer.android.com/develop/ui/views/layout/webapps/debug-chrome-devtools,
  https://developer.chrome.com/docs/devtools/remote-debugging/webviews
- Use DevTools' CPU throttling slider and, where possible, physically run the device until it
  thermally throttles (extended play session) to see a realistic worst case, not just a cold-start
  best case.
- On-device: Android Developer Options "Profile GPU rendering" (bars overlay) and
  `adb shell dumpsys gfxinfo <package>` give frame-timing data outside of DevTools and catch
  WebView-compositor-level jank (relevant to the CSS/scroll jank reports above) that pure canvas
  profiling might miss.

---

## Confidence / gaps

- **§6 device recommendation is a synthesis, not a direct citation.** The specific SoC/GPU/RAM
  combination is inferred from a mix of market-share/forecast reporting (IDC, Android Authority)
  and consumer buying-guide sites (Alibaba electronics guides, moldstud) that are not
  authoritative benchmarking sources. Treat the *tier* ("Helio G85/G88/G99 or entry Snapdragon
  4-series, Mali-G52/G57 GPU, 4GB RAM") as directionally right and worth validating with a cheap
  real purchase, not as a precisely sourced spec.
- **The "hundreds to ~1-2k tiles per level" figure in §1 is this report's inference**, not a number
  from design.md — the design doc describes maps as "compact" and screen-filling but gives no
  explicit tile-grid dimensions. Confirm against whatever grid size ticket 002/007 (level format)
  ultimately settles on.
- **Three.js's exact behavior on context loss is genuinely unresolved by official docs** — the
  docs only document manual test hooks (`forceContextLoss`/`forceContextRestore`), and community
  reports are inconsistent about how much three.js recovers automatically. The spec should not
  bet on any particular behavior here; build explicit handlers regardless (see checklist).
- **BatchedMesh (three.js issue #22376) is still an evolving/stabilizing API** as of the source
  checked — verify its current maturity/API shape against the actual three.js version pinned in
  the project before committing to it as the tile-rendering fallback in §1.
- Could not directly fetch https://threejsroadmap.com/blog/draw-calls-the-silent-killer (403) or
  the official https://threejs.org/manual/#en/optimize-lots-of-objects page (fetch tool returned no
  body); relied on a verified mirror of the manual page and search-engine summaries of the
  roadmap article as corroborating secondary sources for those two citations.

---

## Spec requirements checklist

Concrete rules the tech spec should adopt from day one:

- [ ] **Tile rendering:** all diggable dirt/rock tiles rendered via instancing, never one `Mesh`
      per tile and never one whole-level merged geometry rebuilt per dig. Exact mechanism is
      **conditional on ticket 003's tile-edge decision** (see §1): one `InstancedMesh` per
      tile-type if tiles are visually uniform; per-shape `InstancedMesh` / `BatchedMesh` / chunked
      merge if edges are smoothed/autotiled. Revisit once ticket 003 resolves.
- [ ] **Entity rendering:** every repeated entity type (slimes, diamonds, sacks, bullets,
      particles) rendered via one `InstancedMesh`/`Points` per type; no per-entity unique `Mesh`.
- [ ] **Draw-call budget:** target ≤80 total draw calls at gameplay-busy moments; hard ceiling
      ~100–200 as the "something is wrong" alarm threshold to instrument and watch in dev builds.
- [ ] **Lighting budget:** ambient/hemisphere as base (free); at most one shadow-casting
      `DirectionalLight` if real shadow maps are used at all (evaluate blob/gradient shadow sprites
      as the default instead — see §2); ≤3 dynamic lights total including any shadow light; no
      shadow-casting `PointLight`s ever; if using shadow maps, cap at 512×512 with a tight,
      camera-fitted frustum and prefer `BasicShadowMap` over `PCFSoftShadowMap`; disable
      `antialias` on mid/low quality tiers.
- [ ] **Look:** `MeshToonMaterial` (gradient map) as the primary clay/toon material; baked
      AO/vertex-color lighting for the static dirt field rather than driving its look from dynamic
      lights; `MeshMatcapMaterial` kept as a documented zero-real-light fallback tier.
- [ ] **Textures:** compressed GPU texture formats (KTX2/Basis) through the asset pipeline; a
      defined total live-texture-memory budget (tens of MB, not hundreds); no per-entity unique
      large textures for instanced types.
- [ ] **Resolution:** `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5–2))`, exposed
      as a tunable that can step down further if sustained frame time exceeds budget.
- [ ] **Context loss:** explicit `webglcontextlost` (with `preventDefault()`) /
      `webglcontextrestored` handlers that rebuild the entire render layer from the deterministic
      sim's current state snapshot (never assume three.js silently recovers on its own); wire this
      to Capacitor `App` `pause`/`resume` events, not just page `visibilitychange`.
- [ ] **Capability check:** verify WebGL2 availability at startup and fail gracefully /warn rather
      than assuming it, since OEM/enterprise-managed devices can run an old pinned WebView.
- [ ] **No competing DOM/CSS:** ship as a single fullscreen non-scrolling canvas with no
      CSS-animated DOM layers competing with the WebView compositor during gameplay.
- [ ] **Frame pacing:** fixed-timestep deterministic sim + accumulator pattern, clamped max
      catch-up steps per frame (no spiral-of-death), render-side interpolation between the last two
      sim states using `alpha = accumulator / FIXED_DT`; reset (don't fast-forward) the accumulator
      on Capacitor `resume`. Target 60fps render on mid-range+ devices, accept a *stable* 30fps as
      the floor-device target — achieved by reducing rendering cost (quality ladder below), not by
      naively skipping rAF callbacks (which judders against the panel's native refresh rate).
- [ ] **Quality ladder:** a runtime frame-time monitor that steps down render cost under sustained
      pressure, in order: lower `devicePixelRatio` cap → reduce/disable particle effects → disable
      shadow maps (or drop to blob shadows) → reduce entity draw distance/count. Build this ladder
      into the spec from day one — thermal throttling on the low-end device is the realistic
      failure mode, and a step-down ladder is expensive to retrofit after launch.
- [ ] **Determinism boundary for juice:** hit-stop/screen-shake/time-freeze effects live in the
      render/presentation layer only, never by pausing the authoritative sim tick, to keep the sim
      lockstep/rollback-safe for 1v1 netcode.
- [ ] **Particles:** pooled, instanced particle rendering only; hard cap on concurrent live
      particles (≈200–500) shared across a small fixed number of pooled buffers per effect type.
- [ ] **Target device:** define and physically own a QA device in the Helio G85/G88/G99 or entry
      Snapdragon 4-series class with a Mali-G52/G57-tier GPU, 4GB RAM — chosen as the practical
      performance floor for the target markets, and tested on real hardware rather than trusted via
      benchmark score alone (Mali-class GPUs have a documented history of WebGL/driver oddities in
      other engines, so budget real-device verification time, not just spec-sheet comparison).
- [ ] **Testing pipeline:** `setWebContentsDebuggingEnabled(true)` in debug builds +
      `chrome://inspect` remote DevTools against the real packaged APK (not mobile Chrome tabs) as
      the standard perf-debugging workflow, supplemented by `adb shell dumpsys gfxinfo` /
      "Profile GPU rendering" for compositor-level jank.

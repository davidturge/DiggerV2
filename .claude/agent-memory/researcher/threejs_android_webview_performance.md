---
name: threejs-android-webview-performance
description: Key non-obvious findings on three.js perf inside Capacitor Android WebView (researched 2026-09-14, feeds tech spec ticket 005/008)
metadata:
  type: project
---

Researched 2026-09-14 for DiggerV2 (three.js tile-based arcade game in a Capacitor Android
WebView) to answer tracker ticket 005; full report at
`tracker/research/threejs-android-performance.md`. Relates to [[android-packaging-web-game]].

Non-obvious facts worth not re-deriving:

- **Do not trust the claim that three.js "automatically recovers" from WebGL context loss.**
  Official docs (`threejs.org/docs/pages/WebGLRenderer.html`) only expose
  `forceContextLoss()`/`forceContextRestore()` as manual test/simulation helpers — there is no
  documented guarantee of silent production recovery. Some forum/blog snippets claim otherwise;
  they're not backed by the docs. Always build explicit `webglcontextlost`
  (`preventDefault()`)/`webglcontextrestored` handlers that rebuild the render layer from the
  app's own state (easy here since the sim, ticket 002, is the deterministic source of truth).
  Android WebView specifically has a documented Chromium regression around context loss starting
  ~Chromium 106 (chromium issue 40249037), and OS-level backgrounding/low-memory reclaim can
  trigger it more aggressively than a browser tab — wire recovery to Capacitor `App`
  `pause`/`resume`, not just `visibilitychange`.
- **Watch out for source misattribution when researching "Mali GPU WebGL crashes."** A search
  surfaced a claim that Mali-G52/G57/PowerVR GPUs are flagged for WebGL crashes/black
  screens/freezing, but the actual source (a Genshin Impact device-requirements page) is about a
  *native Unity game*, not WebGL — don't cite it as WebGL-specific. There IS a real, separately
  documented Unity **WebGL** black-screen bug on Mali GPUs tied to Linear color space
  (unity issuetracker), which is legitimate WebGL-adjacent evidence, but treat the Mali/G5x tier
  primarily as "the realistic low-end performance floor," not as a confirmed three.js-specific
  driver hazard, unless a three.js-specific report is found.
- **Capacitor Android jank reports in the wild are about CSS/DOM scroll & compositing**
  (`ionic-team/capacitor` discussion #3899, issue #4187), not about the WebGL canvas rendering path
  itself — Capacitor's WebView is just the stock Chromium-based Android System WebView and doesn't
  add its own GPU rendering overhead (consistent with [[android-packaging-web-game]]). Mitigation:
  ship as a single fullscreen non-scrolling canvas, no CSS-animated DOM layers competing with the
  compositor.
- **Draw-call/lighting numeric budgets that recur across multiple practitioner sources** (three.js
  manual, iErcann's gist, utsubo, threejsroadmap — treat as practitioner consensus, not a single
  canonical spec): keep total scene draw calls in the ~50-80 range (alarm above ~100-200); dynamic
  lights ≤3 total including at most one shadow-casting light; never use shadow-casting
  `PointLight`s (6x render cost per light). Blob/gradient shadow sprites (instanced planes with a
  circular gradient texture) reportedly took one mobile scene from 20fps to 60fps versus real
  directional shadow maps — worth defaulting to for a stylized clay look
  (discourse.threejs.org/t/super-fast-dynamic-but-basic-shadows/74506).
- **rAF cannot be throttled to an arbitrary target framerate cleanly.** It fires at the display's
  native refresh rate; deliberately skipping callbacks to hit "30fps" on a 60Hz+ panel causes
  visible judder unless carefully paced. Prefer reducing rendering cost (resolution/particles/
  shadows via a frame-time-driven quality ladder) over dropping rAF callbacks to hit a stable
  30fps floor on low-end devices.
- Testing must happen on the real packaged Capacitor APK via `chrome://inspect` (with
  `setWebContentsDebuggingEnabled(true)` in debug builds) rather than mobile Chrome tabs, because
  the Activity pause/resume lifecycle (where context-loss and backgrounding pitfalls actually show
  up) differs from a browser tab.

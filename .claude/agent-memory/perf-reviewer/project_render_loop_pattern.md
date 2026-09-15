---
name: project-render-loop-pattern
description: main.ts's RAF frame() loop calls handle.render() methods unconditionally every frame; watch for unconditional style/DOM writes in these render() calls
metadata:
  type: project
---

main.ts's `frame()` (the requestAnimationFrame loop, up to 60fps) calls
`sceneHandle`-adjacent handle `.render()` methods every frame without any
dirty-check (e.g. `joystickHandle.render()`, `actionButtonsHandle.render()`
added in the touch-input diff, src/input/touchControls.ts).

**Why:** These render() methods write to `style.transform` / `style.background`
unconditionally, even when the underlying state (knob offset, heat/cooldown
value) hasn't changed since the last frame — e.g. when the joystick is idle
or heat is fully cooled. This causes redundant style recalculation on a
60Hz path.

**How to apply:** When reviewing diffs that add a `render()`/`update()` method
invoked from main.ts's frame loop, check whether it writes DOM/style
unconditionally vs. only on change. Flag missing dirty-checking as a
MEDIUM finding (not HIGH, since browsers coalesce identical style writes,
but still wasted work on a hot path) — do not raise it as a correctness
issue, only as a perf one.

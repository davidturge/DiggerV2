# Right-hand action button conventions: research for touch-controls prototype

Research for ticket [006-touch-controls-prototype](../tickets/006-touch-controls-prototype.md), triggered by
the developer's ask to "look at other successful games and their examples" for touch button layout.
Context assumed from `documents/design.md`: a fixed virtual joystick (left thumb, 8-way snap, auto-dig
while moving) plus a right-thumb cluster of a **Shoot** button (limited by a heat meter, not a simple
cooldown — design.md §2.5: shots raise a heat gauge, overheating jams the rifle for a few seconds) and
a per-character **Active ability** button with a genuine cooldown (design.md §3). A third context action
may arrive later. Target feel is explicitly "measured and tactical," not "rapid taps" (design.md §1),
and the audience is "all ages."

## How to read the numbers in this doc

Nobody publishes exact dp measurements for shipped games' button geometry, so every dimensional claim
below is tagged with a confidence tier:

- **Reported/described** — a qualitative position or behavior stated in a cited game guide, wiki, or
  dev post (e.g. "Super sits below the Attack button"). No pixel measurement was taken from a
  screenshot for this doc — see Gaps (§8) — so these are textual descriptions, not measured percentages.
- **Guideline** — a published, citable standard: Material Design's 48dp minimum touch target, Apple
  HIG's 44pt minimum, or Hoober's thumb-zone field study. These are hard floors, not layout specs.
- **Inferred** — my synthesis for this game, explicitly labeled as such, not sourced to a single game.

Existing prototype numbers for comparison (`prototypes/touch-controls-prototype/index.html:32-39`):
shoot button 84px diameter, secondary (sprint) 62px diameter, 14px gap, both right-anchored
(`right: 14px + safe-area-inset-right`, `bottom: 26px + safe-area-inset-bottom`), stacked in a CSS
`flex-direction: column` with the secondary sitting *above* the primary (a vertical stack, not an arc).
Joystick: 104px base, 46px knob, 52px drag radius (`:194,197`).

---

## 1. Standard placement geometry: corner offset, arc vs. stack, sizes

**Guideline (Hoober's thumb-zone research, cited widely):** a field study of ~1,300 phone users found
thumbs rest most comfortably in the bottom-center/bottom-corner region ("green zone"); mid-screen sides
require stretching ("yellow zone"); top corners are hard to reach one-handed ("red zone").
https://www.uxmatters.com/mt/archives/2013/11/design-for-fingers-and-thumbs-instead-of-touch.php,
summarized at https://parachutedesign.ca/blog/thumb-zone-ux/. In landscape with two-thumb grip (the
relevant case here — joystick occupies the left thumb), the right thumb's natural resting position is
the bottom-right corner, and its comfortable range of motion from that pivot is an **arc**, not a
vertical line — extending a thumb straight up a stack requires more finger movement than rotating it
along its natural arc.

**Reported/described, per game:**
- **Brawl Stars:** primary Attack sits bottom-right; the Super (secondary, cooldown-gated) ability sits
  "**below** the Attack joystick" per game guides — https://game8.co/games/Brawl-Stars/archives/316910.
  Positions are fully user-draggable in settings, so this default placement is one design choice among
  several the studio ships, not a fixed law.
  https://ar-pay.com/blog/en/articles/brawl-stars/,
  https://www.memuplay.com/blog/best-brawl-stars-control-and-sensitivity-settings.html
- **Soul Knight:** "lower-right corner contains the buttons for attacking, using your skill, and
  switching weapons" — a small cluster of 2-3 round buttons anchored to the same corner, not spread
  across the screen; exact relative offset not specified in the source. https://soul-knight.fandom.com/wiki/Controls
- **Wild Rift:** "the bottom right corner is assigned for your champion's abilities and auto attacks";
  the customization UI explicitly supports moving one spell button "just **top-right** of the standard
  attack button." https://mobi.gg/en/tips/move-buttons-wild-rift/,
  https://www.ginx.tv/en/wild-rift-best-controller-and-ui-settings
- **Call of Duty Mobile:** community guidance is explicit — "keep fire and ADS near the right thumb's
  natural arc, and grenades and operator skills should be reachable but never overshadow the crosshair"
  — directional detail not specified beyond "off to the side, not overlapping."
  https://outsidergaming.com/call-of-duty-mobile-complete-controls-guide/,
  https://zilliongamer.com/call-of-duty-mobile/c/guide/control-customization

**What's actually convergent vs. what isn't:** all four games cluster every right-thumb control tightly
in the bottom-right corner within one thumb's arc of travel, and none stack the secondary in a straight
vertical column directly on top of the primary with zero horizontal offset. That much is convergent.
**The specific direction of the offset is not convergent** — Brawl Stars reports the secondary **below**
the primary, Wild Rift reports **top-right**, and CoD Mobile's guidance is directionally vague. All three
also ship fully user-repositionable buttons, which is likely *why* no single canonical direction exists:
each studio lets players resolve hand-size/grip preference themselves rather than picking one "correct"
offset.

**This game's specific case differs geometrically from Wild Rift's**, which is the source of the
"top-right" pattern: Wild Rift's attack button isn't hard against the screen edge — it has a whole
ability row inboard of it with room to place a button above-right. This game's primary is deliberately
corner-anchored near the safe-area edge (§6), so a button offset to the *right* of it would push toward
or past the edge/gesture zone. **Up-and-inward (toward screen center, i.e. up-and-left for a
bottom-right-anchored primary) is the only direction with screen room to grow**, which is closer to
Brawl Stars' "below" instinct rotated to avoid the edge than to Wild Rift's "top-right." Given the
existing prototype already uses a near-vertical stack with the secondary *above* the primary
(`prototypes/touch-controls-prototype/index.html:33,39`), and no shipped game studied puts the secondary
literally straight below with zero offset, the recommendation in §7 nudges that existing stack toward an
inward diagonal rather than inventing a new direction — but this is **inferred from corner-anchoring
geometry, not a convergent finding from the games studied**, and should be one of the first things
tested on-device per ticket 006's HITL step. If it feels wrong in hand, the alternative worth trying is
a Brawl-Stars-style placement with the ability nearer the thumb's resting pivot and the primary at the
reach sweet spot slightly further out.

**Sizes (guideline floor + inferred):** Material Design's touch-target minimum is 48dp (~9mm physical);
Apple HIG's is 44pt (~7mm). https://blog.logrocket.com/ux-design/all-accessible-touch-target-sizes/,
https://tetralogical.com/blog/2022/12/20/foundations-target-size/. These are minimums for infrequent
UI controls, not primary action buttons pressed dozens of times per minute — actual game buttons run
noticeably larger. The existing prototype's 84px primary / 62px secondary (at `width=device-width`,
CSS px ≈ dp — confirm this holds; see §6) sit comfortably above the 48dp floor and are in the same
ballpark as the "big, friendly buttons" guidance repeated across mobile game UI writeups (e.g.
https://pixune.com/blog/mobile-games-ui-design-a-handy-guide/). No game publishes exact dp; treat 84dp
primary / 60-64dp secondary as a reasonable **inferred** starting point, not a measured fact.

---

## 2. Shoot/attack button: tap vs. hold, auto-aim norms

Three distinct patterns emerged, spanning a spectrum from fully automatic to fully manual:

- **Archero — zero attack button, fully automatic:** movement and combat are mutually exclusive states;
  the character auto-fires at the nearest enemy whenever the player is *not* moving the joystick.
  "Regarding this game... no dedicated attack button... he automatically attacks when standing still."
  https://www.deconstructoroffun.com/blog/2019/8/9/why-archero-banked-25m-but-leaves-25m-hanging-hlx9n
  This is the extreme "auto-aim, no manual fire" pole — good contrast case since it removes an entire
  input, but it fundamentally couples movement and combat, which conflicts with this game's stated
  "measured and tactical" identity (shooting is a deliberate resource decision independent of movement,
  design.md §2.5) — Archero's model is not directly transferable.
- **Soul Knight — dedicated tap-to-fire button with auto-aim assist:** a fixed fire button with a
  targeting-reticle icon; "the game also features an auto-aim system, making combat accessible for
  mobile players," and the same button contextually relabels into an interaction button near objects.
  https://soul-knight.fandom.com/wiki/Controls
- **Brawl Stars — dual-mode single button, most sophisticated pattern:** tap the Attack button for a
  "Quickshot" (auto-aimed at nearest target), or drag it like a joystick for an "Aimed Shot" in a chosen
  direction, released to fire. https://game8.co/games/Brawl-Stars/archives/316910 — same physical button
  serves casual players (tap, get assisted aim) and skilled players (drag, full manual control) without
  adding a second button. This is the most reusable pattern for a game with an "all ages" audience that
  still wants tactical depth.
- **Call of Duty Mobile — separate fire vs. ADS(aim-down-sights), configurable:** offers a distinct
  "Hip Fire Button" in Advanced mode alongside the main fire control, i.e. more manual precision at the
  cost of more buttons — aimed at a more hardcore audience.
  https://outsidergaming.com/call-of-duty-mobile-complete-controls-guide/

**Recommendation relevance:** this game's shoot has a deliberate cost (heat meter) and the design intent
is *"every shot is a decision"* (design.md §2.5), so full auto-fire (Archero) undersells the tactical
weight the design wants; a Brawl-Stars-style tap-for-quickshot / drag-for-aim single button gives casual
players an accessible default while preserving room for aimed play, without a second button. A simpler
fallback matching Soul Knight (tap-to-fire toward nearest enemy or facing direction, with auto-aim
assist) is the lower-effort v1 option and is closer to what ticket 006's existing prototype already
implements (tap `#shoot` fires toward current facing — `index.html:246`).

---

## 3. Cooldown presentation: radial sweep, greyed state, charge counters

- **Soul Knight** combines two simultaneous cooldown signals: the skill button's icon "gradually
  fill[s] up with white" as the cooldown completes (a **radial fill**, inverse of a sweep-away), *plus*
  a redundant "green ring around the player on the ground" showing the same cooldown in world-space.
  https://soul-knight.fandom.com/wiki/Controls — this dual on-button + in-world redundancy is notable:
  it lets the player track cooldown without looking away from the action, relevant for this game since
  the "wobbling sack" mechanic already asks players to track a countdown in-world (design.md §2, the
  sack's reaction window).
- **General pattern (game dev / Unity & Godot cooldown recipes, corroborating secondary sources, not a
  specific shipped game):** the standard implementation is a radial/pie "wipe" mask over the icon (often
  called a "radial cooldown" or "clock wipe"), darkened or desaturated during the cooldown, that clears
  as the timer completes; a numeric countdown is sometimes overlaid for cooldowns longer than a couple
  seconds. https://kidscancode.org/godot_recipes/3.x/ui/cooldown_button/index.html,
  https://medium.com/@240153_78160/creating-a-cooldown-system-in-unity-6df2915008fc — treat this as
  **inferred/corroborating**, not a specific game citation, but it matches what's visible in Soul
  Knight, Brawl Stars, and Wild Rift's ability icons in their own store screenshots and wikis.
- **Brawl Stars' Super** fills as damage is dealt/taken rather than on a pure timer — a **charge meter**,
  not a time-based cooldown — visually similar (radial or bar fill) but conceptually different (it's a
  resource gauge, not a clock). https://game8.co/games/Brawl-Stars/archives/316910 (button described as
  filling toward "ready").

**This maps directly onto a genuine mismatch in this game's own two right-thumb buttons that the
research surfaced:** Shoot uses a **heat meter** (design.md §2.5 — rises with use, doesn't passively
recover on a timer the same way, and has a punitive "jam" state when maxed) while the Active ability
uses a **true cooldown** (design.md §3 — fixed wait after use). These are different mental models and
should get visually distinct treatments even though both are "radial fill around a button" at a glance:
- **Active ability → radial cooldown sweep** (Soul-Knight-style: icon darkened/greyed while on
  cooldown, a wipe or fill clears as it becomes ready, button snaps back to full color/brightness at
  zero — the clean "timer" pattern, since the ability *is* a pure timer per design.md).
  A charge-counter pip is not needed for v1 (design.md doesn't describe multi-charge abilities).
- **Shoot → rising heat gauge, not a cooldown sweep.** Recommend a radial or arc gauge that fills
  *toward* a redline as the player shoots (the opposite direction of a cooldown wipe — it's an
  accumulating danger meter, not a recovering resource) with a distinct "jammed" state (e.g. red flash /
  shake / disabled tap) when maxed, so the two buttons are not visually confusable despite both having
  ring-shaped feedback. This directly reflects design.md's "overheat" framing and is not something any
  single game studied does identically, but Soul Knight's precedent of "meter fills toward a state
  change, shown as a ring around the icon" is the closest transferable pattern.

---

## 4. Left-handed / mirroring options

Common in principle, but typically deep-settings territory, not a v1 must-have:
- Several games (Brawl Stars, Wild Rift, CoD Mobile — see citations in §1) let players **freely
  drag/reposition every button**, which is a superset of left-handed support (a player can manually
  rebuild a mirrored layout themselves) without the developer shipping a dedicated "left-handed mode."
- Dedicated single-toggle "mirror everything" left-handed modes exist in some genres/platforms (e.g.
  Android's OS-level layout-direction mirroring, and some controllers), but community discussion
  suggests it's inconsistently implemented and often just "move the same controls to the other side"
  rather than a fully considered mirrored ergonomic layout.
  https://medium.com/@nigelmills2000/the-surprising-complexity-of-gaming-as-a-lefty-6c0d5fda1e3e,
  https://blog.en.uptodown.com/activate-left-hand-mode-android-tutorial/
- No evidence any of the specific games studied ship handedness as a first-class, heavily marketed
  feature; free-drag customization (Brawl Stars, Wild Rift, CoD Mobile) is the dominant solution because
  it subsumes handedness along with every other personal preference (hand size, grip style) for one
  implementation cost.

**Recommendation:** don't build a dedicated left-handed toggle for v1. Instead, keep all button/joystick
positions in one config object (position, radius, arc angle per button) so that (a) a future full
free-drag customization screen or (b) a single "mirror layout" toggle are both cheap data-only changes
later, not a rewrite. This is a data-representation choice for the coder, not new research.

---

## 5. Button count limits for casual/all-ages audiences

There is no rigorous, citable study establishing a specific maximum button count for casual mobile
gamers — this is closer to design lore than measured research, and it would be dishonest to dress up
Hick's law (choice-reaction-time scaling with number of options) as directly applicable evidence here;
Hick's law concerns menu/decision selection latency, not the ergonomics of a fixed always-visible touch
cluster, and none of the sources found apply it to arcade action-button layouts specifically.

What's actually documented is a **consistent observational convergence**, not a numeric law: every
casual/mid-core action game studied (Archero, Soul Knight, Brawl Stars) keeps the right-thumb cluster to
**2-3 buttons max** (attack + 1 ability, or attack + skill + weapon-swap), and every "casual UI" writeup
repeats the same qualitative advice — "keep buttons to a minimum," "consolidate functions," "fewer is
better" — without a specific number. https://pixune.com/blog/mobile-games-ui-design-a-handy-guide/,
https://medium.com/supercent-blog/designing-ui-of-hyper-casual-games-for-effective-user-experience-dd7c858bec82.
Wild Rift and CoD Mobile (more buttons, 4-6+ abilities) are explicitly **not** casual/all-ages targets —
they're included here as the upper-bound contrast case, not a model to follow.

**Recommendation:** treat "2-3 right-thumb buttons" as the de facto genre convention for this game's
target audience, consistent with the ticket's stated set (Shoot + Active ability, with a third context
action flagged as a possible future addition) — that third slot should get an arc position reserved for
it now (see §6 spec) rather than being designed in after the fact.

---

## 6. Safe-area / notch / gesture-navigation considerations for landscape Android

This section surfaced a concrete gap beyond what the ticket asked about (notches) — **Android gesture
navigation itself claims screen edges**, which matters more than notches for a landscape corner cluster:

- **Viewport meta check (repo fact, not web research):** the existing prototype's `env(safe-area-inset-*)`
  CSS (`prototypes/touch-controls-prototype/index.html:32`) only resolves to nonzero values if the
  viewport meta tag includes `viewport-fit=cover`. The prototype's current tag is:
  `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">`
  (`index.html:8`) — **`viewport-fit=cover` is missing**, so on any device where this actually matters
  (cutouts/notches on the long edge in landscape) the safe-area insets are currently silently 0 and the
  buttons could sit under a cutout or system cutout letterbox. This is a concrete, fixable finding for
  the coder, not just a general caution.
- **Gesture navigation (Android 10+, the default nav mode on modern devices):** in landscape, swiping
  inward from either vertical screen edge triggers system Back, and this claims a strip along both
  edges. https://developer.android.com/develop/ui/views/touch-and-input/gestures/gesturenav — "the new
  system gesture for back is an inward swipe from either the left or the right edge of the screen, which
  might interfere with app navigation elements in those areas."
  https://medium.com/androiddevelopers/gesture-navigation-handling-gesture-conflicts-8ee9c2665c69. A
  bottom-right-corner button cluster sits exactly on the affected edge; buttons placed too close to the
  literal screen edge risk accidental Back triggers or the system intercepting the touch before the game
  sees it.
- **The escape hatch — `Window.setSystemGestureExclusionRects()`:** lets an app declare rectangles where
  system gesture recognition should be suppressed in favor of the app's own touch handling, but Android
  caps total excluded height at **200dp**, and Google's own docs frame it as a last resort ("declaring
  that your app gesture is more important than the system action of going back — a strong statement to
  make"), to be applied only during active gameplay, not globally.
  https://developer.android.com/develop/ui/views/touch-and-input/gestures/gesturenav,
  https://learn.microsoft.com/en-us/dotnet/api/android.views.window.systemgestureexclusionrects
  On the Capacitor/WebView side (project memory: this project ships via Capacitor — see
  `android_packaging_web_game.md`), this needs to be wired from the native Android host, since it isn't
  exposed to a plain WebView page; a simpler and often sufficient v1 mitigation is inset alone. Don't
  hardcode a gesture-margin dp value — none of the sources found publish a fixed figure, and the zone
  width varies by device/OEM and by the user's own Back-sensitivity setting. Instead, the correct
  approach is to query the actual inset at runtime via `WindowInsets.getSystemGestureInsets()` /
  `getMandatorySystemGestureInsets()` (mentioned in the gesture-nav guidance,
  https://developer.android.com/develop/ui/views/touch-and-input/gestures/gesturenav) and feed that
  value into the `max()` inset structure in §7, reserving the exclusion-rect API as a fallback only if
  playtesting shows accidental Back triggers.
- **Cutouts specifically in landscape:** "when the device screen is in landscape mode, the cutout may be
  on the vertical edge... implement padding to avoid display cutouts" —
  https://developer.android.com/develop/ui/views/layout/display-cutout — reinforces that the safe-area
  padding must be live (not just present in CSS but actually resolving, per the `viewport-fit=cover` fix
  above).
- **px≈dp assumption:** holds only when the viewport meta specifies `width=device-width` at
  `initial-scale=1` (already true here, `index.html:8`), so the CSS px values in this report can be
  treated as ≈dp for the coder without a unit-conversion step — worth confirming once on an actual
  device/emulator rather than assuming indefinitely.

---

## 7. Recommended layout spec (v1)

Positions expressed as inset from the safe-area-adjusted bottom-right corner (after `viewport-fit=cover`
is fixed — see §6), in CSS px (≈dp per §6). Treat all numeric values as **inferred**, built from the
guideline floors (§1), the corner-anchoring geometry argument (§1), and the qualitative patterns in
§1-§3 — not copied measurements from a single game (see §0, §8).

- **Fix first, before any layout work:** add `viewport-fit=cover` to the viewport meta tag so the
  existing `env(safe-area-inset-*)` calc actually resolves (`index.html:8`, `:32`).
- **Primary — Shoot:** 84dp diameter (unchanged from the current prototype — already comfortably above
  the 48dp/44pt guideline floor), anchored bottom-right at
  `right: max(24dp, safe-area-inset-right, systemGestureInsets.right)`,
  `bottom: max(28dp, safe-area-inset-bottom, systemGestureInsets.bottom)` — i.e. query the actual
  gesture inset at runtime (`WindowInsets.getSystemGestureInsets()`, §6) rather than hardcoding a margin
  value, since no source gives a fixed figure and it varies by device/OEM/user setting.
  Ring feedback: rising heat gauge (arc fill toward a redline, not a cooldown wipe — §3), with a distinct
  jammed/disabled visual state.
- **Secondary — Active ability:** 64dp diameter, placed up-and-inward from Shoot (toward screen center,
  i.e. up-left for a bottom-right primary) rather than directly above it or offset toward the edge —
  candidate center offset roughly (-70dp x, -46dp y) from Shoot's center. This is the **inferred**
  geometry argued in §1 (the only direction with screen room given corner-anchoring), not a convergent
  finding — Brawl Stars places its secondary below, Wild Rift places it top-right (§1) — so **this is
  the first thing to A/B by feel** during ticket 006's on-device HITL pass; if it feels wrong, try
  the ability nearer the thumb's resting pivot with Shoot at the reach sweet spot further out (Brawl
  Stars' pattern). Ring feedback: radial cooldown sweep/fill (greyed while on cooldown, clears to full
  color at ready — §3), the inverse visual direction from Shoot's gauge so the two are not confusable
  at a glance.
- **Reserved third slot (context action, future):** reserve a position continuing the same rotational
  direction from the ability button (roughly another ~60-70dp further along whichever offset direction
  on-device testing validates for the secondary), even if unused in v1 — continuing a consistent
  direction rather than starting a new stack keeps the cluster geometry coherent if/when the third
  action ships (§5). Keep it in the same position/config data structure as the other two buttons (§4)
  so left-handed mirroring is a data flip, not a rewrite, if ever needed.
- **Interaction model:** Shoot as tap = fire toward current facing/nearest target (matches existing
  prototype behavior, `index.html:246`); consider a Brawl-Stars-style drag-to-aim on the same button as
  a stretch goal once the base loop is validated, not required for v1 given the "measured and tactical,
  not rapid taps" design intent (§2) already discourages a twitchy aimed-fire requirement.
  Ability button: straightforward tap-to-activate (no drag/hold mode found as a norm for cooldown
  abilities in any game studied — hold-to-aim patterns only appeared for primary attacks).
- **Button count:** stop at 3 total right-thumb slots (Shoot, Ability, reserved future context action)
  per the observed genre convergence (§5) — resist adding a 4th without strong justification.
- **Left-handed mode:** not in v1 scope; ensure position/size data lives in one config object so it's a
  future data change (§4).
- **Verify once, not per-build:** confirm CSS px ≈ dp on an actual device/emulator, and playtest for
  accidental system-Back triggers near the bottom-right edge before deciding whether
  `setSystemGestureExclusionRects` is needed (§6) — inset-only is the cheaper first attempt.

---

## 8. Gaps / unknowns

- **No pixel/percentage measurements were taken from actual screenshots.** Game UI Database
  (gameuidatabase.com), named explicitly in the research brief, is a JS-rendered site that did not
  return usable content via search or fetch within this pass — it is not cited anywhere above despite
  being a named source. If precise measured percentages are wanted, someone needs to open actual store
  screenshots or record device footage of Brawl Stars/Soul Knight/Wild Rift and measure button diameters
  against screen height directly; this report relies entirely on textual descriptions from game guides
  and wikis (tagged "Reported/described" in §0-§1).
  - Note also that other genre summaries/UX writeups from GDC talks specifically were searched for but
  not found as directly relevant citable sources beyond general "thumb zone" and mobile-UX blog posts
  (§1); no GDC talk transcript was located and cited.
- **Archero 2 was not separately verified** — §2's Archero findings are sourced to Archero (the
  original game); Archero 2 may have changed the control scheme and was not checked.
- **The secondary-button offset direction (§1, §7) is the single most speculative number in this
  report** — flagged repeatedly above, but worth restating here: it's a geometric inference, not a
  reported convergent pattern, and is the top candidate for revision after the ticket 006 on-device
  playtest.
- **The exact width/onset of Android's gesture-nav edge zone was not found as a fixed published value**
  (§6) — recommended runtime-query approach (`WindowInsets.getSystemGestureInsets()`) sidesteps needing
  that number, but if the coder wants a fallback constant for early prototyping before wiring the real
  API, no authoritative fixed dp figure was located in this research pass.
- **No data on how the specific "heat meter" presentation (§3) is handled in any shipped game** — this
  game's shoot mechanic (rising meter + jam state, not a passive-recovery cooldown) doesn't have a close
  analog in any of the games studied; the recommendation in §3 is original synthesis extrapolated from
  Soul Knight's dual on-button/in-world cooldown-ring pattern, not a directly observed precedent.

---
name: android-packaging-web-game
description: Comparison of Capacitor, TWA/Bubblewrap, Cordova, and Tauri v2 mobile for shipping a three.js/TS/Vite web game to Google Play with AdMob + Play Billing + haptics (researched 2026-09-14)
metadata:
  type: project
---

Researched 2026-09-14 for DiggerV2 (three.js + TypeScript + Vite 2D-logic/3D-render arcade
game) on whether/how to ship to Google Play as an Android app with AdMob ads + Play Billing
cosmetic IAP + haptics + fullscreen/orientation lock.

**Recommendation: Capacitor (Ionic).** Runner-up: Tauri v2 mobile (watch, not yet default choice
for a solo JS dev in 2026 due to Rust glue-code requirement for native plugins). Avoid TWA/Bubblewrap
for this use case, and avoid Cordova for new projects.

Key non-obvious facts (why the ranking, so future-me doesn't have to re-derive):

- **TWA (Trusted Web Activity / Bubblewrap) cannot show AdMob ads at all.** TWA renders the page
  fullscreen under Chrome's control; there's no way to overlay a native `AdView` alongside it, and
  it's an open, unresolved feature request (google-chrome/android-browser-helper#535 on GitHub, still
  open as of 2025). This alone rules out TWA for an AdMob-monetized game.
- TWA IAP requires the **Digital Goods API + Payment Request API**, a narrower/newer web API
  surface than the native Play Billing library — works for simple non-consumable/consumable goods
  but is less battle-tested and has smaller community support than native billing wrappers used by
  Capacitor/Cordova/Tauri plugins.
- Google Play's **Minimum Functionality / Spam policy (4.3-style)** increasingly rejects apps that
  are "just a website in a WebView" with no native integration. A packaged three.js game with real
  interactivity + haptics + ads + IAP clears this easily regardless of wrapper chosen, but a naive
  TWA with zero native touches is the riskiest of the four to get flagged.
- **Cordova** is still alive (Cordova Android 14 shipped March 2025, ~100 committers) but is
  explicitly described by its own community as no longer a default choice — "specialized
  maintenance/migration/enterprise skill" in 2025/2026 (cordova.apache.org meetup post, Jan 2025).
  Its flagship AdMob plugin (`cordova-plugin-admob-free`) is in maintenance mode; users are pointed
  to `admob-plus-cordova` instead. Capacitor is the de-facto successor and can consume most Cordova
  plugins if needed.
- **Capacitor** has first-party or well-maintained community plugins for everything this class of
  game needs: `@capacitor/haptics` (official, active, v8.x in 2025), `@capacitor/screen-orientation`
  (official) or Capawesome's version, `@boengli/capacitor-fullscreen` for immersive mode,
  `@capacitor-community/admob` / Capawesome's AdMob plugin (built on Google's Next-Gen Mobile Ads
  SDK) for ads, and `@revenuecat/purchases-capacitor` (now an officially RevenueCat-owned package)
  wrapping native Google Play Billing for IAP. Capacitor treats the generated Android Studio project
  as source of truth, so a solo dev can drop into native Android/Gradle only when a plugin gap
  appears — lower total risk than either TWA (no native escape hatch story for ads) or Tauri (native
  escape hatch is Rust, not Kotlin/Java, adding a second unfamiliar language for a JS-only dev).
- WebGL/three.js runs fine inside Capacitor's WebView (it's just system WebView under the hood, same
  engine as Chrome for Android on API 24+); reported performance issues in the community are about
  general WebView variance across OEMs, not about Capacitor imposing overhead — the wrapper itself
  doesn't degrade the GPU rendering path.
- **Tauri v2 mobile** (stable since Oct 2024, iOS/Android parity added as tauri v2's headline
  feature) does have AdMob and Play Billing plugins now (e.g. `tauri-plugin-google-admob`,
  `tauri-plugin-iap`, `tauri-plugin-purchases`), but they are much younger/thinner community
  packages than Capacitor's, and Tauri's whole selling point (Rust core, smaller binaries) is not
  a good fit for a solo dev with strong JS/TS but no Rust background — every custom native touchpoint
  costs Rust FFI work. Worth re-evaluating in a year or two once its mobile plugin ecosystem matures.

Sources checked: GitHub issues on android-browser-helper, capacitorjs.com/docs/guides/games,
capacitorjs.com/docs/apis/haptics, RevenueCat purchases-capacitor docs, Chrome for Developers TWA/
Play Billing docs, Apache Cordova announcements blog (Jan 2025), Tauri v2 blog/release notes,
tauri-plugin-google-admob and tauri-plugin-iap GitHub repos.

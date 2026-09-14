---
id: 1
title: Android packaging route
labels: [wayfinder:research]
status: closed
assignee: claude (research agent)
blocked-by: []
---

## Question

Which technology packages the three.js/TypeScript/Vite web game as a Google Play Android app — Capacitor, TWA/Bubblewrap, Cordova, or Tauri v2 mobile? Must eventually support AdMob ads, Play Billing IAP (post-v1), haptics, fullscreen/orientation lock, and impose no WebGL performance penalty. Optimize for a solo dev with strong JS and no native Android experience.

## Resolution

**Capacitor (Ionic).** Deciding reasons from the research:

1. Only option with actively maintained plugins across every requirement: official `@capacitor/haptics` and `@capacitor/screen-orientation`, mature `@capacitor-community/admob`, and RevenueCat's official `@revenuecat/purchases-capacitor` for Play Billing.
2. **TWA/Bubblewrap is disqualified**: there is no supported way to show AdMob ads inside a TWA (open unresolved issue against `android-browser-helper` #535) — a hard blocker for the game's monetization plan.
3. Cordova is in community-acknowledged wind-down for new projects; its AdMob plugin is maintenance-only.
4. Tauri v2 mobile is credible but young, and its native escape hatch is Rust — a poor match for a JS dev; runner-up to revisit in a year or two.
5. WebGL performance is equivalent across Capacitor/Cordova/Tauri (all use the system WebView); no wrapper overhead, though OEM WebView variance exists.
6. Policy: a real game with native plugin integrations easily clears Google Play's Minimum Functionality/Spam policy; thin TWA wrappers are the most exposed to it.

Full findings report with sources: `.claude/agent-memory/researcher/android_packaging_web_game.md`.

Caveats for later (out of v1 scope): Capawesome's newer AdMob plugin is paywalled ("Insiders") — feature-compare vs the free `@capacitor-community/admob` before monetizing; verify current AdMob policy on rewarded-ads-for-cosmetics when monetization returns to scope.

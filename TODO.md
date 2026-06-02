# Blueprint Extra MCP — TODO

## Session Handoff (2026-06-02 session 8)

### Current State
- **Branch**: `main` — merged up to PR #39
- **gh auth**: `grobomo` (correct for this repo)
- **Working tree**: clean
- **Total PRs**: 39 merged
- **All specs complete**: 001-015
- **Chrome extension**: loaded successfully in user's Chrome
- **mcp-manager**: blueprint-extra running (31 tools, PID active)

### Hackathon Goal: V1 Activity Tracker

**Mission:** Instrument V1 console to track real user behavior. Blueprint Chrome extension has DOM access. Activity tracker captures clicks, hovers, scroll, dwell, navigation. Reports show which features get used, where users get stuck.

**Endgame:** Merge with v1-helper Chrome extension = one extension for passive monitoring + active automation.

### What's Next (prioritized by impact)
- [x] T006: Fix mcp-manager startup timeout — RESOLVED (2026-06-02). Not reproducible. Original failure was transient.
- [x] T007: Fix activity tracker cross-navigation event loss — PR #37 merged. stop() now collects from console messages (survives navigations) + page + iframes with dedup.
- [x] T008: Upgrade MCP SDK — PR #38 merged. SDK 1.0.4 → 1.29.0. Protocol now `2025-11-25` (matches mcp-manager). 108 unit tests pass.
- [ ] T009: Live test on V1 — BLOCKED: Trend Micro Toolbar Enterprise extension intercepts V1 sign-in page with chrome-extension:// frames, preventing Blueprint CDP attachment. User must sign in manually first, then Blueprint can operate on the authenticated V1 dashboard. Activity tracker validated on Wikipedia (hovers, dwell, report generation all work).
- [x] T010: Clean up git state — PR #39 merged. Removed spurious root deps, regenerated lock files.
- [ ] T011: Merge v1-helper CVE overlays into Blueprint extension — Add V1 overlay content script (separate file, runs on *.trendmicro.com only), V1 section in popup (analysis import, CVE list, overlay toggle, settings), background storage init for v1h_ keys.

### Cross-Project TODOs (filed in mcp-manager)
- **idle_timeout bug**: `config.idle_timeout || DEFAULT` should be `config.idle_timeout ?? DEFAULT` (0 means no timeout but gets treated as 1hr)
- **Add no_auto_stop tag** for blueprint-extra as workaround until bug is fixed
- [x] T001: Fix extension loading (PRs #31)
- [x] T002: Fix _locales (PRs #32-33)
- [x] T003: Extension distribution — packaging script + test (PR #34)
- [x] T004: Post-merge verification — 119 tests, no regressions (PR #35)
- [x] T005: Code quality — scrollPct fix + assertion (PR #36)

### Architecture
```
extensions/                     <- Chrome extension (loaded in chrome://extensions)
  manifest.json                 <- MV3 manifest (v1.9.21)
  chrome/src/                   <- Background + content scripts
  shared/                       <- Shared modules (adapters, handlers, popup, utils)
  icons/                        <- State-aware icons (attached, connected, etc.)

server/src/
  activityTracker.js            <- Injected JS: click, hover, scroll, dwell, nav tracking
  activityReporter.js           <- Aggregates events → summary JSON + HTML dashboard
  v1Enrichment.js               <- V1 route→name, iframe→module mappings
  statefulBackend.js            <- browser_activity tool (start/stop/report/status)
  unifiedBackend.js             <- All 30+ browser_* tool handlers

scripts/
  package-extension.js          <- Build + ZIP packaging (--bump patch|minor|major)
  test/test-package-extension.sh <- E2E packaging validation
  test/test-extension-load.sh   <- Chrome manifest + file validation
```

## Done
- [x] Spec 014: Code quality pass 3 (PR #36)
- [x] Spec 013: Post-merge verification (PR #35)
- [x] Spec 012: Extension distribution (PR #34)
- [x] Spec 011: Integration tests (PR #31) — 43 tests
- [x] Spec 010: V1 Activity Tracker (PRs #27-30)
- [x] Spec 009: Code review round 2 (PR #25)
- [x] PR #26: Code hash + gotcha rule
- [x] Spec 008: Housekeeping (PRs #19-21)
- [x] Spec 007: Publish docs (PRs #14-18)
- [x] Spec 005: Update .gitignore (PRs #12-13)
- [x] Spec 004: Code review & security fixes (PRs #8-11)
- [x] Spec 003: Improve setup & docs (PRs #4-7)
- [x] Spec 002: RONE portal workflows (PR #2)
- [x] Spec 001: Secret scan CI and Windows setup (PR #3)

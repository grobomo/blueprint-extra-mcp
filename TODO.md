# Blueprint Extra MCP — TODO

## Session Handoff (2026-04-14 session 5)

### Current State
- **Branch**: `main` — merged up to PR #33
- **gh auth**: `grobomo` (correct for this repo)
- **Working tree**: clean (`.workflow-state.json` untracked, harmless)
- **Total PRs**: 33 merged
- **All specs complete**: 001-011

### What Was Done This Session (session 5)
- **Spec 011: Integration Tests** (PR #31) — 43 new tests across 4 suites
- **T001**: Fixed extension loading — archived duplicate `chrome/manifest.json` (PR #31)
- **T002**: Fixed _locales error — removed `default_locale` (PR #32), removed placeholder file from git + gitignored (PR #33), added `scripts/test/test-extension-load.sh` which validates via Chrome `--pack-extension` (creates real CRX)
- **Key discovery**: MCP SDK uses newline-delimited JSON (not Content-Length framing)

### Hackathon Goal: V1 Activity Tracker

**Mission:** Instrument V1 console to track real user behavior. Blueprint Chrome extension has DOM access. Activity tracker captures clicks, hovers, scroll, dwell, navigation. Reports show which features get used, where users get stuck.

**Endgame:** Merge with v1-helper Chrome extension = one extension for passive monitoring + active automation.

### What's Next (prioritized by impact)
- [x] T001: Fix extension loading — broken _locales symlink (old path) + duplicate manifest.json in chrome/ subfolder. Fixed: junction created, chrome/manifest.json archived.
- [ ] **Live test on V1** — Need mcp-manager reconnected (`/mcp` → mcp-manager → Reconnect). Then: `enable` → `browser_activity action='start'` → navigate V1 pages → `browser_activity action='stop'` → `browser_activity action='report' output_path='reports/v1-test.html'`. Verify real-world data quality.
- [ ] **Merge with v1-helper** — Rebrand and combine: activity monitoring (passive) + automation recipes (active) = one v1-helper extension
- [x] T002: Fix _locales — removed default_locale, removed placeholder from git, added gitignore + validation script (PRs #32-33)
- [ ] T003: Extension distribution — build script that creates versioned ZIP in `releases/`, validates with Chrome, includes version bump
- [x] Integration tests — spec 011, 43 tests, PR #31

### Architecture (new files this session)
```
server/src/
  activityTracker.js    <- Injected JS: click, hover, scroll, dwell, nav tracking
  activityReporter.js   <- Aggregates events → summary JSON + HTML dashboard
  v1Enrichment.js       <- V1 route→name, iframe→module mappings
  statefulBackend.js    <- browser_activity tool (start/stop/report/status)
  clickRecorder.js      <- Still used by browser_workflows action='record' (separate purpose)
```

## Done
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

# Blueprint Extra MCP — TODO

## Session Handoff (2026-04-14 session 5)

### Current State
- **Branch**: `main` — merged up to PR #32
- **gh auth**: `grobomo` (correct for this repo)
- **Working tree**: clean (`.workflow-state.json` untracked, harmless)
- **Total PRs**: 32 merged
- **All specs complete**: 001-011

### What Was Done This Session (session 5)
- T001 (done): Fixed extension loading — broken `_locales` symlink (old repo path). Archived `chrome/manifest.json` (upstream duplicate). PR #31.
- **Spec 011: Integration Tests** (PR #31) — 43 new tests:
  - `mcpProcess.test.js` (8) — spawn real MCP server, JSON-RPC over stdio (newline-delimited JSON, NOT Content-Length framing)
  - `activityTracker.test.js` (8) — mock transport, start/stop lifecycle, event collection
  - `activityReporter.test.js` (12) — summarize aggregation, HTML generation, XSS safety
  - `v1Enrichment.test.js` (15) — page name resolution, iframe mapping, event enrichment
  - Shell runner: `bash scripts/test/test-integration.sh`
- **T002: Removed `default_locale` from manifest** (PR #32) — root manifest has no `__MSG_*__` tokens, so `_locales` dir is unnecessary. Eliminates the recurring Windows junction breakage on branch switches.
- **Key discovery**: MCP SDK uses newline-delimited JSON (not Content-Length framing). Important for any future stdio integration tests.

### Hackathon Goal: V1 Activity Tracker

**Mission:** Instrument V1 console to track real user behavior. Blueprint Chrome extension has DOM access. Activity tracker captures clicks, hovers, scroll, dwell, navigation. Reports show which features get used, where users get stuck.

**Endgame:** Merge with v1-helper Chrome extension = one extension for passive monitoring + active automation.

### What's Next (prioritized by impact)
- [x] T001: Fix extension loading — broken _locales symlink (old path) + duplicate manifest.json in chrome/ subfolder. Fixed: junction created, chrome/manifest.json archived.
- [ ] **Live test on V1** — Need mcp-manager reconnected (`/mcp` → mcp-manager → Reconnect). Then: `enable` → `browser_activity action='start'` → navigate V1 pages → `browser_activity action='stop'` → `browser_activity action='report' output_path='reports/v1-test.html'`. Verify real-world data quality.
- [ ] **Merge with v1-helper** — Rebrand and combine: activity monitoring (passive) + automation recipes (active) = one v1-helper extension
- [x] T002: Fix _locales junction issue — removed `default_locale` from manifest (no __MSG_ tokens used), so Chrome no longer needs _locales at root.
- [ ] Extension distribution — build CRX/ZIP in `releases/`
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

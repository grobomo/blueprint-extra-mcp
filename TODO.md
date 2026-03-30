# Blueprint Extra MCP — TODO

## Session Handoff (2026-03-30 session 4, final)

### Current State
- **Branch**: `main` — in sync with origin/main (ad55989)
- **gh auth**: `grobomo` (correct for this repo)
- **Working tree**: clean
- **All remote branches clean**: only main remains
- **Total PRs**: 30 merged
- **All specs complete**: 001-010
- **.mcp.json**: created and gitignored (mcp-manager entry for live testing)

### What Was Done This Session (session 4)
- **Spec 010: V1 Activity Tracker** (PRs #27-29)
  - `server/src/activityTracker.js` — full activity instrumentation (clicks, hovers >500ms, scroll depth, page dwell, navigation paths)
  - `server/src/activityReporter.js` — aggregates events → JSON summary + standalone HTML dashboard (dark theme)
  - `server/src/v1Enrichment.js` — maps 45+ V1 hash routes → page names, 13 iframe containers → module names
  - `browser_activity` MCP tool — start/stop/report/status, wired into statefulBackend.js
  - 71 tests across 3 test scripts, all passing
- **PR #30**: XSS fix in HTML report JSON embed (`</script>` escape)
- Updated CLAUDE.md with hackathon mission + endgame (v1-helper merge)
- Added `.mcp.json` (gitignored) for live testing with mcp-manager
- Deleted 4 stale remote branches

### Hackathon Goal: V1 Activity Tracker

**Mission:** Instrument V1 console to track real user behavior. Blueprint Chrome extension has DOM access. Activity tracker captures clicks, hovers, scroll, dwell, navigation. Reports show which features get used, where users get stuck.

**Endgame:** Merge with v1-helper Chrome extension = one extension for passive monitoring + active automation.

### What's Next (prioritized by impact)
- [ ] **Live test on V1** — Need mcp-manager reconnected (`/mcp` → mcp-manager → Reconnect). Then: `enable` → `browser_activity action='start'` → navigate V1 pages → `browser_activity action='stop'` → `browser_activity action='report' output_path='reports/v1-test.html'`. Verify real-world data quality.
- [ ] **Merge with v1-helper** — Rebrand and combine: activity monitoring (passive) + automation recipes (active) = one v1-helper extension
- [ ] Extension distribution — build CRX/ZIP in `releases/`
- [ ] Integration tests — real MCP server + mock extension test pipeline

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

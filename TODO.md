# Blueprint Extra MCP — TODO

## Session Handoff (2026-03-30 session 4)

### Current State
- **Branch**: `main` — in sync with origin/main
- **gh auth**: `grobomo` (correct for this repo)
- **Working tree**: clean
- **Total PRs**: 29 merged
- **All specs complete**: 001-010

### What Was Done This Session (session 4)
- **Spec 010: V1 Activity Tracker** (PRs #27-29)
  - `server/src/activityTracker.js` — full user activity instrumentation (clicks, hovers >500ms, scroll depth, page dwell, navigation paths)
  - `server/src/activityReporter.js` — aggregates events into summaries + generates standalone HTML dashboard
  - `server/src/v1Enrichment.js` — maps 45+ V1 hash routes to page names, 13 iframe containers to module names
  - `browser_activity` MCP tool — start/stop/report/status, wired into statefulBackend.js
  - 71 tests across 3 test scripts, all passing
- Updated CLAUDE.md with hackathon mission: V1 activity tracking + v1-helper merge endgame

### Hackathon Goal: V1 Activity Tracker

**Mission:** Instrument V1 console to track real user behavior. Blueprint Chrome extension has DOM access. Activity tracker captures clicks, hovers, scroll, dwell, navigation. Reports show which features get used, where users get stuck.

**Endgame:** Merge with v1-helper Chrome extension = one extension for passive monitoring + active automation.

### What's Next
- [ ] **Merge with v1-helper** — Rebrand and combine: activity monitoring (passive) + automation recipes (active) = one v1-helper extension
- [ ] **Live test on V1** — Open V1 console, start `browser_activity`, browse around, generate HTML report. Verify real-world data quality.
- [ ] Extension distribution — build CRX/ZIP in `releases/`
- [ ] Integration tests — real MCP server + mock extension test pipeline

## Done
- [x] Spec 010: V1 Activity Tracker (PRs #27-29)
- [x] Spec 009: Code review round 2 (PR #25)
- [x] PR #26: Code hash + gotcha rule
- [x] Spec 008: Housekeeping (PRs #19-21)
- [x] Spec 007: Publish docs (PRs #14-18)
- [x] Spec 005: Update .gitignore (PRs #12-13)
- [x] Spec 004: Code review & security fixes (PRs #8-11)
- [x] Spec 003: Improve setup & docs (PRs #4-7)
- [x] Spec 002: RONE portal workflows (PR #2)
- [x] Spec 001: Secret scan CI and Windows setup (PR #3)

# Blueprint Extra MCP — TODO

## Session Handoff (2026-03-30 session 3, final)

### Current State
- **Branch**: `main` — in sync with origin/main (9f7c82c)
- **gh auth**: `grobomo` (correct for this repo)
- **Working tree**: clean
- **All remote branches clean**: only main remains
- **Total PRs**: 26 merged
- **All specs complete**: 001-009 + housekeeping

### What Was Done This Session (session 3)
- **Spec 009**: Code review round 2 (PR #25)
  - Extract shared debugLog to server/src/debugLog.js (9 copies → 1 factory import)
  - Fix command injection in oauth.js _openBrowser (exec → execFile + URL protocol validation)
  - Add path.resolve() before writeFileSync in screenshot + PDF save handlers
  - Move require('fs') to top-level imports in unifiedBackend.js
  - Delete 8 stale remote branches
- **PR #26**: Update code hash, add squash-merge gotcha rule
- **Discovered & documented**: Squash merge + feature branch workflow creates empty PRs (see .claude/rules/squash-merge-gotcha.md)

### What's Next — Hackathon Goal: V1 Activity Tracker

The mission is V1 console user activity analysis. Blueprint's Chrome extension has DOM access. Expand the clickRecorder into a full activity tracker, then merge with v1-helper extension.

- [ ] **Spec 010: V1 Activity Tracker** — Expand `clickRecorder.js` to track page dwell time, hover patterns, scroll depth, navigation paths. Aggregate into behavioral analytics reports.
- [ ] **Merge with v1-helper** — Rebrand and combine: activity monitoring (passive) + automation recipes (active) = one v1-helper extension.

### Lower Priority (after hackathon goal)
- [ ] Extension distribution — build CRX/ZIP in `releases/`
- [ ] Integration tests — real MCP server + mock extension test pipeline
- [ ] Expand V1 page recipes — more console pages in `rules/examples/v1-page-recipes.md`

## Done
- [x] Spec 009: Code review round 2 (PR #25)
- [x] PR #26: Code hash + gotcha rule
- [x] Spec 008: Housekeeping (PRs #19-21)
- [x] Spec 007: Publish docs (PRs #14-18)
- [x] Spec 005: Update .gitignore (PRs #12-13)
- [x] Spec 004: Code review & security fixes (PRs #8-11)
- [x] Spec 003: Improve setup & docs (PRs #4-7)
- [x] Spec 002: RONE portal workflows (PR #2)
- [x] Spec 001: Secret scan CI and Windows setup (PR #3)

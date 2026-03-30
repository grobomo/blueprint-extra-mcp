# Blueprint Extra MCP — TODO

## Session Handoff (2026-03-30 session 3)

### Plan: Spec 009 — Code Review & Cleanup

Remaining backlog from session 2 + new findings from code review scan:

- [ ] T001: Extract shared `debugLog` to `server/src/debugLog.js` (9 copies → 1 import)
- [ ] T002: Fix command injection in `oauth.js:_openBrowser` — use URL validation
- [ ] T003: Add path validation to `writeFileSync` in screenshot + PDF save handlers
- [ ] T004: Move `require('fs')` to top-level in `unifiedBackend.js`
- [ ] T005: Delete stale remote branches (008-fix-housekeeping, 008-T001-cleanup, 008-T002-merge-main, 008-T003-merge)
- [ ] T006: Merge spec 009 feature branch to main

### Resolved (no code change needed)
- [x] Service worker error from chrome/ folder — expected, documented in CLAUDE.md
- [x] chrome/_locales decision — generated via setup script, already in .gitignore

## Done
- [x] Spec 008: Housekeeping (PRs #19-21)
- [x] Spec 007: Publish docs (PRs #14-18)
- [x] Fix 2 unpushed commits on main (rebased)
- [x] Fix extensions/_locales junction + remove git placeholder
- [x] Spec 005: Update .gitignore (PRs #12-13)
- [x] Spec 004: Code review & security fixes (PRs #8-11)
- [x] Spec 003: Improve setup & docs (PRs #4-7)
- [x] Spec 002: RONE portal workflows (PR #2)
- [x] Spec 001: Secret scan CI and Windows setup (PR #3)
- [x] Fix Chrome extension `_locales` symlink -> Windows junction

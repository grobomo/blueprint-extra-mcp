# Blueprint Extra MCP — TODO

## Session Handoff (2026-03-30 session 3, final)

### Current State
- **Branch**: `main` — in sync with origin/main (4ea8921)
- **gh auth**: `grobomo` (correct for this repo)
- **Working tree**: clean except TODO.md + .claude/rules/ (unstaged)
- **All remote branches clean**: only main remains
- **Total PRs**: 25 merged (PRs #22-24 were empty squash merges due to feature branch bug — #25 landed the code)

### Gotchas Discovered This Session
- **Squash merge + feature branch = empty PRs**: See `.claude/rules/squash-merge-gotcha.md`

## Done
- [x] Spec 009: Code review round 2 (PR #25)
  - Extract shared debugLog (9 copies → 1 import in server/src/debugLog.js)
  - Fix command injection in oauth.js _openBrowser (exec → execFile + URL validation)
  - Add path.resolve to writeFileSync in screenshot + PDF save
  - Move require('fs') to top-level in unifiedBackend.js
  - Delete 8 stale remote branches (008-*, 009-*)
- [x] Spec 008: Housekeeping (PRs #19-21)
- [x] Spec 007: Publish docs (PRs #14-18)
- [x] Spec 005: Update .gitignore (PRs #12-13)
- [x] Spec 004: Code review & security fixes (PRs #8-11)
- [x] Spec 003: Improve setup & docs (PRs #4-7)
- [x] Spec 002: RONE portal workflows (PR #2)
- [x] Spec 001: Secret scan CI and Windows setup (PR #3)

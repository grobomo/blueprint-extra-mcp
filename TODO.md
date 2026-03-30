# Blueprint Extra MCP — TODO

## Session Handoff (2026-03-30 session 3)

### Current State
- **Branch**: `009-T005-cleanup-branches` — PR to main pending
- **All tests pass**: test-code-review-2.sh (8/8), test-oauth-security.sh (9/9)
- **Total PRs**: 23 merged (PRs #22-23 were empty due to squash merge bug — see gotcha below)

### Gotchas Discovered
- **Squash merge + feature branch workflow breaks with git pull**: When squash-merging task PRs into a feature branch, then `git pull` on the feature branch, the merge resolution discards local changes because the squash commit and local commit are divergent. Fix: PR directly to main for single-task specs, or never pull on the feature branch (use `git reset --hard origin/feature` instead).

## Done
- [x] Spec 009: Code review round 2 (T001-T006)
  - Extract shared debugLog (9 copies → 1 import)
  - Fix command injection in oauth.js _openBrowser (exec → execFile + URL validation)
  - Add path.resolve to writeFileSync in screenshot + PDF save
  - Move require('fs') to top-level in unifiedBackend.js
  - Delete 7 stale remote branches
- [x] Spec 008: Housekeeping (PRs #19-21)
- [x] Spec 007: Publish docs (PRs #14-18)
- [x] Spec 005: Update .gitignore (PRs #12-13)
- [x] Spec 004: Code review & security fixes (PRs #8-11)
- [x] Spec 003: Improve setup & docs (PRs #4-7)
- [x] Spec 002: RONE portal workflows (PR #2)
- [x] Spec 001: Secret scan CI and Windows setup (PR #3)

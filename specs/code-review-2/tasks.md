# 009 — Code Review Round 2

## Phase 1: DRY and Security Fixes

**Checkpoint**: `bash scripts/test/test-code-review-2.sh` exits 0

- [x] T001 Extract shared `debugLog` to `server/src/debugLog.js` — replace 9 copies with 1 import
- [x] T002 Fix command injection in `oauth.js:_openBrowser` — validate URL before passing to exec
- [x] T003 Add path validation to `writeFileSync` in screenshot + PDF save (prevent path traversal)
- [x] T004 Move inline `require('fs')` to top-level imports in `unifiedBackend.js`

## Phase 2: Cleanup and Merge

**Checkpoint**: `bash scripts/test/test-housekeeping.sh` exits 0

- [x] T005 Delete stale remote branches from spec 008 + 009
- [x] T006 Merge to main (PR directly, skip feature branch layer)

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

### What's Next (prioritized by impact)
1. **Analyze V1 activity** — Pull and analyze Vision One observed attack techniques, alerts, and endpoint activity. Generate actionable reports.
2. **Auto-fix patterns catalog** — Document the auto-improvements already in unifiedBackend.js (iframe search, JS-click fallback) as a pattern library. When new blockers arise, the catalog shows how to add auto-fixes.
3. **Extension distribution** — `releases/` is empty. Build the Chrome extension and put a CRX/ZIP there for easy sideloading without Chrome Web Store.
4. **Integration tests** — Current tests are static (grep-based). Add a real integration test that starts the MCP server, connects a mock extension, and exercises the tool pipeline.
5. **Expand V1 page recipes** — `rules/examples/v1-page-recipes.md`. Add recipes for more V1 console pages (endpoint inventory, XDR search, risk insights, email quarantine).

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

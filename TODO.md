# Blueprint Extra MCP — TODO

## Session Handoff (2026-03-30)

### What Was Done This Session
- PR #2: RONE portal workflow definitions → main
- PR #3: Spec 001 (secret-scan CI + Windows setup) → main
- PR #4-7: Spec 003 — improved setup-windows.bat (both junctions), .gitattributes, CLAUDE.md Windows docs
- PR #8: XSS fix in oauth.js (escapeHtml for callback error param), Windows `start` command fix
- PR #9: Removed 324 lines dead code from unifiedBackend.js (7 unused handlers)
- PR #10-11: Spec 004 complete → main
- Fixed main branch (had 4 unpushed commits, moved to feature branch, PRed properly)
- All PRs squash-merged, main is clean and synced

### Current State
- Branch: `main` — clean, up to date with origin
- gh auth: `grobomo` (correct for this repo)
- `extensions/_locales` is still a git symlink placeholder file (needs `setup-windows.bat` after every checkout)

### Remaining Backlog
- [ ] Publish project via publish-project skill (docs, marketplace)
- [ ] mcp-manager setup.js is broken (`Cannot find module '../../super-manager/shared/setup-utils'`) — this project has no .mcp.json, preventing Blueprint MCP connection testing
- [ ] Clean up stale branches (001-*, 002-*, 003-*, 004-* merged branches)

## Done
- [x] Spec 004: Code review & security fixes (PRs #8-11)
  - [x] XSS fix in oauth.js callback HTML
  - [x] Windows `start` command empty title arg fix
  - [x] Removed 324 lines dead code from unifiedBackend.js
- [x] Spec 003: Improve setup & docs (PRs #4-7)
  - [x] setup-windows.bat for both `_locales` and `chrome/_locales` junctions
  - [x] .gitattributes for line ending consistency
  - [x] CLAUDE.md Windows setup instructions
- [x] Spec 002: RONE portal workflows (PR #2)
- [x] Spec 001: Secret scan CI and Windows setup (PR #3)
- [x] Fix Chrome extension `_locales` symlink → Windows junction

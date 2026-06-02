# Spec 015: Clean Up Root package.json

## Goal
Remove spurious dependencies from root package.json that were introduced by a stash conflict during PR #38 merge. Update TODO.md session handoff.

## Issues
1. Root `package.json` has `dependencies` block with `@modelcontextprotocol/sdk`, `commander`, `sharp` — these belong only in `server/package.json`
2. Root `package-lock.json` is out of sync
3. `server/package.json` has harmless sharp bump 0.34.4→0.34.5 (keep)
4. TODO.md session handoff outdated (references session 5/7)

## Fix
1. Remove `dependencies` block from root `package.json`
2. Regenerate `package-lock.json`
3. Keep server sharp bump
4. Update TODO.md with session 8 handoff

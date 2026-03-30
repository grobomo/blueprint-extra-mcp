# 008 — Housekeeping

## Phase 1: Cleanup

**Checkpoint**: `bash scripts/test/test-housekeeping.sh` exits 0

- [x] T001 Delete stale remote branches and improve setup-windows.bat to clean up placeholder files
  **Checkpoint**: `bash scripts/test/test-housekeeping.sh` — no stale branches, no placeholder files in extensions/

## Phase 2: Merge

**Checkpoint**: `bash scripts/test/test-housekeeping.sh` exits 0

- [x] T002 Merge to main
  **Checkpoint**: `gh pr view --json state` shows MERGED

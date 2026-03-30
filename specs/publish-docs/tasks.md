# 007 — Add Publish Docs

## Phase 1: Documentation Layers

**Checkpoint**: `bash scripts/test/test-publish-docs.sh` exits 0

- [x] T001 Create explainer HTML (visual README)
  **Checkpoint**: `bash scripts/test/test-publish-docs.sh` — verifies HTML exists, has required panels, CSS matches standard
- [x] T002 Create docs/.code-hash for staleness tracking
  **Checkpoint**: `bash scripts/test/test-publish-docs.sh` — verifies .code-hash exists with valid YAML
- [x] T003 Clean up stale remote branches (17 deleted)
  **Checkpoint**: `bash scripts/test/test-publish-docs.sh` — verifies no stale merged branches remain

## Phase 2: Merge

**Checkpoint**: `bash scripts/test/test-publish-docs.sh` exits 0

- [ ] T004 Merge feature branch to main
  **Checkpoint**: `gh pr view --json state` shows MERGED

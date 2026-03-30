#!/usr/bin/env bash
# Test: .gitignore has all required entries
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "=== Test: .gitignore exists ==="
test -f .gitignore && echo "PASS" || { echo "FAIL"; exit 1; }

for entry in ".test-results/" "SESSION_STATE.md" "extensions/chrome/_locales/" "archive/" "node_modules/"; do
    echo "=== Test: .gitignore contains $entry ==="
    grep -qF "$entry" .gitignore && echo "PASS" || { echo "FAIL: missing $entry"; exit 1; }
done

echo ""
echo "ALL CHECKS PASSED"

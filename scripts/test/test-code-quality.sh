#!/usr/bin/env bash
# Test: unifiedBackend.js code quality — no dead code, valid syntax
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

UB="server/src/unifiedBackend.js"

echo "=== Test: syntax valid ==="
node -c "$UB" && echo "PASS" || { echo "FAIL: syntax error"; exit 1; }

echo "=== Test: no dead standalone handlers ==="
# These were removed — they were never called, duplicating _handleInteract logic
for fn in _handleClick _handleType _handlePressKey _handleHover _handleMouseClickXY _handleMouseMoveXY _handleWaitFor; do
    if grep -q "async $fn(" "$UB"; then
        echo "FAIL: dead method $fn still exists"
        exit 1
    fi
done
echo "PASS: no dead standalone handlers"

echo "=== Test: unit tests pass ==="
cd server && npx jest tests/unit/unifiedBackend.test.js --no-coverage --silent 2>&1 | tail -5
echo "PASS"

echo ""
echo "ALL CHECKS PASSED"

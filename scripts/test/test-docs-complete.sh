#!/usr/bin/env bash
# Test: CLAUDE.md has Windows setup instructions
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "=== Test: CLAUDE.md exists ==="
test -f CLAUDE.md && echo "PASS" || { echo "FAIL"; exit 1; }

echo "=== Test: mentions setup-windows.bat ==="
grep -q 'setup-windows.bat' CLAUDE.md && echo "PASS" || { echo "FAIL: no setup-windows.bat reference"; exit 1; }

echo "=== Test: explains junction vs symlink ==="
grep -q 'junction' CLAUDE.md && echo "PASS" || { echo "FAIL: no junction explanation"; exit 1; }

echo "=== Test: mentions assume-unchanged ==="
grep -q 'assume-unchanged' CLAUDE.md && echo "PASS" || { echo "FAIL: no assume-unchanged mention"; exit 1; }

echo "=== Test: has Linux/Mac setup ==="
grep -q 'Linux\|Mac' CLAUDE.md && echo "PASS" || { echo "FAIL: no Linux/Mac setup"; exit 1; }

echo ""
echo "ALL CHECKS PASSED"

#!/usr/bin/env bash
# Test: housekeeping tasks
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

PASS=0; FAIL=0
check() { echo "=== Test: $1 ==="; }
pass() { echo "PASS"; PASS=$((PASS+1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL+1)); }

check "no placeholder files in extensions/"
placeholders=$(find extensions/ -maxdepth 2 -name "*.git-placeholder" -o -name "*.bak" 2>/dev/null | head -5)
if [ -z "$placeholders" ]; then pass; else fail "found: $placeholders"; fi

check "setup-windows.bat cleans placeholder files"
if grep -q "git-placeholder" extensions/setup-windows.bat && grep -q "locales-git-placeholder" extensions/setup-windows.bat 2>/dev/null; then
  pass
else
  fail "setup-windows.bat should handle placeholder cleanup"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1

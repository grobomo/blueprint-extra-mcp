#!/usr/bin/env bash
# Test script for spec 009: Code Review Round 2
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

PASS=0
FAIL=0

run_test() {
  local name="$1"
  echo "=== Test: $name ==="
  if eval "$2"; then
    echo "PASS"
    PASS=$((PASS + 1))
  else
    echo "FAIL"
    FAIL=$((FAIL + 1))
  fi
}

# T001: debugLog extracted to shared module
run_test "debugLog.js exists" \
  "test -f server/src/debugLog.js"

run_test "debugLog.js exports a function" \
  "grep -q 'module.exports' server/src/debugLog.js"

run_test "at least 5 files import shared debugLog" \
  '[ $(grep -rl "require.*debugLog" server/src/*.js | wc -l) -ge 5 ]'

run_test "no file still defines its own debugLog" \
  '[ $(grep -rl "^function debugLog" server/src/*.js 2>/dev/null | wc -l) -eq 0 ]'

# T002: oauth.js _openBrowser uses safe URL handling
run_test "oauth.js does not use bare exec for URL" \
  "! grep -q 'exec(command' server/src/oauth.js"

# T003: writeFileSync has path validation
run_test "unifiedBackend.js validates path before writeFileSync" \
  "grep -qE 'path.resolve|sanitizePath|validatePath' server/src/unifiedBackend.js"

# T004: no inline require('fs') in unifiedBackend.js
run_test "no inline require('fs') in handler functions" \
  "! grep -n \"require('fs')\" server/src/unifiedBackend.js | grep -q ':[0-9][0-9][0-9][0-9]*:'"

# Syntax check all JS files
run_test "all server JS files pass syntax check" \
  'for f in server/src/*.js; do node -c "$f" 2>&1 || exit 1; done'

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]

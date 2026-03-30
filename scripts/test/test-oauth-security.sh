#!/usr/bin/env bash
# Test: oauth.js has no XSS vulnerabilities and correct Windows command
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

OAUTH="server/src/oauth.js"

echo "=== Test: oauth.js exists ==="
test -f "$OAUTH" && echo "PASS" || { echo "FAIL"; exit 1; }

echo "=== Test: oauth.js syntax valid ==="
node -c "$OAUTH" && echo "PASS" || { echo "FAIL: syntax error"; exit 1; }

echo "=== Test: escapeHtml function exists ==="
grep -q 'function escapeHtml' "$OAUTH" && echo "PASS" || { echo "FAIL: no escapeHtml function"; exit 1; }

echo "=== Test: error output uses escapeHtml ==="
grep -q 'escapeHtml(error)' "$OAUTH" && echo "PASS" || { echo "FAIL: error not escaped"; exit 1; }

echo "=== Test: no raw \${error} in HTML ==="
if grep -E '\$\{error\}' "$OAUTH" | grep -v 'escapeHtml' | grep -q 'Error:'; then
    echo "FAIL: raw \${error} found in HTML output"
    exit 1
else
    echo "PASS"
fi

echo "=== Test: Windows start command has empty title ==="
grep -q 'start "" "' "$OAUTH" && echo "PASS" || { echo "FAIL: Windows start missing empty title arg"; exit 1; }

echo "=== Test: no hardcoded secrets ==="
if grep -inE '(api[_-]?key|password|secret)\s*[:=]\s*["\x27][^"\x27]+' "$OAUTH" 2>/dev/null; then
    echo "FAIL: possible hardcoded secret"
    exit 1
else
    echo "PASS"
fi

echo ""
echo "ALL CHECKS PASSED"

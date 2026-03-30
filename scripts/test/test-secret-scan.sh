#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FAIL=0

echo "=== Test: secret-scan.yml exists ==="
if [ ! -f "$REPO_ROOT/.github/workflows/secret-scan.yml" ]; then
  echo "FAIL: .github/workflows/secret-scan.yml not found"
  FAIL=1
else
  echo "PASS"
fi

echo "=== Test: setup-windows.bat exists ==="
if [ ! -f "$REPO_ROOT/extensions/setup-windows.bat" ]; then
  echo "FAIL: extensions/setup-windows.bat not found"
  FAIL=1
else
  echo "PASS"
fi

echo "=== Test: no secrets in tracked files ==="
cd "$REPO_ROOT"

# AWS keys
if grep -rn -E 'AKIA[0-9A-Z]{16}' --include='*.js' --include='*.json' --include='*.yml' --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null; then
  echo "FAIL: AWS key pattern found"
  FAIL=1
else
  echo "PASS: no AWS keys"
fi

# Private keys
if grep -rn -l 'BEGIN.*PRIVATE KEY' --exclude-dir=node_modules --exclude-dir=.git --exclude='secret-scan.yml' --exclude='test-secret-scan.sh' . 2>/dev/null; then
  echo "FAIL: Private key found"
  FAIL=1
else
  echo "PASS: no private keys"
fi

# JWT tokens
if grep -rn -E 'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}' --exclude-dir=node_modules --exclude-dir=.git --exclude='secret-scan.yml' . 2>/dev/null; then
  echo "FAIL: JWT token found"
  FAIL=1
else
  echo "PASS: no JWT tokens"
fi

echo ""
if [ "$FAIL" -eq 1 ]; then
  echo "FAILED: some checks did not pass"
  exit 1
fi
echo "ALL CHECKS PASSED"

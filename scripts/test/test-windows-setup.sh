#!/usr/bin/env bash
# Test: setup-windows.bat handles both junction locations
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "=== Test: setup-windows.bat exists ==="
test -f extensions/setup-windows.bat && echo "PASS" || { echo "FAIL"; exit 1; }

echo "=== Test: bat handles extensions/_locales ==="
grep -q 'mklink /J "_locales"' extensions/setup-windows.bat && echo "PASS" || { echo "FAIL: missing _locales junction"; exit 1; }

echo "=== Test: bat handles chrome/_locales ==="
grep -q 'mklink /J "chrome\\_locales"' extensions/setup-windows.bat && echo "PASS" || { echo "FAIL: missing chrome/_locales junction"; exit 1; }

echo "=== Test: bat runs assume-unchanged for both ==="
grep -q 'assume-unchanged _locales' extensions/setup-windows.bat && echo "PASS" || { echo "FAIL: missing assume-unchanged for _locales"; exit 1; }
grep -q 'assume-unchanged chrome/_locales' extensions/setup-windows.bat && echo "PASS" || { echo "FAIL: missing assume-unchanged for chrome/_locales"; exit 1; }

echo "=== Test: shared/_locales has locale files ==="
test -d extensions/shared/_locales/en && echo "PASS" || { echo "FAIL: shared/_locales/en missing"; exit 1; }

echo ""
echo "ALL CHECKS PASSED"

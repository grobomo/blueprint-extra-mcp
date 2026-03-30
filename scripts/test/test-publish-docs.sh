#!/usr/bin/env bash
# Test: publish docs exist and meet standards
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

PASS=0; FAIL=0
check() { echo "=== Test: $1 ==="; }
pass() { echo "PASS"; PASS=$((PASS+1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL+1)); }

# --- Explainer HTML ---
check "explainer HTML exists"
if [ -f docs/blueprint-extra-explainer.html ]; then pass; else fail "docs/blueprint-extra-explainer.html missing"; fi

check "explainer has required panels"
if [ -f docs/blueprint-extra-explainer.html ]; then
  missing=""
  grep -q "The Problem" docs/blueprint-extra-explainer.html || missing="$missing PROBLEM"
  grep -q "How It Works" docs/blueprint-extra-explainer.html || missing="$missing HOW"
  grep -q "Key Files" docs/blueprint-extra-explainer.html || missing="$missing FILES"
  grep -q "Why Use It" docs/blueprint-extra-explainer.html || missing="$missing WHY"
  grep -q "Key Commands" docs/blueprint-extra-explainer.html || missing="$missing COMMANDS"
  if [ -z "$missing" ]; then pass; else fail "missing panels:$missing"; fi
else
  fail "file missing, skipped"
fi

check "explainer CSS matches dark theme standard"
if [ -f docs/blueprint-extra-explainer.html ]; then
  if grep -q "#0d1117" docs/blueprint-extra-explainer.html && grep -q "#161b22" docs/blueprint-extra-explainer.html; then
    pass
  else
    fail "missing standard dark theme colors"
  fi
else
  fail "file missing, skipped"
fi

check "explainer is self-contained (no external refs)"
if [ -f docs/blueprint-extra-explainer.html ]; then
  if grep -qE '(src="|href=")https?://' docs/blueprint-extra-explainer.html; then
    fail "has external resource references"
  else
    pass
  fi
else
  fail "file missing, skipped"
fi

# --- Code hash ---
check "docs/.code-hash exists"
if [ -f docs/.code-hash ]; then pass; else fail "docs/.code-hash missing (ok if T002 not done yet)"; fi

# --- Summary ---
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1

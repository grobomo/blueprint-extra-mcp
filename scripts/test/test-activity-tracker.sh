#!/usr/bin/env bash
# Test script for spec 010: Activity Tracker (Phase 1)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

PASS=0
FAIL=0

run_test() {
  local name="$1"
  local result="$2"
  echo "=== Test: $name ==="
  if [ "$result" = "PASS" ]; then
    echo "PASS"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $result"
    FAIL=$((FAIL + 1))
  fi
}

TRACKER="server/src/activityTracker.js"

# File exists
run_test "activityTracker.js exists" \
  "$([ -f "$TRACKER" ] && echo PASS || echo 'file not found')"

# Syntax valid
run_test "activityTracker.js syntax valid" \
  "$(node -c "$TRACKER" 2>&1 && echo PASS || echo 'syntax error')"

# Uses shared debugLog
run_test "uses shared debugLog" \
  "$(grep -q "require('./debugLog')" "$TRACKER" && echo PASS || echo 'missing debugLog import')"

# Has ActivityTracker class
run_test "exports ActivityTracker class" \
  "$(grep -q 'class ActivityTracker' "$TRACKER" && echo PASS || echo 'missing class')"

# Has start/stop methods
run_test "has start method" \
  "$(grep -q 'async start(transport)' "$TRACKER" && echo PASS || echo 'missing start')"
run_test "has stop method" \
  "$(grep -q 'async stop(transport)' "$TRACKER" && echo PASS || echo 'missing stop')"

# Click tracking
run_test "tracks clicks" \
  "$(grep -q "type: 'click'" "$TRACKER" && echo PASS || echo 'missing click tracking')"

# Keypress tracking
run_test "tracks keypresses" \
  "$(grep -q "type: 'keypress'" "$TRACKER" && echo PASS || echo 'missing keypress tracking')"

# Hover tracking with threshold
run_test "tracks hovers with 500ms threshold" \
  "$(grep -q "duration >= 500" "$TRACKER" && echo PASS || echo 'missing hover threshold')"
run_test "emits hover events" \
  "$(grep -q "type: 'hover'" "$TRACKER" && echo PASS || echo 'missing hover event type')"

# Scroll depth tracking
run_test "tracks scroll depth" \
  "$(grep -q "type: 'scroll_depth'" "$TRACKER" && echo PASS || echo 'missing scroll tracking')"
run_test "calculates scroll percentage" \
  "$(grep -q "scrollPct" "$TRACKER" && echo PASS || echo 'missing scrollPct')"

# Page dwell time
run_test "tracks page dwell time" \
  "$(grep -q "type: 'page_dwell'" "$TRACKER" && echo PASS || echo 'missing dwell tracking')"
run_test "uses visibilitychange for dwell" \
  "$(grep -q "visibilitychange" "$TRACKER" && echo PASS || echo 'missing visibilitychange')"

# Navigation path tracking
run_test "tracks navigation" \
  "$(grep -q "type: 'navigation'" "$TRACKER" && echo PASS || echo 'missing navigation tracking')"
run_test "tracks hashchange" \
  "$(grep -q "hashchange" "$TRACKER" && echo PASS || echo 'missing hashchange listener')"
run_test "records from/to URLs" \
  "$(grep -q "from: oldUrl" "$TRACKER" && echo PASS || echo 'missing from/to in navigation')"

# Summary generation
run_test "generates summary on stop" \
  "$(grep -q "_summarize" "$TRACKER" && echo PASS || echo 'missing summary')"
run_test "summary includes topPages" \
  "$(grep -q "topPages" "$TRACKER" && echo PASS || echo 'missing topPages')"
run_test "summary includes topClicked" \
  "$(grep -q "topClicked" "$TRACKER" && echo PASS || echo 'missing topClicked')"
run_test "summary includes topHovered" \
  "$(grep -q "topHovered" "$TRACKER" && echo PASS || echo 'missing topHovered')"
run_test "summary includes navFlow" \
  "$(grep -q "navFlow" "$TRACKER" && echo PASS || echo 'missing navFlow')"

# Uses __BP_ACTIVITY__ prefix (not __BP_RECORDER__)
run_test "uses __BP_ACTIVITY__ prefix" \
  "$(grep -q '__BP_ACTIVITY__' "$TRACKER" && echo PASS || echo 'wrong prefix')"

# Iframe injection
run_test "injects into iframes" \
  "$(grep -q '__bpActivity' "$TRACKER" && echo PASS || echo 'missing iframe injection')"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1

#!/usr/bin/env bash
# Test script for spec 010 Phase 2: Activity Reporter + MCP Tool
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

REPORTER="server/src/activityReporter.js"
BACKEND="server/src/statefulBackend.js"

# ---- activityReporter.js ----

run_test "activityReporter.js exists" \
  "$([ -f "$REPORTER" ] && echo PASS || echo 'file not found')"

run_test "activityReporter.js syntax valid" \
  "$(node -c "$REPORTER" 2>&1 && echo PASS || echo 'syntax error')"

run_test "exports ActivityReporter class" \
  "$(grep -q 'class ActivityReporter' "$REPORTER" && echo PASS || echo 'missing class')"

run_test "has summarize method" \
  "$(grep -q 'summarize()' "$REPORTER" && echo PASS || echo 'missing summarize')"

run_test "has generateHTML method" \
  "$(grep -q 'generateHTML' "$REPORTER" && echo PASS || echo 'missing generateHTML')"

run_test "summary includes topPages" \
  "$(grep -q 'topPages' "$REPORTER" && echo PASS || echo 'missing topPages')"

run_test "summary includes topClicked" \
  "$(grep -q 'topClicked' "$REPORTER" && echo PASS || echo 'missing topClicked')"

run_test "summary includes topHovered" \
  "$(grep -q 'topHovered' "$REPORTER" && echo PASS || echo 'missing topHovered')"

run_test "summary includes navFlow" \
  "$(grep -q 'navFlow' "$REPORTER" && echo PASS || echo 'missing navFlow')"

run_test "summary includes session duration" \
  "$(grep -q 'durationMs' "$REPORTER" && echo PASS || echo 'missing session duration')"

run_test "HTML has stat cards" \
  "$(grep -q 'stat-card' "$REPORTER" && echo PASS || echo 'missing stat cards in HTML')"

run_test "HTML has navigation flow section" \
  "$(grep -q 'Navigation Flow' "$REPORTER" && echo PASS || echo 'missing nav flow in HTML')"

run_test "HTML escapes output" \
  "$(grep -q '_escapeHTML' "$REPORTER" && echo PASS || echo 'missing HTML escaping')"

run_test "uses shared debugLog" \
  "$(grep -q "require('./debugLog')" "$REPORTER" && echo PASS || echo 'missing debugLog')"

# ---- Test actual summary generation with mock data ----
run_test "summarize produces valid JSON" \
  "$(node -e "
    const { ActivityReporter } = require('./$REPORTER');
    const r = new ActivityReporter([
      {type:'click', timestamp:'2026-01-01T00:00:00Z', element:{tag:'BUTTON', text:'Save'}, url:'http://test/#/page1'},
      {type:'hover', timestamp:'2026-01-01T00:00:01Z', durationMs:1200, element:{tag:'SPAN', text:'Help'}, url:'http://test/#/page1'},
      {type:'page_dwell', timestamp:'2026-01-01T00:00:00Z', dwellMs:5000, maxScrollPct:80, url:'http://test/#/page1'},
      {type:'navigation', timestamp:'2026-01-01T00:00:05Z', from:'http://test/#/page1', to:'http://test/#/page2'}
    ]);
    const s = r.summarize();
    if (s.counts.clicks !== 1) throw 'wrong click count';
    if (s.counts.hovers !== 1) throw 'wrong hover count';
    if (s.topPages.length !== 1) throw 'wrong topPages';
    if (s.navFlow.length !== 1) throw 'wrong navFlow';
    console.log('PASS');
  " 2>&1 || echo 'summary generation failed')"

# ---- Test HTML generation ----
run_test "generateHTML returns valid HTML" \
  "$(node -e "
    const { ActivityReporter } = require('./$REPORTER');
    const r = new ActivityReporter([
      {type:'click', timestamp:'2026-01-01T00:00:00Z', element:{tag:'BUTTON', text:'Save'}, url:'http://test/'}
    ]);
    const html = r.generateHTML();
    if (!html.includes('<!DOCTYPE html>')) throw 'not valid HTML';
    if (!html.includes('Activity Report')) throw 'missing title';
    if (!html.includes('__activityData')) throw 'missing raw data embed';
    console.log('PASS');
  " 2>&1 || echo 'HTML generation failed')"

# ---- statefulBackend.js integration ----

run_test "statefulBackend.js syntax valid" \
  "$(node -c "$BACKEND" 2>&1 && echo PASS || echo 'syntax error')"

run_test "imports ActivityTracker" \
  "$(grep -q "require('./activityTracker')" "$BACKEND" && echo PASS || echo 'missing ActivityTracker import')"

run_test "imports ActivityReporter" \
  "$(grep -q "require('./activityReporter')" "$BACKEND" && echo PASS || echo 'missing ActivityReporter import')"

run_test "has browser_activity tool definition" \
  "$(grep -q "name: 'browser_activity'" "$BACKEND" && echo PASS || echo 'missing tool definition')"

run_test "has _handleActivity method" \
  "$(grep -q '_handleActivity' "$BACKEND" && echo PASS || echo 'missing handler')"

run_test "dispatches browser_activity in callTool" \
  "$(grep -q "case 'browser_activity'" "$BACKEND" && echo PASS || echo 'missing dispatch')"

run_test "tool supports start action" \
  "$(grep -q "case 'start'" "$BACKEND" && echo PASS || echo 'missing start action')"

run_test "tool supports stop action" \
  "$(grep -q "case 'stop'" "$BACKEND" && echo PASS || echo 'missing stop action')"

run_test "tool supports report action" \
  "$(grep -q "case 'report'" "$BACKEND" && echo PASS || echo 'missing report action')"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1

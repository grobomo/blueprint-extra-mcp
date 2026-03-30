#!/usr/bin/env bash
# Test script for spec 010 Phase 3: V1-Specific Enrichment
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

ENRICHMENT="server/src/v1Enrichment.js"
REPORTER="server/src/activityReporter.js"

# ---- v1Enrichment.js ----

run_test "v1Enrichment.js exists" \
  "$([ -f "$ENRICHMENT" ] && echo PASS || echo 'file not found')"

run_test "v1Enrichment.js syntax valid" \
  "$(node -c "$ENRICHMENT" 2>&1 && echo PASS || echo 'syntax error')"

run_test "exports resolvePageName" \
  "$(grep -q 'resolvePageName' "$ENRICHMENT" && echo PASS || echo 'missing export')"

run_test "exports resolveIframeName" \
  "$(grep -q 'resolveIframeName' "$ENRICHMENT" && echo PASS || echo 'missing export')"

run_test "exports enrichEvents" \
  "$(grep -q 'enrichEvents' "$ENRICHMENT" && echo PASS || echo 'missing export')"

run_test "has V1_PAGE_MAP" \
  "$(grep -q 'V1_PAGE_MAP' "$ENRICHMENT" && echo PASS || echo 'missing page map')"

run_test "has V1_IFRAME_MAP" \
  "$(grep -q 'V1_IFRAME_MAP' "$ENRICHMENT" && echo PASS || echo 'missing iframe map')"

# ---- Page name resolution ----

run_test "resolves #/app/sensor-policy" \
  "$(node -e "
    const { resolvePageName } = require('./$ENRICHMENT');
    const name = resolvePageName('https://portal.xdr.trendmicro.com/#/app/sensor-policy');
    if (name !== 'Endpoint Policies') throw 'got: ' + name;
    console.log('PASS');
  " 2>&1 || echo 'resolution failed')"

run_test "resolves #/app/xdr" \
  "$(node -e "
    const { resolvePageName } = require('./$ENRICHMENT');
    const name = resolvePageName('https://portal.xdr.trendmicro.com/#/app/xdr');
    if (name !== 'XDR Workbench') throw 'got: ' + name;
    console.log('PASS');
  " 2>&1 || echo 'resolution failed')"

run_test "resolves #/app/data-security-inventory" \
  "$(node -e "
    const { resolvePageName } = require('./$ENRICHMENT');
    const name = resolvePageName('https://portal.xdr.trendmicro.com/#/app/data-security-inventory');
    if (name !== 'Data Inventory') throw 'got: ' + name;
    console.log('PASS');
  " 2>&1 || echo 'resolution failed')"

run_test "falls back to title case for unknown routes" \
  "$(node -e "
    const { resolvePageName } = require('./$ENRICHMENT');
    const name = resolvePageName('https://portal.xdr.trendmicro.com/#/app/some-new-feature');
    if (name !== 'Some New Feature') throw 'got: ' + name;
    console.log('PASS');
  " 2>&1 || echo 'fallback failed')"

# ---- Iframe name resolution ----

run_test "resolves __VES_CONTAINER" \
  "$(node -e "
    const { resolveIframeName } = require('./$ENRICHMENT');
    const name = resolveIframeName('__VES_CONTAINER');
    if (name !== 'Endpoint Security') throw 'got: ' + name;
    console.log('PASS');
  " 2>&1 || echo 'resolution failed')"

run_test "resolves __ADS_CONTAINER" \
  "$(node -e "
    const { resolveIframeName } = require('./$ENRICHMENT');
    const name = resolveIframeName('__ADS_CONTAINER');
    if (name !== 'Data Security') throw 'got: ' + name;
    console.log('PASS');
  " 2>&1 || echo 'resolution failed')"

run_test "resolves __DETECTIONMODEL_CONTAINER" \
  "$(node -e "
    const { resolveIframeName } = require('./$ENRICHMENT');
    const name = resolveIframeName('__DETECTIONMODEL_CONTAINER');
    if (name !== 'Detection Model Management') throw 'got: ' + name;
    console.log('PASS');
  " 2>&1 || echo 'resolution failed')"

run_test "returns null for unknown iframe" \
  "$(node -e "
    const { resolveIframeName } = require('./$ENRICHMENT');
    const name = resolveIframeName('random_iframe');
    if (name !== null) throw 'expected null, got: ' + name;
    console.log('PASS');
  " 2>&1 || echo 'should return null')"

# ---- Event enrichment ----

run_test "enrichEvents adds pageName" \
  "$(node -e "
    const { enrichEvents } = require('./$ENRICHMENT');
    const events = enrichEvents([
      {type:'click', url:'https://portal.xdr.trendmicro.com/#/app/xdr'}
    ]);
    if (events[0].pageName !== 'XDR Workbench') throw 'got: ' + events[0].pageName;
    console.log('PASS');
  " 2>&1 || echo 'enrichment failed')"

run_test "enrichEvents adds moduleName from iframe" \
  "$(node -e "
    const { enrichEvents } = require('./$ENRICHMENT');
    const events = enrichEvents([
      {type:'click', url:'https://portal.xdr.trendmicro.com/#/app/sensor-policy', iframe:'__VES_CONTAINER'}
    ]);
    if (events[0].moduleName !== 'Endpoint Security') throw 'got: ' + events[0].moduleName;
    console.log('PASS');
  " 2>&1 || echo 'enrichment failed')"

run_test "enrichEvents adds fromPageName/toPageName on navigation" \
  "$(node -e "
    const { enrichEvents } = require('./$ENRICHMENT');
    const events = enrichEvents([
      {type:'navigation', from:'https://portal.xdr.trendmicro.com/#/app/xdr', to:'https://portal.xdr.trendmicro.com/#/app/search'}
    ]);
    if (events[0].fromPageName !== 'XDR Workbench') throw 'from: ' + events[0].fromPageName;
    if (events[0].toPageName !== 'XDR Search') throw 'to: ' + events[0].toPageName;
    console.log('PASS');
  " 2>&1 || echo 'nav enrichment failed')"

# ---- ActivityReporter integration ----

run_test "activityReporter.js syntax still valid" \
  "$(node -c "$REPORTER" 2>&1 && echo PASS || echo 'syntax error')"

run_test "reporter imports v1Enrichment" \
  "$(grep -q "require('./v1Enrichment')" "$REPORTER" && echo PASS || echo 'missing import')"

run_test "reporter auto-enriches events" \
  "$(node -e "
    const { ActivityReporter } = require('./$REPORTER');
    const r = new ActivityReporter([
      {type:'page_dwell', timestamp:'2026-01-01T00:00:00Z', dwellMs:5000, maxScrollPct:50, url:'https://portal.xdr.trendmicro.com/#/app/xdr'},
      {type:'navigation', timestamp:'2026-01-01T00:00:05Z', from:'https://portal.xdr.trendmicro.com/#/app/xdr', to:'https://portal.xdr.trendmicro.com/#/app/search'}
    ]);
    const s = r.summarize();
    if (!s.topPages[0].pageName) throw 'missing pageName in topPages';
    if (s.topPages[0].pageName !== 'XDR Workbench') throw 'wrong pageName: ' + s.topPages[0].pageName;
    if (!s.navFlow[0].fromPageName) throw 'missing fromPageName';
    console.log('PASS');
  " 2>&1 || echo 'auto-enrich failed')"

run_test "HTML report shows page names" \
  "$(node -e "
    const { ActivityReporter } = require('./$REPORTER');
    const r = new ActivityReporter([
      {type:'page_dwell', timestamp:'2026-01-01T00:00:00Z', dwellMs:5000, maxScrollPct:50, url:'https://portal.xdr.trendmicro.com/#/app/xdr'}
    ]);
    const html = r.generateHTML();
    if (!html.includes('XDR Workbench')) throw 'page name not in HTML';
    console.log('PASS');
  " 2>&1 || echo 'HTML page name failed')"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1

#!/usr/bin/env bash
# Test extension packaging: build, zip, validate ZIP contents.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== Extension Package Test ==="
echo ""

# --- Step 1: Run packager ---
echo "[1/4] Running package-extension.js..."
node "$PROJECT_ROOT/scripts/package-extension.js"
echo ""

# --- Step 2: Find the ZIP ---
echo "[2/4] Checking releases/ directory..."
EXT_DIR_WIN="$(cygpath -w "$PROJECT_ROOT/extensions" 2>/dev/null || echo "$PROJECT_ROOT/extensions")"
VERSION=$(python -c "import json; print(json.load(open(r'${EXT_DIR_WIN}\\manifest.json'))['version'])")
ZIP="$PROJECT_ROOT/releases/blueprint-extra-mcp-v${VERSION}.zip"

if [ ! -f "$ZIP" ]; then
  echo "  FAIL: Expected ZIP not found: $ZIP"
  exit 1
fi

SIZE=$(wc -c < "$ZIP" | tr -d ' ')
echo "  OK: $ZIP (${SIZE} bytes)"
echo ""

# --- Step 3: Unzip and validate contents ---
echo "[3/4] Validating ZIP contents..."
TMPDIR=$(mktemp -d)
trap "rm -rf '$TMPDIR'" EXIT

ZIP_WIN="$(cygpath -w "$ZIP" 2>/dev/null || echo "$ZIP")"
TMPDIR_WIN="$(cygpath -w "$TMPDIR" 2>/dev/null || echo "$TMPDIR")"

python -c "
import zipfile, sys
zf = zipfile.ZipFile(sys.argv[1])
for name in sorted(zf.namelist()):
    print(f'  {name}')
print(f'\n  Total: {len(zf.namelist())} files')
zf.extractall(sys.argv[2])
" "$ZIP_WIN" "$TMPDIR_WIN"
echo ""

# Check manifest exists in extracted
if [ ! -f "$TMPDIR/manifest.json" ]; then
  echo "  FAIL: manifest.json not in ZIP root"
  exit 1
fi
echo "  OK: manifest.json in ZIP root"

# Check service worker
MANIFEST_WIN="$(cygpath -w "$TMPDIR/manifest.json" 2>/dev/null || echo "$TMPDIR/manifest.json")"
SW=$(python -c "import json; m=json.load(open(r'${MANIFEST_WIN}')); print(m.get('background',{}).get('service_worker',''))")
if [ -n "$SW" ] && [ ! -f "$TMPDIR/$SW" ]; then
  echo "  FAIL: service_worker '$SW' missing from ZIP"
  exit 1
fi
[ -n "$SW" ] && echo "  OK: service_worker $SW"

# Check content scripts and icons
python -c "
import json, os, sys
base = sys.argv[1]
m = json.load(open(os.path.join(base, 'manifest.json')))
ok = True
for cs in m.get('content_scripts', []):
    for js in cs.get('js', []):
        if not os.path.exists(os.path.join(base, js)):
            print(f'  FAIL: content_script {js} missing'); ok = False
        else:
            print(f'  OK: content_script {js}')
for size, pv in m.get('icons', {}).items():
    if not os.path.exists(os.path.join(base, pv)):
        print(f'  FAIL: icon_{size} {pv} missing'); ok = False
    else:
        print(f'  OK: icon_{size} {pv}')
if not ok: sys.exit(1)
" "$TMPDIR_WIN"

echo ""

# --- Step 4: Chrome validation (if available) ---
echo "[4/4] Chrome --pack-extension on extracted ZIP..."
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
if [ ! -f "$CHROME" ]; then
  CHROME="/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"
fi

if [ -f "$CHROME" ]; then
  TMPDIR2=$(mktemp -d)
  "$CHROME" --pack-extension="$(cygpath -w "$TMPDIR")" --no-message-box 2>"$TMPDIR2/stderr.log" &
  CHROME_PID=$!

  CRX_CREATED=0
  CRX_PARENT="$(dirname "$TMPDIR")"
  CRX_NAME="$(basename "$TMPDIR").crx"
  for i in $(seq 1 15); do
    if ! kill -0 $CHROME_PID 2>/dev/null; then break; fi
    if [ -f "$CRX_PARENT/$CRX_NAME" ]; then
      CRX_CREATED=1
      kill $CHROME_PID 2>/dev/null || true
      break
    fi
    sleep 1
  done

  kill $CHROME_PID 2>/dev/null || true
  wait $CHROME_PID 2>/dev/null || true

  if [ "$CRX_CREATED" -eq 1 ]; then
    echo "  OK: Chrome packed extracted ZIP successfully"
    rm -f "$CRX_PARENT/$CRX_NAME" "$CRX_PARENT/$(basename "$TMPDIR").pem"
  else
    echo "  WARN: Chrome CRX not created (static checks passed)"
  fi
  rm -rf "$TMPDIR2"
else
  echo "  SKIP: Chrome not found"
fi

echo ""
echo "=== Package test complete ==="

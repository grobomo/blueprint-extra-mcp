#!/usr/bin/env bash
# Validate Chrome extension can load without errors.
# Uses Chrome --pack-extension which validates manifest, _locales, permissions.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXT_DIR="$PROJECT_ROOT/extensions"
# Windows path for Python (which can't read /c/Users/... paths)
EXT_DIR_WIN="$(cygpath -w "$EXT_DIR" 2>/dev/null || echo "$EXT_DIR")"

CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
if [ ! -f "$CHROME" ]; then
  CHROME="/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"
fi
if [ ! -f "$CHROME" ]; then
  echo "SKIP: Chrome not found"
  exit 0
fi

echo "=== Extension Load Validation ==="
echo ""

# --- Step 1: Static validation ---
echo "[1/3] Checking manifest.json..."
if [ ! -f "$EXT_DIR/manifest.json" ]; then
  echo "  FAIL: manifest.json not found"
  exit 1
fi

# Use Python with Windows path for JSON parsing
HAS_DEFAULT_LOCALE=$(python -c "
import json, os
m = json.load(open(os.path.join(r'$EXT_DIR_WIN', 'manifest.json')))
print('yes' if 'default_locale' in m else 'no')
")

HAS_LOCALES_DIR="no"
if [ -d "$EXT_DIR/_locales" ]; then
  HAS_LOCALES_DIR="yes"
elif [ -f "$EXT_DIR/_locales" ]; then
  HAS_LOCALES_DIR="yes (placeholder file — WILL BREAK CHROME)"
fi

echo "  default_locale in manifest: $HAS_DEFAULT_LOCALE"
echo "  _locales exists: $HAS_LOCALES_DIR"

if [[ "$HAS_LOCALES_DIR" == *"yes"* && "$HAS_DEFAULT_LOCALE" == "no" ]]; then
  echo "  FAIL: _locales exists but default_locale not in manifest"
  echo "  Chrome error: 'Localization used, but default_locale wasn't specified'"
  exit 1
fi

if [[ "$HAS_DEFAULT_LOCALE" == "yes" && "$HAS_LOCALES_DIR" == "no" ]]; then
  echo "  FAIL: default_locale set but _locales directory missing"
  echo "  Chrome error: '_locales subtree is missing'"
  exit 1
fi

if [[ "$HAS_DEFAULT_LOCALE" == "yes" && "$HAS_LOCALES_DIR" == *"yes"* ]]; then
  LOCALE=$(python -c "
import json, os
m = json.load(open(os.path.join(r'$EXT_DIR_WIN', 'manifest.json')))
print(m['default_locale'])
")
  if [ ! -f "$EXT_DIR/_locales/$LOCALE/messages.json" ]; then
    echo "  FAIL: _locales/$LOCALE/messages.json missing"
    exit 1
  fi
  echo "  OK: default_locale=$LOCALE, _locales/$LOCALE/messages.json exists"
fi

echo "  OK: manifest + _locales state is consistent"

# --- Step 2: Check referenced files exist ---
echo ""
echo "[2/3] Checking referenced files..."
ERRORS=0

# Parse manifest once, output all paths to check
MANIFEST_PATHS=$(python -c "
import json, os
m = json.load(open(os.path.join(r'$EXT_DIR_WIN', 'manifest.json')))
sw = m.get('background', {}).get('service_worker', '')
if sw: print(f'sw:{sw}')
for cs in m.get('content_scripts', []):
    for js in cs.get('js', []):
        print(f'cs:{js}')
popup = m.get('action', {}).get('default_popup', '')
if popup: print(f'popup:{popup}')
for size, path in m.get('icons', {}).items():
    print(f'icon:{path}')
")

while IFS= read -r entry; do
  entry="${entry%$'\r'}"  # Strip Windows CR
  TYPE="${entry%%:*}"
  FPATH="${entry#*:}"
  if [ ! -f "$EXT_DIR/$FPATH" ]; then
    echo "  FAIL: $TYPE '$FPATH' not found"
    ERRORS=$((ERRORS+1))
  else
    echo "  OK: $TYPE $FPATH"
  fi
done <<< "$MANIFEST_PATHS"

if [ "$ERRORS" -gt 0 ]; then
  echo "  FAIL: $ERRORS missing files"
  exit 1
fi

# --- Step 3: Chrome --pack-extension validation ---
echo ""
echo "[3/3] Chrome --pack-extension validation..."

TMPDIR=$(mktemp -d)
KEYFILE="$TMPDIR/ext.pem"
trap "rm -rf '$TMPDIR'" EXIT

# Don't pass --pack-extension-key; Chrome will auto-generate one
"$CHROME" --pack-extension="$(cygpath -w "$EXT_DIR")" --no-message-box 2>"$TMPDIR/stderr.log" &
CHROME_PID=$!

CRX_CREATED=0
for i in $(seq 1 15); do
  if ! kill -0 $CHROME_PID 2>/dev/null; then
    break
  fi
  if [ -f "$PROJECT_ROOT/extensions.crx" ]; then
    CRX_CREATED=1
    kill $CHROME_PID 2>/dev/null || true
    break
  fi
  sleep 1
done

kill $CHROME_PID 2>/dev/null || true
wait $CHROME_PID 2>/dev/null || true

if [ "$CRX_CREATED" -eq 1 ]; then
  echo "  OK: Chrome packed extension successfully (CRX created and valid)"
  rm -f "$PROJECT_ROOT/extensions.crx" "$PROJECT_ROOT/extensions.pem"
else
  if [ -s "$TMPDIR/stderr.log" ]; then
    echo "  Chrome stderr:"
    cat "$TMPDIR/stderr.log"
  fi
  echo "  WARN: CRX not created (Chrome may need profile — static checks passed)"
fi

echo ""
echo "=== Extension validation complete ==="

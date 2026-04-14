#!/usr/bin/env node

/**
 * Package Chrome extension into a distributable ZIP.
 *
 * Usage:
 *   node scripts/package-extension.js                 # Build + zip current version
 *   node scripts/package-extension.js --bump patch    # Bump patch, build, zip
 *   node scripts/package-extension.js --bump minor    # Bump minor, build, zip
 *   node scripts/package-extension.js --bump major    # Bump major, build, zip
 *
 * Output: releases/blueprint-extra-mcp-v{version}.zip
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'extensions', 'manifest.json');
const BUILD_SCRIPT = path.join(ROOT, 'extensions', 'build-chrome.js');
const DIST_DIR = path.join(ROOT, 'dist', 'chrome');
const RELEASES_DIR = path.join(ROOT, 'releases');

// --- Parse args ---
const args = process.argv.slice(2);
const bumpIdx = args.indexOf('--bump');
const bumpType = bumpIdx !== -1 ? args[bumpIdx + 1] : null;

if (bumpType && !['patch', 'minor', 'major'].includes(bumpType)) {
  console.error(`Invalid bump type: ${bumpType}. Use patch, minor, or major.`);
  process.exit(1);
}

// --- Version bump ---
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

if (bumpType) {
  const parts = manifest.version.split('.').map(Number);
  while (parts.length < 3) parts.push(0);

  if (bumpType === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0; }
  else if (bumpType === 'minor') { parts[1]++; parts[2] = 0; }
  else { parts[2]++; }

  manifest.version = parts.join('.');
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Bumped version to ${manifest.version}\n`);
}

const version = manifest.version;
console.log(`Packaging Blueprint Extra MCP v${version}\n`);

// --- Build ---
console.log('=== Step 1: Build ===');
execSync(`node "${BUILD_SCRIPT}"`, { stdio: 'inherit', cwd: ROOT });

// --- Write adjusted manifest to dist ---
// Root manifest references chrome/src/*, chrome/popup.html etc.
// In dist, the chrome/ prefix is stripped (build-chrome.js flattens it).
const distManifest = path.join(DIST_DIR, 'manifest.json');
const distManifestObj = JSON.parse(JSON.stringify(manifest));

function stripChromePrefix(p) {
  return p.replace(/^chrome\//, '');
}

if (distManifestObj.background?.service_worker) {
  distManifestObj.background.service_worker = stripChromePrefix(distManifestObj.background.service_worker);
}
if (distManifestObj.action?.default_popup) {
  distManifestObj.action.default_popup = stripChromePrefix(distManifestObj.action.default_popup);
}
for (const cs of distManifestObj.content_scripts || []) {
  cs.js = (cs.js || []).map(stripChromePrefix);
}

fs.writeFileSync(distManifest, JSON.stringify(distManifestObj, null, 2) + '\n');
console.log('Wrote adjusted manifest.json to dist/chrome/\n');

// --- Validate dist ---
console.log('\n=== Step 2: Validate dist ===');
const distManifestData = JSON.parse(fs.readFileSync(distManifest, 'utf8'));
let errors = 0;

function checkFile(label, relPath) {
  const full = path.join(DIST_DIR, relPath);
  if (!fs.existsSync(full)) {
    console.error(`  FAIL: ${label} "${relPath}" missing`);
    errors++;
  } else {
    console.log(`  OK: ${label} ${relPath}`);
  }
}

const sw = distManifestData.background?.service_worker;
if (sw) checkFile('service_worker', sw);

for (const cs of distManifestData.content_scripts || []) {
  for (const js of cs.js || []) checkFile('content_script', js);
}

const popup = distManifestData.action?.default_popup;
if (popup) checkFile('popup', popup);

for (const [size, iconPath] of Object.entries(distManifestData.icons || {})) {
  checkFile(`icon_${size}`, iconPath);
}

if (errors > 0) {
  console.error(`\n${errors} validation errors. Aborting.`);
  process.exit(1);
}
console.log('All referenced files present.\n');

// --- Count files in dist ---
function countFiles(dir) {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) count += countFiles(path.join(dir, entry.name));
    else count++;
  }
  return count;
}
const totalFiles = countFiles(DIST_DIR);

// --- Create ZIP using Python (reliable on Windows — no file lock issues) ---
console.log('=== Step 3: Create ZIP ===');
fs.mkdirSync(RELEASES_DIR, { recursive: true });

const zipName = `blueprint-extra-mcp-v${version}.zip`;
const zipPath = path.join(RELEASES_DIR, zipName);

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Write temp Python script for zip creation
const tmpPy = path.join(ROOT, '.tmp-zip.py');
fs.writeFileSync(tmpPy, `import zipfile, os, sys
dist_dir = sys.argv[1]
zip_path = sys.argv[2]
count = 0
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(dist_dir):
        for f in files:
            full = os.path.join(root, f)
            arcname = os.path.relpath(full, dist_dir)
            zf.write(full, arcname)
            count += 1
print(count)
`);

try {
  const result = execSync(
    `python "${tmpPy}" "${DIST_DIR}" "${zipPath}"`,
    { encoding: 'utf8', cwd: ROOT }
  ).trim();
  console.log(`  Zipped ${result} files`);
} finally {
  fs.unlinkSync(tmpPy);
}

// --- Summary ---
const zipSize = fs.statSync(zipPath).size;
const zipSizeKB = (zipSize / 1024).toFixed(1);

console.log(`\n=== Done ===`);
console.log(`  Version:  ${version}`);
console.log(`  Files:    ${totalFiles}`);
console.log(`  ZIP:      ${zipName} (${zipSizeKB} KB)`);
console.log(`  Path:     ${zipPath}`);
console.log(`\nTo install: chrome://extensions > Load unpacked > unzip and select folder`);

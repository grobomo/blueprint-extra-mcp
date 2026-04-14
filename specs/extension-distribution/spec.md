# Spec 012: Extension Distribution

## Goal
Create a repeatable build-and-package pipeline for the Chrome extension. Output: versioned ZIP files in `releases/` ready for sideloading or Chrome Web Store upload.

## Background
- `extensions/build-chrome.js` already builds to `dist/chrome/` (copies files, fixes import paths, copies _locales)
- `scripts/test/test-extension-load.sh` validates manifest, referenced files, and Chrome --pack-extension
- No automated packaging exists — users must manually zip dist/chrome/

## Design

### Package script: `scripts/package-extension.js`
Node.js script (zero npm deps, uses built-in `node:fs` + `node:child_process` + archiver pattern via raw zip):

1. Run `build-chrome.js` to produce `dist/chrome/`
2. Read version from `extensions/manifest.json`
3. Create `releases/blueprint-extra-mcp-v{version}.zip` containing the dist/chrome/ contents
4. Validate: unzip to temp dir, run static checks (manifest exists, referenced files present)
5. Print size, file count, version

### Version bump (optional flag)
`--bump patch|minor|major` bumps `extensions/manifest.json` version before building.

### Gitignore
- `releases/` added to `.gitignore` (ZIPs are build artifacts, not source)
- `dist/` already gitignored

## Non-goals
- Chrome Web Store API upload (manual for now)
- CRX signing (Chrome --pack-extension is tested separately)
- Firefox packaging (different manifest format)

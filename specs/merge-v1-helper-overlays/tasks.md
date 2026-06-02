# Tasks: Merge v1-helper CVE Overlays

- [x] T011a: Create `extensions/chrome/src/v1-overlay.js` — CVE badge injection, detail panel, SPA nav watcher, storage listeners
- [x] T011b: Update `extensions/manifest.json` — add second content_scripts entry for `*.trendmicro.com`
- [x] T011c: Add V1 Helper section to `extensions/shared/popup/popup.js` — analysis import, CVE list, overlay toggle
- [x] T011d: Add V1 styles to `extensions/chrome/popup.html` — Trend Micro red accent, v1-section layout
- [x] T011e: Update `extensions/shared/handlers/install.js` — v1h_ storage init on install (cleaner than background-module.js)
- [x] T011f: Verify extension loads and existing tests pass — 108/108 pass

# Spec 016: Merge v1-helper CVE Overlays into Blueprint Extension

## Goal
Integrate v1-helper's CVE overlay features into Blueprint's Chrome extension so users only need one extension for both browser automation (MCP) and V1 vulnerability analysis.

## Approach
Add v1-helper features as a separate content script module rather than modifying Blueprint's existing content script. This keeps the two feature sets independent.

## Changes

### 1. New content script: `extensions/chrome/src/v1-overlay.js`
- CVE badge injection on V1 Container Security vulnerability pages
- Relevance color coding (RELEVANT/LOW/NOT RELEVANT)
- Clickable detail panel with summary, relevance, remediation, severity
- SPA navigation watcher (re-inject overlays on V1 route changes)
- Storage-based analysis data loading (v1h_analysis, v1h_overlay_enabled)
- Message listeners for popup toggle commands

### 2. Manifest update: `extensions/manifest.json`
- Add second content_scripts entry for `*://*.trendmicro.com/*` with `v1-overlay.js` at `document_idle`
- Add `*://*.trendmicro.com/*` to host_permissions (already covered by `<all_urls>` but explicit is better)

### 3. Popup V1 section: `extensions/shared/popup/popup.js` + CSS
- Add V1 Helper section below existing MCP status
- CVE analysis stats (total, relevant, low, not relevant)
- Import analysis.json button
- View CVEs list with filter/copy
- Overlay toggle button
- V1 API settings (key, region, test connection, customer context)

### 4. Background script update: `extensions/chrome/src/background-module.js`
- Add v1h_ storage initialization on install

## Source
Code adapted from `grobomo/v1-helper` extension (v0.2.0).

## Testing
- Existing 108 unit tests still pass (no server changes)
- Extension loads without errors (chrome://extensions)
- CVE overlay injects on V1 pages when analysis data is loaded
- Overlay toggle works from popup
- Analysis import from JSON file works

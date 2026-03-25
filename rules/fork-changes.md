---
id: fork-changes
name: Blueprint Extra Fork Changes
keywords: [blueprint, fork, upstream, websocket, binding, manifest, extension, popup, locales, branding]
description: "WHY: Reverting fork fixes breaks the extension. WHAT: Never change WebSocket bindings, manifest structure, or popup paths."
enabled: true
priority: 5
action: Preserve fork-specific changes
min_matches: 2
---

# Blueprint Extra Fork Changes

Fork of [railsblueprint/blueprint-mcp](https://github.com/railsblueprint/blueprint-mcp) with extras.

## DO NOT CHANGE These

1. **WebSocket binding — MUST be `127.0.0.1`**
   - Extension connects to `ws://127.0.0.1:5555/extension` (hardcoded in `shared/connection/websocket.js:161`)
   - Server binds to `127.0.0.1` (`statefulBackend.js:613`, `extensionServer.js`, `relayClient.js`)
   - Do NOT change to `localhost`, `::`, or `0.0.0.0`
   - **"Extension not connected" → WAIT 10-15s, don't change code**

2. **Extension manifest (`extensions/manifest.json`)**
   - Shared module structure: manifest at `extensions/` root, sources in `chrome/src/`, shared in `shared/`
   - Required permissions: `webRequest`, `webNavigation`, `management`, `offscreen`, `notifications`
   - Without `webRequest`: `NetworkTracker.init()` crashes

3. **Popup path** — `chrome/popup.html` resolves `../shared/popup/popup.css` correctly. Don't move it.

4. **`_locales` symlink** — `extensions/_locales -> shared/_locales`. Created via `cmd /c "mklink /D _locales shared\_locales"`

5. **Branding** — "Blueprint Extra MCP for Chrome" keeps the `Blueprint.*MCP for (\w+)` regex for browser detection

# Blueprint Extra MCP

Browser automation + **V1 console user activity analysis** via Chrome extension + MCP server.

**Upstream:** Originally forked from railsblueprint/blueprint-mcp. This codebase is now independent — do NOT pull or merge from upstream.

## HACKATHON MISSION (read this first, every session)

**Goal:** Instrument the Vision One console to track how real users interact with it. Blueprint's Chrome extension has full DOM access. Use it to record and analyze:

- **Clicks** — what users click, in what order, with full DOM context (already built: `server/src/clickRecorder.js`)
- **Page dwell time** — how long users stay on each V1 page/section
- **Hover patterns** — which elements get hovered, for how long (tooltip reads, menu exploration)
- **Scroll depth** — how far users scroll on each page
- **Navigation paths** — page-to-page sequences, sidebar usage, back-button patterns
- **Activity reports** — aggregate behavioral analytics: which features get used, which get ignored, where users get stuck

**Approach:** The extension injects JS into V1 pages. The clickRecorder already captures clicks/keypresses via a `__BP_RECORDER__` console.log channel. Expand this into a full activity tracker. Screenshots + x/y coordinate clicks + DOM trace = rich behavioral data.

**This is the whole point of the hackathon. Every session should advance this goal. Don't drift into unrelated cleanup, API queries, or recipe catalogs.**

**Endgame:** Once activity tracking works, rebrand and merge with the v1-helper Chrome extension. The combined extension = **v1-helper** with all V1 value in one place: passive activity monitoring + active automation recipes. Blueprint is the engine; v1-helper is the product.

## Auto-Improve Code on Blockers

When Blueprint fails (element not found, iframe issues, timeout), FIX THE CODE in `server/src/unifiedBackend.js`, don't document workarounds.

## Architecture

```
extensions/                     <- Chrome extension (load this folder in chrome://extensions)
  manifest.json                 <- MV3 manifest
  _locales -> shared/_locales   <- Symlink (Windows: run setup-windows.bat)
  chrome/src/                   <- Chrome-specific code
  shared/                       <- Shared modules
server/                         <- MCP server (stdio + WebSocket)
  src/unifiedBackend.js         <- All tool handlers (this is where fixes go)
  src/statefulBackend.js        <- Connection/state management (state machine, enable/disable)
  src/mcpConnection.js          <- JSON-RPC client for proxy/relay mode
  src/extensionServer.js        <- WebSocket server for Chrome extension
rules/                          <- Usage rules (loaded by rule-manager)
```

## Setup

```bash
# Server:
cd server && npm install

# Extension (Linux/Mac):
cd extensions
# Symlink should work out of the box. If not:
ln -s shared/_locales _locales

# Extension (Windows):
# Git stores _locales as a symlink, but Windows checks it out as a text file.
# Run the setup script to create proper junctions (no admin required):
cd extensions && setup-windows.bat

# Load in Chrome:
# chrome://extensions > Developer mode > Load unpacked > select extensions/
```

### Windows `_locales` Symlink Issue

On Windows, `git clone` creates `extensions/_locales` as a 15-byte text file containing `shared/_locales` instead of a real symlink. Chrome rejects the extension with `_locales subtree is missing`.

**Fix:** Run `extensions/setup-windows.bat`. It replaces the placeholder with a Windows junction (no admin needed) and tells git to ignore the local change via `--assume-unchanged`.

**After `git checkout` or `git pull`:** Git may restore the placeholder file, breaking the junction. Re-run `setup-windows.bat` if Chrome stops loading the extension.

## Connection States (statefulBackend.js)

```
passive  ->  active               (free mode: local Chrome extension)
passive  ->  connected            (PRO mode: single browser on relay)
passive  ->  authenticated_waiting  (PRO mode: multiple browsers, needs browser_connect)
```

State is stored in `this._state`. All `browser_*` tool calls require state != `passive`.

## Tool Workflow

### Step 1: enable (REQUIRED before any browser_* tool)

```
enable(client_id="my-project")
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| client_id | string | YES | Human-readable label for connection tracking. Use project name. |
| force_free | boolean | no | Force local mode even with PRO auth tokens |

Returns connection state, mode (free/pro), browser info. Sets `this._clientId` for the session.

**When called via mcp-manager:** `client_id` is auto-injected from the project name. Claude never needs to provide it.

### Step 2: browser_* tools (require enable first)

| Tool | Purpose |
|------|---------|
| browser_tabs | List/select/create/close tabs (action: list, new, attach, close) |
| browser_navigate | Go to URL |
| browser_interact | Click, type, select, hover, scroll on elements |
| browser_snapshot | Accessibility snapshot of page |
| browser_evaluate | Run JavaScript in page context |
| browser_take_screenshot | Screenshot current tab |
| browser_fill_form | Fill multiple form fields at once |
| browser_console_messages | View console output |
| browser_network_requests | Monitor network activity |
| browser_pdf_save | Save page as PDF |
| browser_extract_content | Extract structured content |
| browser_drag | Drag and drop |
| browser_window | Resize/reposition window |
| browser_verify_text_visible | Assert text is visible |
| browser_verify_element_visible | Assert element is visible |
| browser_get_element_styles | CSS inspection |
| browser_lookup | Find elements by selector (auto-searches iframes) |
| browser_performance_metrics | Performance data |
| browser_handle_dialog | Accept/dismiss dialogs |

### Step 3: disable (optional)

```
disable()
```

Returns to passive. All browser_* tools stop working until next enable.

## Management Tools (always available)

| Tool | Purpose |
|------|---------|
| status | Current state, mode, connected browser |
| auth | PRO authentication (action: login/logout/status) |
| browser_list | List browsers on relay (PRO only) |
| browser_connect | Switch browser by ID (PRO with multiple browsers) |
| scripting | External script automation setup |
| browser_diagnostics | Action validation report |
| browser_workflows | Site-specific saved workflows |

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Browser automation not active" | browser_* called before enable | Call enable first |
| "Missing client_id" | enable() with no client_id | Provide client_id (auto-injected via mcp-manager) |
| "Browser not selected" | PRO mode, multiple browsers | Call browser_connect(browser_id=...) |
| "No tab attached" | Tab detached during navigation | browser_tabs(action="attach") |
| "No browser extensions connected" | Chrome extension not running | Start Chrome with extension loaded |

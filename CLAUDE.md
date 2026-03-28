# Blueprint Extra MCP

Browser automation via Chrome extension + MCP server.

**Upstream:** Originally forked from railsblueprint/blueprint-mcp. This codebase is now independent — do NOT pull or merge from upstream. Our customizations (iframe handling, relay mode, incognito support, auto-fix patterns) will break on upstream updates.

## CRITICAL: Auto-Improve Code on Blockers

**When you encounter a blocker using Blueprint (element not found, interaction fails, iframe issues, timeout, etc.), DO NOT document a workaround. Instead, FIX THE CODE.**

1. **Diagnose** — understand why the tool failed (check `server/src/unifiedBackend.js`)
2. **Fix** — modify the server code to handle the case automatically
3. **Verify** — `node -c server/src/unifiedBackend.js` to syntax-check, then restart and test
4. **Update rules** — if there's a relevant rule file in `rules/`, update it. If the fix made a rule obsolete, delete the rule.

Examples of auto-improvements already made:
- `browser_lookup` now auto-searches inside same-origin iframes (2 levels deep) when nothing found in top document
- `browser_interact` click auto-finds and JS-clicks elements inside iframes when CDP can't reach them
- Both were code fixes to `unifiedBackend.js`, not documentation workarounds

**The goal: Blueprint should just work on any site. Every failure is a bug to fix, not a pattern to document.**

## Architecture

```
extensions/                     <- Chrome extension (load this folder in chrome://extensions)
  manifest.json                 <- MV3 manifest
  _locales -> shared/_locales   <- Symlink (admin: mklink /D _locales shared\_locales)
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
# Extension:
cd extensions && cmd /c "mklink /D _locales shared\_locales"
# Chrome > chrome://extensions > Developer mode > Load unpacked > select extensions/

# Server:
cd server && npm install
```

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

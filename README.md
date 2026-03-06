# Blueprint Extra MCP

Fork of [Blueprint MCP](https://github.com/railsblueprint/blueprint-mcp) with extras:
relay fixes, iframe support, same-origin iframe content in snapshots, incognito tab
recognition, and a curated set of Claude Code rules for browser automation best practices.

## What It Does

An MCP server that lets AI assistants (Claude, GPT, etc.) control your actual browser --
Chrome, Firefox, Edge, or Opera -- through a browser extension. Uses your real browser
profile with all your logged-in sessions, cookies, and extensions intact.

## Why Not Playwright/Puppeteer?

| | Blueprint MCP | Playwright/Puppeteer |
|---|---|---|
| Browser | Your real browser, real profile | Headless or new instance |
| Auth | Already logged in everywhere | Must re-authenticate each session |
| Detection | Real fingerprint, not flagged | Often detected as bot |
| Extensions | Your existing extensions work | No extension support |
| Setup | Install extension, done | Requires browser binaries |

## What This Fork Adds

- **Same-origin iframe content** in snapshots and element search
- **Incognito tab recognition** -- correctly identifies and interacts with incognito tabs
- **Relay mode fixes** for multi-session stability
- **Claude Code rules** (`rules/`) -- automation best practices, troubleshooting playbooks
- **V1 page recipes** (`rules/examples/`) -- pre-built selectors for Trend Micro Vision One console

## Install

### Option A: With MCP Manager (recommended)

If you have [mcp-manager](https://github.com/grobomo/claude-code-skills) set up:

1. Clone this repo into your MCP directory:
   ```bash
   git clone https://github.com/grobomo/blueprint-extra-mcp.git
   cd blueprint-extra-mcp/server && npm install
   ```

2. Add to your mcp-manager `servers.yaml`:
   ```yaml
   blueprint:
     command: node
     args: ["<path-to>/blueprint-extra-mcp/run-server.js"]
     auto_start: false
   ```

3. Reload mcp-manager and start:
   ```
   mcpm reload
   mcpm start blueprint
   ```

### Option B: Standalone (no mcp-manager)

Add directly to your Claude Code config:

```bash
claude mcp add blueprint -- node /path/to/blueprint-extra-mcp/run-server.js
```

Or add to `.mcp.json` / `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "blueprint": {
      "command": "node",
      "args": ["/path/to/blueprint-extra-mcp/run-server.js"]
    }
  }
}
```

### Browser Extension (required for both options)

- **Chrome/Edge/Opera:** [Chrome Web Store](https://chromewebstore.google.com/detail/blueprint-mcp-for-chrome/kpfkpbkijebomacngfgljaendniocdfp)
- **Firefox:** [Firefox Add-ons](https://addons.mozilla.org/addon/blueprint-mcp-for-firefox/)

## Installing the Rules (Optional)

The `rules/` directory contains Claude Code automation rules that improve Blueprint usage.
If you use Claude Code's rule-manager or super-manager:

```bash
# Copy rules to your Claude Code rules directory
cp rules/*.md ~/.claude/rules/UserPromptSubmit/

# Or symlink so they stay updated with git pull
ln -s "$(pwd)/rules"/*.md ~/.claude/rules/UserPromptSubmit/
```

The `rules/examples/` directory has V1 console recipes -- copy these if you work with
Trend Micro Vision One.

Without rule-manager, the rules are still useful as reference documentation.

## How It Works

```
AI Assistant
    |  MCP Protocol
MCP Client (Claude Desktop, Claude Code, Cursor)
    |  stdio / JSON-RPC
blueprint-extra-mcp (this server)
    |  WebSocket (localhost:5555)
Browser Extension
    |  Chrome DevTools Protocol
Your Browser (real profile, real sessions)
```

### Multi-Session Support

Multiple Claude Code tabs can share one browser extension simultaneously:

```
Claude Tab A (primary)  ---+
                           |--- port 5555 --- Extension --- Browser
Claude Tab B (relay)    ---+
Claude Tab C (relay)    ---+
```

The first MCP instance binds port 5555 as **primary**. Additional instances
automatically connect as **relay clients** through the primary -- no config
needed. All browser tools work identically in relay mode.

## Quick Start

1. Install server + extension (see above)
2. Start your MCP client
3. Click the Blueprint extension icon in your browser
4. Ask the AI to browse:

```
"Go to GitHub and check my notifications"
"Fill out this form with my info"
"Take a screenshot of this page"
```

## Tools

### Connection
| Tool | Purpose |
|------|---------|
| `enable` | Activate browser automation (required first) |
| `disable` | Deactivate and return to passive mode |
| `status` | Check connection state |

### Tabs
| Tool | Purpose |
|------|---------|
| `browser_tabs` | List, attach, new, close tabs |

### Navigation
| Tool | Purpose |
|------|---------|
| `browser_navigate` | Go to URL, back, forward, reload |

### Content
| Tool | Purpose |
|------|---------|
| `browser_snapshot` | Get accessible page content (text + iframe content) |
| `browser_take_screenshot` | Capture visual screenshot |
| `browser_extract_content` | Extract page as markdown |
| `browser_console_messages` | Read console logs |
| `browser_network_requests` | Monitor/replay network traffic |

### Interaction
| Tool | Purpose |
|------|---------|
| `browser_interact` | Click, type, select, hover, scroll |
| `browser_evaluate` | Execute JavaScript in page |
| `browser_handle_dialog` | Handle alert/confirm/prompt |
| `browser_file_upload` | Upload files |
| `browser_window` | Resize/minimize/maximize |
| `browser_pdf_save` | Save page as PDF |

### Extensions
| Tool | Purpose |
|------|---------|
| `browser_list_extensions` | List installed extensions |
| `browser_reload_extensions` | Reload unpacked extensions |

## Project Structure

```
blueprint-extra-mcp/
+-- run-server.js               Entry point
+-- server/
|   +-- cli.js                  CLI + MCP server setup
|   +-- src/
|       +-- statefulBackend.js  Connection state machine
|       +-- unifiedBackend.js   All browser tool implementations
|       +-- extensionServer.js  WebSocket server + relay multiplexer
|       +-- relayClient.js      Relay mode connection
|       +-- transport.js        Transport abstraction
+-- extensions/
|   +-- chrome/                 Chrome extension (TypeScript + Vite)
|   +-- firefox/                Firefox extension (vanilla JS)
|   +-- shared/                 Shared code (WebSocket, handlers, adapters)
+-- rules/                      Claude Code automation rules
|   +-- blueprint-health-check.md     Troubleshooting playbook
|   +-- browser-automation-routing.md How to use Blueprint effectively
|   +-- browser-via-blueprint.md      Always use Blueprint for URLs
|   +-- examples/
|       +-- v1-page-recipes.md        V1 console selectors and patterns
+-- docs/                       Documentation
+-- releases/                   Built extensions for distribution
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Extension won't connect | Click extension icon, verify "Connected" status |
| Port 5555 in use | Second instance auto-relays through primary -- this is normal |
| Tools not working | Call `enable` first, then `browser_tabs` to attach |
| "Extension not connected" | See `rules/blueprint-health-check.md` for full playbook |
| Iframe content not found | Use `browser_evaluate` to query inside iframes (see rules) |

## License

Apache License 2.0 -- see [LICENSE](LICENSE)

Upstream: Copyright (c) 2025 Rails Blueprint
Fork extras: Copyright (c) 2025 grobomo

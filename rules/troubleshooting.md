---
id: troubleshooting
name: Blueprint Troubleshooting
keywords: [blueprint, error, disconnect, timeout, not connected, extension, reconnect, port, 5555, idle]
description: "WHY: Connection issues waste turns on trial-and-error. WHAT: Structured fixes for every known failure mode."
enabled: true
priority: 5
action: Follow troubleshooting playbook
min_matches: 2
---

# Blueprint Troubleshooting

## "Extension not connected"

**The problem is NEVER the Chrome extension.** Don't tell the user to "click Connect."

| Cause | Fix |
|-------|-----|
| mcp-manager idle-stopped the server | Call any blueprint tool (auto-starts), then `enable`, wait 10-15s |
| `enable` not called after start | WS listener only starts on `enable`. Every restart needs it. |
| Service worker dormant | User opens extension popup (clicks icon) to wake it, wait 5s |

**Reconnect sequence:**
```
1. mcpm restart blueprint-extra
2. enable client_id="..."
3. Wait 10-15 seconds
4. browser_tabs action="list"
5. If still disconnected → user clicks extension icon → wait 5s → retry
```

## Known Gotchas

- **Auto-reconnect takes 10-15 seconds** — don't spam `browser_tabs list`, wait then check once
- **mcp-manager idle timeout** stops server after ~5 min of no calls. Extension auto-reconnects on restart.
- **Node.js path on Windows**: Use absolute path in `servers.yaml`. Spaces in path break with `shell: true`.
- **`npm install` in `server/`**: Needs `node` in PATH for `sharp`. Use `export PATH="/c/Program Files/nodejs:$PATH"` first.
- **Cross-origin iframes**: Can screenshot them, but `browser_interact` and `browser_evaluate` can't penetrate. Modify iframe's `src` attribute from parent to navigate.

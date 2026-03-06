---
id: blueprint-health-check
name: Blueprint Health Check
keywords: [blueprint, extension, connect, disconnect, websocket, error, fail, timeout, port, 5555]
description: "WHY: Blueprint connection issues waste multiple turns on trial-and-error debugging. WHAT: Structured troubleshooting playbook for common connection problems."
enabled: true
priority: 5
action: Run Blueprint health check playbook
min_matches: 2
---

# Blueprint Health Check Playbook

## Step 1: Check status
Call `status` tool. Look for:
- **State:** Should be "active" or "connected"
- **Extension:** Should show "Connected"
- If passive: call `enable` first

## Step 2: Extension not connected
1. Click the Blueprint extension icon in Chrome
2. Verify it shows "Connected" status
3. If it shows "Disconnected", click "Connect"
4. Try `status` again

## Step 3: Port 5555 issues
- If EADDRINUSE: another instance is primary -- this is normal, relay mode activates automatically
- If extension shows wrong port: restart the extension

## Step 4: Relay mode issues
- If relay timeout: primary instance may have crashed
- Fix: restart the primary Claude Code session, then reconnect

## Step 5: Tab not attached
After `enable`, you must:
1. `browser_tabs action='list'` to see tabs
2. `browser_tabs action='attach' index=N` to attach to one
3. Only THEN can you use `browser_navigate`, `browser_interact`, etc.

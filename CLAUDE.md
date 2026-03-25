# Blueprint Extra MCP

Fork of [railsblueprint/blueprint-mcp](https://github.com/railsblueprint/blueprint-mcp). Browser automation via Chrome extension + MCP server.

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
extensions/                     ← Chrome extension (load this folder in chrome://extensions)
├── manifest.json               ← MV3 manifest
├── _locales -> shared/_locales ← Symlink (admin: mklink /D _locales shared\_locales)
├── chrome/src/                 ← Chrome-specific code
├── shared/                     ← Shared modules
server/                         ← MCP server (stdio + WebSocket)
├── src/unifiedBackend.js       ← All tool handlers (this is where fixes go)
├── src/statefulBackend.js      ← Connection/state management
rules/                          ← Usage rules (loaded by rule-manager)
```

## Setup

```bash
# Extension:
cd extensions && cmd /c "mklink /D _locales shared\_locales"
# Chrome > chrome://extensions > Developer mode > Load unpacked > select extensions/

# Server:
cd server && npm install
```

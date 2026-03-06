---
id: browser-automation-routing
name: Browser Automation Routing
keywords: [browser, automate, web, page, click, navigate, screenshot, form, fill]
description: "WHY: Multiple browser automation tools exist but Blueprint is the most reliable for real-browser interaction. WHAT: Route all browser tasks through Blueprint MCP."
enabled: true
priority: 5
action: Use Blueprint MCP for browser automation
min_matches: 2
---

# Browser Automation via Blueprint

## When to use Blueprint
- Navigating to URLs in user's real browser
- Filling forms with user's logged-in sessions
- Taking screenshots of web pages
- Interacting with web applications (click, type, scroll)
- Extracting content from authenticated pages

## Workflow
1. `enable client_id='my-project'` -- activate automation
2. `browser_tabs action='list'` -- see available tabs
3. `browser_tabs action='attach' index=N` -- attach to a tab
4. Use `browser_navigate`, `browser_interact`, `browser_snapshot`, etc.

## Key tools
- `browser_snapshot` -- get accessible page content (includes same-origin iframe content)
- `browser_take_screenshot` -- visual capture
- `browser_interact` -- click, type, select, hover, scroll
- `browser_evaluate` -- run JavaScript in page context

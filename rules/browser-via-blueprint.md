---
id: browser-via-blueprint
name: Open URLs via Blueprint
keywords: [url, open, browse, website, http, https, link, page]
description: "WHY: Opening URLs manually wastes time. WHAT: Always use Blueprint to open and interact with URLs."
enabled: true
priority: 5
action: Open URLs via Blueprint, never manually
min_matches: 2
---

# Open URLs via Blueprint

When the user provides a URL or asks to visit a website:

1. Use Blueprint MCP to navigate: `browser_navigate url='https://...'`
2. Never tell the user to open a URL manually
3. Never use `start ""` or `open` commands for URLs -- use Blueprint

Blueprint uses the user's real browser with all their sessions and cookies intact.

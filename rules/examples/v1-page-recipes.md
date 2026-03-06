---
id: v1-page-recipes
name: V1 Console Page Recipes
keywords: [v1, vision, console, portal, xdr, endpoint, policy, assignment, data, security, sensor, incognito]
description: "WHY: V1 console automation wastes 5-10 turns per page on popup dismissal, iframe discovery, and selector hunting. WHAT: Pre-built recipes for every known V1 page -- run the init script first, then do your task."
enabled: true
priority: 5
action: Run V1 page init recipe before interacting
min_matches: 2
---

# V1 Console Page Recipes

Pre-built automation recipes for Trend Micro Vision One console pages.

## WHY

Every V1 console session wastes turns on the same patterns: dismissing MFA popup, finding
the right iframe, discovering selectors that were already known from last session. These
recipes eliminate that waste.

## CRITICAL: Run Init Script on Every V1 Page Load

After navigating to any V1 page, run this init script FIRST before doing anything else:

```javascript
// UNIVERSAL V1 INIT -- run on every page load
(function() {
  var r = [];
  // 1. Dismiss MFA popup
  var skip = Array.from(document.querySelectorAll('button')).find(function(b) { return /skip/i.test(b.textContent); });
  if (skip) { skip.click(); r.push('dismissed MFA'); }
  // 2. Dismiss announcements
  var gotit = Array.from(document.querySelectorAll('button')).find(function(b) { return /got it/i.test(b.textContent); });
  if (gotit) { gotit.click(); r.push('dismissed announcement'); }
  // 3. Find iframes
  var iframes = document.querySelectorAll('iframe');
  for (var i = 0; i < iframes.length; i++) {
    try {
      var c = iframes[i].contentDocument;
      r.push('iframe[' + i + ']: id=' + iframes[i].id + ' els=' + c.querySelectorAll('*').length);
    } catch(e) { r.push('iframe[' + i + ']: cross-origin'); }
  }
  // 4. Current page info
  r.push('hash=' + window.location.hash);
  r.push('title=' + document.title);
  return r.join(' | ');
})()
```

## Navigation: Sidebar Click (Not Hash)

Hash navigation (`window.location.hash = '#/app/X'`) is UNRELIABLE -- falls back to Cyber
Risk Overview ~50% of the time. Use sidebar menu click pattern:

```javascript
// Step 1: Trigger sidebar popup
var menu = document.querySelector('#menu<MENU_ID> .ant-menu-submenu-title');
menu.dispatchEvent(new MouseEvent('mouseenter', {bubbles:true}));
menu.click();
```
```javascript
// Step 2 (300ms later): Click submenu item
var items = document.querySelectorAll('.ant-menu-submenu-popup a, .ant-tooltip-inner a');
var target = Array.from(items).find(function(a) { return a.textContent.includes('<ITEM_NAME>'); });
if (target) target.click();
```

### Sidebar Menu IDs

| Section | Menu ID |
|---------|---------|
| Endpoint Security | `menuendpoint_security_operations` |
| Data Security | `menudatasecurity` |
| Network Security | `menunetwork_security` |
| Email Security | `menuemail_and_collaboration_security` |
| Cloud Security | `menucloud_security` |
| Attack Surface | `menuattack_surface_risk_management` |
| XDR | `menuxdr` |
| Workflow | `menuworkflow_and_automation` |
| Admin | `menuadministration` |

## Per-Page Recipes

### Endpoint Security Assignments (#/app/sensor-policy)
- **Iframe:** `__VES_CONTAINER`
- **Navigate via:** sidebar > Endpoint Security > Endpoint Policies, then click Assignments tab
- **Key selectors (inside iframe):**
  - Assignments tab: `[id*='Tab-assignments']`
  - Policies tab: `[id*='Tab-policies']`
  - Assignment rows: `[role=row]`
  - Assignment names: `[role=row] button`
- **Feature Management Scope radio buttons:** `input[type=radio]` with name containing `RadioGroup`
  - `value=false` = "Only unified Cyber Risk & Security Operations"
  - `value=true` = "All supported unified features" (needed for Data Security)
- **Click pattern:** React components need full mouse event chain, not just `.click()`

### Data Inventory (#/app/data-security-inventory)
- **Iframe:** `__ADS_CONTAINER`
- **Navigate via:** sidebar > Data Security > Data Inventory (hash nav NEVER works)
- **Empty until:** Data Security Sensor enabled AND Feature Scope = "All supported features"

### Data Policy (#/app/data-policy)
- **Iframe:** `__ADS_CONTAINER`
- **Navigate via:** sidebar > Data Security > Data Policy
- **Key selectors:** "Enable Endpoint Data Sensor" button in top-right

### Sensitive Data Classification (#/app/data-security-classification)
- **Iframe:** `__ADS_CONTAINER`
- **Navigate via:** sidebar > Data Security > Sensitive Data Classification
- **First visit:** Landing page with "Get started" button (click to activate, free feature)
- **After activation:** 118 rules, 31 active default

## Updating Recipes

When you discover new V1 page patterns (iframe IDs, selectors, navigation quirks),
add them to this file so the knowledge persists across sessions.

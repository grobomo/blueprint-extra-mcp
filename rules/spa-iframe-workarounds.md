# SPA & Iframe Workarounds

Enterprise SPAs (Vision One, Dynamics 365, Salesforce, ServiceNow) render content inside nested iframes. `browser_interact` and `browser_lookup` only search the top-level DOM, so elements inside iframes appear invisible.

## Symptoms

- `browser_lookup text="Button"` returns "No elements found" even though visible
- `browser_interact` completes with 0 interactions
- Coordinate clicks land on wrong iframe layer
- Hash URL changes (`window.location.hash`) don't navigate in custom SPA routers

## Fix: Use `browser_evaluate` with JavaScript

### Step 1: List all iframes

```javascript
(function(){
  var iframes = document.querySelectorAll('iframe');
  var r = [];
  iframes.forEach(function(f) {
    r.push({ name: f.name, id: f.id, src: (f.src || '').substring(0, 80) });
  });
  return JSON.stringify(r);
})()
```

### Step 2: Find and click element inside an iframe

```javascript
(function(){
  var f = document.querySelector('iframe[name=IFRAME_NAME]');
  if (!f) return 'no iframe';
  var doc = f.contentDocument;
  var all = doc.querySelectorAll('a, span, button, div');
  for (var i = 0; i < all.length; i++) {
    if (all[i].textContent.trim() === 'TARGET TEXT') {
      all[i].click();
      return 'clicked: ' + all[i].tagName;
    }
  }
  return 'not found';
})()
```

### Step 3: Search 2 levels deep (nested iframes)

```javascript
(function(){
  var f = document.querySelector('iframe[name=IFRAME_NAME]');
  if (!f) return 'no iframe';
  var doc = f.contentDocument;
  // Level 1
  var all = doc.querySelectorAll('a,span,button');
  for (var i = 0; i < all.length; i++) {
    if (all[i].textContent.trim() === 'TARGET TEXT') {
      all[i].click(); return 'clicked L1';
    }
  }
  // Level 2
  var iframes = doc.querySelectorAll('iframe');
  for (var j = 0; j < iframes.length; j++) {
    try {
      var d2 = iframes[j].contentDocument;
      var els = d2.querySelectorAll('a,span,button');
      for (var k = 0; k < els.length; k++) {
        if (els[k].textContent.trim() === 'TARGET TEXT') {
          els[k].click(); return 'clicked L2: ' + iframes[j].name;
        }
      }
    } catch(e) { /* cross-origin */ }
  }
  return 'not found';
})()
```

### List all clickable text in an iframe

```javascript
(function(){
  var f = document.querySelector('iframe[name=IFRAME_NAME]');
  if (!f) return 'no iframe';
  var doc = f.contentDocument;
  var items = doc.querySelectorAll('.ant-menu-title-content span, a, button');
  var texts = [];
  items.forEach(function(i) { if(i.textContent.trim()) texts.push(i.textContent.trim()); });
  return JSON.stringify([...new Set(texts)]);
})()
```

## Known SPA Iframe Structures

| App | Main Frame | Content Frames | Notes |
|-----|-----------|---------------|-------|
| **Vision One** | `__SASE_CONTAINER` | `__SASE_ES_CONTAINER` | Left nav in outer DOM, page content in iframes. Buttons like "Event Rule Management" are in `__SASE_CONTAINER`. |
| **Dynamics 365** | Multiple | Nested | Entity forms in separate iframes |
| **ServiceNow** | `gsft_main` | Nested | Most content inside `gsft_main` |

## Tips

1. **Always wrap JS in an IIFE** — `(function(){ ... })()` — to avoid "already declared" errors on retry
2. **List iframe names first** before trying to target elements
3. **Screenshot after every action** to verify what happened
4. **Try `browser_interact` with `iframe` param first** — only fall back to JS if that fails
5. **SPA navigation**: Click the app's own nav elements via JS — don't manipulate `window.location`
6. **Coordinate clicks**: Account for sidebar offset (e.g., 64px in V1)

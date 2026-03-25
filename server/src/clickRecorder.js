/**
 * Click Recorder - Captures user clicks/keypresses to build workflow files
 *
 * WHY: Manually finding element selectors in enterprise SPAs (V1, Dynamics, etc.)
 * is the #1 pain point in browser automation. The recorder lets users click through
 * the UI normally while it captures stable selectors, iframe context, and element
 * metadata. Output is a workflow-ready JSON file.
 *
 * HOW: Injects a JS listener into the page (and same-origin iframes) that:
 * 1. Captures click target: tag, id, classes, text, data-* attrs, aria-* attrs
 * 2. Computes stable selector candidates (prefer data-testid > aria-label > id > nth-child path)
 * 3. Records iframe context (name of parent iframe if any)
 * 4. Highlights clicked element with a red rectangle overlay
 * 5. Sends event data back via console.log with a unique prefix for extraction
 *
 * USAGE: Start recording, click through the task, stop recording, get workflow JSON.
 */

function debugLog(...args) {
  if (global.DEBUG_MODE) {
    console.error('[ClickRecorder]', ...args);
  }
}

// The JS to inject into pages. Self-contained, no dependencies.
const RECORDER_SCRIPT = `(function(){
  if (window.__blueprintRecorder) return 'already_active';

  window.__blueprintRecorder = {
    events: [],
    active: true
  };

  function getStableSelector(el) {
    // Priority order for stable selectors:
    // 1. data-testid (most stable, designed for automation)
    // 2. aria-label + tag
    // 3. id (if not dynamic-looking)
    // 4. role + text content
    // 5. tag + nth-child path (last resort)

    var candidates = [];

    // data-testid
    var testId = el.getAttribute('data-testid') || el.getAttribute('data-test-id') || el.getAttribute('data-automation-id');
    if (testId) candidates.push({type: 'data-testid', selector: '[data-testid="' + testId + '"]', stability: 'high'});

    // aria-label
    var ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) candidates.push({type: 'aria-label', selector: el.tagName.toLowerCase() + '[aria-label="' + ariaLabel + '"]', stability: 'high'});

    // id (skip if looks dynamic: contains hashes, uuids, or long random strings)
    if (el.id && !/[0-9a-f]{8,}|[0-9]{5,}|_[0-9]+$/.test(el.id)) {
      candidates.push({type: 'id', selector: '#' + CSS.escape(el.id), stability: 'medium'});
    }

    // role + name
    var role = el.getAttribute('role');
    if (role) {
      var name = el.getAttribute('aria-label') || el.textContent.trim().substring(0, 30);
      if (name) candidates.push({type: 'role', selector: '[role="' + role + '"]', text: name, stability: 'medium'});
    }

    // name attribute (form elements)
    if (el.name) candidates.push({type: 'name', selector: el.tagName.toLowerCase() + '[name="' + el.name + '"]', stability: 'medium'});

    // placeholder
    var placeholder = el.getAttribute('placeholder');
    if (placeholder) candidates.push({type: 'placeholder', selector: el.tagName.toLowerCase() + '[placeholder="' + placeholder + '"]', stability: 'medium'});

    // CSS class path (filter out dynamic classes like css-xxxx, emotion hashes)
    var stableClasses = Array.from(el.classList).filter(function(c) {
      return !/^css-|^sc-|^emotion|^e[a-z0-9]{6,}|^_[a-z0-9]{5,}|^jsx-/.test(c);
    });
    if (stableClasses.length > 0) {
      candidates.push({type: 'class', selector: el.tagName.toLowerCase() + '.' + stableClasses.join('.'), stability: 'low'});
    }

    // nth-child path (always works but brittle)
    var path = [];
    var current = el;
    while (current && current !== document.body && path.length < 5) {
      var parent = current.parentElement;
      if (!parent) break;
      var siblings = Array.from(parent.children).filter(function(s) { return s.tagName === current.tagName; });
      if (siblings.length > 1) {
        var idx = siblings.indexOf(current) + 1;
        path.unshift(current.tagName.toLowerCase() + ':nth-child(' + idx + ')');
      } else {
        path.unshift(current.tagName.toLowerCase());
      }
      current = parent;
    }
    candidates.push({type: 'path', selector: path.join(' > '), stability: 'low'});

    return candidates;
  }

  function getElementInfo(el) {
    var rect = el.getBoundingClientRect();
    var text = el.textContent ? el.textContent.trim().substring(0, 100) : '';
    var attrs = {};
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      if (['class', 'style'].indexOf(a.name) === -1) {
        attrs[a.name] = a.value.substring(0, 100);
      }
    }
    return {
      tag: el.tagName,
      text: text,
      attrs: attrs,
      rect: {x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height)},
      selectors: getStableSelector(el),
      visible: el.offsetParent !== null,
      enabled: !el.disabled,
      stableClasses: Array.from(el.classList).filter(function(c) {
        return !/^css-|^sc-|^emotion|^e[a-z0-9]{6,}|^_[a-z0-9]{5,}|^jsx-/.test(c);
      })
    };
  }

  function highlightElement(el) {
    var rect = el.getBoundingClientRect();
    var overlay = document.createElement('div');
    overlay.className = '__bp-recorder-highlight';
    overlay.style.cssText = 'position:fixed;border:3px solid red;background:rgba(255,0,0,0.1);pointer-events:none;z-index:999999;transition:opacity 0.5s;' +
      'left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;';

    // Step number badge
    var badge = document.createElement('div');
    badge.style.cssText = 'position:absolute;top:-12px;left:-12px;background:red;color:white;border-radius:50%;width:24px;height:24px;font:bold 12px sans-serif;display:flex;align-items:center;justify-content:center;';
    badge.textContent = window.__blueprintRecorder.events.length + 1;
    overlay.appendChild(badge);

    document.body.appendChild(overlay);
    setTimeout(function() { overlay.style.opacity = '0.3'; }, 2000);
  }

  function handleClick(e) {
    if (!window.__blueprintRecorder || !window.__blueprintRecorder.active) return;

    var el = e.target;
    var info = getElementInfo(el);

    // Check if click was inside an iframe
    var iframeName = null;
    try {
      if (window.frameElement) {
        iframeName = window.frameElement.name || window.frameElement.id || null;
      }
    } catch(err) {}

    var event = {
      type: 'click',
      timestamp: new Date().toISOString(),
      element: info,
      iframe: iframeName,
      url: location.href,
      pageTitle: document.title
    };

    window.__blueprintRecorder.events.push(event);
    highlightElement(el);

    // Send to extension via console with unique prefix
    console.log('__BP_RECORDER__' + JSON.stringify(event));
  }

  function handleKeypress(e) {
    if (!window.__blueprintRecorder || !window.__blueprintRecorder.active) return;
    if (['Enter', 'Tab', 'Escape'].indexOf(e.key) === -1) return; // Only capture significant keys

    var el = e.target;
    var info = getElementInfo(el);
    var iframeName = null;
    try { if (window.frameElement) iframeName = window.frameElement.name || null; } catch(err) {}

    var event = {
      type: 'keypress',
      key: e.key,
      timestamp: new Date().toISOString(),
      element: info,
      iframe: iframeName,
      inputValue: el.value ? el.value.substring(0, 200) : null,
      url: location.href
    };

    window.__blueprintRecorder.events.push(event);
    console.log('__BP_RECORDER__' + JSON.stringify(event));
  }

  // Listen on main document
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeypress, true);

  // Also inject into same-origin iframes
  var iframes = document.querySelectorAll('iframe');
  for (var i = 0; i < iframes.length; i++) {
    try {
      var d = iframes[i].contentDocument;
      if (d) {
        d.addEventListener('click', handleClick, true);
        d.addEventListener('keydown', handleKeypress, true);
      }
    } catch(e) { /* cross-origin, skip */ }
  }

  return 'recorder_started';
})()`;

const STOP_SCRIPT = `(function(){
  if (!window.__blueprintRecorder) return JSON.stringify({events: [], error: 'not_active'});
  window.__blueprintRecorder.active = false;
  var events = window.__blueprintRecorder.events;

  // Clean up highlights
  document.querySelectorAll('.__bp-recorder-highlight').forEach(function(el) { el.remove(); });
  // Clean up iframe listeners (best effort)
  document.querySelectorAll('iframe').forEach(function(f) {
    try { if (f.contentDocument) {
      f.contentDocument.querySelectorAll('.__bp-recorder-highlight').forEach(function(el) { el.remove(); });
    }} catch(e) {}
  });

  delete window.__blueprintRecorder;
  return JSON.stringify({events: events, count: events.length});
})()`;

class ClickRecorder {
  constructor() {
    this._recording = false;
    this._events = [];
  }

  get isRecording() {
    return this._recording;
  }

  /**
   * Start recording clicks in the current page
   */
  async start(transport) {
    if (this._recording) return { success: false, message: 'Already recording' };
    this._events = [];
    this._recording = true;

    try {
      const result = await transport.sendCommand('forwardCDPCommand', {
        method: 'Runtime.evaluate',
        params: { expression: RECORDER_SCRIPT, returnByValue: true }
      });

      // Also inject into iframes
      await transport.sendCommand('forwardCDPCommand', {
        method: 'Runtime.evaluate',
        params: {
          expression: `(function(){
            var iframes = document.querySelectorAll('iframe');
            var injected = 0;
            for (var i = 0; i < iframes.length; i++) {
              try {
                var d = iframes[i].contentDocument;
                if (d && !d.defaultView.__blueprintRecorder) {
                  d.defaultView.eval(${JSON.stringify(RECORDER_SCRIPT)});
                  injected++;
                }
              } catch(e) {}
            }
            return injected;
          })()`,
          returnByValue: true
        }
      });

      debugLog('Recording started');
      return { success: true, message: 'Recording started. Click through your task — each click is captured with element selectors.' };
    } catch (e) {
      this._recording = false;
      return { success: false, message: 'Failed to start: ' + e.message };
    }
  }

  /**
   * Stop recording and return captured events
   */
  async stop(transport) {
    if (!this._recording) return { success: false, message: 'Not recording' };
    this._recording = false;

    try {
      // Collect from main page
      const result = await transport.sendCommand('forwardCDPCommand', {
        method: 'Runtime.evaluate',
        params: { expression: STOP_SCRIPT, returnByValue: true }
      });

      let data = { events: [] };
      if (result?.result?.value) {
        data = JSON.parse(result.result.value);
      }

      // Also collect from iframes
      const iframeResult = await transport.sendCommand('forwardCDPCommand', {
        method: 'Runtime.evaluate',
        params: {
          expression: `(function(){
            var allEvents = [];
            var iframes = document.querySelectorAll('iframe');
            for (var i = 0; i < iframes.length; i++) {
              try {
                var w = iframes[i].contentWindow;
                if (w && w.__blueprintRecorder) {
                  allEvents = allEvents.concat(w.__blueprintRecorder.events.map(function(e) {
                    e.iframe = iframes[i].name || iframes[i].id || ('iframe_' + i);
                    return e;
                  }));
                  w.__blueprintRecorder.active = false;
                  delete w.__blueprintRecorder;
                }
              } catch(e) {}
            }
            return JSON.stringify(allEvents);
          })()`,
          returnByValue: true
        }
      });

      if (iframeResult?.result?.value) {
        const iframeEvents = JSON.parse(iframeResult.result.value);
        data.events = data.events.concat(iframeEvents);
      }

      // Sort by timestamp
      data.events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      this._events = data.events;
      debugLog(`Recording stopped: ${data.events.length} events`);

      return {
        success: true,
        eventCount: data.events.length,
        events: data.events
      };
    } catch (e) {
      return { success: false, message: 'Failed to stop: ' + e.message };
    }
  }

  /**
   * Convert recorded events to a workflow JSON structure
   */
  toWorkflow(name, description) {
    const steps = this._events.map((evt, i) => {
      const step = {
        id: 'step_' + (i + 1),
        action: evt.type === 'click' ? 'click_in_iframe' : 'type_in_iframe',
        description: this._describeEvent(evt),
      };

      if (evt.iframe) {
        step.iframePattern = evt.iframe;
      }

      // Pick best selector
      const selectors = evt.element.selectors || [];
      const best = selectors.find(s => s.stability === 'high') || selectors.find(s => s.stability === 'medium') || selectors[0];
      if (best) {
        step.findElement = { selector: best.selector, type: best.type };
        if (evt.element.text && evt.element.text.length < 50) {
          step.findElement.text = evt.element.text;
        }
      }

      // All selector candidates for reference
      step.selectorCandidates = selectors;

      if (evt.type === 'keypress') {
        step.key = evt.key;
        if (evt.inputValue) step.inputValue = evt.inputValue;
      }

      return step;
    });

    return {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: name,
      description: description || 'Recorded workflow',
      steps: steps,
      recordedAt: new Date().toISOString(),
      eventCount: this._events.length
    };
  }

  _describeEvent(evt) {
    const el = evt.element;
    const tag = el.tag.toLowerCase();
    const text = el.text ? el.text.substring(0, 40) : '';

    if (evt.type === 'keypress') {
      return `Press ${evt.key} on ${tag}` + (text ? ` "${text}"` : '');
    }

    if (tag === 'button' || tag === 'a') {
      return `Click ${tag}` + (text ? ` "${text}"` : '');
    }
    if (tag === 'input' || tag === 'textarea') {
      return `Click ${tag}` + (el.attrs.placeholder ? ` (${el.attrs.placeholder})` : '');
    }
    return `Click ${tag}` + (text ? ` "${text}"` : '');
  }
}

module.exports = { ClickRecorder };

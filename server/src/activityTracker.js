/**
 * Activity Tracker - Full V1 console user activity instrumentation
 *
 * Evolved from clickRecorder.js. Tracks:
 * - Clicks (with stable selectors, iframe context, element metadata)
 * - Keypresses (Enter, Tab, Escape)
 * - Hover events (>500ms threshold, element info, duration)
 * - Scroll depth (max % per page, scroll events)
 * - Page dwell time (enter/leave via visibilitychange + hashchange)
 * - Navigation paths (page transitions with timestamps)
 *
 * All events sent via console.log('__BP_ACTIVITY__' + JSON.stringify(event))
 */

const debugLog = require('./debugLog')('ActivityTracker');

// Injected JS — self-contained, no dependencies, ES5 for max compat
const TRACKER_SCRIPT = `(function(){
  if (window.__bpActivity) return 'already_active';

  window.__bpActivity = {
    events: [],
    active: true,
    pageEnteredAt: Date.now(),
    currentUrl: location.href,
    maxScrollPct: 0,
    hoverState: null
  };

  var T = window.__bpActivity;
  var PREFIX = '__BP_ACTIVITY__';

  // ============ Shared helpers ============

  function getStableSelector(el) {
    var candidates = [];
    var testId = el.getAttribute('data-testid') || el.getAttribute('data-test-id') || el.getAttribute('data-automation-id');
    if (testId) candidates.push({type: 'data-testid', selector: '[data-testid="' + testId + '"]', stability: 'high'});

    var ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) candidates.push({type: 'aria-label', selector: el.tagName.toLowerCase() + '[aria-label="' + ariaLabel + '"]', stability: 'high'});

    if (el.id && !/[0-9a-f]{8,}|[0-9]{5,}|_[0-9]+$/.test(el.id)) {
      candidates.push({type: 'id', selector: '#' + CSS.escape(el.id), stability: 'medium'});
    }

    var role = el.getAttribute('role');
    if (role) {
      var name = el.getAttribute('aria-label') || el.textContent.trim().substring(0, 30);
      if (name) candidates.push({type: 'role', selector: '[role="' + role + '"]', text: name, stability: 'medium'});
    }

    if (el.name) candidates.push({type: 'name', selector: el.tagName.toLowerCase() + '[name="' + el.name + '"]', stability: 'medium'});

    var placeholder = el.getAttribute('placeholder');
    if (placeholder) candidates.push({type: 'placeholder', selector: el.tagName.toLowerCase() + '[placeholder="' + placeholder + '"]', stability: 'medium'});

    var stableClasses = Array.from(el.classList).filter(function(c) {
      return !/^css-|^sc-|^emotion|^e[a-z0-9]{6,}|^_[a-z0-9]{5,}|^jsx-/.test(c);
    });
    if (stableClasses.length > 0) {
      candidates.push({type: 'class', selector: el.tagName.toLowerCase() + '.' + stableClasses.join('.'), stability: 'low'});
    }

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
      visible: el.offsetParent !== null
    };
  }

  function getIframeName() {
    try { return window.frameElement ? (window.frameElement.name || window.frameElement.id || null) : null; }
    catch(e) { return null; }
  }

  function emit(event) {
    T.events.push(event);
    console.log(PREFIX + JSON.stringify(event));
  }

  // ============ Click tracking ============

  function handleClick(e) {
    if (!T.active) return;
    emit({
      type: 'click',
      timestamp: new Date().toISOString(),
      element: getElementInfo(e.target),
      iframe: getIframeName(),
      url: location.href,
      pageTitle: document.title
    });
  }

  // ============ Keypress tracking ============

  function handleKeypress(e) {
    if (!T.active) return;
    if (['Enter', 'Tab', 'Escape'].indexOf(e.key) === -1) return;
    emit({
      type: 'keypress',
      key: e.key,
      timestamp: new Date().toISOString(),
      element: getElementInfo(e.target),
      iframe: getIframeName(),
      inputValue: e.target.value ? e.target.value.substring(0, 200) : null,
      url: location.href
    });
  }

  // ============ Hover tracking (>500ms threshold) ============

  function handleMouseOver(e) {
    if (!T.active) return;
    var el = e.target;
    if (el === document.body || el === document.documentElement) return;
    var tag = el.tagName;
    if (!tag) return;
    var meaningful = ['A','BUTTON','INPUT','SELECT','TEXTAREA','LI','TD','TH','SPAN','DIV','LABEL','IMG','SVG','PATH','H1','H2','H3','H4','H5','H6'];
    var hasTooltipAttr = el.getAttribute('title') || el.getAttribute('aria-label') || el.getAttribute('role') || el.getAttribute('data-tooltip');
    if (meaningful.indexOf(tag) === -1 && !hasTooltipAttr) return;

    T.hoverState = {
      el: el,
      startTime: Date.now(),
      info: getElementInfo(el)
    };
  }

  function handleMouseOut(e) {
    if (!T.active || !T.hoverState) return;
    if (e.target !== T.hoverState.el) return;
    var duration = Date.now() - T.hoverState.startTime;
    if (duration >= 500) {
      emit({
        type: 'hover',
        timestamp: new Date(T.hoverState.startTime).toISOString(),
        durationMs: duration,
        element: T.hoverState.info,
        iframe: getIframeName(),
        url: location.href
      });
    }
    T.hoverState = null;
  }

  // ============ Scroll depth tracking ============

  var scrollTimer = null;
  function handleScroll() {
    if (!T.active) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function() {
      var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      var scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      var clientHeight = document.documentElement.clientHeight;
      var pct = scrollHeight > clientHeight ? Math.round((scrollTop + clientHeight) / scrollHeight * 100) : 100;
      if (pct > T.maxScrollPct) {
        T.maxScrollPct = pct;
        emit({
          type: 'scroll_depth',
          timestamp: new Date().toISOString(),
          scrollPct: pct,
          url: location.href,
          iframe: getIframeName()
        });
      }
    }, 300);
  }

  // ============ Page dwell / navigation tracking ============

  function emitPageLeave(reason) {
    if (!T.active) return;
    var dwellMs = Date.now() - T.pageEnteredAt;
    if (dwellMs < 500) return;
    emit({
      type: 'page_dwell',
      timestamp: new Date(T.pageEnteredAt).toISOString(),
      dwellMs: dwellMs,
      maxScrollPct: T.maxScrollPct,
      url: T.currentUrl,
      reason: reason
    });
  }

  function handleHashChange() {
    if (!T.active) return;
    var oldUrl = T.currentUrl;
    emitPageLeave('hashchange');
    T.currentUrl = location.href;
    T.pageEnteredAt = Date.now();
    T.maxScrollPct = 0;
    emit({
      type: 'navigation',
      timestamp: new Date().toISOString(),
      from: oldUrl,
      to: location.href,
      method: 'hashchange'
    });
  }

  function handleVisibilityChange() {
    if (!T.active) return;
    if (document.hidden) {
      emitPageLeave('hidden');
    } else {
      T.pageEnteredAt = Date.now();
    }
  }

  function handleBeforeUnload() {
    if (!T.active) return;
    emitPageLeave('unload');
  }

  // ============ Attach listeners ============

  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeypress, true);
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('scroll', handleScroll, true);
  window.addEventListener('hashchange', handleHashChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleBeforeUnload);

  // Also inject into same-origin iframes
  var iframes = document.querySelectorAll('iframe');
  for (var i = 0; i < iframes.length; i++) {
    try {
      var d = iframes[i].contentDocument;
      if (d) {
        d.addEventListener('click', handleClick, true);
        d.addEventListener('keydown', handleKeypress, true);
        d.addEventListener('mouseover', handleMouseOver, true);
        d.addEventListener('mouseout', handleMouseOut, true);
        d.addEventListener('scroll', handleScroll, true);
      }
    } catch(e) { /* cross-origin, skip */ }
  }

  return 'activity_tracker_started';
})()`;

const STOP_SCRIPT = `(function(){
  if (!window.__bpActivity) return JSON.stringify({events: [], error: 'not_active'});
  var T = window.__bpActivity;
  T.active = false;

  // Emit final dwell for current page
  var dwellMs = Date.now() - T.pageEnteredAt;
  if (dwellMs >= 500) {
    T.events.push({
      type: 'page_dwell',
      timestamp: new Date(T.pageEnteredAt).toISOString(),
      dwellMs: dwellMs,
      maxScrollPct: T.maxScrollPct,
      url: T.currentUrl,
      reason: 'stop'
    });
  }

  var events = T.events;
  delete window.__bpActivity;
  return JSON.stringify({events: events, count: events.length});
})()`;

class ActivityTracker {
  constructor() {
    this._recording = false;
    this._events = [];
  }

  get isRecording() {
    return this._recording;
  }

  async start(transport) {
    if (this._recording) return { success: false, message: 'Already recording' };
    this._events = [];
    this._recording = true;

    try {
      await transport.sendCommand('forwardCDPCommand', {
        method: 'Runtime.evaluate',
        params: { expression: TRACKER_SCRIPT, returnByValue: true }
      });

      // Inject into iframes too
      await transport.sendCommand('forwardCDPCommand', {
        method: 'Runtime.evaluate',
        params: {
          expression: `(function(){
            var iframes = document.querySelectorAll('iframe');
            var injected = 0;
            for (var i = 0; i < iframes.length; i++) {
              try {
                var d = iframes[i].contentDocument;
                if (d && !d.defaultView.__bpActivity) {
                  d.defaultView.eval(${JSON.stringify(TRACKER_SCRIPT)});
                  injected++;
                }
              } catch(e) {}
            }
            return injected;
          })()`,
          returnByValue: true
        }
      });

      debugLog('Activity tracking started');
      return { success: true, message: 'Activity tracking started. Capturing clicks, hovers (>500ms), scroll depth, page dwell, and navigation.' };
    } catch (e) {
      this._recording = false;
      return { success: false, message: 'Failed to start: ' + e.message };
    }
  }

  async stop(transport) {
    if (!this._recording) return { success: false, message: 'Not recording' };
    this._recording = false;

    try {
      const result = await transport.sendCommand('forwardCDPCommand', {
        method: 'Runtime.evaluate',
        params: { expression: STOP_SCRIPT, returnByValue: true }
      });

      let data = { events: [] };
      if (result?.result?.value) {
        data = JSON.parse(result.result.value);
      }

      // Collect from iframes
      const iframeResult = await transport.sendCommand('forwardCDPCommand', {
        method: 'Runtime.evaluate',
        params: {
          expression: `(function(){
            var allEvents = [];
            var iframes = document.querySelectorAll('iframe');
            for (var i = 0; i < iframes.length; i++) {
              try {
                var w = iframes[i].contentWindow;
                if (w && w.__bpActivity) {
                  allEvents = allEvents.concat(w.__bpActivity.events.map(function(e) {
                    e.iframe = iframes[i].name || iframes[i].id || ('iframe_' + i);
                    return e;
                  }));
                  w.__bpActivity.active = false;
                  delete w.__bpActivity;
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

      data.events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      this._events = data.events;
      debugLog(`Activity tracking stopped: ${data.events.length} events`);

      return {
        success: true,
        eventCount: data.events.length,
        events: data.events,
        summary: this._summarize(data.events)
      };
    } catch (e) {
      return { success: false, message: 'Failed to stop: ' + e.message };
    }
  }

  _summarize(events) {
    const clicks = events.filter(e => e.type === 'click');
    const hovers = events.filter(e => e.type === 'hover');
    const dwells = events.filter(e => e.type === 'page_dwell');
    const navs = events.filter(e => e.type === 'navigation');
    const scrolls = events.filter(e => e.type === 'scroll_depth');

    return {
      totalEvents: events.length,
      clicks: clicks.length,
      hovers: hovers.length,
      pageVisits: dwells.length,
      navigations: navs.length,
      scrollEvents: scrolls.length,
      topPages: this._topPages(dwells),
      topClicked: this._topClicked(clicks),
      topHovered: this._topHovered(hovers),
      navFlow: navs.map(n => ({ from: n.from, to: n.to }))
    };
  }

  _topPages(dwells) {
    const byUrl = {};
    for (const d of dwells) {
      if (!byUrl[d.url]) byUrl[d.url] = { totalMs: 0, visits: 0, maxScrollPct: 0 };
      byUrl[d.url].totalMs += d.dwellMs;
      byUrl[d.url].visits++;
      byUrl[d.url].maxScrollPct = Math.max(byUrl[d.url].maxScrollPct, d.maxScrollPct || 0);
    }
    return Object.entries(byUrl)
      .map(([url, data]) => ({ url, ...data }))
      .sort((a, b) => b.totalMs - a.totalMs)
      .slice(0, 10);
  }

  _topClicked(clicks) {
    const byText = {};
    for (const c of clicks) {
      const key = (c.element.tag + ':' + (c.element.text || '').substring(0, 40)).toLowerCase();
      if (!byText[key]) byText[key] = { count: 0, element: key };
      byText[key].count++;
    }
    return Object.values(byText).sort((a, b) => b.count - a.count).slice(0, 10);
  }

  _topHovered(hovers) {
    const byText = {};
    for (const h of hovers) {
      const key = (h.element.tag + ':' + (h.element.text || '').substring(0, 40)).toLowerCase();
      if (!byText[key]) byText[key] = { count: 0, totalMs: 0, element: key };
      byText[key].count++;
      byText[key].totalMs += h.durationMs;
    }
    return Object.values(byText).sort((a, b) => b.totalMs - a.totalMs).slice(0, 10);
  }
}

module.exports = { ActivityTracker };

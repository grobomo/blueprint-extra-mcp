/**
 * Action Validator - Post-action validation, diagnostics, and issue tracking
 *
 * Wraps Blueprint tool calls with:
 * 1. Pre-action state capture (snapshot before)
 * 2. Post-action validation (did the action register?)
 * 3. Automated diagnostics on failure (iframe, timing, selector issues)
 * 4. Issue tracking with root cause analysis
 * 5. Summary reporting of common failure patterns
 */

const fs = require('fs');
const path = require('path');

function debugLog(...args) {
  if (global.DEBUG_MODE) {
    console.error('[ActionValidator]', ...args);
  }
}

// Tools that modify page state and should be validated
const VALIDATABLE_TOOLS = new Set([
  'browser_interact',
  'browser_navigate',
  'browser_fill_form',
  'browser_evaluate'
]);

// Tools that read state (used for diagnostics, never validated themselves)
const DIAGNOSTIC_TOOLS = new Set([
  'browser_snapshot',
  'browser_take_screenshot',
  'browser_evaluate',
  'browser_lookup',
  'browser_verify_text_visible',
  'browser_verify_element_visible'
]);

class ActionValidator {
  constructor() {
    this._issues = [];           // All tracked issues
    this._maxIssues = 200;       // Rolling buffer
    this._diagnosticScripts = this._buildDiagnosticScripts();
    this._enabled = true;
  }

  /**
   * Pre-built diagnostic scripts for common failure patterns
   */
  _buildDiagnosticScripts() {
    return {
      // Check if page has iframes and what's inside them
      iframeCheck: `(function(){
        const frames = document.querySelectorAll('iframe');
        return JSON.stringify(Array.from(frames).map((f,i) => {
          let accessible = false, origin = '', docReady = '';
          try {
            accessible = !!f.contentDocument;
            origin = 'same-origin';
            docReady = f.contentDocument.readyState;
          } catch(e) { origin = 'cross-origin'; }
          return {
            i, name: f.name || f.id || '(none)',
            src: (f.src||'').substring(0,100),
            visible: f.offsetParent !== null,
            rect: f.getBoundingClientRect(),
            accessible, origin, docReady
          };
        }));
      })()`,

      // Check if page is still loading
      pageLoadState: `(function(){
        return JSON.stringify({
          readyState: document.readyState,
          pendingXHR: performance.getEntriesByType('resource').filter(r => !r.responseEnd).length,
          bodyChildren: document.body ? document.body.children.length : 0,
          hasSpinner: !!(document.querySelector('.spinner, .loading, [class*="loading"], [class*="spinner"], .ant-spin, .ant-skeleton')),
          title: document.title,
          url: location.href
        });
      })()`,

      // Check for modals/overlays blocking interaction
      overlayCheck: `(function(){
        const overlays = document.querySelectorAll(
          '.ant-modal-wrap, .ant-drawer, [class*="modal"], [class*="overlay"], [class*="backdrop"], [role="dialog"]'
        );
        return JSON.stringify(Array.from(overlays).filter(e => {
          const s = getComputedStyle(e);
          return s.display !== 'none' && s.visibility !== 'hidden';
        }).map(e => ({
          tag: e.tagName, cls: e.className?.toString?.().substring(0,80),
          text: e.textContent?.substring(0,100),
          rect: e.getBoundingClientRect()
        })));
      })()`,

      // Check element visibility and interactability at a point
      elementAtPoint: (x, y) => `(function(){
        const el = document.elementFromPoint(${x}, ${y});
        if (!el) return JSON.stringify({found: false, x: ${x}, y: ${y}});
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return JSON.stringify({
          found: true, tag: el.tagName,
          cls: el.className?.toString?.().substring(0,80),
          text: el.textContent?.substring(0,50),
          rect: r, pointerEvents: s.pointerEvents,
          opacity: s.opacity, zIndex: s.zIndex,
          disabled: el.disabled, inert: el.inert
        });
      })()`,

      // Comprehensive selector search in iframes
      selectorInIframes: (selector) => `(function(){
        const results = [];
        const escaped = ${JSON.stringify(selector)};
        // Check main document
        try {
          const el = document.querySelector(escaped);
          if (el) results.push({location: 'main', found: true, visible: el.offsetParent !== null});
        } catch(e) { results.push({location: 'main', error: e.message}); }
        // Check iframes
        document.querySelectorAll('iframe').forEach((f, i) => {
          try {
            const d = f.contentDocument;
            if (!d) return;
            const el = d.querySelector(escaped);
            if (el) results.push({location: 'iframe:'+( f.name||f.id||i), found: true, visible: el.offsetParent !== null});
          } catch(e) {}
        });
        return JSON.stringify(results);
      })()`
    };
  }

  /**
   * Wrap a tool call with validation
   * @param {string} toolName - Tool being called
   * @param {object} args - Tool arguments
   * @param {Function} executeCall - The actual tool call function
   * @param {object} backend - UnifiedBackend for running diagnostics
   * @returns {object} Tool result, potentially enriched with diagnostics
   */
  async wrapCall(toolName, args, executeCall, backend) {
    if (!this._enabled || !VALIDATABLE_TOOLS.has(toolName)) {
      return await executeCall();
    }

    const startTime = Date.now();
    let result;
    let preState = null;

    // Capture pre-state for navigate/interact
    try {
      preState = await this._capturePreState(toolName, args, backend);
    } catch (e) {
      debugLog('Pre-state capture failed (non-fatal):', e.message);
    }

    // Execute the actual call
    result = await executeCall();

    const elapsed = Date.now() - startTime;

    // Check if result indicates failure
    const failure = this._detectFailure(toolName, args, result);

    if (failure) {
      // Run diagnostics
      const diagnostics = await this._runDiagnostics(toolName, args, failure, backend, preState);

      // Track the issue
      const issue = this._trackIssue(toolName, args, failure, diagnostics, elapsed);

      // Enrich the result with diagnostic info
      result = this._enrichResult(result, diagnostics, issue);
    }

    return result;
  }

  /**
   * Capture page state before action
   */
  async _capturePreState(toolName, args, backend) {
    if (!backend?._transport) return null;

    try {
      const evalResult = await backend._transport.sendCommand('forwardCDPCommand', {
        method: 'Runtime.evaluate',
        params: {
          expression: this._diagnosticScripts.pageLoadState,
          returnByValue: true
        }
      });
      return evalResult?.result?.value ? JSON.parse(evalResult.result.value) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Detect if a tool result indicates failure
   * @returns {object|null} Failure info or null if success
   */
  _detectFailure(toolName, args, result) {
    if (!result) return { type: 'null_result', message: 'Tool returned null' };

    // Check isError flag
    if (result.isError) {
      const text = this._extractText(result);
      return {
        type: this._classifyError(text),
        message: text.substring(0, 200)
      };
    }

    const text = this._extractText(result);

    // Check for common error patterns in response text
    if (/element not found/i.test(text)) {
      return { type: 'element_not_found', message: text.substring(0, 200) };
    }
    if (/unknown action/i.test(text)) {
      return { type: 'unknown_action', message: text.substring(0, 200) };
    }
    if (/timeout|timed out/i.test(text)) {
      return { type: 'timeout', message: text.substring(0, 200) };
    }
    if (/not attached|no tab/i.test(text)) {
      return { type: 'no_tab', message: text.substring(0, 200) };
    }
    if (/not active|not enabled|passive/i.test(text)) {
      return { type: 'not_enabled', message: text.substring(0, 200) };
    }
    if (/javascript error/i.test(text)) {
      return { type: 'js_error', message: text.substring(0, 200) };
    }

    // For interact actions, check if 0 succeeded
    if (toolName === 'browser_interact' && /0 succeeded/i.test(text)) {
      return { type: 'interact_all_failed', message: text.substring(0, 200) };
    }

    return null; // No failure detected
  }

  /**
   * Classify error text into a category
   */
  _classifyError(text) {
    // Order matters: more specific patterns first
    if (/element not found|selector/i.test(text)) return 'element_not_found';
    if (/unknown action/i.test(text)) return 'unknown_action';
    if (/timeout/i.test(text)) return 'timeout';
    if (/disconnected|connection lost/i.test(text)) return 'connection';
    if (/cross-origin/i.test(text)) return 'cross_origin';
    if (/SyntaxError|TypeError|ReferenceError|RangeError/i.test(text)) return 'js_error';
    if (/iframe.*access|cannot access iframe/i.test(text)) return 'iframe_issue';
    return 'unknown';
  }

  /**
   * Run targeted diagnostics based on failure type
   */
  async _runDiagnostics(toolName, args, failure, backend, preState) {
    const diagnostics = { checks: [], rootCause: null, suggestion: null };

    if (!backend?._transport) {
      diagnostics.rootCause = 'no_transport';
      diagnostics.suggestion = 'Backend transport unavailable. Call enable + browser_tabs first.';
      return diagnostics;
    }

    const runScript = async (name, script) => {
      try {
        const r = await backend._transport.sendCommand('forwardCDPCommand', {
          method: 'Runtime.evaluate',
          params: { expression: script, returnByValue: true }
        });
        const val = r?.result?.value;
        const parsed = typeof val === 'string' ? JSON.parse(val) : val;
        diagnostics.checks.push({ name, result: parsed });
        return parsed;
      } catch (e) {
        diagnostics.checks.push({ name, error: e.message });
        return null;
      }
    };

    // Always check page load state
    const pageState = await runScript('pageLoadState', this._diagnosticScripts.pageLoadState);

    // Failure-specific diagnostics
    switch (failure.type) {
      case 'element_not_found': {
        // Check iframes
        const iframes = await runScript('iframeCheck', this._diagnosticScripts.iframeCheck);

        if (iframes && iframes.length > 0) {
          const sameOrigin = iframes.filter(f => f.accessible);
          if (sameOrigin.length > 0) {
            diagnostics.rootCause = 'element_in_iframe';
            diagnostics.suggestion = `Element may be inside iframe "${sameOrigin[0].name}". ` +
              `Use iframe parameter or browser_evaluate with contentDocument access.`;
          } else {
            diagnostics.rootCause = 'cross_origin_iframe';
            diagnostics.suggestion = 'Page has cross-origin iframes. Elements inside them are not directly accessible.';
          }
        }

        // Check if page still loading
        if (pageState && pageState.readyState !== 'complete') {
          diagnostics.rootCause = 'page_loading';
          diagnostics.suggestion = `Page still loading (readyState: ${pageState.readyState}). Wait and retry.`;
        }

        // Check for blocking overlays
        const overlays = await runScript('overlayCheck', this._diagnosticScripts.overlayCheck);
        if (overlays && overlays.length > 0) {
          diagnostics.rootCause = 'blocked_by_overlay';
          diagnostics.suggestion = `Modal/overlay is blocking: ${overlays[0].cls}. Dismiss it first.`;
        }

        // Try to find the selector inside iframes
        const selector = this._extractSelector(args);
        if (selector) {
          await runScript('selectorInIframes', this._diagnosticScripts.selectorInIframes(selector));
        }

        // If no specific root cause found, it's a plain selector miss
        if (!diagnostics.rootCause) {
          diagnostics.rootCause = 'element_not_found';
          diagnostics.suggestion = selector
            ? `Selector "${selector}" not found on page or in any accessible iframe. Verify the selector exists — use browser_snapshot or browser_lookup to find the right one.`
            : 'Element not found. Use browser_snapshot to inspect page structure.';
        }
        break;
      }

      case 'timeout': {
        if (pageState) {
          if (pageState.hasSpinner) {
            diagnostics.rootCause = 'page_loading_spinner';
            diagnostics.suggestion = 'Page shows loading indicator. Content may not be ready yet. Wait and retry.';
          } else if (pageState.readyState !== 'complete') {
            diagnostics.rootCause = 'page_loading';
            diagnostics.suggestion = `Page readyState: ${pageState.readyState}. Wait for load completion.`;
          } else {
            diagnostics.rootCause = 'slow_response';
            diagnostics.suggestion = 'Page loaded but action timed out. Element may be dynamically rendered.';
          }
        }
        break;
      }

      case 'iframe_issue':
      case 'cross_origin': {
        const iframes = await runScript('iframeCheck', this._diagnosticScripts.iframeCheck);
        diagnostics.rootCause = 'iframe_access';
        diagnostics.suggestion = iframes
          ? `Found ${iframes.length} iframe(s). Same-origin: ${iframes.filter(f => f.accessible).length}. ` +
            `Use browser_evaluate with contentDocument for same-origin iframes.`
          : 'Could not enumerate iframes.';
        break;
      }

      case 'unknown_action': {
        diagnostics.rootCause = 'api_misuse';
        const action = args?.actions?.[0];
        diagnostics.suggestion = action
          ? `Action type "${action.action || action.type}" not recognized. ` +
            `Valid types: click, type, press, hover, select_option, scroll, wait.`
          : 'Missing or malformed actions array. Each action needs a "type" field.';
        break;
      }

      case 'interact_all_failed': {
        // Check iframes + overlays
        await runScript('iframeCheck', this._diagnosticScripts.iframeCheck);
        await runScript('overlayCheck', this._diagnosticScripts.overlayCheck);
        if (pageState && pageState.readyState !== 'complete') {
          diagnostics.rootCause = 'page_loading';
          diagnostics.suggestion = 'Page not fully loaded when interaction attempted.';
        }
        break;
      }

      case 'js_error': {
        diagnostics.rootCause = 'javascript_error';
        diagnostics.suggestion = 'JavaScript execution error. Check for variable name collisions (use IIFE wrapper) or cross-origin restrictions.';
        break;
      }

      default: {
        // Generic diagnostics
        await runScript('iframeCheck', this._diagnosticScripts.iframeCheck);
        break;
      }
    }

    // If no root cause identified yet, set generic
    if (!diagnostics.rootCause) {
      diagnostics.rootCause = failure.type;
      // Extract just the meaningful part of the error, stripping status headers
      const cleanMsg = failure.message.replace(/^.*?---\s*/s, '').replace(/^###\s*Error\s*/m, '').trim();
      const shortMsg = cleanMsg.split('\n')[0].substring(0, 120);
      diagnostics.suggestion = shortMsg || `Action failed with ${failure.type}`;
    }

    return diagnostics;
  }

  /**
   * Track an issue for pattern analysis
   */
  _trackIssue(toolName, args, failure, diagnostics, elapsed) {
    const issue = {
      timestamp: new Date().toISOString(),
      tool: toolName,
      failureType: failure.type,
      rootCause: diagnostics.rootCause,
      suggestion: diagnostics.suggestion,
      elapsed,
      url: diagnostics.checks.find(c => c.name === 'pageLoadState')?.result?.url || 'unknown',
      selector: this._extractSelector(args),
      checks: diagnostics.checks.map(c => c.name)
    };

    this._issues.push(issue);

    // Rolling buffer
    if (this._issues.length > this._maxIssues) {
      this._issues = this._issues.slice(-this._maxIssues);
    }

    debugLog('Issue tracked:', issue.failureType, '->', issue.rootCause);
    return issue;
  }

  /**
   * Enrich the tool result with diagnostic information
   */
  _enrichResult(result, diagnostics, issue) {
    const diagText = [];
    diagText.push('\n---\n### Action Validator - Diagnostics\n');
    diagText.push(`**Root cause:** ${diagnostics.rootCause}`);
    diagText.push(`**Suggestion:** ${diagnostics.suggestion}`);

    // Add check results
    for (const check of diagnostics.checks) {
      if (check.error) {
        diagText.push(`\n**${check.name}:** Error - ${check.error}`);
      } else if (check.result) {
        const summary = this._summarizeCheck(check.name, check.result);
        if (summary) diagText.push(`\n**${check.name}:** ${summary}`);
      }
    }

    // Add pattern info if this is a repeat
    const similar = this._issues.filter(i =>
      i.rootCause === issue.rootCause && i.timestamp !== issue.timestamp
    );
    if (similar.length > 0) {
      diagText.push(`\n**Pattern:** This root cause (${issue.rootCause}) has occurred ${similar.length + 1} times.`);
    }

    // Append to result
    if (result?.content && Array.isArray(result.content)) {
      const lastText = result.content.findLast(c => c.type === 'text');
      if (lastText) {
        lastText.text += '\n' + diagText.join('\n');
      } else {
        result.content.push({ type: 'text', text: diagText.join('\n') });
      }
    }

    return result;
  }

  /**
   * Summarize a diagnostic check result into readable text
   */
  _summarizeCheck(name, result) {
    switch (name) {
      case 'pageLoadState':
        return `readyState=${result.readyState}, spinner=${result.hasSpinner}, elements=${result.bodyChildren}`;
      case 'iframeCheck':
        if (!Array.isArray(result) || result.length === 0) return 'No iframes found';
        return result.map(f =>
          `"${f.name}" (${f.origin}, ready=${f.docReady || 'N/A'}, visible=${f.visible})`
        ).join(', ');
      case 'overlayCheck':
        if (!Array.isArray(result) || result.length === 0) return 'No blocking overlays';
        return `${result.length} overlay(s): ${result.map(o => o.cls?.substring(0, 40)).join(', ')}`;
      case 'selectorInIframes':
        if (!Array.isArray(result) || result.length === 0) return 'Selector not found anywhere';
        return result.map(r =>
          r.error ? `${r.location}: error` : `${r.location}: found=${r.found}, visible=${r.visible}`
        ).join(', ');
      default:
        return typeof result === 'string' ? result.substring(0, 100) : JSON.stringify(result).substring(0, 100);
    }
  }

  /**
   * Generate a summary report of tracked issues
   */
  getReport() {
    if (this._issues.length === 0) {
      return '### Action Validator Report\n\nNo issues tracked this session.';
    }

    // Group by root cause
    const byCause = {};
    for (const issue of this._issues) {
      const key = issue.rootCause || 'unknown';
      if (!byCause[key]) byCause[key] = [];
      byCause[key].push(issue);
    }

    // Sort by frequency
    const sorted = Object.entries(byCause).sort((a, b) => b[1].length - a[1].length);

    const lines = ['### Action Validator Report\n'];
    lines.push(`**Total issues:** ${this._issues.length} | **Unique root causes:** ${sorted.length}\n`);

    // Top issues table
    lines.push('| # | Root Cause | Count | Last Tool | Suggestion |');
    lines.push('|---|-----------|-------|-----------|------------|');
    sorted.forEach(([cause, issues], i) => {
      const last = issues[issues.length - 1];
      lines.push(`| ${i + 1} | ${cause} | ${issues.length} | ${last.tool} | ${last.suggestion?.substring(0, 60) || '-'} |`);
    });

    // Recent issues
    lines.push('\n**Recent issues (last 10):**\n');
    const recent = this._issues.slice(-10).reverse();
    for (const issue of recent) {
      const time = issue.timestamp.substring(11, 19);
      lines.push(`- \`${time}\` **${issue.rootCause}** → ${issue.tool}${issue.selector ? ` (${issue.selector.substring(0, 40)})` : ''} [${issue.elapsed}ms]`);
    }

    return lines.join('\n');
  }

  /**
   * Get issues as structured data (for programmatic use)
   */
  getIssues() {
    return [...this._issues];
  }

  /**
   * Clear tracked issues
   */
  clearIssues() {
    this._issues = [];
  }

  /**
   * Enable/disable validation
   */
  setEnabled(enabled) {
    this._enabled = enabled;
  }

  // --- Helpers ---

  _extractText(result) {
    if (!result?.content) return '';
    return result.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n');
  }

  _extractSelector(args) {
    // From interact actions
    if (args?.actions) {
      const first = args.actions[0];
      return first?.selector || first?.ref || null;
    }
    // From direct selector arg
    return args?.selector || null;
  }
}

module.exports = { ActionValidator };

/**
 * Site Playbooks - URL-matched automated site handling
 *
 * Automatically runs site-specific prep/fixup code before and after tool calls
 * based on the current tab URL. Handles iframes, overlays, modals, SPA navigation
 * quirks, and other site-specific issues so the caller doesn't have to.
 *
 * URL patterns support wildcards: * matches any characters.
 * Each playbook defines:
 *   - urlPatterns: array of wildcard URL patterns
 *   - preAction(transport, toolName, args): runs before each tool call
 *   - postAction(transport, toolName, args, result): runs after each tool call
 */

const debugLog = require('./debugLog')('SitePlaybooks');

/**
 * Convert a wildcard pattern to a RegExp
 * Supports * as "match anything" wildcard
 */
function wildcardToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const withWildcards = escaped.replace(/\*/g, '.*');
  return new RegExp('^' + withWildcards + '$', 'i');
}

// ============================================================
// Helper: Run JS in page context via CDP
// ============================================================
async function evalInPage(transport, expression) {
  try {
    const r = await transport.sendCommand('forwardCDPCommand', {
      method: 'Runtime.evaluate',
      params: { expression, returnByValue: true, timeout: 3000 }
    });
    return r?.result?.value;
  } catch (e) {
    debugLog('evalInPage error:', e.message);
    return null;
  }
}

// ============================================================
// Helper: Run JS inside a named iframe
// ============================================================
async function evalInIframe(transport, iframeName, expression) {
  const wrapped = `(function(){
    var f = document.querySelector('iframe[name="${iframeName}"]');
    if (!f || !f.contentDocument) return null;
    var d = f.contentDocument;
    return (function(d){ ${expression} })(d);
  })()`;
  return evalInPage(transport, wrapped);
}

// ============================================================
// PLAYBOOK: Vision One (portal.xdr.trendmicro.com)
// ============================================================
const visionOnePlaybook = {
  id: 'vision-one',
  urlPatterns: [
    '*portal.xdr.trendmicro.com*',
    '*://portal.xdr.trendmicro.com/*'
  ],

  /**
   * V1 structure:
   * - Left sidebar nav is in the top-level DOM
   * - Page content renders in named iframes that change per section:
   *   __WORKBENCH_CONTAINER, __DETECTIONMODEL_CONTAINER, __SASE_ES_CONTAINER, etc.
   * - An iframe-overlay div sits on top of content iframes, blocking clicks
   * - MFA modal (ant-modal) pops up on every page transition
   * - Ant Design Select components need mousedown+mouseup+click sequence to open
   * - Sidebar menu items are flyout submenus triggered by hover
   */

  async preAction(transport, toolName, args) {
    // Skip for read-only tools that don't need the overlay fix
    const readOnlyTools = new Set([
      'browser_take_screenshot', 'browser_snapshot',
      'browser_console_messages', 'browser_performance_metrics'
    ]);
    if (readOnlyTools.has(toolName)) return;

    debugLog('V1 preAction for', toolName);

    // 1. Remove iframe-overlay that blocks all clicks on content
    // 2. Suppress MFA modal that pops up on every navigation
    // 3. Install MutationObserver to auto-remove both when re-added
    await evalInPage(transport, `(function(){
      // Remove existing blockers
      document.querySelectorAll('.iframe-overlay').forEach(function(o) { o.remove(); });
      document.querySelectorAll('.ant-modal-wrap, .ant-modal-mask, .ant-modal-root').forEach(function(m) { m.remove(); });
      document.body.style.overflow = 'auto';
      document.body.classList.remove('ant-scrolling-effect');

      // Install persistent observer (idempotent - checks for existing)
      if (!window.__v1PlaybookObserver) {
        window.__v1PlaybookObserver = new MutationObserver(function(muts) {
          for (var i = 0; i < muts.length; i++) {
            var nodes = muts[i].addedNodes;
            for (var j = 0; j < nodes.length; j++) {
              var n = nodes[j];
              if (n.classList) {
                if (n.classList.contains('iframe-overlay')) n.remove();
                if (n.classList.contains('ant-modal-wrap')) n.remove();
                if (n.classList.contains('ant-modal-mask')) n.remove();
                if (n.classList.contains('ant-modal-root')) n.remove();
              }
            }
          }
        });
        window.__v1PlaybookObserver.observe(document.body, {childList: true, subtree: true});
      }
      return true;
    })()`);
  },

  async postAction(transport, toolName, args, result) {
    // No post-action needed currently
  },

  /**
   * Get the name of the active V1 content iframe
   * V1 uses different iframes per section: __WORKBENCH_CONTAINER,
   * __DETECTIONMODEL_CONTAINER, __SASE_ES_CONTAINER, etc.
   */
  async getContentIframe(transport) {
    const result = await evalInPage(transport, `(function(){
      var frames = document.querySelectorAll('iframe');
      var best = null;
      var bestArea = 0;
      for (var i = 0; i < frames.length; i++) {
        var f = frames[i];
        var r = f.getBoundingClientRect();
        var area = r.width * r.height;
        if (area > bestArea && r.width > 200 && r.height > 200 && f.name && f.name !== '__FOUNDATION_IAM_CONTAINER__') {
          try {
            if (f.contentDocument) { best = f.name; bestArea = area; }
          } catch(e) {}
        }
      }
      return best;
    })()`);
    return result;
  }
};

// ============================================================
// PLAYBOOK: Dynamics 365 CRM
// ============================================================
const dynamics365Playbook = {
  id: 'dynamics-365',
  urlPatterns: [
    '*.crm.dynamics.com*',
    '*://trendmicro.crm.dynamics.com/*'
  ],

  async preAction(transport, toolName, args) {
    const readOnlyTools = new Set([
      'browser_take_screenshot', 'browser_snapshot',
      'browser_console_messages', 'browser_performance_metrics'
    ]);
    if (readOnlyTools.has(toolName)) return;

    debugLog('Dynamics 365 preAction for', toolName);

    // Dynamics uses nested iframes for entity forms
    // Remove any loading overlays
    await evalInPage(transport, `(function(){
      document.querySelectorAll('[id*="InlineDialog"], .ms-Overlay').forEach(function(o) { o.remove(); });
      return true;
    })()`);
  },

  async postAction(transport, toolName, args, result) {}
};

// ============================================================
// PLAYBOOK: Confluence Wiki
// ============================================================
const confluencePlaybook = {
  id: 'confluence',
  urlPatterns: [
    '*.atlassian.net/wiki*',
    '*://trendmicro.atlassian.net/*'
  ],

  async preAction(transport, toolName, args) {
    const readOnlyTools = new Set([
      'browser_take_screenshot', 'browser_snapshot',
      'browser_console_messages', 'browser_performance_metrics'
    ]);
    if (readOnlyTools.has(toolName)) return;

    debugLog('Confluence preAction for', toolName);

    // Dismiss cookie banners and announcement modals
    await evalInPage(transport, `(function(){
      document.querySelectorAll('[data-testid="consent-banner"] button, .aui-blanket').forEach(function(e) {
        if (e.tagName === 'BUTTON') e.click();
        else e.remove();
      });
      return true;
    })()`);
  },

  async postAction(transport, toolName, args, result) {}
};

// ============================================================
// PLAYBOOK: SharePoint / OneDrive
// ============================================================
const sharePointPlaybook = {
  id: 'sharepoint',
  urlPatterns: [
    '*.sharepoint.com*',
    '*-my.sharepoint.com*'
  ],

  async preAction(transport, toolName, args) {
    const readOnlyTools = new Set([
      'browser_take_screenshot', 'browser_snapshot',
      'browser_console_messages', 'browser_performance_metrics'
    ]);
    if (readOnlyTools.has(toolName)) return;

    debugLog('SharePoint preAction for', toolName);

    // Dismiss consent/cookie dialogs and notification bars
    await evalInPage(transport, `(function(){
      document.querySelectorAll('.od-Notification-dismiss, [data-automationid="notificationBarDismiss"]').forEach(function(b) { b.click(); });
      return true;
    })()`);
  },

  async postAction(transport, toolName, args, result) {}
};

// ============================================================
// Registry of code-based playbooks (pre/post action hooks)
// ============================================================
const CODE_PLAYBOOKS = [
  visionOnePlaybook,
  dynamics365Playbook,
  confluencePlaybook,
  sharePointPlaybook
];

// ============================================================
// Workflow File Loader
// Scans server/workflows/<site>/ for _site.json + workflow files
// ============================================================
const fs = require('fs');
const path = require('path');

const WORKFLOWS_DIR = path.join(__dirname, '..', 'workflows');

function loadWorkflowSites() {
  const sites = [];
  if (!fs.existsSync(WORKFLOWS_DIR)) return sites;

  for (const dir of fs.readdirSync(WORKFLOWS_DIR)) {
    const siteDir = path.join(WORKFLOWS_DIR, dir);
    if (!fs.statSync(siteDir).isDirectory()) continue;

    const siteFile = path.join(siteDir, '_site.json');
    if (!fs.existsSync(siteFile)) continue;

    try {
      const siteConfig = JSON.parse(fs.readFileSync(siteFile, 'utf-8'));
      const workflows = [];

      for (const file of fs.readdirSync(siteDir)) {
        if (file === '_site.json' || !file.endsWith('.json')) continue;
        try {
          const wf = JSON.parse(fs.readFileSync(path.join(siteDir, file), 'utf-8'));
          // Check for reference screenshots in same directory
          const screenshotDir = path.join(siteDir, 'screenshots', wf.id || path.basename(file, '.json'));
          wf._screenshotDir = fs.existsSync(screenshotDir) ? screenshotDir : null;
          wf._file = file;
          workflows.push(wf);
        } catch (e) {
          debugLog(`Error loading workflow ${file}:`, e.message);
        }
      }

      sites.push({
        ...siteConfig,
        _dir: siteDir,
        _regexes: (siteConfig.urlPatterns || []).map(wildcardToRegex),
        workflows
      });
    } catch (e) {
      debugLog(`Error loading site config ${siteFile}:`, e.message);
    }
  }
  return sites;
}

// ============================================================
// SitePlaybooks Manager
// ============================================================
class SitePlaybooks {
  constructor() {
    // Compile code-based playbooks
    this._codePlaybooks = CODE_PLAYBOOKS.map(pb => ({
      ...pb,
      _regexes: pb.urlPatterns.map(wildcardToRegex)
    }));

    // Load workflow files from disk
    this._workflowSites = loadWorkflowSites();
    debugLog(`Loaded ${this._workflowSites.length} workflow sites with ${this._workflowSites.reduce((n, s) => n + s.workflows.length, 0)} workflows`);

    this._lastMatchedId = null;
  }

  /**
   * Reload workflow files from disk (hot reload)
   */
  reload() {
    this._workflowSites = loadWorkflowSites();
    debugLog(`Reloaded: ${this._workflowSites.length} sites, ${this._workflowSites.reduce((n, s) => n + s.workflows.length, 0)} workflows`);
  }

  /**
   * Find the code playbook matching a URL
   */
  matchCodePlaybook(url) {
    if (!url) return null;
    for (const pb of this._codePlaybooks) {
      for (const regex of pb._regexes) {
        if (regex.test(url)) return pb;
      }
    }
    return null;
  }

  /**
   * Find the workflow site matching a URL
   */
  matchWorkflowSite(url) {
    if (!url) return null;
    for (const site of this._workflowSites) {
      for (const regex of site._regexes) {
        if (regex.test(url)) return site;
      }
    }
    return null;
  }

  /**
   * Get available workflows for a URL
   * @param {string} url - Current tab URL
   * @returns {Array} Matching workflows with id, name, description, params
   */
  getWorkflows(url) {
    const site = this.matchWorkflowSite(url);
    if (!site) return [];
    return site.workflows.map(wf => ({
      id: wf.id,
      name: wf.name,
      description: wf.description,
      params: wf.params || {},
      stepCount: (wf.steps || []).length,
      hasScreenshots: !!wf._screenshotDir
    }));
  }

  /**
   * Get a specific workflow by ID for the current URL
   * @param {string} url - Current tab URL
   * @param {string} workflowId - Workflow ID
   * @returns {object|null} Full workflow definition
   */
  getWorkflow(url, workflowId) {
    const site = this.matchWorkflowSite(url);
    if (!site) return null;
    return site.workflows.find(wf => wf.id === workflowId) || null;
  }

  /**
   * Get reference screenshot paths for a workflow step
   * @param {string} url - Current tab URL
   * @param {string} workflowId - Workflow ID
   * @param {string} stepId - Step ID
   * @returns {string|null} Path to screenshot file, or null
   */
  getStepScreenshot(url, workflowId, stepId) {
    const wf = this.getWorkflow(url, workflowId);
    if (!wf || !wf._screenshotDir) return null;
    // Look for stepId.jpg or stepId.png
    for (const ext of ['.jpg', '.png']) {
      const p = path.join(wf._screenshotDir, stepId + ext);
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  /**
   * Run pre-action for the current URL (code playbooks)
   */
  async runPreAction(url, transport, toolName, args) {
    const pb = this.matchCodePlaybook(url);
    if (!pb) return;

    if (pb.id !== this._lastMatchedId) {
      debugLog(`Matched site: ${pb.id} for ${url}`);
      this._lastMatchedId = pb.id;
    }

    try {
      await pb.preAction(transport, toolName, args);
    } catch (e) {
      debugLog(`preAction error for ${pb.id}:`, e.message);
    }
  }

  /**
   * Run post-action for the current URL (code playbooks)
   */
  async runPostAction(url, transport, toolName, args, result) {
    const pb = this.matchCodePlaybook(url);
    if (!pb) return;

    try {
      await pb.postAction(transport, toolName, args, result);
    } catch (e) {
      debugLog(`postAction error for ${pb.id}:`, e.message);
    }
  }

  /**
   * List all registered sites (code + workflow)
   */
  list() {
    const codeSites = this._codePlaybooks.map(pb => ({
      id: pb.id,
      type: 'code',
      patterns: pb.urlPatterns
    }));
    const wfSites = this._workflowSites.map(site => ({
      id: site.id,
      type: 'workflow',
      name: site.name,
      patterns: site.urlPatterns,
      workflowCount: site.workflows.length,
      workflows: site.workflows.map(wf => wf.id)
    }));
    return [...codeSites, ...wfSites];
  }
}

module.exports = { SitePlaybooks };

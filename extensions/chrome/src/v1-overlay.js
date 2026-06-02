/**
 * V1 Helper — CVE overlay content script
 * Injects relevance badges on Vision One Container Security vulnerability pages.
 * Runs only on *.trendmicro.com pages (configured in manifest.json).
 *
 * Features:
 * - Color-coded relevance badges (RELEVANT/LOW/NOT RELEVANT) next to CVE IDs
 * - Clickable detail panel with summary, relevance reasoning, remediation
 * - Auto-refreshes on V1 SPA navigation
 * - Storage-based: import analysis.json via popup, overlays appear automatically
 *
 * Source: Adapted from grobomo/v1-helper extension v0.2.0
 */

// Guard against multiple executions
if (!window.__v1OverlayLoaded) {
  window.__v1OverlayLoaded = true;

  // ─── URL Pattern Detection ───

  const V1_URL_PATTERNS = [
    /trendmicro\.com.*container.?security.*vulnerabilit/i,
    /trendmicro\.com.*#\/app\/container/i,
    /trendmicro\.com.*containerSecurity/i,
  ];

  function isV1VulnPage() {
    const url = window.location.href + window.location.hash;
    return V1_URL_PATTERNS.some(p => p.test(url));
  }

  // ─── Relevance Styling ───

  const RELEVANCE_COLORS = {
    yes:  { bg: '#fef2f2', border: '#dc2626', text: '#991b1b', label: 'RELEVANT' },
    low:  { bg: '#fefce8', border: '#ca8a04', text: '#854d0e', label: 'LOW' },
    no:   { bg: '#f0fdf4', border: '#16a34a', text: '#166534', label: 'NOT RELEVANT' },
  };

  function getRelevanceStyle(relevant) {
    const key = (relevant || '').toLowerCase();
    return RELEVANCE_COLORS[key] || { bg: '#f3f4f6', border: '#9ca3af', text: '#4b5563', label: relevant || '?' };
  }

  // ─── State ───

  let analysisCache = null;
  let overlayEnabled = true;
  let overlayObserver = null;

  // ─── Data Loading ───

  async function loadAnalysisData() {
    try {
      const { v1h_analysis, v1h_overlay_enabled } = await chrome.storage.local.get([
        'v1h_analysis', 'v1h_overlay_enabled'
      ]);
      analysisCache = v1h_analysis || null;
      overlayEnabled = v1h_overlay_enabled !== false;
    } catch (e) {
      console.error('[V1 Overlay] Failed to load analysis:', e);
    }
  }

  // ─── Badge Creation ───

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function createBadge(cve, analysis) {
    const style = getRelevanceStyle(analysis.relevant);
    const badge = document.createElement('span');
    badge.className = 'v1h-badge';
    badge.dataset.v1hCve = cve;
    badge.style.cssText = `
      display:inline-flex; align-items:center; gap:4px;
      margin-left:8px; padding:2px 8px;
      background:${style.bg}; border:1px solid ${style.border};
      border-radius:12px; font-size:11px; font-weight:600;
      color:${style.text}; cursor:pointer; white-space:nowrap;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      transition:opacity 0.15s;
    `;
    badge.textContent = style.label;
    badge.title = `${cve}: ${analysis.summary || analysis.action || ''}`;

    badge.addEventListener('mouseenter', () => { badge.style.opacity = '0.8'; });
    badge.addEventListener('mouseleave', () => { badge.style.opacity = '1'; });
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      showDetailPanel(cve, analysis);
    });

    return badge;
  }

  // ─── Detail Panel ───

  function showDetailPanel(cve, analysis) {
    const existing = document.getElementById('v1h-detail');
    if (existing) existing.remove();
    const existingBackdrop = document.getElementById('v1h-backdrop');
    if (existingBackdrop) existingBackdrop.remove();

    const style = getRelevanceStyle(analysis.relevant);
    const panel = document.createElement('div');
    panel.id = 'v1h-detail';
    panel.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      background:white; border:2px solid ${style.border}; border-radius:12px;
      padding:0; max-width:640px; width:90vw; max-height:80vh;
      overflow:hidden; z-index:999999;
      box-shadow:0 20px 60px rgba(0,0,0,0.3);
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      font-size:14px; color:#1f2937; line-height:1.6;
    `;

    const header = `
      <div style="display:flex;justify-content:space-between;align-items:center;
        padding:16px 20px;background:${style.bg};border-bottom:1px solid ${style.border};">
        <div>
          <span style="font-weight:700;font-size:16px;color:${style.text};">${escHtml(cve)}</span>
          <span style="margin-left:10px;padding:2px 8px;background:${style.border};
            color:white;border-radius:10px;font-size:11px;font-weight:600;">
            ${escHtml(style.label)}
          </span>
        </div>
        <span id="v1h-detail-close" style="cursor:pointer;font-size:20px;color:#9ca3af;
          padding:4px 8px;border-radius:4px;">&times;</span>
      </div>
    `;

    const sections = [];

    if (analysis.summary || analysis.action) {
      sections.push(`
        <div style="margin-bottom:16px;">
          <div style="font-weight:600;color:#374151;margin-bottom:4px;">Summary</div>
          <div style="color:#4b5563;">${escHtml(analysis.summary || analysis.action)}</div>
        </div>
      `);
    }

    if (analysis.relevance_reasoning) {
      sections.push(`
        <div style="margin-bottom:16px;">
          <div style="font-weight:600;color:#374151;margin-bottom:4px;">Relevance</div>
          <div style="color:#4b5563;">${escHtml(analysis.relevance_reasoning)}</div>
        </div>
      `);
    }

    if (analysis.steps || analysis.remediation) {
      sections.push(`
        <div style="margin-bottom:16px;">
          <div style="font-weight:600;color:#374151;margin-bottom:4px;">Remediation</div>
          <div style="color:#4b5563;white-space:pre-wrap;">${escHtml(analysis.steps || analysis.remediation)}</div>
        </div>
      `);
    }

    if (analysis.cvss_score || analysis.severity) {
      sections.push(`
        <div style="margin-bottom:16px;">
          <div style="font-weight:600;color:#374151;margin-bottom:4px;">Severity</div>
          <div style="color:#4b5563;">
            ${analysis.cvss_score ? 'CVSS: ' + escHtml(String(analysis.cvss_score)) : ''}
            ${analysis.severity ? ' (' + escHtml(analysis.severity) + ')' : ''}
          </div>
        </div>
      `);
    }

    if (analysis.affected_component) {
      sections.push(`
        <div style="margin-bottom:16px;">
          <div style="font-weight:600;color:#374151;margin-bottom:4px;">Affected Component</div>
          <div style="color:#4b5563;">${escHtml(analysis.affected_component)}</div>
        </div>
      `);
    }

    panel.innerHTML = header + `
      <div style="padding:20px;overflow-y:auto;max-height:calc(80vh - 60px);">
        ${sections.join('')}
        ${sections.length === 0 ? '<div style="color:#9ca3af;">No analysis details available.</div>' : ''}
      </div>
    `;

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'v1h-backdrop';
    backdrop.style.cssText = `
      position:fixed; top:0; left:0; right:0; bottom:0;
      background:rgba(0,0,0,0.3); z-index:999998;
    `;
    backdrop.addEventListener('click', () => {
      panel.remove();
      backdrop.remove();
    });

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    document.getElementById('v1h-detail-close').addEventListener('click', () => {
      panel.remove();
      backdrop.remove();
    });
  }

  // ─── Overlay Injection ───

  function injectOverlays() {
    if (!analysisCache || !overlayEnabled) return 0;

    const elements = document.querySelectorAll('td, span, a');
    let injected = 0;

    for (const el of elements) {
      const text = el.textContent.trim();
      const cveMatch = text.match(/^CVE-\d{4}-\d+$/);
      if (!cveMatch) continue;

      const cve = cveMatch[0];
      const analysis = analysisCache[cve];
      if (!analysis) continue;

      if (el.dataset.v1hOverlay) continue;
      el.dataset.v1hOverlay = 'true';

      const badge = createBadge(cve, analysis);
      el.parentElement.insertBefore(badge, el.nextSibling);
      injected++;
    }

    return injected;
  }

  function removeOverlays() {
    document.querySelectorAll('.v1h-badge').forEach(b => b.remove());
    document.querySelectorAll('[data-v1h-overlay]').forEach(el => {
      delete el.dataset.v1hOverlay;
    });
    const detail = document.getElementById('v1h-detail');
    if (detail) detail.remove();
    const backdrop = document.getElementById('v1h-backdrop');
    if (backdrop) backdrop.remove();
  }

  // ─── Mutation Observer ───

  function startOverlayObserver() {
    if (overlayObserver) return;

    let debounceTimer = null;
    overlayObserver = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isV1VulnPage() && overlayEnabled) {
          injectOverlays();
        }
      }, 300);
    });

    overlayObserver.observe(document.body || document.documentElement, {
      childList: true, subtree: true
    });
  }

  function stopOverlayObserver() {
    if (overlayObserver) {
      overlayObserver.disconnect();
      overlayObserver = null;
    }
  }

  // ─── Storage Change Listener ───

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.v1h_analysis) {
      analysisCache = changes.v1h_analysis.newValue || null;
      removeOverlays();
      if (isV1VulnPage()) injectOverlays();
    }
    if (changes.v1h_overlay_enabled) {
      overlayEnabled = changes.v1h_overlay_enabled.newValue !== false;
      if (!overlayEnabled) {
        removeOverlays();
        stopOverlayObserver();
      } else if (isV1VulnPage()) {
        injectOverlays();
        startOverlayObserver();
      }
    }
  });

  // ─── Message Listener (from popup) ───

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'v1h_injectOverlays') {
      loadAnalysisData().then(() => {
        removeOverlays();
        injectOverlays();
        startOverlayObserver();
      });
    }
    if (msg.type === 'v1h_removeOverlays') {
      removeOverlays();
      stopOverlayObserver();
    }
  });

  // ─── SPA Navigation Watcher ───

  let lastUrl = window.location.href;
  new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      if (isV1VulnPage() && overlayEnabled && analysisCache) {
        setTimeout(() => {
          removeOverlays();
          injectOverlays();
        }, 500);
      } else {
        removeOverlays();
        stopOverlayObserver();
      }
    }
  }).observe(document, { subtree: true, childList: true });

  // ─── Initial Load ───

  async function init() {
    await loadAnalysisData();
    if (isV1VulnPage() && analysisCache && overlayEnabled) {
      setTimeout(() => {
        const count = injectOverlays();
        if (count > 0) console.log(`[V1 Overlay] Injected ${count} CVE overlays`);
        startOverlayObserver();
      }, 1000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

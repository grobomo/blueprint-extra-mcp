/**
 * Activity Reporter - Aggregates raw activity events into reports
 *
 * Takes events from ActivityTracker and produces:
 * - JSON summary (top pages, clicks, hovers, nav flow)
 * - Standalone HTML dashboard with charts
 */

const fs = require('fs');
const path = require('path');
const debugLog = require('./debugLog')('ActivityReporter');
const { enrichEvents, resolvePageName } = require('./v1Enrichment');

class ActivityReporter {
  constructor(events, options = {}) {
    // Auto-enrich V1 events unless explicitly disabled
    this._events = options.skipEnrichment ? (events || []) : enrichEvents(events || []);
  }

  summarize() {
    const clicks = this._events.filter(e => e.type === 'click');
    const hovers = this._events.filter(e => e.type === 'hover');
    const dwells = this._events.filter(e => e.type === 'page_dwell');
    const navs = this._events.filter(e => e.type === 'navigation');
    const scrolls = this._events.filter(e => e.type === 'scroll_depth');
    const keypresses = this._events.filter(e => e.type === 'keypress');

    const firstTs = this._events.length > 0 ? this._events[0].timestamp : null;
    const lastTs = this._events.length > 0 ? this._events[this._events.length - 1].timestamp : null;
    const sessionMs = firstTs && lastTs ? new Date(lastTs) - new Date(firstTs) : 0;

    return {
      session: {
        startTime: firstTs,
        endTime: lastTs,
        durationMs: sessionMs,
        durationFormatted: this._formatDuration(sessionMs)
      },
      counts: {
        total: this._events.length,
        clicks: clicks.length,
        hovers: hovers.length,
        keypresses: keypresses.length,
        pageVisits: dwells.length,
        navigations: navs.length,
        scrollEvents: scrolls.length
      },
      topPages: this._topPages(dwells),
      topClicked: this._topClicked(clicks),
      topHovered: this._topHovered(hovers),
      navFlow: navs.map(n => ({ from: n.from, to: n.to, fromPageName: n.fromPageName || null, toPageName: n.toPageName || null, timestamp: n.timestamp })),
      scrollDepth: this._scrollSummary(scrolls)
    };
  }

  generateHTML(outputPath) {
    const summary = this.summarize();
    const html = this._buildHTML(summary);

    if (outputPath) {
      const resolved = path.resolve(outputPath);
      fs.writeFileSync(resolved, html, 'utf-8');
      debugLog(`HTML report saved to ${resolved}`);
      return resolved;
    }

    return html;
  }

  _topPages(dwells) {
    const byUrl = {};
    for (const d of dwells) {
      const key = d.url || 'unknown';
      if (!byUrl[key]) byUrl[key] = { totalMs: 0, visits: 0, maxScrollPct: 0, pageName: d.pageName || null, moduleName: d.moduleName || null };
      byUrl[key].totalMs += d.dwellMs || 0;
      byUrl[key].visits++;
      byUrl[key].maxScrollPct = Math.max(byUrl[key].maxScrollPct, d.maxScrollPct || 0);
      if (d.pageName && !byUrl[key].pageName) byUrl[key].pageName = d.pageName;
      if (d.moduleName && !byUrl[key].moduleName) byUrl[key].moduleName = d.moduleName;
    }
    return Object.entries(byUrl)
      .map(([url, data]) => ({ url, ...data, totalFormatted: this._formatDuration(data.totalMs) }))
      .sort((a, b) => b.totalMs - a.totalMs)
      .slice(0, 15);
  }

  _topClicked(clicks) {
    const byKey = {};
    for (const c of clicks) {
      const text = (c.element?.text || '').substring(0, 50);
      const tag = (c.element?.tag || 'unknown').toLowerCase();
      const key = text ? `${tag}: "${text}"` : tag;
      if (!byKey[key]) byKey[key] = { count: 0, element: key, iframe: c.iframe || null };
      byKey[key].count++;
    }
    return Object.values(byKey).sort((a, b) => b.count - a.count).slice(0, 15);
  }

  _topHovered(hovers) {
    const byKey = {};
    for (const h of hovers) {
      const text = (h.element?.text || '').substring(0, 50);
      const tag = (h.element?.tag || 'unknown').toLowerCase();
      const key = text ? `${tag}: "${text}"` : tag;
      if (!byKey[key]) byKey[key] = { count: 0, totalMs: 0, element: key };
      byKey[key].count++;
      byKey[key].totalMs += h.durationMs || 0;
    }
    return Object.values(byKey)
      .map(h => ({ ...h, avgMs: Math.round(h.totalMs / h.count), totalFormatted: this._formatDuration(h.totalMs) }))
      .sort((a, b) => b.totalMs - a.totalMs)
      .slice(0, 15);
  }

  _scrollSummary(scrolls) {
    const byUrl = {};
    for (const s of scrolls) {
      const key = s.url || 'unknown';
      if (!byUrl[key]) byUrl[key] = 0;
      byUrl[key] = Math.max(byUrl[key], s.scrollPct || 0);
    }
    return Object.entries(byUrl).map(([url, pct]) => ({ url, maxScrollPct: pct }));
  }

  _formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const min = Math.floor(ms / 60000);
    const sec = Math.round((ms % 60000) / 1000);
    return `${min}m ${sec}s`;
  }

  _escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  _shortenUrl(url) {
    try {
      const u = new URL(url);
      return u.hash || u.pathname || url;
    } catch {
      return url.length > 60 ? url.substring(0, 60) + '...' : url;
    }
  }

  _buildHTML(summary) {
    const topPagesRows = summary.topPages.map(p => `
      <tr>
        <td title="${this._escapeHTML(p.url)}">${p.pageName ? this._escapeHTML(p.pageName) : this._escapeHTML(this._shortenUrl(p.url))}</td>
        <td>${p.moduleName ? this._escapeHTML(p.moduleName) : '-'}</td>
        <td>${p.visits}</td>
        <td>${p.totalFormatted}</td>
        <td>
          <div class="bar-container">
            <div class="bar" style="width:${p.maxScrollPct}%"></div>
            <span>${p.maxScrollPct}%</span>
          </div>
        </td>
      </tr>`).join('');

    const topClicksRows = summary.topClicked.map(c => `
      <tr>
        <td>${this._escapeHTML(c.element)}</td>
        <td>${c.count}</td>
        <td>${c.iframe ? this._escapeHTML(c.iframe) : '-'}</td>
      </tr>`).join('');

    const topHoversRows = summary.topHovered.map(h => `
      <tr>
        <td>${this._escapeHTML(h.element)}</td>
        <td>${h.count}</td>
        <td>${h.totalFormatted}</td>
        <td>${h.avgMs}ms</td>
      </tr>`).join('');

    const navFlowItems = summary.navFlow.map(n => `
      <div class="nav-step">
        <span class="nav-from" title="${this._escapeHTML(n.from)}">${n.fromPageName ? this._escapeHTML(n.fromPageName) : this._escapeHTML(this._shortenUrl(n.from))}</span>
        <span class="nav-arrow">&rarr;</span>
        <span class="nav-to" title="${this._escapeHTML(n.to)}">${n.toPageName ? this._escapeHTML(n.toPageName) : this._escapeHTML(this._shortenUrl(n.to))}</span>
      </div>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>V1 Activity Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; line-height: 1.5; }
  h1 { color: #38bdf8; margin-bottom: 0.5rem; }
  .subtitle { color: #94a3b8; margin-bottom: 2rem; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .stat-card { background: #1e293b; border-radius: 8px; padding: 1rem; text-align: center; }
  .stat-value { font-size: 2rem; font-weight: 700; color: #38bdf8; }
  .stat-label { color: #94a3b8; font-size: 0.85rem; }
  .section { background: #1e293b; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
  .section h2 { color: #38bdf8; margin-bottom: 1rem; font-size: 1.2rem; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 0.5rem; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #334155; }
  td { padding: 0.5rem; border-bottom: 1px solid #1e293b; }
  tr:hover { background: #334155; }
  .bar-container { display: flex; align-items: center; gap: 0.5rem; }
  .bar { height: 8px; background: #38bdf8; border-radius: 4px; min-width: 2px; }
  .nav-step { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0; font-size: 0.9rem; }
  .nav-from, .nav-to { background: #334155; padding: 2px 8px; border-radius: 4px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav-arrow { color: #38bdf8; font-weight: bold; }
  .empty { color: #64748b; font-style: italic; }
</style>
</head>
<body>
<h1>V1 Console Activity Report</h1>
<p class="subtitle">Session: ${summary.session.startTime ? new Date(summary.session.startTime).toLocaleString() : 'N/A'} &mdash; Duration: ${summary.session.durationFormatted}</p>

<div class="stats-grid">
  <div class="stat-card"><div class="stat-value">${summary.counts.total}</div><div class="stat-label">Total Events</div></div>
  <div class="stat-card"><div class="stat-value">${summary.counts.clicks}</div><div class="stat-label">Clicks</div></div>
  <div class="stat-card"><div class="stat-value">${summary.counts.hovers}</div><div class="stat-label">Hovers (&gt;500ms)</div></div>
  <div class="stat-card"><div class="stat-value">${summary.counts.keypresses}</div><div class="stat-label">Keypresses</div></div>
  <div class="stat-card"><div class="stat-value">${summary.counts.pageVisits}</div><div class="stat-label">Page Visits</div></div>
  <div class="stat-card"><div class="stat-value">${summary.counts.navigations}</div><div class="stat-label">Navigations</div></div>
</div>

<div class="section">
  <h2>Top Pages by Dwell Time</h2>
  ${topPagesRows ? `<table><thead><tr><th>Page</th><th>Module</th><th>Visits</th><th>Total Time</th><th>Scroll Depth</th></tr></thead><tbody>${topPagesRows}</tbody></table>` : '<p class="empty">No page dwell data recorded.</p>'}
</div>

<div class="section">
  <h2>Most Clicked Elements</h2>
  ${topClicksRows ? `<table><thead><tr><th>Element</th><th>Clicks</th><th>Iframe</th></tr></thead><tbody>${topClicksRows}</tbody></table>` : '<p class="empty">No click data recorded.</p>'}
</div>

<div class="section">
  <h2>Most Hovered Elements (Tooltip Reads)</h2>
  ${topHoversRows ? `<table><thead><tr><th>Element</th><th>Hovers</th><th>Total Time</th><th>Avg Time</th></tr></thead><tbody>${topHoversRows}</tbody></table>` : '<p class="empty">No hover data recorded.</p>'}
</div>

<div class="section">
  <h2>Navigation Flow</h2>
  ${navFlowItems || '<p class="empty">No navigation data recorded.</p>'}
</div>

<script>
  // Raw data for custom analysis
  window.__activityData = ${JSON.stringify(summary).replace(/</g, '\\u003c')};
</script>
</body>
</html>`;
  }
}

module.exports = { ActivityReporter };

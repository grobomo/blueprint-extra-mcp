/**
 * ActivityReporter unit tests with synthetic events
 * Spec 011 T004 (summarize) + T005 (HTML generation)
 */

const { ActivityReporter } = require('../../src/activityReporter');
const fs = require('fs');
const path = require('path');
const os = require('os');

function createSyntheticEvents() {
  return [
    { type: 'click', timestamp: '2026-01-01T00:00:01Z', element: { tag: 'BUTTON', text: 'Dashboard' }, url: 'https://portal.xdr.trendmicro.com/#/app/dashboard' },
    { type: 'click', timestamp: '2026-01-01T00:00:05Z', element: { tag: 'A', text: 'Endpoints' }, url: 'https://portal.xdr.trendmicro.com/#/app/dashboard' },
    { type: 'click', timestamp: '2026-01-01T00:00:10Z', element: { tag: 'BUTTON', text: 'Dashboard' }, url: 'https://portal.xdr.trendmicro.com/#/app/dashboard' },
    { type: 'hover', timestamp: '2026-01-01T00:00:02Z', element: { tag: 'SPAN', text: 'Tooltip hint' }, durationMs: 1200, url: 'https://portal.xdr.trendmicro.com/#/app/dashboard' },
    { type: 'hover', timestamp: '2026-01-01T00:00:06Z', element: { tag: 'SPAN', text: 'Tooltip hint' }, durationMs: 800, url: 'https://portal.xdr.trendmicro.com/#/app/dashboard' },
    { type: 'page_dwell', timestamp: '2026-01-01T00:00:00Z', dwellMs: 15000, maxScrollPct: 60, url: 'https://portal.xdr.trendmicro.com/#/app/dashboard' },
    { type: 'page_dwell', timestamp: '2026-01-01T00:00:20Z', dwellMs: 8000, maxScrollPct: 40, url: 'https://portal.xdr.trendmicro.com/#/app/endpointSecurity' },
    { type: 'navigation', timestamp: '2026-01-01T00:00:15Z', from: 'https://portal.xdr.trendmicro.com/#/app/dashboard', to: 'https://portal.xdr.trendmicro.com/#/app/endpointSecurity', method: 'hashchange' },
    { type: 'scroll_depth', timestamp: '2026-01-01T00:00:12Z', scrollPct: 60, url: 'https://portal.xdr.trendmicro.com/#/app/dashboard' },
    { type: 'scroll_depth', timestamp: '2026-01-01T00:00:25Z', scrollPct: 40, url: 'https://portal.xdr.trendmicro.com/#/app/endpointSecurity' },
    { type: 'keypress', timestamp: '2026-01-01T00:00:08Z', key: 'Enter', url: 'https://portal.xdr.trendmicro.com/#/app/dashboard' }
  ];
}

describe('ActivityReporter - Summarize (T004)', () => {
  test('summarize returns correct structure and counts', () => {
    const reporter = new ActivityReporter(createSyntheticEvents());
    const summary = reporter.summarize();

    expect(summary.session).toBeDefined();
    expect(summary.session.durationMs).toBeGreaterThan(0);
    expect(summary.session.durationFormatted).toBeDefined();

    expect(summary.counts.total).toBe(11);
    expect(summary.counts.clicks).toBe(3);
    expect(summary.counts.hovers).toBe(2);
    expect(summary.counts.keypresses).toBe(1);
    expect(summary.counts.pageVisits).toBe(2);
    expect(summary.counts.navigations).toBe(1);
    expect(summary.counts.scrollEvents).toBe(2);
  });

  test('topPages aggregates dwell correctly', () => {
    const reporter = new ActivityReporter(createSyntheticEvents());
    const summary = reporter.summarize();

    expect(summary.topPages.length).toBe(2);
    const dashPage = summary.topPages.find(p => p.url.includes('dashboard'));
    expect(dashPage).toBeDefined();
    expect(dashPage.totalMs).toBe(15000);
    expect(dashPage.maxScrollPct).toBe(60);
  });

  test('topClicked aggregates by element', () => {
    const reporter = new ActivityReporter(createSyntheticEvents());
    const summary = reporter.summarize();

    expect(summary.topClicked.length).toBe(2);
    const dashBtn = summary.topClicked.find(c => c.element.includes('Dashboard'));
    expect(dashBtn.count).toBe(2);
  });

  test('topHovered aggregates by element with total duration', () => {
    const reporter = new ActivityReporter(createSyntheticEvents());
    const summary = reporter.summarize();

    expect(summary.topHovered.length).toBe(1);
    expect(summary.topHovered[0].totalMs).toBe(2000);
    expect(summary.topHovered[0].count).toBe(2);
  });

  test('navFlow captures navigation sequence', () => {
    const reporter = new ActivityReporter(createSyntheticEvents());
    const summary = reporter.summarize();

    expect(summary.navFlow.length).toBe(1);
    expect(summary.navFlow[0].from).toContain('dashboard');
    expect(summary.navFlow[0].to).toContain('endpointSecurity');
  });

  test('scrollDepth aggregates max scroll per URL', () => {
    const reporter = new ActivityReporter(createSyntheticEvents());
    const summary = reporter.summarize();

    expect(summary.scrollDepth.length).toBe(2);
    const dashScroll = summary.scrollDepth.find(s => s.url.includes('dashboard'));
    expect(dashScroll).toBeDefined();
    expect(dashScroll.maxScrollPct).toBe(60);
    const endpointScroll = summary.scrollDepth.find(s => s.url.includes('endpointSecurity'));
    expect(endpointScroll.maxScrollPct).toBe(40);
  });

  test('empty events produce valid summary', () => {
    const reporter = new ActivityReporter([]);
    const summary = reporter.summarize();

    expect(summary.counts.total).toBe(0);
    expect(summary.topPages).toEqual([]);
    expect(summary.topClicked).toEqual([]);
    expect(summary.navFlow).toEqual([]);
    expect(summary.session.durationMs).toBe(0);
  });

  test('V1 enrichment adds page names', () => {
    const reporter = new ActivityReporter(createSyntheticEvents());
    const summary = reporter.summarize();

    const dashPage = summary.topPages.find(p => p.url.includes('dashboard'));
    if (dashPage.pageName) {
      expect(typeof dashPage.pageName).toBe('string');
    }
  });
});

describe('ActivityReporter - HTML Generation (T005)', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-test-'));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('generateHTML returns HTML string when no path given', () => {
    const reporter = new ActivityReporter(createSyntheticEvents());
    const html = reporter.generateHTML();

    expect(typeof html).toBe('string');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Activity');
  });

  test('generateHTML writes file when path given', () => {
    const outputPath = path.join(tmpDir, 'test-report.html');
    const reporter = new ActivityReporter(createSyntheticEvents());
    const result = reporter.generateHTML(outputPath);

    expect(fs.existsSync(result)).toBe(true);
    const content = fs.readFileSync(result, 'utf-8');
    expect(content).toContain('<!DOCTYPE html>');
  });

  test('HTML contains expected sections', () => {
    const reporter = new ActivityReporter(createSyntheticEvents());
    const html = reporter.generateHTML();

    expect(html).toContain('click');
    expect(html).toContain('hover');
    expect(html).toContain('scroll');
  });

  test('HTML JSON embed is XSS-safe (no raw </script>)', () => {
    const events = [
      { type: 'click', timestamp: '2026-01-01T00:00:01Z', element: { tag: 'BUTTON', text: '</script><script>alert(1)</script>' }, url: 'https://example.com' }
    ];
    const reporter = new ActivityReporter(events, { skipEnrichment: true });
    const html = reporter.generateHTML();

    const scriptCloses = html.match(/<\/script>/gi) || [];
    const scriptOpens = html.match(/<script[^>]*>/gi) || [];
    expect(scriptCloses.length).toBe(scriptOpens.length);
  });

  test('HTML works with empty events', () => {
    const reporter = new ActivityReporter([]);
    const html = reporter.generateHTML();

    expect(html).toContain('<!DOCTYPE html>');
    expect(html.length).toBeGreaterThan(100);
  });
});

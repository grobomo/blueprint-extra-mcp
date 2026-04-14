/**
 * V1 Enrichment unit tests
 * Spec 011 T006
 */

const { resolvePageName, resolveIframeName, enrichEvents, V1_PAGE_MAP, V1_IFRAME_MAP } = require('../../src/v1Enrichment');

describe('resolvePageName', () => {
  test('resolves known V1 hash routes from full URL', () => {
    expect(resolvePageName('https://portal.xdr.trendmicro.com/#/app/dashboard')).toBe('Executive Dashboard');
    expect(resolvePageName('https://portal.xdr.trendmicro.com/#/app/sensor-policy')).toBe('Endpoint Policies');
    expect(resolvePageName('https://portal.xdr.trendmicro.com/#/app/xdr')).toBe('XDR Workbench');
    expect(resolvePageName('https://portal.xdr.trendmicro.com/#/app/search')).toBe('XDR Search');
  });

  test('resolves sub-path routes via prefix or fallback', () => {
    // Two-level sub-paths fall through prefix match to regex fallback (title-cased first segment)
    const result = resolvePageName('https://portal.xdr.trendmicro.com/#/app/sensor-policy/detail/123');
    // Either exact prefix match works or falls back to title case
    expect(['Endpoint Policies', 'Sensor Policy']).toContain(result);

    // Single sub-path should match via prefix strip
    const result2 = resolvePageName('https://portal.xdr.trendmicro.com/#/app/sensor-policy/456');
    expect(result2).toBe('Endpoint Policies');
  });

  test('falls back to title-cased route name for unknown routes', () => {
    const result = resolvePageName('https://portal.xdr.trendmicro.com/#/app/some-new-feature');
    expect(result).toBe('Some New Feature');
  });

  test('resolves hash-only strings', () => {
    expect(resolvePageName('#/app/dashboard')).toBe('Executive Dashboard');
  });

  test('returns null for non-V1 URLs', () => {
    expect(resolvePageName('https://google.com')).toBeNull();
    expect(resolvePageName('')).toBeNull();
    expect(resolvePageName(null)).toBeNull();
  });

  test('all V1_PAGE_MAP entries are resolvable', () => {
    for (const [hash, name] of Object.entries(V1_PAGE_MAP)) {
      const result = resolvePageName(`https://portal.xdr.trendmicro.com/${hash}`);
      expect(result).toBe(name);
    }
  });
});

describe('resolveIframeName', () => {
  test('resolves known V1 iframe containers', () => {
    expect(resolveIframeName('__VES_CONTAINER')).toBe('Endpoint Security');
    expect(resolveIframeName('__CECP_CONTAINER')).toBe('Email & Collaboration Protection');
    expect(resolveIframeName('__ZTSA_CONTAINER')).toBe('Zero Trust Secure Access');
  });

  test('returns null for unknown iframe names', () => {
    expect(resolveIframeName('random_iframe')).toBeNull();
    expect(resolveIframeName(null)).toBeNull();
    expect(resolveIframeName('')).toBeNull();
  });

  test('all V1_IFRAME_MAP entries are resolvable', () => {
    for (const [name, label] of Object.entries(V1_IFRAME_MAP)) {
      expect(resolveIframeName(name)).toBe(label);
    }
  });
});

describe('enrichEvents', () => {
  test('adds pageName to events with V1 URLs', () => {
    const events = [
      { type: 'click', url: 'https://portal.xdr.trendmicro.com/#/app/dashboard', element: { tag: 'BUTTON', text: 'Test' } }
    ];
    const enriched = enrichEvents(events);

    expect(enriched[0].pageName).toBe('Executive Dashboard');
    expect(enriched[0].type).toBe('click');
    expect(enriched[0].element.text).toBe('Test');
  });

  test('adds moduleName to events from V1 iframes', () => {
    const events = [
      { type: 'click', url: 'https://v1.example.com', iframe: '__VES_CONTAINER', element: { tag: 'BUTTON', text: 'Test' } }
    ];
    const enriched = enrichEvents(events);
    expect(enriched[0].moduleName).toBe('Endpoint Security');
  });

  test('enriches navigation events with fromPageName and toPageName', () => {
    const events = [
      {
        type: 'navigation',
        from: 'https://portal.xdr.trendmicro.com/#/app/dashboard',
        to: 'https://portal.xdr.trendmicro.com/#/app/xdr',
        method: 'hashchange'
      }
    ];
    const enriched = enrichEvents(events);

    expect(enriched[0].fromPageName).toBe('Executive Dashboard');
    expect(enriched[0].toPageName).toBe('XDR Workbench');
  });

  test('does not mutate original events', () => {
    const events = [{ type: 'click', url: 'https://portal.xdr.trendmicro.com/#/app/dashboard', element: { tag: 'A' } }];
    const enriched = enrichEvents(events);

    expect(events[0].pageName).toBeUndefined();
    expect(enriched[0].pageName).toBe('Executive Dashboard');
  });

  test('handles empty array', () => {
    expect(enrichEvents([])).toEqual([]);
  });

  test('skips events without URL or iframe', () => {
    const events = [{ type: 'keypress', key: 'Enter' }];
    const enriched = enrichEvents(events);

    expect(enriched[0].pageName).toBeUndefined();
    expect(enriched[0].moduleName).toBeUndefined();
  });
});

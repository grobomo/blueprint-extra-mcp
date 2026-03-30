/**
 * V1 Enrichment - Maps V1 hash routes and iframe names to human-readable labels
 *
 * Used by ActivityReporter to enrich raw events with V1 context:
 * - Hash route → page name (e.g. #/app/sensor-policy → "Endpoint Policies")
 * - Iframe name → module name (e.g. __VES_CONTAINER → "Endpoint Security")
 */

const debugLog = require('./debugLog')('V1Enrichment');

// V1 hash route → human-readable page name
const V1_PAGE_MAP = {
  // Cyber Risk Overview
  '#/app/home': 'Cyber Risk Overview',
  '#/app/dashboard': 'Executive Dashboard',

  // Endpoint Security
  '#/app/sensor-policy': 'Endpoint Policies',
  '#/app/endpoint-inventory': 'Endpoint Inventory',
  '#/app/endpoint-group': 'Endpoint Groups',
  '#/app/sensor-management': 'Sensor Management',

  // Data Security
  '#/app/data-security-inventory': 'Data Inventory',
  '#/app/data-policy': 'Data Policy',
  '#/app/data-security-classification': 'Sensitive Data Classification',
  '#/app/data-security-dashboard': 'Data Security Dashboard',

  // Email & Collaboration Security
  '#/app/email-security': 'Email Security',
  '#/app/email-quarantine': 'Email Quarantine',
  '#/app/collaboration-protection': 'Collaboration Protection',

  // Network Security
  '#/app/network-inventory': 'Network Inventory',
  '#/app/network-security': 'Network Security',
  '#/app/ztsa': 'Zero Trust Secure Access',
  '#/app/ztsa-internet-access': 'ZTSA Internet Access',
  '#/app/ztsa-private-access': 'ZTSA Private Access',

  // Cloud Security
  '#/app/cloud-security': 'Cloud Security',
  '#/app/cloud-posture': 'Cloud Posture',
  '#/app/container-security': 'Container Security',
  '#/app/container-inventory': 'Container Inventory',

  // Attack Surface Risk Management
  '#/app/risk-insights': 'Risk Insights',
  '#/app/attack-surface': 'Attack Surface Discovery',
  '#/app/operations-dashboard': 'Operations Dashboard',

  // XDR / Detection & Response
  '#/app/xdr': 'XDR Workbench',
  '#/app/workbench': 'Workbench',
  '#/app/search': 'XDR Search',
  '#/app/observed-attack-techniques': 'Observed Attack Techniques',
  '#/app/dm': 'Detection Model Management',
  '#/app/threatintelligence': 'Threat Intelligence',

  // Workflow & Automation
  '#/app/playbook': 'Playbooks',
  '#/app/response': 'Response Management',
  '#/app/automation': 'Automation Rules',

  // Administration
  '#/app/admin': 'Administration',
  '#/app/user-accounts': 'User Accounts',
  '#/app/user-roles': 'User Roles',
  '#/app/api-keys': 'API Keys',
  '#/app/notifications': 'Notifications',
  '#/app/audit-logs': 'Audit Logs',
  '#/app/license': 'License',

  // Identity Security
  '#/app/identity-security': 'Identity Security',
  '#/app/identity-posture': 'Identity Posture',

  // Mobile Security
  '#/app/mobile-security': 'Mobile Security',
  '#/app/mobile-inventory': 'Mobile Inventory'
};

// V1 iframe name → module/product name
const V1_IFRAME_MAP = {
  '__VES_CONTAINER': 'Endpoint Security',
  '__SASE_CONTAINER': 'Network Security (SASE)',
  '__SASE_ES_CONTAINER': 'Network Security (ES)',
  '__ADS_CONTAINER': 'Data Security',
  '__DETECTIONMODEL_CONTAINER': 'Detection Model Management',
  '__CECP_CONTAINER': 'Email & Collaboration Protection',
  '__CLOUD_CONTAINER': 'Cloud Security',
  '__IDENTITY_CONTAINER': 'Identity Security',
  '__MOBILE_CONTAINER': 'Mobile Security',
  '__CONTAINER_SECURITY_CONTAINER': 'Container Security',
  '__ZTSA_CONTAINER': 'Zero Trust Secure Access',
  '__RESPONSE_CONTAINER': 'Response Management',
  '__PLAYBOOK_CONTAINER': 'Playbooks'
};

/**
 * Resolve a V1 URL to a human-readable page name
 * Handles full URLs and hash fragments
 */
function resolvePageName(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const hash = u.hash;
    if (!hash) return null;

    // Exact match
    if (V1_PAGE_MAP[hash]) return V1_PAGE_MAP[hash];

    // Prefix match (some routes have sub-paths like #/app/sensor-policy/detail/123)
    const hashBase = hash.replace(/\/[^/]+$/, ''); // strip last segment
    if (V1_PAGE_MAP[hashBase]) return V1_PAGE_MAP[hashBase];

    // Try extracting the route name from the hash
    const match = hash.match(/#\/app\/([^/?]+)/);
    if (match) {
      // Convert kebab-case to title case
      return match[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  } catch {
    // Not a valid URL, try as hash directly
    if (V1_PAGE_MAP[url]) return V1_PAGE_MAP[url];
  }
  return null;
}

/**
 * Resolve an iframe name to a V1 module name
 */
function resolveIframeName(iframeName) {
  if (!iframeName) return null;
  return V1_IFRAME_MAP[iframeName] || null;
}

/**
 * Enrich an array of activity events with V1 context
 * Adds pageName and moduleName fields where applicable
 */
function enrichEvents(events) {
  return events.map(event => {
    const enriched = { ...event };
    if (event.url) {
      const pageName = resolvePageName(event.url);
      if (pageName) enriched.pageName = pageName;
    }
    if (event.iframe) {
      const moduleName = resolveIframeName(event.iframe);
      if (moduleName) enriched.moduleName = moduleName;
    }
    // For navigation events, enrich from/to
    if (event.type === 'navigation') {
      if (event.from) {
        const fromName = resolvePageName(event.from);
        if (fromName) enriched.fromPageName = fromName;
      }
      if (event.to) {
        const toName = resolvePageName(event.to);
        if (toName) enriched.toPageName = toName;
      }
    }
    return enriched;
  });
}

module.exports = {
  resolvePageName,
  resolveIframeName,
  enrichEvents,
  V1_PAGE_MAP,
  V1_IFRAME_MAP
};

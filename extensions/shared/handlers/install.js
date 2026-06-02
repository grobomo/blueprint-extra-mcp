/**
 * Install handler - opens welcome page on first install
 *
 * Usage:
 *   import { setupInstallHandler } from '../shared/handlers/install.js';
 *   setupInstallHandler(chrome);
 *
 * Browser name is auto-detected from manifest.json extension name
 * e.g., "Blueprint MCP for Chrome" -> "chrome"
 */

// Welcome page base URL - each browser version points here with browser param
const WELCOME_URL_BASE = 'https://blueprint-mcp.railsblueprint.com/welcome';

/**
 * Extract browser name from extension manifest name
 * "Blueprint MCP for Chrome" -> "chrome"
 * "Blueprint MCP for Firefox" -> "firefox"
 *
 * @param {object} browserAPI - The browser API
 * @returns {string} Browser name in lowercase
 */
function getBrowserNameFromManifest(browserAPI) {
  const manifest = browserAPI.runtime.getManifest();
  const extensionName = manifest.name || '';
  // Match "Blueprint MCP for X" pattern
  const match = extensionName.match(/Blueprint MCP for (\w+)/i);
  if (match) {
    return match[1].toLowerCase();
  }
  // Fallback to 'unknown' if pattern doesn't match
  return 'unknown';
}

/**
 * Set up the onInstalled handler to open welcome page on first install
 *
 * @param {object} browserAPI - The browser API (chrome or browser)
 */
export function setupInstallHandler(browserAPI) {
  browserAPI.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      // Open welcome page on fresh install
      const browserName = getBrowserNameFromManifest(browserAPI);
      const welcomeUrl = `${WELCOME_URL_BASE}?browser=${encodeURIComponent(browserName)}`;
      browserAPI.tabs.create({ url: welcomeUrl });

      // Initialize V1 Helper defaults
      browserAPI.storage.local.set({
        v1h_overlay_enabled: true,
        v1h_region: 'us-east-1',
      });
    }
  });
}

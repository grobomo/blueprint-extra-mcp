/**
 * Shared debug logger — replaces per-file debugLog copies.
 * Usage: const debugLog = require('./debugLog')('MyModule');
 */
function createDebugLog(tag) {
  const prefix = tag ? `[${tag}]` : '';
  return function debugLog(...args) {
    if (global.DEBUG_MODE) {
      if (prefix) {
        console.error(prefix, ...args);
      } else {
        console.error(...args);
      }
    }
  };
}

module.exports = createDebugLog;

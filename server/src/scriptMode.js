/**
 * Script Mode (PRO feature)
 *
 * Provides a simple JSON-RPC 2.0 interface over stdin/stdout for scripting.
 * Allows any language (Python, Ruby, Bash, etc.) to control the browser
 * without needing MCP client libraries.
 *
 * REQUIRES: PRO authentication (OAuth tokens)
 *
 * Protocol:
 * - One JSON message per line (request or batch array)
 * - Responses are returned as JSON lines
 * - Server exits when stdin closes
 *
 * Example:
 *   Input:  {"jsonrpc":"2.0","id":1,"method":"enable","params":{"client_id":"my-script"}}
 *   Output: {"jsonrpc":"2.0","id":1,"result":{"success":true,"mode":"pro","state":"active"}}
 */

const readline = require('readline');
const { StatefulBackend } = require('./statefulBackend');
const { OAuth2Client } = require('./oauth');

/**
 * Start script mode - JSON-RPC over stdio (PRO only)
 */
async function startScriptMode(config) {
  // Check PRO authentication first
  const oauth = new OAuth2Client(config);
  const isAuthenticated = await oauth.isAuthenticated();

  if (!isAuthenticated) {
    // Output error and exit
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32001,
        message: 'Script mode requires PRO authentication. Run "npx @railsblueprint/blueprint-mcp auth login" first, or visit https://blueprint-mcp.railsblueprint.com/pro'
      }
    };
    console.log(JSON.stringify(errorResponse));
    process.exit(1);
  }

  // Create backend
  const backend = new StatefulBackend(config);

  // Initialize backend (no MCP server needed)
  await backend.initialize(null, {});

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  // Process incoming lines
  rl.on('line', async (line) => {
    try {
      const trimmed = line.trim();
      if (!trimmed) return; // Skip empty lines

      const parsed = JSON.parse(trimmed);

      // Handle batch requests (array)
      if (Array.isArray(parsed)) {
        const results = await Promise.all(
          parsed.map(req => handleRequest(req, backend))
        );
        console.log(JSON.stringify(results));
      } else {
        // Single request
        const result = await handleRequest(parsed, backend);
        console.log(JSON.stringify(result));
      }
    } catch (error) {
      // JSON parse error
      const errorResponse = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700, // Parse error
          message: `Parse error: ${error.message}`
        }
      };
      console.log(JSON.stringify(errorResponse));
    }
  });

  // Clean shutdown when stdin closes
  rl.on('close', async () => {
    await backend.serverClosed();
    process.exit(0);
  });

  // Handle signals
  process.on('SIGINT', async () => {
    await backend.serverClosed();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await backend.serverClosed();
    process.exit(0);
  });
}

/**
 * Handle a single JSON-RPC request
 */
async function handleRequest(request, backend) {
  const { jsonrpc, id, method, params } = request;

  // Validate JSON-RPC format
  if (jsonrpc !== '2.0') {
    return {
      jsonrpc: '2.0',
      id: id || null,
      error: {
        code: -32600, // Invalid Request
        message: 'Invalid JSON-RPC version (must be "2.0")'
      }
    };
  }

  if (!method || typeof method !== 'string') {
    return {
      jsonrpc: '2.0',
      id: id || null,
      error: {
        code: -32600,
        message: 'Missing or invalid method'
      }
    };
  }

  try {
    // Call the tool with rawResult option for structured responses
    const result = await backend.callTool(method, params || {}, { rawResult: true });

    return {
      jsonrpc: '2.0',
      id,
      result
    };
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32000, // Server error
        message: error.message || String(error)
      }
    };
  }
}

module.exports = { startScriptMode };

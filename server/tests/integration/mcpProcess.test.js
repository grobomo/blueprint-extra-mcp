/**
 * MCP Server Process Integration Tests
 *
 * Spawns the actual MCP server as a child process, communicates via JSON-RPC
 * over stdin/stdout (newline-delimited JSON), and verifies real protocol behavior.
 */

const { spawn } = require('child_process');
const path = require('path');

const SERVER_PATH = path.join(__dirname, '..', '..', 'cli.js');
const TIMEOUT = 15000;

/**
 * Spawn the MCP server and return helpers for JSON-RPC communication.
 * MCP SDK uses newline-delimited JSON (one JSON object per line).
 */
function spawnServer() {
  const proc = spawn(process.execPath, [SERVER_PATH, '--child'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: path.join(__dirname, '..', '..'),
    env: { ...process.env, STEALTH_MODE: 'true' }
  });

  let buffer = '';
  const pendingResolvers = new Map();
  let nextId = 1;

  proc.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    // Parse newline-delimited JSON messages
    let newlineIdx;
    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIdx).replace(/\r$/, '');
      buffer = buffer.slice(newlineIdx + 1);
      if (!line) continue;

      try {
        const msg = JSON.parse(line);
        if (msg.id !== undefined && pendingResolvers.has(msg.id)) {
          pendingResolvers.get(msg.id)(msg);
          pendingResolvers.delete(msg.id);
        }
      } catch (e) {
        // ignore non-JSON lines
      }
    }
  });

  function sendRequest(method, params = {}) {
    const id = nextId++;
    const line = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
    proc.stdin.write(line);

    return new Promise((resolve, reject) => {
      pendingResolvers.set(id, resolve);
      setTimeout(() => {
        if (pendingResolvers.has(id)) {
          pendingResolvers.delete(id);
          reject(new Error(`Timeout waiting for response to ${method} (id=${id})`));
        }
      }, 10000);
    });
  }

  function sendNotification(method, params = {}) {
    const line = JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n';
    proc.stdin.write(line);
  }

  function kill() {
    // Clear all pending resolvers to prevent timeout timers from keeping Jest alive
    for (const [id, resolve] of pendingResolvers) {
      resolve({ id, error: { code: -1, message: 'Server killed' } });
    }
    pendingResolvers.clear();
    try { proc.stdin.end(); } catch (e) { /* ignore */ }
    proc.kill('SIGTERM');
    return new Promise((resolve) => {
      proc.on('exit', resolve);
      setTimeout(() => { try { proc.kill('SIGKILL'); } catch (e) { /* */ } resolve(); }, 2000);
    });
  }

  return { proc, sendRequest, sendNotification, kill };
}

/** Helper: initialize + send initialized notification */
async function initServer(server) {
  const response = await server.sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  });
  server.sendNotification('notifications/initialized');
  return response;
}

describe('MCP Server Process', () => {
  let server;

  afterEach(async () => {
    if (server) {
      await server.kill();
      server = null;
    }
  });

  test('starts and responds to initialize', async () => {
    server = spawnServer();

    const response = await server.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    });

    expect(response.result).toBeDefined();
    expect(response.result.serverInfo).toBeDefined();
    expect(response.result.serverInfo.name).toContain('Blueprint');
    expect(response.result.capabilities).toBeDefined();
    expect(response.result.capabilities.tools).toBeDefined();
  }, TIMEOUT);

  test('tools/list includes browser_activity and enable', async () => {
    server = spawnServer();
    await initServer(server);

    const response = await server.sendRequest('tools/list', {});

    expect(response.result).toBeDefined();
    expect(response.result.tools).toBeInstanceOf(Array);

    const toolNames = response.result.tools.map(t => t.name);
    expect(toolNames).toContain('enable');
    expect(toolNames).toContain('browser_activity');
    expect(toolNames).toContain('status');
    expect(toolNames).toContain('disable');
  }, TIMEOUT);

  test('tools/call enable without client_id returns error', async () => {
    server = spawnServer();
    await initServer(server);

    const response = await server.sendRequest('tools/call', {
      name: 'enable',
      arguments: {}
    });

    expect(response.result).toBeDefined();
    expect(response.result.isError).toBe(true);
    expect(response.result.content[0].text).toContain('client_id');
  }, TIMEOUT);

  test('tools/call status returns passive/disabled state', async () => {
    server = spawnServer();
    await initServer(server);

    const response = await server.sendRequest('tools/call', {
      name: 'status',
      arguments: {}
    });

    expect(response.result).toBeDefined();
    expect(response.result.isError).toBeFalsy();
    const text = response.result.content[0].text;
    expect(text).toContain('Passive');
  }, TIMEOUT);

  // T002: Error handling
  test('tools/call browser_activity start without enable returns error', async () => {
    server = spawnServer();
    await initServer(server);

    const response = await server.sendRequest('tools/call', {
      name: 'browser_activity',
      arguments: { action: 'start' }
    });

    expect(response.result).toBeDefined();
    expect(response.result.isError).toBe(true);
    expect(response.result.content[0].text).toMatch(/not connected|enable/i);
  }, TIMEOUT);

  test('tools/call browser_* tools without enable returns error', async () => {
    server = spawnServer();
    await initServer(server);

    const response = await server.sendRequest('tools/call', {
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' }
    });

    expect(response.result).toBeDefined();
    expect(response.result.isError).toBe(true);
    expect(response.result.content[0].text).toMatch(/not active|enable|passive/i);
  }, TIMEOUT);

  test('tools/call nonexistent tool returns error', async () => {
    server = spawnServer();
    await initServer(server);

    const response = await server.sendRequest('tools/call', {
      name: 'totally_fake_tool',
      arguments: {}
    });

    // MCP SDK returns a JSON-RPC error for unknown tools
    expect(response.error || response.result?.isError).toBeTruthy();
  }, TIMEOUT);

  test('tools/call browser_activity status returns idle when not enabled', async () => {
    server = spawnServer();
    await initServer(server);

    const response = await server.sendRequest('tools/call', {
      name: 'browser_activity',
      arguments: { action: 'status' }
    });

    expect(response.result).toBeDefined();
    const text = response.result.content[0].text;
    expect(text).toMatch(/idle|not.*track/i);
  }, TIMEOUT);
});

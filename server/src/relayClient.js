/**
 * Relay Client for Multi-Session Support
 *
 * When port 5555 is already bound by a primary Blueprint MCP instance,
 * this client connects to that primary via WebSocket on /relay path.
 * Commands are forwarded through the primary to the browser extension.
 *
 * Architecture:
 *   Claude Tab A (primary)  ---+
 *                              |--- port 5555 --- Extension --- Browser
 *   Claude Tab B (relay)    ---+  (via /relay WebSocket)
 *   Claude Tab C (relay)    ---+
 *
 * Copyright (c) 2025 grobomo (fork extra)
 * Licensed under Apache License 2.0
 */

const WebSocket = require('ws');
const { getLogger } = require('./fileLogger');

function debugLog(...args) {
  if (global.DEBUG_MODE) {
    const logger = getLogger();
    logger.log('[RelayClient]', ...args);
  }
}

class RelayClient {
  constructor(port = 5555, host = '127.0.0.1') {
    this._port = port;
    this._host = host;
    this._ws = null;
    this._pendingRequests = new Map();
    this._connected = false;
    this._reconnectTimer = null;
    this._reconnectAttempts = 0;
    this._maxReconnectAttempts = 20;
    this._autoReconnect = true;
    this._clientId = null;
    this.onReconnect = null;
    this.onTabInfoUpdate = null;
  }

  /**
   * Connect to the primary instance's relay endpoint
   */
  async connect() {
    return new Promise((resolve, reject) => {
      const url = `ws://${this._host}:${this._port}/relay`;
      debugLog(`Connecting to primary at ${url}`);

      this._ws = new WebSocket(url);

      const timeout = setTimeout(() => {
        if (!this._connected) {
          this._ws.terminate();
          reject(new Error(`Relay connection timeout to ${url}`));
        }
      }, 10000);

      this._ws.on('open', () => {
        clearTimeout(timeout);
        this._connected = true;
        this._reconnectAttempts = 0;
        debugLog('Connected to primary as relay client');

        // Send handshake
        this._ws.send(JSON.stringify({
          type: 'relay_handshake',
          clientId: this._clientId || 'relay-' + process.pid
        }));

        // Start keepalive to prevent idle disconnects
        this._startKeepalive();

        resolve();
      });

      this._ws.on('message', (data) => {
        this._handleMessage(data);
      });

      this._ws.on('close', () => {
        debugLog('Relay connection closed');
        this._connected = false;
        // Don't reject pending — reconnect will retry them
        if (this._autoReconnect) {
          this._scheduleReconnect();
        } else {
          this._rejectAllPending('Relay connection closed');
        }
      });

      this._ws.on('error', (error) => {
        clearTimeout(timeout);
        debugLog('Relay connection error:', error.message);
        if (!this._connected) {
          reject(error);
        }
      });
    });
  }

  /**
   * Handle incoming message from primary
   */
  _handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      debugLog('Relay received:', message.method || 'response');

      // Response to a pending request
      if (message.id !== undefined && !message.method) {
        const pending = this._pendingRequests.get(message.id);
        if (pending) {
          this._pendingRequests.delete(message.id);

          // Extract tab info updates
          const result = message.result || {};
          if ('currentTab' in result && this.onTabInfoUpdate) {
            this.onTabInfoUpdate(result.currentTab);
          }

          if (message.error) {
            pending.reject(new Error(message.error.message || JSON.stringify(message.error)));
          } else {
            pending.resolve(message.result);
          }
        }
        return;
      }

      // Notifications from primary
      if (message.method === 'relay_notification') {
        debugLog('Relay notification:', message.params?.type);
        if (message.params?.type === 'extension_reconnected' && this.onReconnect) {
          this.onReconnect();
        }
        return;
      }
    } catch (error) {
      debugLog('Error handling relay message:', error);
    }
  }

  /**
   * Send a command through the relay to the extension
   */
  async sendCommand(method, params = {}, timeout = 30000) {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
      throw new Error('Relay not connected. Primary instance may have stopped.');
    }

    const id = 'relay-' + Math.random().toString(36).substring(7);

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this._pendingRequests.delete(id);
        reject(new Error(`Relay request timeout: ${method}`));
      }, timeout);

      this._pendingRequests.set(id, {
        resolve: (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      });

      const message = {
        jsonrpc: '2.0',
        id,
        method: 'relay_forward',
        params: {
          targetMethod: method,
          targetParams: params
        }
      };

      debugLog('Relay sending:', method);
      this._ws.send(JSON.stringify(message));
    });
  }

  /**
   * Set client ID for relay identification
   */
  setClientId(clientId) {
    this._clientId = clientId;
    debugLog('Relay client ID set to:', clientId);
  }

  /**
   * Check if relay is connected
   */
  isConnected() {
    return this._connected && this._ws && this._ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get browser type (relayed from primary)
   */
  getBrowserType() {
    return 'chrome'; // Default; updated on first response
  }

  /**
   * Get build timestamp (relayed from primary)
   */
  getBuildTimestamp() {
    return null;
  }

  /**
   * Schedule auto-reconnect with exponential backoff
   */
  _scheduleReconnect() {
    if (this._reconnectTimer) return;
    if (this._reconnectAttempts >= this._maxReconnectAttempts) {
      debugLog(`Max reconnect attempts (${this._maxReconnectAttempts}) reached, giving up`);
      this._rejectAllPending('Relay reconnect failed after max attempts');
      return;
    }

    const delay = Math.min(1000 * Math.pow(1.5, this._reconnectAttempts), 15000);
    this._reconnectAttempts++;
    debugLog(`Reconnecting in ${delay}ms (attempt ${this._reconnectAttempts}/${this._maxReconnectAttempts})`);

    this._reconnectTimer = setTimeout(async () => {
      this._reconnectTimer = null;
      try {
        await this.connect();
        debugLog('Relay reconnected successfully');
        this._reconnectAttempts = 0;
        if (this.onReconnect) this.onReconnect();
      } catch (e) {
        debugLog('Reconnect failed:', e.message);
        if (this._autoReconnect) this._scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Start keepalive ping to prevent idle disconnects
   */
  _startKeepalive(intervalMs = 15000) {
    if (this._keepaliveTimer) clearInterval(this._keepaliveTimer);
    this._keepaliveTimer = setInterval(() => {
      if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        try {
          this._ws.ping();
        } catch (e) {
          debugLog('Keepalive ping failed:', e.message);
        }
      }
    }, intervalMs);
  }

  /**
   * Reject all pending requests
   */
  _rejectAllPending(reason) {
    for (const [id, pending] of this._pendingRequests) {
      pending.reject(new Error(reason));
    }
    this._pendingRequests.clear();
  }

  /**
   * Close the relay connection
   */
  async close() {
    debugLog('Closing relay connection');
    this._connected = false;
    this._autoReconnect = false;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._keepaliveTimer) {
      clearInterval(this._keepaliveTimer);
      this._keepaliveTimer = null;
    }
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this._rejectAllPending('Relay client closed');
  }
}

module.exports = { RelayClient };

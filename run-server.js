#!/usr/bin/env node
/**
 * Blueprint Extra MCP - Entry Point
 *
 * Fork of railsblueprint/blueprint-mcp with extras:
 * - Same-origin iframe content in snapshots
 * - Incognito tab recognition
 * - Relay mode for multi-session support
 *
 * Copyright (c) 2025 Rails Blueprint (upstream)
 * Copyright (c) 2025 grobomo (fork extras)
 * Licensed under Apache License 2.0
 */

require('./server/cli.js');

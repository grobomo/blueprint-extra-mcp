#!/usr/bin/env bash
# Spec 011: Integration tests — real MCP server process + activity tracker classes
# Runs Jest integration tests that spawn the actual server as a child process.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER_DIR="$PROJECT_ROOT/server"

echo "=== Spec 011: Integration Tests ==="
echo ""

cd "$SERVER_DIR"

# Run MCP process integration tests (needs --forceExit due to cli.js exit-watchdog timer)
echo "[1/1] MCP Server Process Tests"
npx jest tests/integration/mcpProcess.test.js --no-coverage --forceExit 2>&1

echo ""
echo "=== All integration tests passed ==="

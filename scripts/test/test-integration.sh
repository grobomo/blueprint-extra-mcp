#!/usr/bin/env bash
# Spec 011: Integration tests — real MCP server process + activity tracker/reporter/enrichment
# Runs Jest tests: process-level (spawn server) + unit tests with mocks/synthetic data.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER_DIR="$PROJECT_ROOT/server"

echo "=== Spec 011: Integration Tests ==="
echo ""

cd "$SERVER_DIR"

# Phase 1-2: MCP process + ActivityTracker (T001-T003)
echo "[1/4] MCP Server Process Tests (T001-T002)"
npx jest tests/integration/mcpProcess.test.js --no-coverage --forceExit 2>&1
echo ""

echo "[2/4] ActivityTracker Unit Tests (T003)"
npx jest tests/unit/activityTracker.test.js --no-coverage 2>&1
echo ""

# Phase 3: ActivityReporter (T004-T005)
echo "[3/4] ActivityReporter Tests (T004-T005)"
npx jest tests/unit/activityReporter.test.js --no-coverage 2>&1
echo ""

# Phase 4: V1 Enrichment (T006)
echo "[4/4] V1 Enrichment Tests (T006)"
npx jest tests/unit/v1Enrichment.test.js --no-coverage 2>&1
echo ""

echo "=== All integration tests passed ==="

# Spec 011: Integration Tests

Real functional tests that exercise the MCP server process and activity tracker classes with actual data, not just grep-based static checks.

## Phase 1: MCP Server Process Tests

### T001: MCP server starts and responds to tools/list
Start the server as a child process, send JSON-RPC `tools/list`, verify `browser_activity` and `enable` are in the response.

**Checkpoint**: `bash scripts/test/test-integration.sh` — exits 0, all assertions pass

### T002: Tool call error handling
Call `enable` without `client_id` → expect error. Call `browser_activity action='status'` → expect idle response. Call `browser_activity action='start'` without enable → expect error.

**Checkpoint**: `bash scripts/test/test-integration.sh` — exits 0, error handling assertions pass

## Phase 2: ActivityTracker Unit Tests

### T003: ActivityTracker class start/stop with mock transport
Create a mock transport, call start(), verify script injection was requested. Call stop(), verify events are collected and summarized.

**Checkpoint**: `bash scripts/test/test-integration.sh` — exits 0, tracker unit tests pass

## Phase 3: ActivityReporter Tests

### T004: ActivityReporter summarize with synthetic events
Feed synthetic events (clicks, hovers, dwells, navs, scrolls) into ActivityReporter, verify summary structure and calculations.

**Checkpoint**: `bash scripts/test/test-integration.sh` — exits 0, reporter tests pass

### T005: ActivityReporter HTML generation
Generate HTML report from synthetic events, verify file is written, contains expected sections (charts, tables), and JSON embed is XSS-safe.

**Checkpoint**: `bash scripts/test/test-integration.sh` — exits 0, HTML report tests pass

## Phase 4: V1 Enrichment Tests

### T006: v1Enrichment route and iframe mapping
Test resolvePageName for known V1 hash routes, test enrichEvents transforms events correctly.

**Checkpoint**: `bash scripts/test/test-integration.sh` — exits 0, enrichment tests pass

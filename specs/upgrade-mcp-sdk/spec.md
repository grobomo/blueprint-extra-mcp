# Spec 015b: Upgrade MCP SDK

## Goal
Upgrade `@modelcontextprotocol/sdk` from 1.0.4 to 1.29.0 to align protocol version with mcp-manager (SDK ^1.25.1).

## Why
- SDK 1.0.4 supports protocol `2024-11-05` only
- mcp-manager sends `protocolVersion: "2025-11-25"`
- Current negotiation falls back gracefully but protocol alignment prevents future incompatibilities
- SDK 1.29.0 supports `2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05`, `2024-10-07`

## Verified Compatibility
- SDK 1.29.0 has dual CJS/ESM exports (`dist/cjs/` for require(), `dist/esm/` for import)
- Wildcard export `"./*"` covers all Blueprint import paths
- `Server`, `StdioServerTransport`, `ListToolsRequestSchema`, `CallToolRequestSchema` all present in CJS

## Files Changed
- `server/package.json` — bump `@modelcontextprotocol/sdk` version
- `server/package-lock.json` — auto-updated by npm

## Testing
- Run existing unit tests to verify no breakage
- Test standalone server startup and initialize handshake

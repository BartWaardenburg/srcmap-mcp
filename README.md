# srcmap-mcp

[![npm version](https://img.shields.io/npm/v/srcmap-mcp.svg)](https://www.npmjs.com/package/srcmap-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![CI](https://github.com/BartWaardenburg/srcmap-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/BartWaardenburg/srcmap-mcp/actions/workflows/ci.yml)
[![MCP](https://img.shields.io/badge/MCP-compatible-8A2BE2.svg)](https://modelcontextprotocol.io)

MCP server for source map debugging. Fetch, inspect, look up, and extract original sources from any production website — directly from your AI assistant.

> Unofficial community server. Not affiliated with the srcmap project.

## Add To Your Editor

### Claude Code

```bash
claude mcp add srcmap-mcp -- npx srcmap-mcp
```

### Codex CLI

```bash
codex --mcp-config '{"srcmap-mcp":{"command":"npx","args":["srcmap-mcp"]}}'
```

### Gemini CLI

```bash
gemini --mcp-config '{"srcmap-mcp":{"command":"npx","args":["srcmap-mcp"]}}'
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "srcmap-mcp": {
      "command": "npx",
      "args": ["srcmap-mcp"]
    }
  }
}
```

<details>
<summary>Claude Desktop / Windsurf / Cline / Zed / Docker</summary>

### Claude Desktop / Windsurf / Cline

Add to your MCP config file:

```json
{
  "mcpServers": {
    "srcmap-mcp": {
      "command": "npx",
      "args": ["srcmap-mcp"]
    }
  }
}
```

### Zed

Add to Zed settings:

```json
{
  "context_servers": {
    "srcmap-mcp": {
      "command": {
        "path": "npx",
        "args": ["srcmap-mcp"]
      }
    }
  }
}
```

### Docker

```bash
docker run -i --rm ghcr.io/bartwaardenburg/srcmap-mcp
```

</details>

## Prerequisites

This MCP server requires the `srcmap` CLI to be installed:

```bash
cargo install srcmap-cli
```

Verify it's available:

```bash
srcmap --version
```

## Features

**8 tools** across 3 categories for complete source map debugging:

### Inspection (4 tools)

| Tool | Description |
|------|-------------|
| `sourcemap_info` | Show source map metadata and statistics |
| `sourcemap_validate` | Validate a source map file |
| `sourcemap_sources` | List all original source files in a source map |
| `sourcemap_mappings` | List mappings with pagination and source filtering |

### Lookup (2 tools)

| Tool | Description |
|------|-------------|
| `sourcemap_lookup` | Find original position for a generated position, with source context |
| `sourcemap_resolve` | Reverse lookup: find generated position for an original position |

### Fetch (2 tools)

| Tool | Description |
|------|-------------|
| `sourcemap_fetch` | Download a bundle and its source map from a URL |
| `sourcemap_extract_sources` | Extract all embedded original sources to disk |

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SRCMAP_BINARY` | No | `srcmap` | Path to the srcmap CLI binary |
| `SRCMAP_CACHE_TTL` | No | `300` | Cache TTL in seconds (0 to disable) |
| `SRCMAP_TOOLSETS` | No | all | Comma-separated toolsets to enable |

## Toolset Filtering

| Toolset | Tools | Description |
|---------|-------|-------------|
| `inspection` | 4 | Source map metadata, validation, sources list, mappings |
| `lookup` | 2 | Forward and reverse position lookups |
| `fetch` | 2 | Remote fetching and source extraction |

Example: `SRCMAP_TOOLSETS=lookup,fetch` enables only lookup and fetch tools.

## Example Usage

Ask your AI assistant:

- "Fetch the source map for https://cdn.example.com/app.min.js and extract the original sources"
- "Look up what's at line 0, column 84729 in bundle.js.map"
- "Show me the original source for this minified error position"
- "List all the source files in this source map"
- "Validate this source map file"
- "What source file corresponds to this error location?"
- "Extract all the original TypeScript sources from this production bundle"

## Debugging Workflow

The typical workflow for debugging a production website:

```
1. sourcemap_fetch — Download bundle + source map from URL
2. sourcemap_sources — List what's inside
3. sourcemap_lookup — Map error positions to original source
4. sourcemap_extract_sources — Get the full source tree
```

## Development

```bash
pnpm install      # Install dependencies
pnpm dev          # Run in development mode
pnpm build        # Compile TypeScript
pnpm test         # Run tests
pnpm typecheck    # Type check without emitting
```

### Project Structure

```
src/
  index.ts              Entry point (env, client, transport)
  server.ts             McpServer factory and toolset registry
  srcmap-client.ts      CLI process wrapper with caching
  cache.ts              TTL cache
  tool-result.ts        Result/error formatting helpers
  update-checker.ts     npm update checker
  types.ts              TypeScript interfaces
  tools/
    inspection.ts       Info, validate, sources, mappings tools
    lookup.ts           Lookup and resolve tools
    fetch.ts            Fetch and extract tools
    tools.test.ts       Tool handler tests
```

## Requirements

- Node.js >= 20
- `srcmap` CLI installed (`cargo install srcmap-cli`)

## License

MIT

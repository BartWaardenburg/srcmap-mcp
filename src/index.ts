#!/usr/bin/env node

import { createRequire } from "node:module";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { SrcmapClient } from "./srcmap-client.js";
import { createServer, parseToolsets } from "./server.js";
import { checkForUpdate } from "./update-checker.js";

const require = createRequire(import.meta.url);
const { name, version } = require("../package.json") as { name: string; version: string };

const binary = process.env.SRCMAP_BINARY ?? "srcmap";
const cacheTtl = process.env.SRCMAP_CACHE_TTL !== undefined
  ? parseInt(process.env.SRCMAP_CACHE_TTL, 10) * 1000
  : undefined;

const client = new SrcmapClient(binary, cacheTtl);
const toolsets = parseToolsets(process.env.SRCMAP_TOOLSETS);

// serveStdio serves 2026-07-28 clients and clients that open with the 2025 handshake.
serveStdio(() => createServer(client, toolsets), {
  onerror: (error) => console.error("srcmap MCP server error:", error),
});

// Do not wait for the update check: the server must start at once.
void checkForUpdate(name, version);

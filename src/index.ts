#!/usr/bin/env node

import { createRequire } from "node:module";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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
const server = createServer(client, toolsets);

const main = async (): Promise<void> => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Fire-and-forget — don't block server startup
  void checkForUpdate(name, version);
};

main().catch((error) => {
  console.error("srcmap MCP server failed:", error);
  process.exit(1);
});

import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/server";
import type { SrcmapClient } from "./srcmap-client.js";
import { registerInspectionTools } from "./tools/inspection.js";
import { registerLookupTools } from "./tools/lookup.js";
import { registerFetchTools } from "./tools/fetch.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

export type Toolset = "inspection" | "lookup" | "fetch";

const ALL_TOOLSETS: Toolset[] = ["inspection", "lookup", "fetch"];

export const parseToolsets = (env?: string): Set<Toolset> => {
  if (!env) return new Set(ALL_TOOLSETS);

  const requested = env.split(",").map((s) => s.trim().toLowerCase());
  const valid = new Set<Toolset>();

  for (const name of requested) {
    if (ALL_TOOLSETS.includes(name as Toolset)) {
      valid.add(name as Toolset);
    }
  }

  return valid.size > 0 ? valid : new Set(ALL_TOOLSETS);
};

type ToolRegisterer = (server: McpServer, client: SrcmapClient) => void;

const toolsetRegistry: Record<Toolset, ToolRegisterer> = {
  inspection: registerInspectionTools,
  lookup: registerLookupTools,
  fetch: registerFetchTools,
};

const INSTRUCTIONS = [
  "Debug production JavaScript and CSS with source maps. The srcmap CLI must be installed.",
  "Start with sourcemap_fetch to download a bundle and its source map from a URL.",
  "Then call sourcemap_info, sourcemap_validate or sourcemap_sources to inspect the map.",
  "Use sourcemap_lookup and sourcemap_resolve to map positions between generated and original code.",
  "Call sourcemap_extract_sources to write the original files to disk.",
  "Set SRCMAP_BINARY if the srcmap binary is not on PATH.",
].join("\n");

export const createServer = (client: SrcmapClient, toolsets: Set<Toolset>): McpServer => {
  const server = new McpServer(
    {
      name: "srcmap-mcp",
      title: "Source Map Debugger",
      version,
      websiteUrl: "https://github.com/BartWaardenburg/srcmap-mcp",
    },
    { instructions: INSTRUCTIONS },
  );

  // Iterate the fixed list, not the user input, so tools/list has one stable order.
  for (const toolset of ALL_TOOLSETS.filter((t) => toolsets.has(t))) {
    toolsetRegistry[toolset](server, client);
  }

  return server;
};

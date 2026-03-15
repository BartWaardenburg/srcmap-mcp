import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { SrcmapClient } from "../srcmap-client.js";
import type { SourceMapInfo, SourcesList, MappingsResult, SourceEntry } from "../types.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const registerInspectionTools = (server: McpServer, client: SrcmapClient): void => {
  server.registerTool(
    "sourcemap_info",
    {
      title: "Source Map Info",
      description:
        "Show metadata and statistics for a source map file. " +
        "Returns file name, source count, names, mappings count, lines, content size, and debug ID. " +
        "Use this to understand what a source map contains before doing lookups.",
      annotations: { readOnlyHint: true, openWorldHint: false },

      inputSchema: z.object({
        file: z.string().describe("Path to a source map file (.map)"),
      }),
    },
    async ({ file }) => {
      try {
        const info = (await client.info(file)) as unknown as SourceMapInfo;

        const lines = [
          "Source map info:",
          info.file ? `  File: ${info.file}` : null,
          `  Sources: ${info.sources}`,
          `  Names: ${info.names}`,
          `  Mappings: ${info.mappings}`,
          info.rangeMappings > 0 ? `  Range mappings: ${info.rangeMappings}` : null,
          `  Lines: ${info.lines}`,
          info.sourcesWithContent > 0
            ? `  Content: ${info.sourcesWithContent}/${info.sources} sources (${formatSize(info.totalContentSize)})`
            : null,
          `  File size: ${formatSize(info.fileSize)}`,
          info.debugId ? `  Debug ID: ${info.debugId}` : null,
        ].filter(Boolean);

        return toTextResult(lines.join("\n"), { info } as Record<string, unknown>);
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "sourcemap_validate",
    {
      title: "Validate Source Map",
      description:
        "Validate that a file is a valid source map. " +
        "Reports whether the map is valid and its basic structure (sources, names, mappings count).",
      annotations: { readOnlyHint: true, openWorldHint: false },

      inputSchema: z.object({
        file: z.string().describe("Path to a source map file (.map)"),
      }),
    },
    async ({ file }) => {
      try {
        const result = (await client.validate(file)) as Record<string, unknown>;
        const valid = result.valid as boolean;

        if (valid) {
          return toTextResult(
            `Valid source map v3: ${result.sources} sources, ${result.names} names, ${result.mappings} mappings across ${result.lines} lines`,
            result,
          );
        }

        return toTextResult(`Invalid source map: ${result.error}`, result);
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "sourcemap_sources",
    {
      title: "List Sources",
      description:
        "List all original source files embedded in a source map. " +
        "Shows each source path, whether it has embedded content, content size, and if it's on the ignore list. " +
        "Use this to understand what files a bundle was built from.",
      annotations: { readOnlyHint: true, openWorldHint: false },

      inputSchema: z.object({
        file: z.string().describe("Path to a source map file (.map)"),
      }),
    },
    async ({ file }) => {
      try {
        const result = (await client.sources(file)) as unknown as SourcesList;

        const lines = [
          `Sources (${result.total}, ${result.withContent} with content):`,
          "",
          ...result.sources.map((s: SourceEntry) => {
            const size = s.hasContent && s.contentSize !== null
              ? ` [${formatSize(s.contentSize)}]`
              : " [no content]";
            const ignored = s.ignored ? " (ignored)" : "";
            return `  ${s.index}: ${s.source}${size}${ignored}`;
          }),
        ];

        return toTextResult(lines.join("\n"), result as unknown as Record<string, unknown>);
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "sourcemap_mappings",
    {
      title: "List Mappings",
      description:
        "List mappings in a source map with pagination. " +
        "Shows generated and original positions for each mapping. " +
        "Optionally filter by source file. Use --limit and --offset for pagination.",
      annotations: { readOnlyHint: true, openWorldHint: false },

      inputSchema: z.object({
        file: z.string().describe("Path to a source map file (.map)"),
        source: z.string().optional().describe("Filter by source filename"),
        limit: z.number().min(1).max(1000).default(50).describe("Maximum number of mappings to return (default: 50)"),
        offset: z.number().min(0).default(0).describe("Skip first N mappings (default: 0)"),
      }),
    },
    async ({ file, source, limit, offset }) => {
      try {
        const result = (await client.mappings(file, { source, limit, offset })) as unknown as MappingsResult;

        const lines = [
          `Mappings (${result.total} total, showing ${result.offset}-${result.offset + result.mappings.length}):`,
          "",
          ...result.mappings.map((m) => {
            const src = m.source ?? "-";
            const name = m.name ? ` name=${m.name}` : "";
            return `  ${m.generatedLine}:${m.generatedColumn} → ${src}:${m.originalLine}:${m.originalColumn}${name}`;
          }),
        ];

        if (result.hasMore) {
          lines.push("", `  ... ${result.total - result.offset - result.mappings.length} more (use offset=${result.offset + result.mappings.length})`);
        }

        return toTextResult(lines.join("\n"), result as unknown as Record<string, unknown>);
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};

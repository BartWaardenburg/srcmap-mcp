import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { SrcmapClient } from "../srcmap-client.js";
import type { FetchResult, ExtractResult } from "../types.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const registerFetchTools = (server: McpServer, client: SrcmapClient): void => {
  server.registerTool(
    "sourcemap_fetch",
    {
      title: "Fetch Bundle & Source Map",
      description:
        "Download a JavaScript or CSS bundle and its source map from a URL. " +
        "Automatically resolves the sourceMappingURL reference (inline data URIs, external URLs, " +
        "and conventional .map suffix fallback). Saves both files to the output directory. " +
        "Use this as the first step when debugging a production website.",
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },

      inputSchema: z.object({
        url: z.string().describe("URL of the JavaScript or CSS file to fetch"),
        outputDir: z.string().default("/tmp/srcmap").describe("Directory to save the downloaded files (default: /tmp/srcmap)"),
      }),
    },
    async ({ url, outputDir }) => {
      try {
        const result = (await client.fetch(url, outputDir)) as unknown as FetchResult;

        const parts = [
          `Fetched bundle: ${result.bundle.file} (${formatSize(result.bundle.size)})`,
        ];

        if (result.sourceMap) {
          parts.push(`Source map: ${result.sourceMap.file} (${formatSize(result.sourceMap.size)})`);
        } else {
          parts.push("No source map found for this bundle.");
        }

        return toTextResult(parts.join("\n"), result as unknown as Record<string, unknown>);
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "sourcemap_extract_sources",
    {
      title: "Extract Original Sources",
      description:
        "Extract all embedded original source files from a source map to disk. " +
        "Writes each sourcesContent entry as a file, preserving the directory structure. " +
        "Handles webpack://, file://, and relative path prefixes. " +
        "Use this after fetching a source map to get the full original source tree.",
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },

      inputSchema: z.object({
        file: z.string().describe("Path to a source map file (.map)"),
        outputDir: z.string().default("/tmp/srcmap-sources").describe("Directory to extract source files to (default: /tmp/srcmap-sources)"),
      }),
    },
    async ({ file, outputDir }) => {
      try {
        const result = (await client.sourcesExtract(file, outputDir)) as unknown as ExtractResult;

        const parts = [
          `Extracted ${result.extracted.length}/${result.total} sources to ${outputDir}`,
        ];

        if (result.extracted.length > 0) {
          parts.push("");
          for (const entry of result.extracted) {
            parts.push(`  ${entry.source} [${formatSize(entry.size)}]`);
          }
        }

        if (result.skipped.length > 0) {
          parts.push("", `Skipped ${result.skipped.length} sources without content`);
        }

        return toTextResult(parts.join("\n"), result as unknown as Record<string, unknown>);
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};

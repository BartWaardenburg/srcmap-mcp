import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { SrcmapClient } from "../srcmap-client.js";
import type { LookupResult, ContextLine, ResolveResult } from "../types.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerLookupTools = (server: McpServer, client: SrcmapClient): void => {
  server.registerTool(
    "sourcemap_lookup",
    {
      title: "Lookup Original Position",
      description:
        "Find the original source position for a generated (minified) position. " +
        "Given a line and column in the generated/minified file, returns the original source file, " +
        "line, column, and optionally the identifier name. " +
        "Use --context to also get surrounding lines of original source code. " +
        "All positions are 0-based.",
      annotations: { readOnlyHint: true, openWorldHint: false },

      inputSchema: z.object({
        file: z.string().describe("Path to a source map file (.map)"),
        line: z.number().min(0).describe("Generated line number (0-based)"),
        column: z.number().min(0).describe("Generated column number (0-based)"),
        context: z.number().min(0).max(50).default(5).describe("Number of context lines to show around the matched position (default: 5)"),
      }),
    },
    async ({ file, line, column, context }) => {
      try {
        const result = (await client.lookup(file, line, column, context)) as unknown as LookupResult;

        const parts = [
          `${result.source}:${result.line}:${result.column}`,
          result.name ? `  name: ${result.name}` : null,
        ].filter(Boolean);

        if (result.context && result.context.length > 0) {
          parts.push("");
          const gutterWidth = String(result.context[result.context.length - 1].line).length;
          for (const ctx of result.context as ContextLine[]) {
            const marker = ctx.highlight ? ">" : " ";
            const lineNum = String(ctx.line).padStart(gutterWidth);
            parts.push(`${marker} ${lineNum} | ${ctx.text}`);
          }
        }

        return toTextResult(parts.join("\n"), result as unknown as Record<string, unknown>);
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "sourcemap_resolve",
    {
      title: "Resolve Generated Position",
      description:
        "Reverse lookup: find the generated (minified) position for an original source position. " +
        "Given a source file, line, and column, returns the generated line and column. " +
        "All positions are 0-based.",
      annotations: { readOnlyHint: true, openWorldHint: false },

      inputSchema: z.object({
        file: z.string().describe("Path to a source map file (.map)"),
        source: z.string().describe("Original source filename (as it appears in the source map)"),
        line: z.number().min(0).describe("Original line number (0-based)"),
        column: z.number().min(0).describe("Original column number (0-based)"),
      }),
    },
    async ({ file, source, line, column }) => {
      try {
        const result = (await client.resolve(file, source, line, column)) as unknown as ResolveResult;

        return toTextResult(
          `Generated position: ${result.line}:${result.column}`,
          result as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};

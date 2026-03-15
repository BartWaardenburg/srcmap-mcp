import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SrcmapClient } from "../srcmap-client.js";
import { SrcmapError } from "../srcmap-client.js";
import { registerInspectionTools } from "./inspection.js";
import { registerLookupTools } from "./lookup.js";
import { registerFetchTools } from "./fetch.js";

type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

interface ToolResult {
  content: { type: string; text: string }[];
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
}

const createMockServer = () => {
  const handlers = new Map<string, ToolHandler>();
  return {
    registerTool: vi.fn((name: string, _config: unknown, handler: ToolHandler) => {
      handlers.set(name, handler);
    }),
    getHandler: (name: string): ToolHandler => {
      const handler = handlers.get(name);
      if (!handler) throw new Error(`No handler registered for "${name}"`);
      return handler;
    },
  };
};

const cliError = new SrcmapError("command failed", "CLI_ERROR");

const createMockClient = (): Record<string, ReturnType<typeof vi.fn>> => ({
  info: vi.fn(),
  validate: vi.fn(),
  sources: vi.fn(),
  sourcesExtract: vi.fn(),
  mappings: vi.fn(),
  lookup: vi.fn(),
  resolve: vi.fn(),
  fetch: vi.fn(),
  symbolicate: vi.fn(),
});

// --- Inspection Tools ---

describe("inspection tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerInspectionTools(server as never, client as unknown as SrcmapClient);
  });

  describe("sourcemap_info", () => {
    const handler = () => server.getHandler("sourcemap_info");

    it("returns formatted source map info", async () => {
      client.info.mockResolvedValueOnce({
        file: "bundle.js",
        sources: 5,
        names: 100,
        mappings: 500,
        rangeMappings: 0,
        lines: 10,
        sourcesWithContent: 3,
        totalContentSize: 8192,
        fileSize: 25000,
        debugId: null,
      });

      const result = (await handler()({ file: "bundle.js.map" })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("File: bundle.js");
      expect(result.content[0].text).toContain("Sources: 5");
      expect(result.content[0].text).toContain("Mappings: 500");
      expect(result.content[0].text).toContain("3/5 sources");
      expect(result.structuredContent).toBeDefined();
    });

    it("handles errors", async () => {
      client.info.mockRejectedValueOnce(cliError);

      const result = (await handler()({ file: "bad.map" })) as ToolResult;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("srcmap error");
    });
  });

  describe("sourcemap_validate", () => {
    const handler = () => server.getHandler("sourcemap_validate");

    it("returns valid result", async () => {
      client.validate.mockResolvedValueOnce({
        valid: true,
        sources: 2,
        names: 3,
        mappings: 14,
        lines: 2,
      });

      const result = (await handler()({ file: "bundle.js.map" })) as ToolResult;

      expect(result.content[0].text).toContain("Valid source map v3");
      expect(result.content[0].text).toContain("2 sources");
    });

    it("returns invalid result", async () => {
      client.validate.mockResolvedValueOnce({
        valid: false,
        error: "VLQ decode error",
      });

      const result = (await handler()({ file: "bad.map" })) as ToolResult;

      expect(result.content[0].text).toContain("Invalid source map");
      expect(result.content[0].text).toContain("VLQ");
    });
  });

  describe("sourcemap_sources", () => {
    const handler = () => server.getHandler("sourcemap_sources");

    it("returns formatted sources list", async () => {
      client.sources.mockResolvedValueOnce({
        sources: [
          { index: 0, source: "src/app.ts", hasContent: true, contentSize: 1024, ignored: false },
          { index: 1, source: "src/util.ts", hasContent: false, contentSize: null, ignored: false },
        ],
        total: 2,
        withContent: 1,
      });

      const result = (await handler()({ file: "bundle.js.map" })) as ToolResult;

      expect(result.content[0].text).toContain("src/app.ts");
      expect(result.content[0].text).toContain("1.0 KB");
      expect(result.content[0].text).toContain("no content");
      expect(result.structuredContent).toBeDefined();
    });
  });

  describe("sourcemap_mappings", () => {
    const handler = () => server.getHandler("sourcemap_mappings");

    it("returns formatted mappings", async () => {
      client.mappings.mockResolvedValueOnce({
        mappings: [
          { generatedLine: 0, generatedColumn: 0, source: "src/app.ts", originalLine: 0, originalColumn: 0, name: "greet", isRangeMapping: false },
        ],
        total: 14,
        offset: 0,
        limit: 50,
        hasMore: false,
      });

      const result = (await handler()({ file: "bundle.js.map", limit: 50, offset: 0 })) as ToolResult;

      expect(result.content[0].text).toContain("0:0");
      expect(result.content[0].text).toContain("src/app.ts");
      expect(result.content[0].text).toContain("name=greet");
    });
  });
});

// --- Lookup Tools ---

describe("lookup tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerLookupTools(server as never, client as unknown as SrcmapClient);
  });

  describe("sourcemap_lookup", () => {
    const handler = () => server.getHandler("sourcemap_lookup");

    it("returns original position with context", async () => {
      client.lookup.mockResolvedValueOnce({
        source: "src/app.ts",
        line: 10,
        column: 4,
        name: "handleClick",
        context: [
          { line: 9, text: "  const btn = document.getElementById('submit');", highlight: false },
          { line: 10, text: "  handleClick(event);", highlight: true },
          { line: 11, text: "});", highlight: false },
        ],
      });

      const result = (await handler()({ file: "bundle.js.map", line: 0, column: 500, context: 5 })) as ToolResult;

      expect(result.content[0].text).toContain("src/app.ts:10:4");
      expect(result.content[0].text).toContain("handleClick");
      expect(result.content[0].text).toContain(">");
      expect(result.structuredContent).toBeDefined();
    });

    it("handles not-found errors", async () => {
      client.lookup.mockRejectedValueOnce(new SrcmapError("no mapping found for 999:0", "NOT_FOUND"));

      const result = (await handler()({ file: "bundle.js.map", line: 999, column: 0, context: 0 })) as ToolResult;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("NOT_FOUND");
    });
  });

  describe("sourcemap_resolve", () => {
    const handler = () => server.getHandler("sourcemap_resolve");

    it("returns generated position", async () => {
      client.resolve.mockResolvedValueOnce({ line: 0, column: 42 });

      const result = (await handler()({ file: "bundle.js.map", source: "src/app.ts", line: 10, column: 0 })) as ToolResult;

      expect(result.content[0].text).toContain("0:42");
      expect(result.structuredContent).toBeDefined();
    });
  });
});

// --- Fetch Tools ---

describe("fetch tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerFetchTools(server as never, client as unknown as SrcmapClient);
  });

  describe("sourcemap_fetch", () => {
    const handler = () => server.getHandler("sourcemap_fetch");

    it("returns fetch result with source map", async () => {
      client.fetch.mockResolvedValueOnce({
        bundle: { url: "https://cdn.example.com/app.min.js", file: "/tmp/app.min.js", size: 10000 },
        sourceMap: { url: "https://cdn.example.com/app.min.js.map", file: "/tmp/app.min.js.map", size: 50000 },
      });

      const result = (await handler()({ url: "https://cdn.example.com/app.min.js", outputDir: "/tmp" })) as ToolResult;

      expect(result.content[0].text).toContain("Fetched bundle");
      expect(result.content[0].text).toContain("Source map");
      expect(result.content[0].text).toContain("48.8 KB");
      expect(result.structuredContent).toBeDefined();
    });

    it("reports when no source map found", async () => {
      client.fetch.mockResolvedValueOnce({
        bundle: { url: "https://cdn.example.com/app.js", file: "/tmp/app.js", size: 5000 },
        sourceMap: null,
      });

      const result = (await handler()({ url: "https://cdn.example.com/app.js", outputDir: "/tmp" })) as ToolResult;

      expect(result.content[0].text).toContain("No source map found");
    });

    it("handles fetch errors", async () => {
      client.fetch.mockRejectedValueOnce(new SrcmapError("HTTP 404", "FETCH_ERROR"));

      const result = (await handler()({ url: "https://bad.example.com/x.js", outputDir: "/tmp" })) as ToolResult;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("FETCH_ERROR");
    });
  });

  describe("sourcemap_extract_sources", () => {
    const handler = () => server.getHandler("sourcemap_extract_sources");

    it("returns extraction results", async () => {
      client.sourcesExtract.mockResolvedValueOnce({
        extracted: [
          { source: "src/app.ts", file: "/tmp/src/app.ts", size: 1024 },
          { source: "src/util.ts", file: "/tmp/src/util.ts", size: 512 },
        ],
        skipped: ["node_modules/react/index.js"],
        total: 3,
      });

      const result = (await handler()({ file: "bundle.js.map", outputDir: "/tmp" })) as ToolResult;

      expect(result.content[0].text).toContain("Extracted 2/3");
      expect(result.content[0].text).toContain("src/app.ts");
      expect(result.content[0].text).toContain("Skipped 1");
      expect(result.structuredContent).toBeDefined();
    });
  });
});

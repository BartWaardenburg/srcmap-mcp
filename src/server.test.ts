import { describe, it, expect } from "vitest";
import { createServer, parseToolsets } from "./server.js";
import type { SrcmapClient } from "./srcmap-client.js";

const mockClient = {} as SrcmapClient;

type RegisteredTool = { annotations?: Record<string, unknown> };
type ServerWithTools = { _registeredTools: Record<string, RegisteredTool> };

const getTools = (toolsets?: Set<string>): Record<string, RegisteredTool> =>
  (createServer(mockClient, toolsets as never) as unknown as ServerWithTools)._registeredTools;

describe("createServer", () => {
  it("creates a server", () => {
    const server = createServer(mockClient);
    expect(server).toBeDefined();
  });

  it("registers all 8 tools", () => {
    const tools = getTools();
    expect(Object.keys(tools)).toHaveLength(8);
  });

  it("registers all expected tool names", () => {
    const tools = getTools();

    const expectedTools = [
      "sourcemap_info",
      "sourcemap_validate",
      "sourcemap_sources",
      "sourcemap_mappings",
      "sourcemap_lookup",
      "sourcemap_resolve",
      "sourcemap_fetch",
      "sourcemap_extract_sources",
    ];

    for (const name of expectedTools) {
      expect(name in tools, `Tool "${name}" should be registered`).toBe(true);
    }
  });

  it("all tools have annotations", () => {
    const tools = getTools();

    for (const [name, tool] of Object.entries(tools)) {
      expect(tool.annotations, `Tool "${name}" should have annotations`).toBeDefined();
    }
  });
});

describe("parseToolsets", () => {
  it("returns all toolsets when env is undefined", () => {
    const result = parseToolsets(undefined);
    expect(result.size).toBe(3);
  });

  it("returns all toolsets when env is empty", () => {
    const result = parseToolsets("");
    expect(result.size).toBe(3);
  });

  it("parses a single toolset", () => {
    const result = parseToolsets("lookup");
    expect(result).toEqual(new Set(["lookup"]));
  });

  it("parses multiple toolsets", () => {
    const result = parseToolsets("lookup,fetch");
    expect(result).toEqual(new Set(["lookup", "fetch"]));
  });

  it("ignores invalid toolset names", () => {
    const result = parseToolsets("lookup,invalid,fetch");
    expect(result).toEqual(new Set(["lookup", "fetch"]));
  });

  it("returns all toolsets if all names are invalid", () => {
    const result = parseToolsets("invalid,unknown");
    expect(result.size).toBe(3);
  });

  it("handles whitespace in toolset names", () => {
    const result = parseToolsets(" lookup , fetch ");
    expect(result).toEqual(new Set(["lookup", "fetch"]));
  });
});

describe("toolset filtering", () => {
  it("registers only inspection tools when inspection toolset is selected", () => {
    const tools = getTools(new Set(["inspection"]) as never);
    expect("sourcemap_info" in tools).toBe(true);
    expect("sourcemap_validate" in tools).toBe(true);
    expect("sourcemap_sources" in tools).toBe(true);
    expect("sourcemap_mappings" in tools).toBe(true);
    expect("sourcemap_lookup" in tools).toBe(false);
    expect("sourcemap_fetch" in tools).toBe(false);
  });

  it("registers only lookup tools when lookup toolset is selected", () => {
    const tools = getTools(new Set(["lookup"]) as never);
    expect("sourcemap_lookup" in tools).toBe(true);
    expect("sourcemap_resolve" in tools).toBe(true);
    expect("sourcemap_info" in tools).toBe(false);
    expect("sourcemap_fetch" in tools).toBe(false);
  });

  it("registers only fetch tools when fetch toolset is selected", () => {
    const tools = getTools(new Set(["fetch"]) as never);
    expect("sourcemap_fetch" in tools).toBe(true);
    expect("sourcemap_extract_sources" in tools).toBe(true);
    expect("sourcemap_info" in tools).toBe(false);
    expect("sourcemap_lookup" in tools).toBe(false);
  });

  it("does not register duplicate tools when all toolsets are selected", () => {
    const tools = getTools(new Set(["inspection", "lookup", "fetch"]) as never);
    const toolNames = Object.keys(tools);
    const unique = new Set(toolNames);
    expect(toolNames.length).toBe(unique.size);
  });
});

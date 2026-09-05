import { describe, it, expect } from "vitest";
import { createServer, parseToolsets } from "./server.js";
import type { SrcmapClient } from "./srcmap-client.js";

const mockClient = {} as SrcmapClient;

type RegisteredTool = { annotations?: Record<string, unknown> };
type ServerWithTools = { _registeredTools: Record<string, RegisteredTool> };

const getTools = (toolsets = parseToolsets()): Record<string, RegisteredTool> =>
  (createServer(mockClient, toolsets) as unknown as ServerWithTools)._registeredTools;

describe("createServer", () => {
  it("registers exactly the expected tools", () => {
    const tools = getTools();

    expect(Object.keys(tools).sort()).toEqual([
      "sourcemap_extract_sources",
      "sourcemap_fetch",
      "sourcemap_info",
      "sourcemap_lookup",
      "sourcemap_mappings",
      "sourcemap_resolve",
      "sourcemap_sources",
      "sourcemap_validate",
    ]);
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
    const tools = getTools(new Set(["inspection"]));
    expect("sourcemap_info" in tools).toBe(true);
    expect("sourcemap_validate" in tools).toBe(true);
    expect("sourcemap_sources" in tools).toBe(true);
    expect("sourcemap_mappings" in tools).toBe(true);
    expect("sourcemap_lookup" in tools).toBe(false);
    expect("sourcemap_fetch" in tools).toBe(false);
  });

  it("registers only lookup tools when lookup toolset is selected", () => {
    const tools = getTools(new Set(["lookup"]));
    expect("sourcemap_lookup" in tools).toBe(true);
    expect("sourcemap_resolve" in tools).toBe(true);
    expect("sourcemap_info" in tools).toBe(false);
    expect("sourcemap_fetch" in tools).toBe(false);
  });

  it("registers only fetch tools when fetch toolset is selected", () => {
    const tools = getTools(new Set(["fetch"]));
    expect("sourcemap_fetch" in tools).toBe(true);
    expect("sourcemap_extract_sources" in tools).toBe(true);
    expect("sourcemap_info" in tools).toBe(false);
    expect("sourcemap_lookup" in tools).toBe(false);
  });
});

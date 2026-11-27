import { describe, it, expect, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { createServer, parseToolsets, type Toolset } from "./server.js";
import type { SrcmapClient } from "./srcmap-client.js";

const mockClient = {} as SrcmapClient;

const connect = async (
  toolsets: Set<Toolset> = parseToolsets(),
): Promise<{ client: Client; close: () => Promise<void> }> => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const server = createServer(mockClient, toolsets);
  await server.connect(serverSide);
  const client = new Client({ name: "protocol-test", version: "0.0.0" });
  await client.connect(clientSide);
  return { client, close: async () => { await client.close(); await server.close(); } };
};

describe("MCP protocol surface", () => {
  let close: (() => Promise<void>) | undefined;
  afterEach(async () => { await close?.(); });

  it("gives instructions to the client", async () => {
    const conn = await connect();
    close = conn.close;
    const instructions = conn.client.getInstructions() ?? "";
    expect(instructions).toMatch(/sourcemap_fetch/);
    const { tools } = await conn.client.listTools();
    const names = new Set(tools.map((t) => t.name));
    const mentioned = instructions.match(/sourcemap_[a-z_]+/g) ?? [];
    expect(mentioned.length).toBeGreaterThan(0);
    for (const tool of mentioned) expect(names.has(tool), tool).toBe(true);
  });

  it("lists tools in the same order for any toolset order", async () => {
    const a = await connect(parseToolsets("lookup,fetch,inspection"));
    const first = (await a.client.listTools()).tools.map((t) => t.name);
    await a.close();
    const b = await connect(parseToolsets("inspection,fetch,lookup"));
    close = b.close;
    const second = (await b.client.listTools()).tools.map((t) => t.name);
    expect(second).toEqual(first);
  });

  it("lists every tool with a title and annotations", async () => {
    const conn = await connect();
    close = conn.close;
    const { tools } = await conn.client.listTools();
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.title, tool.name).toBeTruthy();
      expect(tool.annotations, tool.name).toBeDefined();
    }
  });
});

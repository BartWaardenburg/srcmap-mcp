import { describe, it, expect } from "vitest";
import { toTextResult, toErrorResult } from "./tool-result.js";
import { SrcmapError } from "./srcmap-client.js";

describe("toTextResult", () => {
  it("creates a text result", () => {
    const result = toTextResult("hello");
    expect(result.content).toEqual([{ type: "text", text: "hello" }]);
  });

  it("includes structured content when provided", () => {
    const result = toTextResult("hello", { data: 42 });
    expect(result.structuredContent).toEqual({ data: 42 });
  });

  it("omits structured content when not provided", () => {
    const result = toTextResult("hello");
    expect(result).not.toHaveProperty("structuredContent");
  });
});

describe("toErrorResult", () => {
  it("formats SrcmapError with code and message", () => {
    const error = new SrcmapError("file not found", "IO_ERROR");
    const result = toErrorResult(error);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("srcmap error: file not found");
    expect(result.content[0].text).toContain("Code: IO_ERROR");
  });

  it("includes recovery suggestion for IO_ERROR", () => {
    const error = new SrcmapError("failed to read", "IO_ERROR");
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("file path");
  });

  it("includes recovery suggestion for NOT_FOUND", () => {
    const error = new SrcmapError("no mapping found", "NOT_FOUND");
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("0-based");
  });

  it("includes recovery suggestion for FETCH_ERROR with 404", () => {
    const error = new SrcmapError("HTTP 404 for url", "FETCH_ERROR");
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("URL not found");
  });

  it("handles generic Error", () => {
    const error = new Error("something broke");
    const result = toErrorResult(error);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("something broke");
  });

  it("handles non-Error values", () => {
    const result = toErrorResult("string error");

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("string error");
  });
});

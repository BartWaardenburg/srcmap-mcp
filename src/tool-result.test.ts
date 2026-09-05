import { describe, it, expect } from "vitest";
import { toTextResult, toErrorResult } from "./tool-result.js";
import { SrcmapError } from "./srcmap-client.js";

describe("toTextResult", () => {
  it("includes structured content when provided", () => {
    const result = toTextResult("hello", { data: 42 });
    expect(result.content).toEqual([{ type: "text", text: "hello" }]);
    expect(result.structuredContent).toEqual({ data: 42 });
  });

  it("omits structured content when not provided", () => {
    const result = toTextResult("hello");
    expect(result).not.toHaveProperty("structuredContent");
  });
});

describe("toErrorResult", () => {
  it("formats SrcmapError with code and message, without a recovery line for unknown codes", () => {
    const result = toErrorResult(new SrcmapError("command failed", "CLI_ERROR"));

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("srcmap error: command failed\nCode: CLI_ERROR");
  });

  it.each([
    ["FETCH_ERROR", "HTTP 404 for url", "Recovery: URL not found"],
    ["FETCH_ERROR", "HTTP 403 for url", "Recovery: Access denied"],
    ["FETCH_ERROR", "HTTP 401 for url", "Recovery: Access denied"],
    ["FETCH_ERROR", "ECONNREFUSED", "Recovery: Network error"],
    ["NOT_FOUND", "no mapping", "0-based"],
    ["PARSE_ERROR", "bad json", "Invalid source map"],
    ["IO_ERROR", "ENOENT", "file path"],
    ["PATH_TRAVERSAL", "../x", "path traversal"],
  ])("appends the recovery suggestion for %s (%s)", (code, message, expected) => {
    const result = toErrorResult(new SrcmapError(message, code));

    expect(result.content[0].text).toContain(expected);
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

import { describe, it, expect } from "vitest";
import { toTextResult, toErrorResult } from "./tool-result.js";
import { SrcmapError } from "./srcmap-client.js";

describe("toTextResult", () => {
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
  it("formats SrcmapError with code and message, without a recovery line for unknown codes", () => {
    const result = toErrorResult(new SrcmapError("command failed", "CLI_ERROR"));

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("srcmap error: command failed\nCode: CLI_ERROR");
  });

  it("appends the 404 recovery suggestion for FETCH_ERROR", () => {
    const result = toErrorResult(new SrcmapError("HTTP 404 for url", "FETCH_ERROR"));

    expect(result.content[0].text).toContain("Recovery: URL not found");
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

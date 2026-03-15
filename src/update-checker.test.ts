import { describe, it, expect, vi, afterEach } from "vitest";
import { isNewerVersion, checkForUpdate } from "./update-checker.js";

describe("isNewerVersion", () => {
  it("detects newer major version", () => {
    expect(isNewerVersion("2.0.0", "1.0.0")).toBe(true);
  });

  it("detects newer minor version", () => {
    expect(isNewerVersion("1.1.0", "1.0.0")).toBe(true);
  });

  it("detects newer patch version", () => {
    expect(isNewerVersion("1.0.1", "1.0.0")).toBe(true);
  });

  it("returns false for same version", () => {
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
  });

  it("returns false for older version", () => {
    expect(isNewerVersion("1.0.0", "2.0.0")).toBe(false);
  });

  it("handles missing patch", () => {
    expect(isNewerVersion("1.1", "1.0")).toBe(true);
  });
});

describe("checkForUpdate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes to stderr when update is available", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: "2.0.0" }),
    }));
    const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    await checkForUpdate("test-pkg", "1.0.0");

    expect(write).toHaveBeenCalledWith(expect.stringContaining("Update available"));
  });

  it("does nothing when current version is latest", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: "1.0.0" }),
    }));
    const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    await checkForUpdate("test-pkg", "1.0.0");

    expect(write).not.toHaveBeenCalled();
  });

  it("silently handles network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    await expect(checkForUpdate("test-pkg", "1.0.0")).resolves.toBeUndefined();
  });
});

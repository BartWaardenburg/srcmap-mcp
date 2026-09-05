import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TtlCache } from "./cache.js";

describe("TtlCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves values", () => {
    const cache = new TtlCache(1000);
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");
  });

  it("returns undefined for missing keys", () => {
    const cache = new TtlCache(1000);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("expires entries after TTL", () => {
    const cache = new TtlCache(1000);
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");

    vi.advanceTimersByTime(1001);
    expect(cache.get("key")).toBeUndefined();
  });
});

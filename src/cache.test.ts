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
    const cache = new TtlCache();
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");
  });

  it("returns undefined for missing keys", () => {
    const cache = new TtlCache();
    expect(cache.get("missing")).toBeUndefined();
  });

  it("expires entries after TTL", () => {
    const cache = new TtlCache(1000);
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");

    vi.advanceTimersByTime(1001);
    expect(cache.get("key")).toBeUndefined();
  });

  it("uses per-entry TTL when provided", () => {
    const cache = new TtlCache(10_000);
    cache.set("short", "value", 500);
    cache.set("long", "value", 20_000);

    vi.advanceTimersByTime(600);
    expect(cache.get("short")).toBeUndefined();
    expect(cache.get("long")).toBe("value");
  });

  it("invalidates matching keys", () => {
    const cache = new TtlCache();
    cache.set("info:a.map", "a");
    cache.set("info:b.map", "b");
    cache.set("sources:a.map", "c");

    cache.invalidate("a.map");
    expect(cache.get("info:a.map")).toBeUndefined();
    expect(cache.get("sources:a.map")).toBeUndefined();
    expect(cache.get("info:b.map")).toBe("b");
  });

  it("clears all entries", () => {
    const cache = new TtlCache();
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("tracks size correctly", () => {
    const cache = new TtlCache();
    expect(cache.size).toBe(0);
    cache.set("a", 1);
    expect(cache.size).toBe(1);
    cache.set("b", 2);
    expect(cache.size).toBe(2);
  });
});

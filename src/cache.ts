interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

export class TtlCache {
  private readonly store = new Map<string, CacheEntry>();

  constructor(private readonly ttlMs: number) {}

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set(key: string, value: unknown): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

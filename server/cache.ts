import crypto from "crypto";

interface CacheEntry<T> {
  data: T;
  etag: string;
  expiresAt: number;
}

class ApiCache {
  private store = new Map<string, CacheEntry<any>>();
  private maxEntries = 200;

  get<T>(key: string): CacheEntry<T> | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  set<T>(key: string, data: T, ttlSeconds: number): CacheEntry<T> {
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    const json = JSON.stringify(data);
    const etag = `W/"${crypto.createHash("md5").update(json).digest("hex").slice(0, 16)}"`;
    const entry: CacheEntry<T> = { data, etag, expiresAt: Date.now() + ttlSeconds * 1000 };
    this.store.set(key, entry);
    return entry;
  }

  invalidate(pattern: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(pattern)) {
        this.store.delete(key);
      }
    }
  }

  invalidateAll(): void {
    this.store.clear();
  }
}

export const apiCache = new ApiCache();

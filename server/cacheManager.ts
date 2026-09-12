import { createHash } from 'crypto';

export interface CacheEntry<T> {
  key: string;
  data: T;
  hash: string;
  timestamp: number;
  lastChanged: number;
  hits: number;
  ttlMs: number;
}

export class SmartCacheManager {
  private store: Map<string, CacheEntry<any>> = new Map();
  private defaultTtlMs: number = 5 * 60 * 1000;

  constructor(defaultTtlMs?: number) {
    if (defaultTtlMs) this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Fast SHA-256 fingerprint of payload
   */
  public computeHash(data: any): string {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Check if incoming data has meaningfully changed compared to cached version
   * Returns: { changed: boolean, hash: string, previousHash?: string }
   */
  public detectChange<T>(key: string, freshData: T): { changed: boolean; hash: string; previousHash?: string } {
    const freshHash = this.computeHash(freshData);
    const cached = this.store.get(key);

    if (!cached) {
      return { changed: true, hash: freshHash };
    }

    const changed = cached.hash !== freshHash;
    return { changed, hash: freshHash, previousHash: cached.hash };
  }

  /**
   * Put or update cache item
   */
  public set<T>(key: string, data: T, ttlMs?: number): { changed: boolean; entry: CacheEntry<T> } {
    const hash = this.computeHash(data);
    const now = Date.now();
    const existing = this.store.get(key);

    const changed = !existing || existing.hash !== hash;
    const lastChanged = changed ? now : (existing ? existing.lastChanged : now);

    const entry: CacheEntry<T> = {
      key,
      data,
      hash,
      timestamp: now,
      lastChanged,
      hits: existing ? existing.hits + 1 : 0,
      ttlMs: ttlMs ?? this.defaultTtlMs,
    };

    this.store.set(key, entry);
    return { changed, entry };
  }

  /**
   * Get cached data if within TTL
   */
  public get<T>(key: string): { data: T; isFresh: boolean; ageMs: number; lastChanged: number } | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const now = Date.now();
    const ageMs = now - entry.timestamp;
    const isFresh = ageMs < entry.ttlMs;

    entry.hits += 1;
    return {
      data: entry.data as T,
      isFresh,
      ageMs,
      lastChanged: entry.lastChanged,
    };
  }

  /**
   * Get raw entry including metadata
   */
  public getEntry<T>(key: string): CacheEntry<T> | undefined {
    return this.store.get(key);
  }

  /**
   * Status metrics across all cached keys
   */
  public getStats() {
    let freshCount = 0;
    let staleCount = 0;
    const now = Date.now();

    for (const entry of this.store.values()) {
      if (now - entry.timestamp < entry.ttlMs) {
        freshCount++;
      } else {
        staleCount++;
      }
    }

    return {
      total_keys: this.store.size,
      fresh_keys: freshCount,
      stale_keys: staleCount,
      memory_keys: Array.from(this.store.keys()),
    };
  }

  public clear() {
    this.store.clear();
  }
}

export const smartCache = new SmartCacheManager();

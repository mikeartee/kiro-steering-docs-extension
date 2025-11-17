import * as vscode from 'vscode';

/**
 * Cache entry with TTL support
 */
interface CacheEntry<T> {
    value: T;
    timestamp: number;
    ttl?: number;
}

/**
 * CacheManager handles caching of data using VS Code's globalState
 * with support for TTL (time-to-live) for cache entries
 */
export class CacheManager {
    private readonly CACHE_PREFIX = 'steeringDocs.cache.';

    constructor(private readonly globalState: vscode.Memento) {}

    /**
     * Get a value from the cache
     * @param key Cache key
     * @returns The cached value or undefined if not found or expired
     */
    get<T>(key: string): T | undefined {
        const cacheKey = this.CACHE_PREFIX + key;
        const entry = this.globalState.get<CacheEntry<T>>(cacheKey);

        if (!entry) {
            return undefined;
        }

        // Check if entry has expired
        if (entry.ttl !== undefined) {
            const now = Date.now();
            const age = now - entry.timestamp;
            if (age > entry.ttl * 1000) {
                // Entry has expired, remove it
                this.clear(key);
                return undefined;
            }
        }

        return entry.value;
    }

    /**
     * Set a value in the cache
     * @param key Cache key
     * @param value Value to cache
     * @param ttl Time-to-live in seconds (optional)
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        const cacheKey = this.CACHE_PREFIX + key;
        const entry: CacheEntry<T> = {
            value,
            timestamp: Date.now(),
            ttl
        };

        await this.globalState.update(cacheKey, entry);
    }

    /**
     * Clear a specific cache entry or all cache entries
     * @param key Cache key to clear (optional, clears all if not provided)
     */
    async clear(key?: string): Promise<void> {
        if (key) {
            const cacheKey = this.CACHE_PREFIX + key;
            await this.globalState.update(cacheKey, undefined);
        } else {
            // Clear all cache entries
            const keys = this.globalState.keys();
            for (const k of keys) {
                if (k.startsWith(this.CACHE_PREFIX)) {
                    await this.globalState.update(k, undefined);
                }
            }
        }
    }

    /**
     * Check if a cache entry exists and is not expired
     * @param key Cache key
     * @returns True if the entry exists and is not expired
     */
    has(key: string): boolean {
        return this.get(key) !== undefined;
    }
}

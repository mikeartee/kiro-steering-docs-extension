import * as assert from 'assert';
import { CacheManager } from './CacheManager';

/**
 * Mock implementation of vscode.Memento for testing
 */
class MockMemento {
    private storage = new Map<string, any>();

    get<T>(key: string): T | undefined {
        return this.storage.get(key);
    }

    async update(key: string, value: any): Promise<void> {
        if (value === undefined) {
            this.storage.delete(key);
        } else {
            this.storage.set(key, value);
        }
    }

    keys(): readonly string[] {
        return Array.from(this.storage.keys());
    }

    setKeysForSync(_keys: readonly string[]): void {
        // Not needed for tests
    }
}

suite('CacheManager Tests', () => {
    let memento: MockMemento;
    let cacheManager: CacheManager;

    setup(() => {
        memento = new MockMemento();
        cacheManager = new CacheManager(memento as any);
    });

    test('set and get should store and retrieve values', async () => {
        const testValue = { data: 'test data' };
        await cacheManager.set('testKey', testValue);
        
        const retrieved = cacheManager.get<typeof testValue>('testKey');
        assert.deepStrictEqual(retrieved, testValue, 'Retrieved value should match stored value');
    });

    test('get should return undefined for non-existent key', () => {
        const result = cacheManager.get('nonExistentKey');
        assert.strictEqual(result, undefined, 'Should return undefined for non-existent key');
    });

    test('has should return true for existing key', async () => {
        await cacheManager.set('existingKey', 'value');
        assert.strictEqual(cacheManager.has('existingKey'), true, 'Should return true for existing key');
    });

    test('has should return false for non-existent key', () => {
        assert.strictEqual(cacheManager.has('nonExistentKey'), false, 'Should return false for non-existent key');
    });

    test('clear with key should remove specific entry', async () => {
        await cacheManager.set('key1', 'value1');
        await cacheManager.set('key2', 'value2');
        
        await cacheManager.clear('key1');
        
        assert.strictEqual(cacheManager.get('key1'), undefined, 'key1 should be cleared');
        assert.strictEqual(cacheManager.get('key2'), 'value2', 'key2 should still exist');
    });

    test('clear without key should remove all entries', async () => {
        await cacheManager.set('key1', 'value1');
        await cacheManager.set('key2', 'value2');
        await cacheManager.set('key3', 'value3');
        
        await cacheManager.clear();
        
        assert.strictEqual(cacheManager.get('key1'), undefined, 'key1 should be cleared');
        assert.strictEqual(cacheManager.get('key2'), undefined, 'key2 should be cleared');
        assert.strictEqual(cacheManager.get('key3'), undefined, 'key3 should be cleared');
    });

    test('TTL should expire entries after specified time', async () => {
        const ttl = 1; // 1 second
        await cacheManager.set('expireKey', 'value', ttl);
        
        // Value should exist immediately
        assert.strictEqual(cacheManager.get('expireKey'), 'value', 'Value should exist immediately');
        
        // Wait for TTL to expire
        await new Promise(resolve => setTimeout(resolve, 1100));
        
        // Value should be expired
        assert.strictEqual(cacheManager.get('expireKey'), undefined, 'Value should be expired after TTL');
    });

    test('Entry without TTL should not expire', async () => {
        await cacheManager.set('persistentKey', 'value');
        
        // Wait some time
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Value should still exist
        assert.strictEqual(cacheManager.get('persistentKey'), 'value', 'Value without TTL should persist');
    });

    test('has should return false for expired entries', async () => {
        const ttl = 1; // 1 second
        await cacheManager.set('expireKey', 'value', ttl);
        
        assert.strictEqual(cacheManager.has('expireKey'), true, 'Should exist before expiration');
        
        // Wait for TTL to expire
        await new Promise(resolve => setTimeout(resolve, 1100));
        
        assert.strictEqual(cacheManager.has('expireKey'), false, 'Should not exist after expiration');
    });

    test('Cache persistence across multiple operations', async () => {
        // Set multiple values
        await cacheManager.set('user', { name: 'John', age: 30 });
        await cacheManager.set('settings', { theme: 'dark', language: 'en' });
        await cacheManager.set('count', 42);
        
        // Retrieve and verify
        const user = cacheManager.get<{ name: string; age: number }>('user');
        const settings = cacheManager.get<{ theme: string; language: string }>('settings');
        const count = cacheManager.get<number>('count');
        
        assert.deepStrictEqual(user, { name: 'John', age: 30 });
        assert.deepStrictEqual(settings, { theme: 'dark', language: 'en' });
        assert.strictEqual(count, 42);
    });

    test('Updating existing key should overwrite value', async () => {
        await cacheManager.set('key', 'oldValue');
        assert.strictEqual(cacheManager.get('key'), 'oldValue');
        
        await cacheManager.set('key', 'newValue');
        assert.strictEqual(cacheManager.get('key'), 'newValue', 'Value should be updated');
    });

    test('Different TTLs for different entries', async () => {
        await cacheManager.set('shortLived', 'value1', 1); // 1 second
        await cacheManager.set('longLived', 'value2', 5); // 5 seconds
        
        // Wait 1.1 seconds
        await new Promise(resolve => setTimeout(resolve, 1100));
        
        assert.strictEqual(cacheManager.get('shortLived'), undefined, 'Short-lived should expire');
        assert.strictEqual(cacheManager.get('longLived'), 'value2', 'Long-lived should still exist');
    });
});

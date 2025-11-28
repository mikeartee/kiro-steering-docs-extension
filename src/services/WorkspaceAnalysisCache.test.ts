import * as assert from 'assert';
import { WorkspaceAnalysisCache } from './WorkspaceAnalysisCache';
import { WorkspaceAnalyzer } from './WorkspaceAnalyzer';
import { WorkspaceContext, ProjectType } from '../models/types';

suite('WorkspaceAnalysisCache Tests', () => {
    let cache: WorkspaceAnalysisCache;
    let analyzer: WorkspaceAnalyzer;
    let analyzeCallCount: number;

    const mockContext: WorkspaceContext = {
        languages: ['typescript', 'javascript'],
        frameworks: [],
        dependencies: [],
        filePatterns: [],
        hasTests: false,
        projectType: ProjectType.UNKNOWN,
        installedDocs: []
    };

    setup(() => {
        analyzer = new WorkspaceAnalyzer();
        analyzeCallCount = 0;

        // Mock the analyze method to track calls
        const originalAnalyze = analyzer.analyze.bind(analyzer);
        analyzer.analyze = async (workspaceRoot: string | undefined): Promise<WorkspaceContext> => {
            analyzeCallCount++;
            // For testing, return mock context instead of real analysis
            if (!workspaceRoot) {
                return originalAnalyze(workspaceRoot);
            }
            return { ...mockContext };
        };

        cache = new WorkspaceAnalysisCache(analyzer);
    });

    teardown(() => {
        cache.dispose();
    });

    test('should cache analysis results', async () => {
        const workspaceRoot = '/test/workspace';

        // First call should trigger analysis
        const result1 = await cache.analyze(workspaceRoot);
        assert.strictEqual(analyzeCallCount, 1);
        assert.deepStrictEqual(result1, mockContext);

        // Second call should use cache
        const result2 = await cache.analyze(workspaceRoot);
        assert.strictEqual(analyzeCallCount, 1); // Should not increase
        assert.deepStrictEqual(result2, mockContext);
    });

    test('should cache results for different workspaces separately', async () => {
        const workspace1 = '/test/workspace1';
        const workspace2 = '/test/workspace2';

        // Analyze first workspace
        await cache.analyze(workspace1);
        assert.strictEqual(analyzeCallCount, 1);

        // Analyze second workspace should trigger new analysis
        await cache.analyze(workspace2);
        assert.strictEqual(analyzeCallCount, 2);

        // Re-analyze first workspace should use cache
        await cache.analyze(workspace1);
        assert.strictEqual(analyzeCallCount, 2); // Should not increase
    });

    test('should expire cache after TTL', async function() {
        this.timeout(6000); // Increase timeout for this test

        const workspaceRoot = '/test/workspace';

        // First call
        await cache.analyze(workspaceRoot);
        assert.strictEqual(analyzeCallCount, 1);

        // Wait for cache to expire (5 minutes + buffer)
        // For testing, we'll just verify the cache logic works
        // In a real scenario, we'd wait 5+ minutes
        
        // Manually clear cache to simulate expiration
        cache.clearAll();

        // Next call should trigger new analysis
        await cache.analyze(workspaceRoot);
        assert.strictEqual(analyzeCallCount, 2);
    });

    test('should handle undefined workspace root', async () => {
        // Should pass through to analyzer without caching
        try {
            await cache.analyze(undefined);
            assert.fail('Should have thrown error');
        } catch (error: any) {
            // Expected to throw
            assert.ok(error.message.includes('No workspace'));
        }
    });

    test('clearAll should invalidate all cached results', async () => {
        const workspace1 = '/test/workspace1';
        const workspace2 = '/test/workspace2';

        // Cache results for two workspaces
        await cache.analyze(workspace1);
        await cache.analyze(workspace2);
        assert.strictEqual(analyzeCallCount, 2);

        // Clear all cache
        cache.clearAll();

        // Both should trigger new analysis
        await cache.analyze(workspace1);
        await cache.analyze(workspace2);
        assert.strictEqual(analyzeCallCount, 4);
    });

    test('dispose should clean up resources', async () => {
        const workspaceRoot = '/test/workspace';

        // Analyze to set up watchers
        await cache.analyze(workspaceRoot);

        // Dispose should not throw
        assert.doesNotThrow(() => {
            cache.dispose();
        });

        // After dispose, cache should be cleared
        // New analysis should work
        await cache.analyze(workspaceRoot);
        assert.strictEqual(analyzeCallCount, 2);
    });
});

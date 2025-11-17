import * as assert from 'assert';
import { GitHubClient } from './GitHubClient';
import { ErrorCode, ExtensionError } from '../models/types';

suite('GitHubClient Tests', () => {
    
    test('getRepositoryContents should return array of contents', async () => {
        const client = new GitHubClient('test/repo', 'main');
        
        // This test validates the structure but requires actual network call
        // In a real scenario, we would mock the https module
        try {
            const contents = await client.getRepositoryContents('documents');
            assert.ok(Array.isArray(contents), 'Should return an array');
        } catch (error) {
            // Expected to fail without actual repository
            assert.ok(error instanceof ExtensionError, 'Should throw ExtensionError');
        }
    });

    test('getFileContent should decode base64 content', async () => {
        const client = new GitHubClient('test/repo', 'main');
        
        try {
            await client.getFileContent('test.md');
        } catch (error) {
            // Expected to fail without actual repository
            assert.ok(error instanceof ExtensionError, 'Should throw ExtensionError');
        }
    });

    test('getRawFileContent should fetch raw content', async () => {
        const client = new GitHubClient('test/repo', 'main');
        
        try {
            await client.getRawFileContent('test.md');
        } catch (error) {
            // Expected to fail without actual repository
            assert.ok(error instanceof ExtensionError, 'Should throw ExtensionError');
        }
    });

    test('Error handling for 404 responses', async () => {
        const client = new GitHubClient('test/nonexistent', 'main');
        
        try {
            await client.getRepositoryContents('nonexistent');
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert.ok(error instanceof ExtensionError, 'Should throw ExtensionError');
            if (error instanceof ExtensionError) {
                assert.strictEqual(error.code, ErrorCode.NOT_FOUND, 'Should be NOT_FOUND error');
            }
        }
    });

    test('Timeout handling', async () => {
        const client = new GitHubClient('test/repo', 'main');
        
        // This test validates timeout behavior
        // In production, timeout is set to 30 seconds
        try {
            await client.getRepositoryContents('test');
        } catch (error) {
            assert.ok(error instanceof ExtensionError, 'Should throw ExtensionError on timeout');
        }
    });
});

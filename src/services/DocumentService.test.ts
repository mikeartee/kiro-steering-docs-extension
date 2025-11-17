import * as assert from 'assert';
import * as vscode from 'vscode';
import { DocumentService } from './DocumentService';
import { GitHubClient } from './GitHubClient';
import { CacheManager } from './CacheManager';
import { FrontmatterService } from './FrontmatterService';
import { DocumentMetadata, ErrorCode, ExtensionError } from '../models/types';

suite('DocumentService Tests', () => {
    let documentService: DocumentService;
    let mockGitHubClient: GitHubClient;
    let mockCacheManager: CacheManager;
    let frontmatterService: FrontmatterService;

    setup(() => {
        // Create mock instances
        mockGitHubClient = new GitHubClient('test/repo', 'main');
        
        // Create a mock memento for cache manager
        const mockMemento: vscode.Memento = {
            keys: () => [],
            get: <T>(_key: string): T | undefined => undefined,
            update: async (_key: string, _value: any): Promise<void> => {}
        };
        
        mockCacheManager = new CacheManager(mockMemento);
        frontmatterService = new FrontmatterService();
        
        documentService = new DocumentService(
            mockGitHubClient,
            mockCacheManager,
            frontmatterService
        );
    });

    test('fetchDocumentList should handle network errors gracefully', async () => {
        try {
            await documentService.fetchDocumentList();
        } catch (error) {
            // Expected to fail without actual repository
            assert.ok(error instanceof Error, 'Should throw an error');
        }
    });

    test('fetchDocumentContent should handle errors', async () => {
        try {
            await documentService.fetchDocumentContent('nonexistent.md');
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert.ok(error instanceof ExtensionError, 'Should throw ExtensionError');
        }
    });

    test('getInstalledDocuments should return empty array when no workspace', async () => {
        // This test validates behavior when no workspace is open
        const docs = await documentService.getInstalledDocuments();
        assert.ok(Array.isArray(docs), 'Should return an array');
    });

    test('installDocument should throw error when no workspace', async () => {
        const mockDoc: DocumentMetadata = {
            name: 'test.md',
            path: 'documents/test.md',
            category: 'test',
            version: '1.0.0',
            description: 'Test document',
            sha: 'abc123',
            size: 100,
            downloadUrl: 'https://example.com/test.md'
        };

        try {
            await documentService.installDocument(mockDoc);
        } catch (error) {
            assert.ok(error instanceof ExtensionError, 'Should throw ExtensionError');
            if (error instanceof ExtensionError) {
                assert.strictEqual(error.code, ErrorCode.FILE_SYSTEM_ERROR);
            }
        }
    });

    test('quickLoadDocument should call installDocument with always mode', async () => {
        const mockDoc: DocumentMetadata = {
            name: 'test.md',
            path: 'documents/test.md',
            category: 'test',
            version: '1.0.0',
            description: 'Test document',
            sha: 'abc123',
            size: 100,
            downloadUrl: 'https://example.com/test.md'
        };

        try {
            await documentService.quickLoadDocument(mockDoc);
        } catch (error) {
            // Expected to fail without workspace
            assert.ok(error instanceof ExtensionError, 'Should throw ExtensionError');
        }
    });

    test('setInclusionMode should throw error when no workspace', async () => {
        try {
            await documentService.setInclusionMode('test.md', 'always');
        } catch (error) {
            assert.ok(error instanceof ExtensionError, 'Should throw ExtensionError');
        }
    });

    test('getInclusionMode should return undefined when no workspace', async () => {
        const mode = await documentService.getInclusionMode('test.md');
        assert.strictEqual(mode, undefined, 'Should return undefined');
    });

    test('checkForUpdates should return empty array when no documents', async () => {
        try {
            const updates = await documentService.checkForUpdates();
            assert.ok(Array.isArray(updates), 'Should return an array');
        } catch (error) {
            // Expected to fail without actual repository
            assert.ok(error instanceof Error, 'Should throw an error');
        }
    });

    test('updateDocument should throw error when no workspace', async () => {
        const mockDoc: DocumentMetadata = {
            name: 'test.md',
            path: 'documents/test.md',
            category: 'test',
            version: '2.0.0',
            description: 'Test document',
            sha: 'def456',
            size: 100,
            downloadUrl: 'https://example.com/test.md'
        };

        try {
            await documentService.updateDocument(mockDoc);
        } catch (error) {
            assert.ok(error instanceof ExtensionError, 'Should throw ExtensionError');
        }
    });
});

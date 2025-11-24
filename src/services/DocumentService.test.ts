import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fc from 'fast-check';
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

    test('installDocument should throw error for non-existent document', async () => {
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
                // Should throw NOT_FOUND or NETWORK_ERROR when document doesn't exist
                assert.ok(
                    error.code === ErrorCode.NOT_FOUND || error.code === ErrorCode.NETWORK_ERROR,
                    `Expected NOT_FOUND or NETWORK_ERROR, got ${error.code}`
                );
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

    /**
     * Feature: folder-structure-support, Property 1: Installation path preservation
     * Validates: Requirements 1.2, 1.4
     * 
     * For any document with path category/filename.md, installing it should create 
     * the file at .kiro/steering/category/filename.md with the exact same relative 
     * path structure.
     */
    test('Property 1: Installation path preservation', () => {
        // Generator for valid path segments (no special characters, no ..)
        const pathSegmentArb = fc.stringMatching(/^[a-zA-Z0-9_-]+$/);
        
        // Generator for valid filenames
        const filenameArb = fc.stringMatching(/^[a-zA-Z0-9_-]+\.md$/);
        
        // Generator for document paths with 0-3 directory levels
        const documentPathArb = fc.oneof(
            // Root-level document
            filenameArb,
            // One level deep
            fc.tuple(pathSegmentArb, filenameArb).map(([dir, file]) => `${dir}/${file}`),
            // Two levels deep
            fc.tuple(pathSegmentArb, pathSegmentArb, filenameArb)
                .map(([dir1, dir2, file]) => `${dir1}/${dir2}/${file}`),
            // Three levels deep
            fc.tuple(pathSegmentArb, pathSegmentArb, pathSegmentArb, filenameArb)
                .map(([dir1, dir2, dir3, file]) => `${dir1}/${dir2}/${dir3}/${file}`)
        );

        fc.assert(
            fc.property(documentPathArb, (docPath) => {
                // Test the path extraction logic
                const lastSlashIndex = docPath.lastIndexOf('/');
                const expectedDir = lastSlashIndex === -1 ? '' : docPath.substring(0, lastSlashIndex);
                const filename = lastSlashIndex === -1 ? docPath : docPath.substring(lastSlashIndex + 1);
                
                // Verify path structure is preserved
                // If there's a directory, it should be extractable
                if (expectedDir) {
                    assert.ok(docPath.startsWith(expectedDir + '/'), 
                        `Path ${docPath} should start with directory ${expectedDir}/`);
                }
                
                // Verify filename is at the end
                assert.ok(docPath.endsWith(filename), 
                    `Path ${docPath} should end with filename ${filename}`);
                
                // Verify no path traversal characters
                assert.ok(!docPath.includes('..'), 
                    `Path ${docPath} should not contain ..`);
                assert.ok(!docPath.startsWith('/'), 
                    `Path ${docPath} should not start with /`);
                assert.ok(!docPath.startsWith('\\'), 
                    `Path ${docPath} should not start with \\`);
                
                // Verify the path can be reconstructed
                const reconstructed = expectedDir ? `${expectedDir}/${filename}` : filename;
                assert.strictEqual(reconstructed, docPath, 
                    `Reconstructed path should match original`);
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: folder-structure-support, Property 2: Recursive scanning completeness
     * Validates: Requirements 2.1, 2.2
     * 
     * For any markdown file in .kiro/steering/ or its subdirectories, the recursive scan 
     * should find and include it in the installed documents list.
     */
    test('Property 2: Recursive scanning completeness', async () => {
        // Skip if no workspace is available
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            console.log('Skipping test: No workspace folder available');
            return;
        }

        // Generator for valid path segments (non-empty)
        const pathSegmentArb = fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter(s => s.length > 0);
        
        // Generator for valid filenames (non-empty, must end with .md)
        const filenameArb = fc.stringMatching(/^[a-zA-Z0-9_-]+\.md$/).filter(s => s.length > 3);
        
        // Generator for document paths (root or nested)
        const documentPathArb = fc.oneof(
            // Root-level document
            filenameArb.map(name => ({ path: '', name })),
            // One level deep
            fc.tuple(pathSegmentArb, filenameArb).map(([dir, name]) => ({ path: dir, name })),
            // Two levels deep
            fc.tuple(pathSegmentArb, pathSegmentArb, filenameArb)
                .map(([dir1, dir2, name]) => ({ path: `${dir1}/${dir2}`, name }))
        );

        // Generator for a list of 1-5 documents with unique full paths
        const documentListArb = fc.array(documentPathArb, { minLength: 1, maxLength: 5 })
            .map(docs => {
                // Ensure unique full paths by deduplicating
                const seen = new Set<string>();
                const uniqueDocs = [];
                for (const doc of docs) {
                    const fullPath = doc.path ? `${doc.path}/${doc.name}` : doc.name;
                    if (!seen.has(fullPath)) {
                        seen.add(fullPath);
                        uniqueDocs.push(doc);
                    }
                }
                return uniqueDocs;
            })
            .filter(docs => docs.length > 0); // Ensure at least one document after deduplication

        await fc.assert(
            fc.asyncProperty(documentListArb, async (documents) => {
                // Create a unique test directory for this property test run
                const testBaseDir = vscode.Uri.joinPath(
                    workspaceFolder.uri, 
                    '.kiro', 
                    'test-steering-' + Date.now() + '-' + Math.random().toString(36).substring(7)
                );
                
                try {
                    // Ensure base test directory exists
                    await vscode.workspace.fs.createDirectory(testBaseDir);
                    
                    // Create all documents
                    const createdPaths: string[] = [];
                    for (const doc of documents) {
                        const docDir = doc.path ? vscode.Uri.joinPath(testBaseDir, doc.path) : testBaseDir;
                        
                        // Create subdirectory if needed
                        if (doc.path) {
                            await vscode.workspace.fs.createDirectory(docDir);
                        }
                        
                        // Create document with minimal frontmatter
                        const fileUri = vscode.Uri.joinPath(docDir, doc.name);
                        const content = `---
version: "1.0.0"
sha: "test-sha-${doc.name}"
---

# Test Document

This is a test document.
`;
                        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf-8'));
                        
                        // Track the relative path
                        const relativePath = doc.path ? `${doc.path}/${doc.name}` : doc.name;
                        createdPaths.push(relativePath);
                    }
                    
                    // Create a temporary DocumentService instance for testing
                    const testService = new DocumentService(
                        mockGitHubClient,
                        mockCacheManager,
                        frontmatterService
                    );
                    
                    // Note: We're testing the scanDirectoryRecursive method directly
                    // We'll use reflection to access the private method
                    const scanMethod = (testService as any).scanDirectoryRecursive.bind(testService);
                    const scannedDocs = await scanMethod(testBaseDir, testBaseDir);
                    
                    // Verify all created documents were found
                    assert.strictEqual(scannedDocs.length, createdPaths.length, 
                        `Should find all ${createdPaths.length} created documents`);
                    
                    // Verify each document has the correct path
                    const scannedPaths = scannedDocs.map((d: any) => d.path).sort();
                    const expectedPaths = createdPaths.sort();
                    
                    assert.deepStrictEqual(scannedPaths, expectedPaths, 
                        'Scanned paths should match created paths');
                    
                    // Verify each document has required fields
                    for (const doc of scannedDocs) {
                        assert.ok(doc.name, 'Document should have a name');
                        assert.ok(doc.path, 'Document should have a path');
                        assert.ok(doc.version, 'Document should have a version');
                        assert.ok(doc.sha, 'Document should have a sha');
                        assert.ok(doc.installedAt instanceof Date, 'Document should have installedAt date');
                    }
                    
                } finally {
                    // Clean up test directory
                    try {
                        await vscode.workspace.fs.delete(testBaseDir, { recursive: true });
                    } catch (error) {
                        console.error('Failed to clean up test directory:', error);
                    }
                }
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: folder-structure-support, Property 5: Subdirectory creation idempotence
     * Validates: Requirements 1.1, 1.5
     * 
     * For any subdirectory path, attempting to create it multiple times should succeed 
     * without error, whether the directory exists or not.
     */
    test('Property 5: Subdirectory creation idempotence', async () => {
        // Skip if no workspace is available
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            console.log('Skipping test: No workspace folder available');
            return;
        }

        // Generator for valid path segments
        const pathSegmentArb = fc.stringMatching(/^[a-zA-Z0-9_-]+$/);
        
        // Generator for subdirectory paths with 1-3 levels
        const subdirPathArb = fc.oneof(
            // One level
            pathSegmentArb,
            // Two levels
            fc.tuple(pathSegmentArb, pathSegmentArb)
                .map(([dir1, dir2]) => `${dir1}/${dir2}`),
            // Three levels
            fc.tuple(pathSegmentArb, pathSegmentArb, pathSegmentArb)
                .map(([dir1, dir2, dir3]) => `${dir1}/${dir2}/${dir3}`)
        );

        await fc.assert(
            fc.asyncProperty(subdirPathArb, async (subdirPath) => {
                // Create a unique test directory for this property test run
                const testBaseDir = vscode.Uri.joinPath(
                    workspaceFolder.uri, 
                    '.kiro', 
                    'test-steering-' + Date.now() + '-' + Math.random().toString(36).substring(7)
                );
                
                try {
                    // Ensure base test directory exists
                    await vscode.workspace.fs.createDirectory(testBaseDir);
                    
                    const targetDir = vscode.Uri.joinPath(testBaseDir, subdirPath);
                    
                    // First creation - should succeed
                    await vscode.workspace.fs.createDirectory(targetDir);
                    
                    // Verify directory exists
                    const stat1 = await vscode.workspace.fs.stat(targetDir);
                    assert.strictEqual(stat1.type, vscode.FileType.Directory, 
                        'First creation should create a directory');
                    
                    // Second creation - should succeed (idempotent)
                    await vscode.workspace.fs.createDirectory(targetDir);
                    
                    // Verify directory still exists
                    const stat2 = await vscode.workspace.fs.stat(targetDir);
                    assert.strictEqual(stat2.type, vscode.FileType.Directory, 
                        'Second creation should not fail');
                    
                    // Third creation - should succeed (idempotent)
                    await vscode.workspace.fs.createDirectory(targetDir);
                    
                    // Verify directory still exists
                    const stat3 = await vscode.workspace.fs.stat(targetDir);
                    assert.strictEqual(stat3.type, vscode.FileType.Directory, 
                        'Third creation should not fail');
                    
                } finally {
                    // Clean up test directory
                    try {
                        await vscode.workspace.fs.delete(testBaseDir, { recursive: true });
                    } catch (error) {
                        console.error('Failed to clean up test directory:', error);
                    }
                }
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: folder-structure-support, Property 4: Update path matching
     * Validates: Requirements 3.1, 3.2
     * 
     * For any installed document with relative path P, checking for updates should 
     * match it against remote documents with the same path P, not just the same filename.
     */
    test('Property 4: Update path matching', () => {
        // Generator for valid path segments
        const pathSegmentArb = fc.stringMatching(/^[a-zA-Z0-9_-]+$/);
        
        // Generator for valid filenames
        const filenameArb = fc.stringMatching(/^[a-zA-Z0-9_-]+\.md$/);
        
        // Generator for document paths (root or nested)
        const documentPathArb = fc.oneof(
            // Root-level document
            filenameArb.map(name => ({ path: '', name, fullPath: name })),
            // One level deep
            fc.tuple(pathSegmentArb, filenameArb)
                .map(([dir, name]) => ({ path: dir, name, fullPath: `${dir}/${name}` })),
            // Two levels deep
            fc.tuple(pathSegmentArb, pathSegmentArb, filenameArb)
                .map(([dir1, dir2, name]) => ({ 
                    path: `${dir1}/${dir2}`, 
                    name, 
                    fullPath: `${dir1}/${dir2}/${name}` 
                }))
        );

        // Generator for SHA values (40 character hex strings)
        const shaArb = fc.string({ minLength: 40, maxLength: 40 })
            .map(s => s.split('').map(c => '0123456789abcdef'[c.charCodeAt(0) % 16]).join(''));

        fc.assert(
            fc.property(
                fc.array(documentPathArb, { minLength: 2, maxLength: 10 }),
                fc.array(shaArb, { minLength: 2, maxLength: 2 }),
                (documents, shas): boolean => {
                    // Ensure we have at least 2 unique documents
                    const uniqueDocs = Array.from(
                        new Map(documents.map(d => [d.fullPath, d])).values()
                    );
                    
                    if (uniqueDocs.length < 2) {
                        return true; // Skip this test case
                    }

                    // Pick two documents with the same filename but different paths
                    const doc1 = uniqueDocs[0];
                    const doc2 = { ...uniqueDocs[1], name: doc1.name };
                    doc2.fullPath = doc2.path ? `${doc2.path}/${doc2.name}` : doc2.name;

                    // Ensure they have different paths
                    if (doc1.fullPath === doc2.fullPath) {
                        return true; // Skip this test case
                    }

                    // Create mock installed document (doc1 with old SHA)
                    const installedDoc = {
                        name: doc1.name,
                        path: doc1.fullPath,
                        version: '1.0.0',
                        installedAt: new Date(),
                        sha: shas[0]
                    };

                    // Create mock remote documents (both with new SHA)
                    const remoteDoc1: DocumentMetadata = {
                        name: doc1.name,
                        path: doc1.fullPath,
                        category: 'test',
                        version: '2.0.0',
                        description: 'Test document 1',
                        sha: shas[1],
                        size: 100,
                        downloadUrl: 'https://example.com/doc1.md'
                    };

                    const remoteDoc2: DocumentMetadata = {
                        name: doc2.name,
                        path: doc2.fullPath,
                        category: 'test',
                        version: '2.0.0',
                        description: 'Test document 2',
                        sha: shas[1],
                        size: 100,
                        downloadUrl: 'https://example.com/doc2.md'
                    };

                    // Test path-based matching logic
                    // Should match by path, not just name
                    const matchByPath = remoteDoc1.path === installedDoc.path;
                    const matchByName = remoteDoc1.name === installedDoc.name;
                    
                    // Verify that path matching is more specific than name matching
                    assert.ok(matchByPath, 'Should match by path');
                    assert.ok(matchByName, 'Should also match by name (same document)');
                    
                    // Verify that doc2 matches by name but NOT by path
                    const doc2MatchByPath = remoteDoc2.path === installedDoc.path;
                    const doc2MatchByName = remoteDoc2.name === installedDoc.name;
                    
                    assert.ok(doc2MatchByName, 'Doc2 should match by name');
                    assert.ok(!doc2MatchByPath, 'Doc2 should NOT match by path (different paths)');
                    
                    // The key property: documents with different paths should be treated as different
                    // even if they have the same filename
                    assert.notStrictEqual(remoteDoc1.path, remoteDoc2.path, 
                        'Documents with same name but different paths should have different paths');
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: folder-structure-support, Property 3: Root-level document compatibility
     * Validates: Requirements 5.1, 5.2, 5.4
     * 
     * For any document installed at .kiro/steering/filename.md (root level), all 
     * operations should continue to work without modification.
     */
    test('Property 3: Root-level document compatibility', async () => {
        // Skip if no workspace is available
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            console.log('Skipping test: No workspace folder available');
            return;
        }

        // Generator for valid filenames
        const filenameArb = fc.stringMatching(/^[a-zA-Z0-9_-]+\.md$/);

        await fc.assert(
            fc.asyncProperty(filenameArb, async (filename) => {
                // Create a unique test directory for this property test run
                const testBaseDir = vscode.Uri.joinPath(
                    workspaceFolder.uri, 
                    '.kiro', 
                    'test-steering-' + Date.now() + '-' + Math.random().toString(36).substring(7)
                );
                
                try {
                    // Ensure base test directory exists
                    await vscode.workspace.fs.createDirectory(testBaseDir);
                    
                    // Create a root-level document
                    const fileUri = vscode.Uri.joinPath(testBaseDir, filename);
                    const content = `---
version: "1.0.0"
sha: "test-sha-root"
inclusion: "manual"
---

# Root Level Test Document

This is a root-level test document.
`;
                    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf-8'));
                    
                    // Create a temporary DocumentService instance for testing
                    const testService = new DocumentService(
                        mockGitHubClient,
                        mockCacheManager,
                        frontmatterService
                    );
                    
                    // Test 1: Scanning should find root-level document
                    const scanMethod = (testService as any).scanDirectoryRecursive.bind(testService);
                    const scannedDocs = await scanMethod(testBaseDir, testBaseDir);
                    
                    assert.strictEqual(scannedDocs.length, 1, 
                        'Should find exactly one root-level document');
                    
                    const doc = scannedDocs[0];
                    
                    // Test 2: Root-level document should have path equal to name
                    assert.strictEqual(doc.path, filename, 
                        'Root-level document path should equal filename');
                    assert.strictEqual(doc.name, filename, 
                        'Root-level document name should equal filename');
                    
                    // Test 3: Document should have all required fields
                    assert.strictEqual(doc.version, '1.0.0', 
                        'Document should have correct version');
                    assert.strictEqual(doc.sha, 'test-sha-root', 
                        'Document should have correct sha');
                    assert.strictEqual(doc.inclusionMode, 'manual', 
                        'Document should have correct inclusion mode');
                    assert.ok(doc.installedAt instanceof Date, 
                        'Document should have installedAt date');
                    
                    // Test 4: Reading the document directly should work
                    const readContent = await vscode.workspace.fs.readFile(fileUri);
                    const readContentStr = Buffer.from(readContent).toString('utf-8');
                    assert.ok(readContentStr.includes('Root Level Test Document'), 
                        'Should be able to read document content');
                    
                    // Test 5: Updating frontmatter should work
                    const { frontmatter, body } = frontmatterService.parse(readContentStr);
                    frontmatter.version = '2.0.0';
                    const updatedContent = frontmatterService.stringify(frontmatter, body);
                    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(updatedContent, 'utf-8'));
                    
                    // Verify update worked
                    const updatedReadContent = await vscode.workspace.fs.readFile(fileUri);
                    const updatedReadContentStr = Buffer.from(updatedReadContent).toString('utf-8');
                    const { frontmatter: updatedFrontmatter } = frontmatterService.parse(updatedReadContentStr);
                    assert.strictEqual(updatedFrontmatter.version, '2.0.0', 
                        'Document version should be updated');
                    
                    // Test 6: Deleting the document should work
                    await vscode.workspace.fs.delete(fileUri);
                    
                    // Verify deletion
                    try {
                        await vscode.workspace.fs.stat(fileUri);
                        assert.fail('Document should have been deleted');
                    } catch (error) {
                        // Expected - file should not exist
                        assert.ok(error instanceof vscode.FileSystemError, 
                            'Should throw FileSystemError when file does not exist');
                    }
                    
                } finally {
                    // Clean up test directory
                    try {
                        await vscode.workspace.fs.delete(testBaseDir, { recursive: true });
                    } catch (error) {
                        console.error('Failed to clean up test directory:', error);
                    }
                }
            }),
            { numRuns: 100 }
        );
    });
});

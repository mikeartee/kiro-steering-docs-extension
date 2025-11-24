import * as assert from 'assert';
import { SteeringDocsTreeProvider } from './SteeringDocsTreeProvider';
import { DocumentService } from '../services/DocumentService';
import { GitHubClient } from '../services/GitHubClient';
import { CacheManager } from '../services/CacheManager';
import { FrontmatterService } from '../services/FrontmatterService';
import * as vscode from 'vscode';

suite('SteeringDocsTreeProvider Tests', () => {
    let treeProvider: SteeringDocsTreeProvider;
    let documentService: DocumentService;

    setup(() => {
        // Create mock instances
        const mockGitHubClient = new GitHubClient('test/repo', 'main');
        
        // Create a mock memento for cache manager
        const mockMemento: vscode.Memento = {
            keys: () => [],
            get: <T>(_key: string): T | undefined => undefined,
            update: async (_key: string, _value: any): Promise<void> => {}
        };
        
        const mockCacheManager = new CacheManager(mockMemento);
        const frontmatterService = new FrontmatterService();
        
        documentService = new DocumentService(
            mockGitHubClient,
            mockCacheManager,
            frontmatterService
        );
        
        treeProvider = new SteeringDocsTreeProvider(documentService);
    });

    test('buildFolderHierarchy should create folder nodes for nested paths', () => {
        // Access the private method using reflection
        const buildMethod = (treeProvider as any).buildFolderHierarchy.bind(treeProvider);
        
        // Create test documents with various nesting levels
        const documents = [
            {
                type: 'document' as const,
                metadata: {
                    name: 'typescript-formatting.md',
                    path: 'languages/typescript-formatting.md',
                    category: 'code-formatting',
                    version: '1.0.0',
                    description: 'TypeScript formatting',
                    sha: 'abc123',
                    size: 100,
                    downloadUrl: 'https://example.com/typescript-formatting.md'
                },
                hasUpdate: false
            },
            {
                type: 'document' as const,
                metadata: {
                    name: 'python-formatting.md',
                    path: 'languages/python-formatting.md',
                    category: 'code-formatting',
                    version: '1.0.0',
                    description: 'Python formatting',
                    sha: 'def456',
                    size: 100,
                    downloadUrl: 'https://example.com/python-formatting.md'
                },
                hasUpdate: false
            },
            {
                type: 'document' as const,
                metadata: {
                    name: 'json-formatting.md',
                    path: 'data-formats/json-formatting.md',
                    category: 'code-formatting',
                    version: '1.0.0',
                    description: 'JSON formatting',
                    sha: 'ghi789',
                    size: 100,
                    downloadUrl: 'https://example.com/json-formatting.md'
                },
                hasUpdate: false
            },
            {
                type: 'document' as const,
                metadata: {
                    name: 'tech.md',
                    path: 'tech.md',
                    category: 'code-formatting',
                    version: '1.0.0',
                    description: 'Tech stack',
                    sha: 'jkl012',
                    size: 100,
                    downloadUrl: 'https://example.com/tech.md'
                },
                hasUpdate: false
            }
        ];
        
        // Build the hierarchy
        const result = buildMethod('code-formatting', documents);
        
        // Verify we have the correct number of items (2 folders + 1 root document)
        assert.strictEqual(result.length, 3, 'Should have 2 folders and 1 root document');
        
        // Verify folders are created
        const folders = result.filter((item: any) => item.type === 'folder');
        assert.strictEqual(folders.length, 2, 'Should have 2 folders');
        
        // Verify folder paths
        const folderPaths = folders.map((f: any) => f.path).sort();
        assert.deepStrictEqual(folderPaths, ['data-formats', 'languages'], 
            'Should have correct folder paths');
        
        // Verify root-level documents are included
        const rootDocs = result.filter((item: any) => 
            item.type === 'document' && !item.metadata.path.includes('/')
        );
        assert.strictEqual(rootDocs.length, 1, 'Should have 1 root-level document');
        assert.strictEqual(rootDocs[0].metadata.name, 'tech.md', 
            'Root document should be tech.md');
        
        // Verify folders come before documents in the sorted result
        const firstFolder = result.findIndex((item: any) => item.type === 'folder');
        const firstDoc = result.findIndex((item: any) => item.type === 'document');
        assert.ok(firstFolder < firstDoc, 'Folders should come before documents');
    });

    test('buildFolderHierarchy should handle deeply nested paths', () => {
        const buildMethod = (treeProvider as any).buildFolderHierarchy.bind(treeProvider);
        
        const documents = [
            {
                type: 'document' as const,
                metadata: {
                    name: 'api.md',
                    path: 'code-quality/patterns/api.md',
                    category: 'practices',
                    version: '1.0.0',
                    description: 'API patterns',
                    sha: 'abc123',
                    size: 100,
                    downloadUrl: 'https://example.com/api.md'
                },
                hasUpdate: false
            }
        ];
        
        const result = buildMethod('practices', documents);
        
        // Should create folder nodes for both levels
        const folders = result.filter((item: any) => item.type === 'folder');
        assert.strictEqual(folders.length, 2, 'Should have 2 folder levels');
        
        const folderPaths = folders.map((f: any) => f.path).sort();
        assert.deepStrictEqual(folderPaths, ['code-quality', 'code-quality/patterns'], 
            'Should have both folder levels');
        
        // Verify parent relationships
        const topFolder = folders.find((f: any) => f.path === 'code-quality');
        const nestedFolder = folders.find((f: any) => f.path === 'code-quality/patterns');
        
        assert.strictEqual(topFolder.parentPath, undefined, 
            'Top-level folder should have no parent');
        assert.strictEqual(nestedFolder.parentPath, 'code-quality', 
            'Nested folder should have correct parent');
    });

    test('buildFolderHierarchy should handle only root-level documents', () => {
        const buildMethod = (treeProvider as any).buildFolderHierarchy.bind(treeProvider);
        
        const documents = [
            {
                type: 'document' as const,
                metadata: {
                    name: 'tech.md',
                    path: 'tech.md',
                    category: 'general',
                    version: '1.0.0',
                    description: 'Tech stack',
                    sha: 'abc123',
                    size: 100,
                    downloadUrl: 'https://example.com/tech.md'
                },
                hasUpdate: false
            },
            {
                type: 'document' as const,
                metadata: {
                    name: 'product.md',
                    path: 'product.md',
                    category: 'general',
                    version: '1.0.0',
                    description: 'Product overview',
                    sha: 'def456',
                    size: 100,
                    downloadUrl: 'https://example.com/product.md'
                },
                hasUpdate: false
            }
        ];
        
        const result = buildMethod('general', documents);
        
        // Should have no folders, only documents
        const folders = result.filter((item: any) => item.type === 'folder');
        assert.strictEqual(folders.length, 0, 'Should have no folders');
        
        const docs = result.filter((item: any) => item.type === 'document');
        assert.strictEqual(docs.length, 2, 'Should have 2 documents');
    });

    test('buildFolderHierarchy should handle empty document list', () => {
        const buildMethod = (treeProvider as any).buildFolderHierarchy.bind(treeProvider);
        
        const result = buildMethod('empty', []);
        
        assert.strictEqual(result.length, 0, 'Should return empty array for empty input');
    });

    test('getChildrenForFolder should return documents with correct properties', () => {
        const getChildrenMethod = (treeProvider as any).getChildrenForFolder.bind(treeProvider);
        
        // Set up remote documents
        (treeProvider as any).remoteDocuments = [
            {
                name: 'typescript-formatting.md',
                path: 'languages/typescript-formatting.md',
                category: 'code-formatting',
                version: '1.0.0',
                description: 'TypeScript formatting',
                sha: 'abc123',
                size: 100,
                downloadUrl: 'https://example.com/typescript-formatting.md'
            },
            {
                name: 'python-formatting.md',
                path: 'languages/python-formatting.md',
                category: 'code-formatting',
                version: '1.0.0',
                description: 'Python formatting',
                sha: 'def456',
                size: 100,
                downloadUrl: 'https://example.com/python-formatting.md'
            }
        ];
        
        // Set up installed documents
        (treeProvider as any).installedDocuments = [
            {
                name: 'typescript-formatting.md',
                path: 'languages/typescript-formatting.md',
                version: '1.0.0',
                installedAt: new Date(),
                sha: 'abc123',
                inclusionMode: 'always'
            }
        ];
        
        const result = getChildrenMethod('code-formatting', 'languages');
        
        // Should have 2 documents
        const docs = result.filter((item: any) => item.type === 'document');
        assert.strictEqual(docs.length, 2, 'Should have 2 documents');
        
        // Verify installed document has correct properties
        const installedDoc = docs.find((d: any) => d.metadata.name === 'typescript-formatting.md');
        assert.ok(installedDoc, 'Should find installed document');
        assert.ok(installedDoc.installed, 'Document should have installed property');
        assert.strictEqual(installedDoc.installed.inclusionMode, 'always', 
            'Should preserve inclusion mode');
        assert.strictEqual(installedDoc.hasUpdate, false, 
            'Should correctly calculate hasUpdate');
        
        // Verify non-installed document has correct properties
        const notInstalledDoc = docs.find((d: any) => d.metadata.name === 'python-formatting.md');
        assert.ok(notInstalledDoc, 'Should find non-installed document');
        assert.strictEqual(notInstalledDoc.installed, undefined, 
            'Document should not have installed property');
        assert.strictEqual(notInstalledDoc.hasUpdate, false, 
            'Should correctly calculate hasUpdate for non-installed');
    });

    test('createDocumentTreeItem should preserve properties for nested documents', () => {
        const createMethod = (treeProvider as any).createDocumentTreeItem.bind(treeProvider);
        
        // Create a document tree item for a nested document
        const docItem = {
            type: 'document' as const,
            metadata: {
                name: 'typescript-formatting.md',
                path: 'languages/typescript-formatting.md',
                category: 'code-formatting',
                version: '1.0.0',
                description: 'TypeScript formatting',
                sha: 'abc123',
                size: 100,
                downloadUrl: 'https://example.com/typescript-formatting.md'
            },
            installed: {
                name: 'typescript-formatting.md',
                path: 'languages/typescript-formatting.md',
                version: '1.0.0',
                installedAt: new Date(),
                sha: 'abc123',
                inclusionMode: 'always' as const
            },
            hasUpdate: false
        };
        
        const treeItem = createMethod(docItem);
        
        // Verify tree item properties
        assert.strictEqual(treeItem.label, 'typescript-formatting.md', 
            'Should have correct label');
        assert.strictEqual(treeItem.description, '1.0.0', 
            'Should have version as description');
        assert.strictEqual(treeItem.contextValue, 'document-installed', 
            'Should have correct context value');
        assert.ok(treeItem.command, 'Should have toggle command');
        assert.strictEqual(treeItem.command.command, 'steeringDocs.toggle', 
            'Should have correct command');
        assert.ok(treeItem.iconPath, 'Should have icon');
        assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None, 
            'Documents should not be collapsible');
    });

    test('createDocumentTreeItem should handle non-installed nested documents', () => {
        const createMethod = (treeProvider as any).createDocumentTreeItem.bind(treeProvider);
        
        // Create a document tree item for a non-installed nested document
        const docItem = {
            type: 'document' as const,
            metadata: {
                name: 'python-formatting.md',
                path: 'languages/python-formatting.md',
                category: 'code-formatting',
                version: '1.0.0',
                description: 'Python formatting',
                sha: 'def456',
                size: 100,
                downloadUrl: 'https://example.com/python-formatting.md'
            },
            hasUpdate: false
        };
        
        const treeItem = createMethod(docItem);
        
        // Verify tree item properties
        assert.strictEqual(treeItem.label, 'python-formatting.md', 
            'Should have correct label');
        assert.strictEqual(treeItem.contextValue, 'document-not-installed', 
            'Should have correct context value for non-installed');
        assert.ok(treeItem.command, 'Should have toggle command');
        assert.strictEqual(treeItem.command.command, 'steeringDocs.toggle', 
            'Should have correct command');
    });
});


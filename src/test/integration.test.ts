import * as assert from 'assert';
import * as vscode from 'vscode';
import { GitHubClient } from '../services/GitHubClient';
import { CacheManager } from '../services/CacheManager';
import { FrontmatterService } from '../services/FrontmatterService';
import { DocumentService } from '../services/DocumentService';
import { SteeringDocsTreeProvider } from '../providers/SteeringDocsTreeProvider';
import { DocumentMetadata } from '../models/types';

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

/**
 * Mock GitHub client for integration tests
 */
class MockGitHubClient extends GitHubClient {
    private mockDocuments: DocumentMetadata[] = [
        {
            name: 'test-doc-1.md',
            path: 'documents/test/test-doc-1.md',
            category: 'test',
            version: '1.0.0',
            description: 'Test document 1',
            sha: 'abc123',
            size: 1024,
            downloadUrl: 'https://example.com/test-doc-1.md'
        },
        {
            name: 'test-doc-2.md',
            path: 'documents/test/test-doc-2.md',
            category: 'test',
            version: '1.0.0',
            description: 'Test document 2',
            sha: 'def456',
            size: 2048,
            downloadUrl: 'https://example.com/test-doc-2.md'
        }
    ];

    private mockContent = `---
version: "1.0.0"
category: "test"
description: "Test document"
---

# Test Document

This is a test document for integration testing.
`;

    private mockCategoriesJson = JSON.stringify({
        categories: [
            {
                id: 'test',
                name: 'Test',
                description: 'Test category'
            }
        ]
    });

    constructor() {
        super('test/repo', 'main');
    }

    async getRepositoryContents(path: string): Promise<any[]> {
        // Return mock directory contents for the test category
        if (path === 'test') {
            return this.mockDocuments.map(doc => ({
                name: doc.name,
                path: doc.path,
                type: 'file',
                sha: doc.sha,
                size: doc.size,
                download_url: doc.downloadUrl
            }));
        }
        return [];
    }

    async getFileContent(_path: string): Promise<string> {
        return this.mockContent;
    }

    async getRawFileContent(path: string): Promise<string> {
        if (path === 'categories.json') {
            return this.mockCategoriesJson;
        }
        return this.mockContent;
    }

    // Method to update mock document SHA for testing updates
    updateDocumentSha(name: string, newSha: string): void {
        const doc = this.mockDocuments.find(d => d.name === name);
        if (doc) {
            doc.sha = newSha;
        }
    }
}

suite('Integration Tests', () => {
    let workspaceUri: vscode.Uri;
    let steeringDir: vscode.Uri;
    let memento: MockMemento;
    let githubClient: MockGitHubClient;
    let cacheManager: CacheManager;
    let frontmatterService: FrontmatterService;
    let documentService: DocumentService;
    let treeProvider: SteeringDocsTreeProvider;

    // Helper function to get the correct file URI for a document
    function getDocumentFileUri(doc: DocumentMetadata): vscode.Uri {
        const pathParts = doc.path.split('/');
        const dirPath = pathParts.slice(0, -1).join('/');
        return vscode.Uri.joinPath(steeringDir, dirPath, doc.name);
    }

    setup(async () => {
        // Get workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder found for testing');
        }
        workspaceUri = workspaceFolders[0].uri;
        steeringDir = vscode.Uri.joinPath(workspaceUri, '.kiro', 'steering');

        // Create test directory structure
        try {
            await vscode.workspace.fs.createDirectory(steeringDir);
        } catch (error) {
            // Directory might already exist
        }

        // Initialize services with mocks
        memento = new MockMemento();
        githubClient = new MockGitHubClient();
        cacheManager = new CacheManager(memento as any);
        frontmatterService = new FrontmatterService();
        documentService = new DocumentService(githubClient as any, cacheManager, frontmatterService);
        treeProvider = new SteeringDocsTreeProvider(documentService);
    });

    teardown(async () => {
        // Clean up test files
        try {
            const files = await vscode.workspace.fs.readDirectory(steeringDir);
            for (const [name, type] of files) {
                if (type === vscode.FileType.File && name.startsWith('test-')) {
                    const fileUri = vscode.Uri.joinPath(steeringDir, name);
                    await vscode.workspace.fs.delete(fileUri);
                }
            }
        } catch (error) {
            // Directory might not exist
        }
    });

    test('End-to-end: Browse documents', async () => {
        // Fetch document list
        const documents = await documentService.fetchDocumentList();

        assert.ok(Array.isArray(documents), 'Should return array of documents');
        assert.strictEqual(documents.length, 2, 'Should have 2 mock documents');
        assert.strictEqual(documents[0].name, 'test-doc-1.md', 'First document name should match');
        assert.strictEqual(documents[1].name, 'test-doc-2.md', 'Second document name should match');
    });

    test('End-to-end: Preview document', async () => {
        const documents = await documentService.fetchDocumentList();
        const doc = documents[0];

        // Fetch document content
        const content = await documentService.fetchDocumentContent(doc.path);

        assert.ok(content.includes('# Test Document'), 'Content should include document title');
        assert.ok(content.includes('version: "1.0.0"'), 'Content should include frontmatter');
    });

    test('End-to-end: Install document', async () => {
        const documents = await documentService.fetchDocumentList();
        const doc = documents[0];

        // Install document
        await documentService.installDocument(doc);

        // Verify file was created at the correct path (including subdirectories)
        const fileUri = getDocumentFileUri(doc);
        const stat = await vscode.workspace.fs.stat(fileUri);
        assert.ok(stat.type === vscode.FileType.File, 'Document file should exist');

        // Verify content
        const content = await vscode.workspace.fs.readFile(fileUri);
        const contentStr = Buffer.from(content).toString('utf8');
        assert.ok(contentStr.includes('# Test Document'), 'Installed content should match');
    });

    test('End-to-end: Quick load document', async () => {
        const documents = await documentService.fetchDocumentList();
        const doc = documents[0];

        // Quick load document
        await documentService.quickLoadDocument(doc);

        // Verify file was created at the correct path
        const fileUri = getDocumentFileUri(doc);
        const stat = await vscode.workspace.fs.stat(fileUri);
        assert.ok(stat.type === vscode.FileType.File, 'Document file should exist');

        // Verify inclusion mode is set to "always"
        const content = await vscode.workspace.fs.readFile(fileUri);
        const contentStr = Buffer.from(content).toString('utf8');
        assert.ok(contentStr.includes('inclusion: "always"'), 'Should have inclusion mode set to always');
    });

    test('End-to-end: Update document', async () => {
        const documents = await documentService.fetchDocumentList();
        const doc = documents[0];

        // Install document first
        await documentService.installDocument(doc);

        // Update mock document SHA to simulate new version
        githubClient.updateDocumentSha(doc.name, 'newsha789');

        // Check for updates
        const updates = await documentService.checkForUpdates();
        assert.strictEqual(updates.length, 1, 'Should detect 1 update');
        assert.strictEqual(updates[0].document.name, doc.name, 'Update should be for the installed document');

        // Update document
        await documentService.updateDocument(updates[0].document);

        // Verify file still exists
        const fileUri = getDocumentFileUri(doc);
        const stat = await vscode.workspace.fs.stat(fileUri);
        assert.ok(stat.type === vscode.FileType.File, 'Document file should still exist');
    });

    test('Inclusion mode: Change to always', async () => {
        const documents = await documentService.fetchDocumentList();
        const doc = documents[0];

        // Install document
        await documentService.installDocument(doc);

        // Set inclusion mode to always (use full path from doc.path)
        await documentService.setInclusionMode(doc.path, 'always');

        // Verify inclusion mode
        const mode = await documentService.getInclusionMode(doc.path);
        assert.strictEqual(mode, 'always', 'Inclusion mode should be "always"');

        // Verify file content
        const fileUri = getDocumentFileUri(doc);
        const content = await vscode.workspace.fs.readFile(fileUri);
        const contentStr = Buffer.from(content).toString('utf8');
        assert.ok(contentStr.includes('inclusion: "always"'), 'File should contain inclusion: "always"');
    });

    test('Inclusion mode: Change to manual', async () => {
        const documents = await documentService.fetchDocumentList();
        const doc = documents[0];

        // Install and quick load (sets to always)
        await documentService.quickLoadDocument(doc);

        // Change to manual
        await documentService.setInclusionMode(doc.path, 'manual');

        // Verify inclusion mode
        const mode = await documentService.getInclusionMode(doc.path);
        assert.strictEqual(mode, 'manual', 'Inclusion mode should be "manual"');
    });

    test('Inclusion mode: Change to fileMatch', async () => {
        const documents = await documentService.fetchDocumentList();
        const doc = documents[0];

        // Install document
        await documentService.installDocument(doc);

        // Set inclusion mode to fileMatch
        await documentService.setInclusionMode(doc.path, 'fileMatch', '*.ts');

        // Verify inclusion mode
        const mode = await documentService.getInclusionMode(doc.path);
        assert.strictEqual(mode, 'fileMatch', 'Inclusion mode should be "fileMatch"');

        // Verify file content includes pattern
        const fileUri = getDocumentFileUri(doc);
        const content = await vscode.workspace.fs.readFile(fileUri);
        const contentStr = Buffer.from(content).toString('utf8');
        assert.ok(contentStr.includes('inclusion: "fileMatch"'), 'File should contain inclusion: "fileMatch"');
        assert.ok(contentStr.includes('fileMatchPattern: "*.ts"'), 'File should contain fileMatchPattern');
    });

    test('Frontmatter updates: Preserve existing properties', async () => {
        const documents = await documentService.fetchDocumentList();
        const doc = documents[0];

        // Install document
        await documentService.installDocument(doc);

        // Get original content
        const fileUri = getDocumentFileUri(doc);
        const originalContent = await vscode.workspace.fs.readFile(fileUri);
        const originalStr = Buffer.from(originalContent).toString('utf8');

        // Verify original frontmatter properties exist
        assert.ok(originalStr.includes('version: "1.0.0"'), 'Should have version');
        assert.ok(originalStr.includes('category: "test"'), 'Should have category');

        // Set inclusion mode
        await documentService.setInclusionMode(doc.path, 'always');

        // Get updated content
        const updatedContent = await vscode.workspace.fs.readFile(fileUri);
        const updatedStr = Buffer.from(updatedContent).toString('utf8');

        // Verify original properties are preserved
        assert.ok(updatedStr.includes('version: "1.0.0"'), 'Should preserve version');
        assert.ok(updatedStr.includes('category: "test"'), 'Should preserve category');
        assert.ok(updatedStr.includes('inclusion: "always"'), 'Should add inclusion mode');
    });

    test('Offline behavior: Use cached data', async () => {
        // Fetch documents (populates cache)
        const documents = await documentService.fetchDocumentList();
        assert.strictEqual(documents.length, 2, 'Should fetch 2 documents');

        // Verify cache has data
        const cached = cacheManager.get('documentList');
        assert.ok(cached !== undefined, 'Cache should have document list');
    });

    test('Active document filtering: Get installed documents', async () => {
        const documents = await documentService.fetchDocumentList();

        // Install first document with "always" mode
        await documentService.quickLoadDocument(documents[0]);

        // Install second document with "manual" mode
        await documentService.installDocument(documents[1]);
        await documentService.setInclusionMode(documents[1].name, 'manual');

        // Get installed documents
        const installed = await documentService.getInstalledDocuments();

        assert.strictEqual(installed.length, 2, 'Should have 2 installed documents');

        const doc1 = installed.find(d => d.name === documents[0].name);
        const doc2 = installed.find(d => d.name === documents[1].name);

        assert.ok(doc1, 'First document should be in installed list');
        assert.ok(doc2, 'Second document should be in installed list');
        assert.strictEqual(doc1?.inclusionMode, 'always', 'First document should have "always" mode');
        assert.strictEqual(doc2?.inclusionMode, 'manual', 'Second document should have "manual" mode');
    });

    test('Tree provider: Refresh updates tree', async () => {
        // Install a document
        const documents = await documentService.fetchDocumentList();
        await documentService.installDocument(documents[0]);

        // Refresh tree
        treeProvider.refresh();

        // Tree should update (we can't easily test the actual tree structure without VS Code UI)
        // But we can verify the refresh doesn't throw errors
        const updatedChildren = await treeProvider.getChildren();
        assert.ok(Array.isArray(updatedChildren), 'Tree children should be an array');
    });

    test('Tree provider: Show active only filter', async () => {
        // Install documents with different modes
        const documents = await documentService.fetchDocumentList();
        await documentService.quickLoadDocument(documents[0]); // always
        await documentService.installDocument(documents[1]);
        await documentService.setInclusionMode(documents[1].name, 'manual');

        // Test filter toggle
        const initialState = treeProvider.getShowActiveOnly();
        treeProvider.setShowActiveOnly(!initialState);
        assert.strictEqual(treeProvider.getShowActiveOnly(), !initialState, 'Filter state should toggle');

        // Reset filter
        treeProvider.setShowActiveOnly(initialState);
        assert.strictEqual(treeProvider.getShowActiveOnly(), initialState, 'Filter state should reset');
    });
});

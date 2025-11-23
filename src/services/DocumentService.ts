import * as vscode from 'vscode';
import { GitHubClient } from './GitHubClient';
import { CacheManager } from './CacheManager';
import { FrontmatterService } from './FrontmatterService';
import {
    DocumentMetadata,
    InstalledDocument,
    UpdateInfo,
    CategoryDefinition,
    ErrorCode,
    ExtensionError
} from '../models/types';

/**
 * Service for managing steering documents
 */
export class DocumentService {
    private readonly CACHE_KEY_DOCUMENTS = 'documentList';
    private readonly STEERING_DIR = '.kiro/steering';

    constructor(
        private readonly githubClient: GitHubClient,
        private readonly cacheManager: CacheManager,
        private readonly frontmatterService: FrontmatterService
    ) {}

    /**
     * Extract the directory portion from a document path
     * @param fullPath Full path like "agents/bmad-spec-converter.md" or "tech.md"
     * @returns Directory path like "agents" or empty string for root-level documents
     */
    private getRelativePath(fullPath: string): string {
        // Validate path to prevent path traversal attacks
        if (fullPath.includes('..') || fullPath.startsWith('/') || fullPath.startsWith('\\')) {
            throw new ExtensionError(
                'Invalid path: path traversal or absolute paths are not allowed',
                ErrorCode.FILE_SYSTEM_ERROR,
                false
            );
        }

        // Normalize path separators to forward slashes
        const normalizedPath = fullPath.replace(/\\/g, '/');
        
        // Extract directory portion
        const lastSlashIndex = normalizedPath.lastIndexOf('/');
        if (lastSlashIndex === -1) {
            // No directory, root-level document
            return '';
        }
        
        return normalizedPath.substring(0, lastSlashIndex);
    }

    /**
     * Recursively scan a directory for markdown files
     * @param dirUri Directory URI to scan
     * @param baseUri Base directory URI for calculating relative paths
     * @returns Array of installed documents with relative paths
     */
    private async scanDirectoryRecursive(
        dirUri: vscode.Uri,
        baseUri: vscode.Uri
    ): Promise<InstalledDocument[]> {
        const installedDocs: InstalledDocument[] = [];

        try {
            const entries = await vscode.workspace.fs.readDirectory(dirUri);

            for (const [name, type] of entries) {
                const itemUri = vscode.Uri.joinPath(dirUri, name);

                if (type === vscode.FileType.File && name.endsWith('.md')) {
                    try {
                        const content = await vscode.workspace.fs.readFile(itemUri);
                        const contentStr = Buffer.from(content).toString('utf-8');
                        const { frontmatter } = this.frontmatterService.parse(contentStr);

                        // Get file stats for installed date
                        const stats = await vscode.workspace.fs.stat(itemUri);

                        // Calculate relative path from base directory
                        const relativePath = itemUri.fsPath
                            .substring(baseUri.fsPath.length + 1)
                            .replace(/\\/g, '/');

                        installedDocs.push({
                            name,
                            path: relativePath,
                            version: frontmatter.version || '1.0.0',
                            installedAt: new Date(stats.mtime),
                            sha: frontmatter.sha || '',
                            inclusionMode: frontmatter.inclusion as 'always' | 'manual' | 'fileMatch' | undefined,
                            fileMatchPattern: frontmatter.fileMatchPattern
                        });
                    } catch (error) {
                        console.error(`Failed to read document ${name}:`, error);
                    }
                } else if (type === vscode.FileType.Directory) {
                    // Recursively scan subdirectory
                    const subDocs = await this.scanDirectoryRecursive(itemUri, baseUri);
                    installedDocs.push(...subDocs);
                }
            }
        } catch (error) {
            // Log error but continue - allows partial results if some directories fail
            console.error(`Failed to scan directory ${dirUri.fsPath}:`, error);
        }

        return installedDocs;
    }

    /**
     * Recursively fetch markdown documents from a GitHub directory
     * @param dirPath Directory path to scan
     * @param categoryId Category ID for the documents
     * @returns Array of document metadata
     */
    private async fetchDocumentsRecursive(
        dirPath: string,
        categoryId: string
    ): Promise<DocumentMetadata[]> {
        const documents: DocumentMetadata[] = [];

        try {
            const contents = await this.githubClient.getRepositoryContents(dirPath);

            for (const item of contents) {
                // Skip README.md files - they are repository documentation, not steering docs
                if (item.type === 'file' && item.name.toLowerCase() === 'readme.md') {
                    continue;
                }

                if (item.type === 'file' && item.name.endsWith('.md')) {
                    // Fetch document content to parse frontmatter
                    const content = await this.githubClient.getRawFileContent(item.path);
                    const { frontmatter } = this.frontmatterService.parse(content);

                    documents.push({
                        name: item.name,
                        path: item.path,
                        category: categoryId,
                        version: frontmatter.version || '1.0.0',
                        description: frontmatter.description || '',
                        sha: item.sha,
                        size: item.size,
                        downloadUrl: item.download_url
                    });
                } else if (item.type === 'dir') {
                    // Recursively fetch documents from subdirectory
                    const subDocs = await this.fetchDocumentsRecursive(item.path, categoryId);
                    documents.push(...subDocs);
                }
            }
        } catch (error) {
            // Log error but continue - allows partial results if some directories fail
            console.error(`Failed to fetch documents from ${dirPath}:`, error);
        }

        return documents;
    }

    /**
     * Clear the document list cache
     */
    clearCache(): void {
        this.cacheManager.clear(this.CACHE_KEY_DOCUMENTS);
    }

    /**
     * Fetch the list of available documents from GitHub with caching
     * @returns Array of document metadata organized by category
     */
    async fetchDocumentList(): Promise<DocumentMetadata[]> {
        // Try to get from cache first
        const cached = this.cacheManager.get<DocumentMetadata[]>(this.CACHE_KEY_DOCUMENTS);
        if (cached) {
            return cached;
        }

        try {
            // Fetch categories.json
            const categoriesContent = await this.githubClient.getRawFileContent('categories.json');
            const categoriesData = JSON.parse(categoriesContent);
            const categories: CategoryDefinition[] = categoriesData.categories || [];

            const documents: DocumentMetadata[] = [];

            // Folders to skip - repository infrastructure, not steering documents
            const ignoredFolders = ['docs', 'templates'];

            // Fetch documents from each category directory (using category.id as folder name)
            for (const category of categories) {
                const categoryPath = category.id; // Look in root-level folders like "code-quality", "best-practices"
                
                // Skip ignored folders (case-insensitive)
                if (ignoredFolders.includes(categoryPath.toLowerCase())) {
                    continue;
                }
                
                try {
                    // Recursively fetch all documents from category directory and subdirectories
                    const categoryDocs = await this.fetchDocumentsRecursive(categoryPath, category.id);
                    documents.push(...categoryDocs);
                } catch (error) {
                    // Log error but continue with other categories
                    console.error(`Failed to fetch documents from category ${category.id}:`, error);
                }
            }

            // Cache the results
            await this.cacheManager.set(this.CACHE_KEY_DOCUMENTS, documents, 3600); // 1 hour TTL

            return documents;
        } catch (error) {
            // If fetch fails, try to return cached data even if expired
            const cached = this.cacheManager.get<DocumentMetadata[]>(this.CACHE_KEY_DOCUMENTS);
            if (cached) {
                return cached;
            }

            throw error;
        }
    }

    /**
     * Fetch the content of a specific document
     * @param path Path to the document in the repository
     * @returns Document content as string
     */
    async fetchDocumentContent(path: string): Promise<string> {
        try {
            return await this.githubClient.getRawFileContent(path);
        } catch (error) {
            if (error instanceof ExtensionError) {
                throw error;
            }
            throw new ExtensionError(
                `Failed to fetch document content: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ErrorCode.NETWORK_ERROR,
                true
            );
        }
    }

    /**
     * Get list of installed documents from the local steering directory
     * @returns Array of installed document metadata
     */
    async getInstalledDocuments(): Promise<InstalledDocument[]> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return [];
        }

        const steeringDirUri = vscode.Uri.joinPath(workspaceFolder.uri, this.STEERING_DIR);

        try {
            // Use recursive scan to find all markdown files
            const installedDocs = await this.scanDirectoryRecursive(steeringDirUri, steeringDirUri);
            return installedDocs;
        } catch (error) {
            // Directory doesn't exist or can't be read
            if (error instanceof vscode.FileSystemError) {
                return [];
            }
            throw new ExtensionError(
                `Failed to read installed documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ErrorCode.FILE_SYSTEM_ERROR,
                false
            );
        }
    }

    /**
     * Install a document to the local steering directory
     * @param doc Document metadata
     * @param inclusionMode Optional inclusion mode to set in frontmatter
     * @param fileMatchPattern Optional file match pattern (required if inclusionMode is 'fileMatch')
     */
    async installDocument(
        doc: DocumentMetadata,
        inclusionMode?: 'always' | 'manual' | 'fileMatch',
        fileMatchPattern?: string
    ): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new ExtensionError(
                'No workspace folder open',
                ErrorCode.FILE_SYSTEM_ERROR,
                false
            );
        }

        const steeringDirUri = vscode.Uri.joinPath(workspaceFolder.uri, this.STEERING_DIR);
        
        // Extract directory path from doc.path (e.g., "agents" from "agents/bmad-spec-converter.md")
        const dirPath = this.getRelativePath(doc.path);
        
        // Determine target directory and file URI
        let targetDirUri = steeringDirUri;
        let fileUri: vscode.Uri;
        
        if (dirPath) {
            // Document is in a subdirectory
            targetDirUri = vscode.Uri.joinPath(steeringDirUri, dirPath);
            fileUri = vscode.Uri.joinPath(targetDirUri, doc.name);
        } else {
            // Root-level document
            fileUri = vscode.Uri.joinPath(steeringDirUri, doc.name);
        }

        try {
            // Check if file already exists
            try {
                await vscode.workspace.fs.stat(fileUri);
                
                // File exists, prompt for overwrite
                const answer = await vscode.window.showWarningMessage(
                    `Document "${doc.name}" already exists. Do you want to overwrite it?`,
                    'Overwrite',
                    'Cancel'
                );

                if (answer !== 'Overwrite') {
                    return;
                }
            } catch {
                // File doesn't exist, continue with installation
            }

            // Create base steering directory if it doesn't exist
            try {
                await vscode.workspace.fs.createDirectory(steeringDirUri);
            } catch {
                // Directory might already exist, ignore error
            }

            // Create subdirectory if needed (createDirectory is idempotent)
            if (dirPath) {
                await vscode.workspace.fs.createDirectory(targetDirUri);
            }

            // Download document content
            let content = await this.fetchDocumentContent(doc.path);

            // Apply inclusion mode if specified
            if (inclusionMode) {
                content = this.frontmatterService.updateInclusionMode(content, inclusionMode, fileMatchPattern);
            }

            // Add SHA to frontmatter for version tracking
            const { frontmatter, body } = this.frontmatterService.parse(content);
            frontmatter.sha = doc.sha;
            content = this.frontmatterService.stringify(frontmatter, body);

            // Save document
            const contentBuffer = Buffer.from(content, 'utf-8');
            await vscode.workspace.fs.writeFile(fileUri, contentBuffer);

            // Show success notification
            vscode.window.showInformationMessage(`Document "${doc.name}" installed successfully`);
        } catch (error) {
            if (error instanceof ExtensionError) {
                throw error;
            }
            throw new ExtensionError(
                `Failed to install document: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ErrorCode.FILE_SYSTEM_ERROR,
                false
            );
        }
    }

    /**
     * Quick load a document - install with 'always' inclusion mode
     * @param doc Document metadata
     */
    async quickLoadDocument(doc: DocumentMetadata): Promise<void> {
        await this.installDocument(doc, 'always');
        vscode.window.showInformationMessage(
            `Document "${doc.name}" is now active in Kiro's agent context`
        );
    }

    /**
     * Uninstall a document by removing it from the local steering directory
     * @param docPath Document relative path (e.g., "agents/bmad-spec-converter.md" or "tech.md")
     */
    async uninstallDocument(docPath: string): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new ExtensionError(
                'No workspace folder open',
                ErrorCode.FILE_SYSTEM_ERROR,
                false
            );
        }

        // Resolve relative path to full URI under .kiro/steering/
        const steeringDirUri = vscode.Uri.joinPath(workspaceFolder.uri, this.STEERING_DIR);
        const fileUri = vscode.Uri.joinPath(steeringDirUri, docPath);

        try {
            // Check if file exists before attempting to delete
            await vscode.workspace.fs.stat(fileUri);
            
            // Delete the file from correct subdirectory location
            await vscode.workspace.fs.delete(fileUri);

            // Extract filename for display message
            const fileName = docPath.split('/').pop() || docPath;
            
            // Show success notification
            vscode.window.showInformationMessage(`Document "${fileName}" uninstalled successfully`);
        } catch (error) {
            if (error instanceof vscode.FileSystemError) {
                // Extract filename for error message
                const fileName = docPath.split('/').pop() || docPath;
                throw new ExtensionError(
                    `Document "${fileName}" not found`,
                    ErrorCode.NOT_FOUND,
                    false
                );
            }
            throw new ExtensionError(
                `Failed to uninstall document: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ErrorCode.FILE_SYSTEM_ERROR,
                false
            );
        }
    }

    /**
     * Set the inclusion mode for an installed document
     * @param docPath Document relative path (e.g., "agents/bmad-spec-converter.md" or "tech.md")
     * @param mode Inclusion mode to set
     * @param fileMatchPattern Optional file match pattern (required if mode is 'fileMatch')
     */
    async setInclusionMode(
        docPath: string,
        mode: 'always' | 'manual' | 'fileMatch',
        fileMatchPattern?: string
    ): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new ExtensionError(
                'No workspace folder open',
                ErrorCode.FILE_SYSTEM_ERROR,
                false
            );
        }

        // Resolve relative path to full URI under .kiro/steering/
        const steeringDirUri = vscode.Uri.joinPath(workspaceFolder.uri, this.STEERING_DIR);
        const fileUri = vscode.Uri.joinPath(steeringDirUri, docPath);

        try {
            // Read current content
            const content = await vscode.workspace.fs.readFile(fileUri);
            const contentStr = Buffer.from(content).toString('utf-8');

            // Update inclusion mode
            const updatedContent = this.frontmatterService.updateInclusionMode(
                contentStr,
                mode,
                fileMatchPattern
            );

            // Write back to file
            const contentBuffer = Buffer.from(updatedContent, 'utf-8');
            await vscode.workspace.fs.writeFile(fileUri, contentBuffer);

            // Extract filename for display message
            const fileName = docPath.split('/').pop() || docPath;
            vscode.window.showInformationMessage(
                `Inclusion mode for "${fileName}" set to "${mode}"`
            );
        } catch (error) {
            if (error instanceof vscode.FileSystemError) {
                throw new ExtensionError(
                    `Document "${docPath}" not found`,
                    ErrorCode.NOT_FOUND,
                    false
                );
            }
            throw new ExtensionError(
                `Failed to update inclusion mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ErrorCode.FILE_SYSTEM_ERROR,
                false
            );
        }
    }

    /**
     * Get the inclusion mode for an installed document
     * @param docPath Document relative path (e.g., "agents/bmad-spec-converter.md" or "tech.md")
     * @returns Inclusion mode or undefined if not set
     */
    async getInclusionMode(docPath: string): Promise<string | undefined> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return undefined;
        }

        // Resolve relative path to full URI under .kiro/steering/
        const steeringDirUri = vscode.Uri.joinPath(workspaceFolder.uri, this.STEERING_DIR);
        const fileUri = vscode.Uri.joinPath(steeringDirUri, docPath);

        try {
            const content = await vscode.workspace.fs.readFile(fileUri);
            const contentStr = Buffer.from(content).toString('utf-8');
            return this.frontmatterService.getInclusionMode(contentStr);
        } catch {
            return undefined;
        }
    }

    /**
     * Check for updates to installed documents
     * @returns Array of update information for documents with available updates
     */
    async checkForUpdates(): Promise<UpdateInfo[]> {
        const [remoteDocuments, installedDocuments] = await Promise.all([
            this.fetchDocumentList(),
            this.getInstalledDocuments()
        ]);

        const updates: UpdateInfo[] = [];

        for (const installed of installedDocuments) {
            // Find matching remote document by path (not just name)
            // This ensures documents with the same name in different folders are treated as different documents
            const remote = remoteDocuments.find(doc => doc.path === installed.path);
            
            if (remote && remote.sha !== installed.sha) {
                updates.push({
                    document: remote,
                    currentVersion: installed.version,
                    newVersion: remote.version
                });
            }
        }

        return updates;
    }

    /**
     * Update an installed document to the latest version
     * @param doc Document metadata for the new version
     */
    async updateDocument(doc: DocumentMetadata): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new ExtensionError(
                'No workspace folder open',
                ErrorCode.FILE_SYSTEM_ERROR,
                false
            );
        }

        const steeringDirUri = vscode.Uri.joinPath(workspaceFolder.uri, this.STEERING_DIR);
        
        // Extract directory path from doc.path to locate the document in the same subdirectory
        const dirPath = this.getRelativePath(doc.path);
        
        // Construct file URI using the relative path from doc.path
        let fileUri: vscode.Uri;
        if (dirPath) {
            // Document is in a subdirectory
            fileUri = vscode.Uri.joinPath(steeringDirUri, dirPath, doc.name);
        } else {
            // Root-level document
            fileUri = vscode.Uri.joinPath(steeringDirUri, doc.name);
        }

        try {
            // Read current document to preserve inclusion mode
            const currentContent = await vscode.workspace.fs.readFile(fileUri);
            const currentContentStr = Buffer.from(currentContent).toString('utf-8');
            const { frontmatter: currentFrontmatter } = this.frontmatterService.parse(currentContentStr);
            
            const currentInclusionMode = currentFrontmatter.inclusion as 'always' | 'manual' | 'fileMatch' | undefined;
            const currentFileMatchPattern = currentFrontmatter.fileMatchPattern;

            // Download new content
            let newContent = await this.fetchDocumentContent(doc.path);

            // Preserve inclusion mode if it was set
            if (currentInclusionMode) {
                newContent = this.frontmatterService.updateInclusionMode(
                    newContent,
                    currentInclusionMode,
                    currentFileMatchPattern
                );
            }

            // Add SHA to frontmatter for version tracking
            const { frontmatter, body } = this.frontmatterService.parse(newContent);
            frontmatter.sha = doc.sha;
            newContent = this.frontmatterService.stringify(frontmatter, body);

            // Write updated content to the same subdirectory location
            const contentBuffer = Buffer.from(newContent, 'utf-8');
            await vscode.workspace.fs.writeFile(fileUri, contentBuffer);

            vscode.window.showInformationMessage(
                `Document "${doc.name}" updated successfully to version ${doc.version}`
            );
        } catch (error) {
            if (error instanceof ExtensionError) {
                throw error;
            }
            throw new ExtensionError(
                `Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ErrorCode.FILE_SYSTEM_ERROR,
                false
            );
        }
    }
}

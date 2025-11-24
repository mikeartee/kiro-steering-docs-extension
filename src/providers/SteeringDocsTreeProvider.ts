import * as vscode from 'vscode';
import { DocumentService } from '../services/DocumentService';
import { DocumentMetadata, InstalledDocument, CategoryDefinition } from '../models/types';

/**
 * Tree item types for the steering documents tree view
 */
type TreeItem = CategoryTreeItem | FolderTreeItem | DocumentTreeItem;

/**
 * Category node in the tree
 */
interface CategoryTreeItem {
    type: 'category';
    id: string;
    label: string;
    description: string;
}

/**
 * Folder node in the tree
 */
interface FolderTreeItem {
    type: 'folder';
    categoryId: string;
    path: string;
    label: string;
    parentPath?: string;
}

/**
 * Document node in the tree
 */
interface DocumentTreeItem {
    type: 'document';
    metadata: DocumentMetadata;
    installed?: InstalledDocument;
    hasUpdate: boolean;
}

/**
 * Tree data provider for steering documents
 */
export class SteeringDocsTreeProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private showActiveOnly = false;
    private categories: CategoryDefinition[] = [];
    private remoteDocuments: DocumentMetadata[] = [];
    private installedDocuments: InstalledDocument[] = [];
    private isOffline = false;

    constructor(private readonly documentService: DocumentService) {}

    /**
     * Refresh the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Get current filter state
     */
    getShowActiveOnly(): boolean {
        return this.showActiveOnly;
    }

    /**
     * Set filter to show only active documents
     */
    setShowActiveOnly(value: boolean): void {
        this.showActiveOnly = value;
        this.refresh();
    }

    /**
     * Get tree item representation for VS Code
     */
    getTreeItem(element: TreeItem): vscode.TreeItem {
        if (element.type === 'category') {
            return this.createCategoryTreeItem(element);
        } else if (element.type === 'folder') {
            return this.createFolderTreeItem(element);
        } else {
            return this.createDocumentTreeItem(element);
        }
    }

    /**
     * Get children for a tree item
     */
    async getChildren(element?: TreeItem): Promise<TreeItem[]> {
        if (!element) {
            // Root level - return categories
            return this.getRootItems();
        }

        if (element.type === 'category') {
            // Return top-level folders and documents in this category
            const documents = await this.getDocumentsForCategory(element.id);
            // Filter to only DocumentTreeItem types for buildFolderHierarchy
            const documentItems = documents.filter((item): item is DocumentTreeItem => item.type === 'document');
            return this.buildFolderHierarchy(element.id, documentItems);
        }

        if (element.type === 'folder') {
            // Return child folders and documents within this folder
            return this.getChildrenForFolder(element.categoryId, element.path);
        }

        // Document nodes have no children
        return [];
    }

    /**
     * Get root level items (categories or error message)
     */
    private async getRootItems(): Promise<TreeItem[]> {
        try {
            // Fetch data
            await this.fetchData();

            // Return categories that have documents
            const categoryItems: TreeItem[] = [];
            
            for (const category of this.categories) {
                const docs = await this.getDocumentsForCategory(category.id);
                if (docs.length > 0) {
                    categoryItems.push({
                        type: 'category',
                        id: category.id,
                        label: category.label,
                        description: category.description
                    });
                }
            }

            return categoryItems;
        } catch (error) {
            // Return empty array on error - errors will be shown via notifications
            console.error('Failed to load steering documents:', error);
            return [];
        }
    }

    /**
     * Get documents for a specific category
     */
    private async getDocumentsForCategory(categoryId: string): Promise<TreeItem[]> {
        const categoryDocs = this.remoteDocuments.filter(doc => doc.category === categoryId);
        const documentItems: TreeItem[] = [];

        for (const doc of categoryDocs) {
            // Find matching installed document by path instead of name
            const installed = this.installedDocuments.find(inst => inst.path === doc.path);

            // Check if document has an update
            const hasUpdate = installed ? installed.sha !== doc.sha : false;

            // Apply active filter if enabled
            if (this.showActiveOnly) {
                const isActive = installed?.inclusionMode === 'always';
                if (!isActive) {
                    continue;
                }
            }

            documentItems.push({
                type: 'document',
                metadata: doc,
                installed,
                hasUpdate
            });
        }

        return documentItems;
    }

    /**
     * Fetch data from document service
     */
    private async fetchData(): Promise<void> {
        try {
            // Fetch remote documents and installed documents in parallel
            const [remote, installed] = await Promise.all([
                this.documentService.fetchDocumentList(),
                this.documentService.getInstalledDocuments()
            ]);

            this.remoteDocuments = remote;
            this.installedDocuments = installed;
            this.isOffline = false;

            // Extract unique categories from documents
            const categoryMap = new Map<string, CategoryDefinition>();
            for (const doc of remote) {
                if (!categoryMap.has(doc.category)) {
                    categoryMap.set(doc.category, {
                        id: doc.category,
                        label: this.formatCategoryLabel(doc.category),
                        description: ''
                    });
                }
            }
            this.categories = Array.from(categoryMap.values());
        } catch (error) {
            // Mark as offline if fetch fails
            this.isOffline = true;
            throw error;
        }
    }

    /**
     * Format category ID to a readable label
     */
    private formatCategoryLabel(categoryId: string): string {
        return categoryId
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Extract folder path from a document path
     * Returns the immediate parent folder path, or null if document is at root level
     * 
     * @param documentPath - The full document path (e.g., "languages/typescript-formatting.md")
     * @returns The folder path (e.g., "languages") or null for root-level documents
     * 
     * @example
     * extractFolderPath("languages/typescript-formatting.md") // returns "languages"
     * extractFolderPath("code-quality/patterns/api.md") // returns "code-quality/patterns"
     * extractFolderPath("tech.md") // returns null
     */
    private extractFolderPath(documentPath: string): string | null {
        const lastSlashIndex = documentPath.lastIndexOf('/');
        if (lastSlashIndex === -1) {
            // No slash found - document is at root level
            return null;
        }
        // Return everything before the last slash
        return documentPath.substring(0, lastSlashIndex);
    }

    /**
     * Build folder hierarchy from a flat list of documents
     * Creates folder nodes for each unique directory level in document paths
     * Supports arbitrary nesting depth without hardcoded limits
     * 
     * @param categoryId - The category ID these documents belong to
     * @param documents - Flat list of document tree items
     * @returns Hierarchical list of folders and root-level documents
     * 
     * @example
     * Input documents with paths:
     *   - "languages/typescript-formatting.md"
     *   - "languages/python-formatting.md"
     *   - "data-formats/json-formatting.md"
     *   - "tech.md"
     * 
     * Output tree items:
     *   - FolderTreeItem { path: "data-formats", label: "data-formats" }
     *   - FolderTreeItem { path: "languages", label: "languages" }
     *   - DocumentTreeItem { path: "tech.md" }
     */
    private buildFolderHierarchy(categoryId: string, documents: DocumentTreeItem[]): TreeItem[] {
        const items: TreeItem[] = [];
        const folderSet = new Set<string>();

        // Extract all unique folder paths from documents
        for (const doc of documents) {
            // Strip category prefix from path to avoid redundant folder levels
            let pathToProcess = doc.metadata.path;
            const categoryPrefix = categoryId + '/';
            if (pathToProcess.startsWith(categoryPrefix)) {
                pathToProcess = pathToProcess.substring(categoryPrefix.length);
            }
            
            const folderPath = this.extractFolderPath(pathToProcess);
            
            if (folderPath !== null) {
                // Document is in a folder - track all folder levels
                const parts = folderPath.split('/');
                
                // Add all folder levels (e.g., for "a/b/c", add "a", "a/b", and "a/b/c")
                for (let i = 1; i <= parts.length; i++) {
                    const currentPath = parts.slice(0, i).join('/');
                    folderSet.add(currentPath);
                }
            }
        }

        // Create folder tree items for all unique folder paths
        for (const folderPath of folderSet) {
            const parts = folderPath.split('/');
            const label = parts[parts.length - 1]; // Last part is the folder name
            const parentPath = parts.length > 1 ? parts.slice(0, -1).join('/') : undefined;

            items.push({
                type: 'folder',
                categoryId,
                path: folderPath,
                label,
                parentPath
            });
        }

        // Add root-level documents (documents without a folder path after stripping category prefix)
        for (const doc of documents) {
            // Strip category prefix from path
            let pathToProcess = doc.metadata.path;
            const categoryPrefix = categoryId + '/';
            if (pathToProcess.startsWith(categoryPrefix)) {
                pathToProcess = pathToProcess.substring(categoryPrefix.length);
            }
            
            const folderPath = this.extractFolderPath(pathToProcess);
            if (folderPath === null) {
                items.push(doc);
            }
        }    

        // Sort: folders first (alphabetically), then documents (alphabetically)
        return items.sort((a, b) => {
            // Folders before documents
            if (a.type === 'folder' && b.type !== 'folder') {
                return -1;
            }
            if (a.type !== 'folder' && b.type === 'folder') {
                return 1;
            }

            // Both are folders or both are documents - sort alphabetically
            if (a.type === 'folder' && b.type === 'folder') {
                return a.label.localeCompare(b.label);
            }
            if (a.type === 'document' && b.type === 'document') {
                return a.metadata.name.localeCompare(b.metadata.name);
            }

            return 0;
        });
    }

    /**
     * Get children (subfolders and documents) for a specific folder
     * 
     * @param categoryId - The category ID
     * @param folderPath - The folder path (e.g., "languages" or "code-quality/patterns")
     * @returns List of child folders and documents within this folder
     * 
     * @example
     * For folderPath "languages" with documents:
     *   - "languages/typescript-formatting.md"
     *   - "languages/python-formatting.md"
     *   - "languages/advanced/generics.md"
     * 
     * Returns:
     *   - FolderTreeItem { path: "languages/advanced", label: "advanced" }
     *   - DocumentTreeItem { path: "languages/typescript-formatting.md" }
     *   - DocumentTreeItem { path: "languages/python-formatting.md" }
     */
    private getChildrenForFolder(categoryId: string, folderPath: string): TreeItem[] {
        const items: TreeItem[] = [];
        const childFolders = new Set<string>();

        // Get all documents in this category
        const categoryDocs = this.remoteDocuments.filter(doc => doc.category === categoryId);

        // Find documents and subfolders that are direct children of this folder
        for (const doc of categoryDocs) {
            // Strip category prefix from document path
            let docPath = doc.path;
            const categoryPrefix = categoryId + '/';
            if (docPath.startsWith(categoryPrefix)) {
                docPath = docPath.substring(categoryPrefix.length);
            }

            // Check if document is within this folder
            if (docPath.startsWith(folderPath + '/')) {
                // Get the relative path from the folder
                const relativePath = docPath.substring(folderPath.length + 1);
                const slashIndex = relativePath.indexOf('/');

                if (slashIndex === -1) {
                    // Document is a direct child of this folder
                    const installed = this.installedDocuments.find(inst => inst.path === doc.path);
                    const hasUpdate = installed ? installed.sha !== doc.sha : false;

                    // Apply active filter if enabled
                    if (this.showActiveOnly) {
                        const isActive = installed?.inclusionMode === 'always';
                        if (!isActive) {
                            continue;
                        }
                    }

                    items.push({
                        type: 'document',
                        metadata: doc,
                        installed,
                        hasUpdate
                    });
                } else {
                    // Document is in a subfolder - track the subfolder
                    const subfolderName = relativePath.substring(0, slashIndex);
                    const subfolderPath = folderPath + '/' + subfolderName;
                    childFolders.add(subfolderPath);
                }
            }
        }

        // Create folder tree items for subfolders
        for (const subfolderPath of childFolders) {
            const parts = subfolderPath.split('/');
            const label = parts[parts.length - 1];

            items.push({
                type: 'folder',
                categoryId,
                path: subfolderPath,
                label,
                parentPath: folderPath
            });
        }

        // Sort: folders first (alphabetically), then documents (alphabetically)
        return items.sort((a, b) => {
            // Folders before documents
            if (a.type === 'folder' && b.type !== 'folder') {
                return -1;
            }
            if (a.type !== 'folder' && b.type === 'folder') {
                return 1;
            }

            // Both are folders or both are documents - sort alphabetically
            if (a.type === 'folder' && b.type === 'folder') {
                return a.label.localeCompare(b.label);
            }
            if (a.type === 'document' && b.type === 'document') {
                return a.metadata.name.localeCompare(b.metadata.name);
            }

            return 0;
        });
    }

    /**
     * Create VS Code tree item for a category
     */
    private createCategoryTreeItem(category: CategoryTreeItem): vscode.TreeItem {
        const item = new vscode.TreeItem(category.label, vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = category.description || category.label;
        item.contextValue = 'category';
        item.iconPath = new vscode.ThemeIcon('folder');
        return item;
    }

    /**
     * Create VS Code tree item for a folder
     */
    private createFolderTreeItem(folder: FolderTreeItem): vscode.TreeItem {
        const item = new vscode.TreeItem(folder.label, vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = folder.path;
        item.contextValue = 'folder';
        item.iconPath = new vscode.ThemeIcon('folder');
        return item;
    }

    /**
     * Create VS Code tree item for a document
     */
    private createDocumentTreeItem(doc: DocumentTreeItem): vscode.TreeItem {
        const item = new vscode.TreeItem(doc.metadata.name, vscode.TreeItemCollapsibleState.None);
        
        // Set description (shown next to label)
        item.description = doc.metadata.version;

        // Set tooltip with full information
        item.tooltip = this.createDocumentTooltip(doc);

        // Set context value for command enablement
        item.contextValue = this.getDocumentContextValue(doc);

        // Set icon based on status
        item.iconPath = this.getDocumentIcon(doc);

        // Make the item clickable - clicking toggles the document
        item.command = {
            command: 'steeringDocs.toggle',
            title: 'Toggle Document',
            arguments: [{ metadata: doc.metadata }]
        };

        return item;
    }

    /**
     * Create tooltip for a document
     */
    private createDocumentTooltip(doc: DocumentTreeItem): string {
        const lines: string[] = [
            doc.metadata.description || doc.metadata.name,
            `Version: ${doc.metadata.version}`,
            `Category: ${doc.metadata.category}`
        ];

        if (doc.installed) {
            lines.push(`Installed: ${doc.installed.installedAt.toLocaleDateString()}`);
            
            if (doc.installed.inclusionMode) {
                lines.push(`Inclusion: ${doc.installed.inclusionMode}`);
                
                if (doc.installed.inclusionMode === 'fileMatch' && doc.installed.fileMatchPattern) {
                    lines.push(`Pattern: ${doc.installed.fileMatchPattern}`);
                }
            }
        }

        if (doc.hasUpdate) {
            lines.push('⚠️ Update available');
        }

        if (this.isOffline) {
            lines.push('📡 Offline mode - using cached data');
        }

        return lines.join('\n');
    }

    /**
     * Get context value for command enablement
     */
    private getDocumentContextValue(doc: DocumentTreeItem): string {
        // Simplified context values for toggle functionality
        if (doc.installed) {
            // Document is installed - show as "on" state
            return 'document-installed';
        } else {
            // Document is not installed - show as "off" state
            return 'document-not-installed';
        }
    }

    /**
     * Get icon for a document based on its status
     */
    private getDocumentIcon(doc: DocumentTreeItem): vscode.ThemeIcon {
        if (!doc.installed) {
            // Not installed - show outline circle
            return new vscode.ThemeIcon('circle-outline');
        }

        // Installed - show colored dot based on inclusion mode
        switch (doc.installed.inclusionMode) {
            case 'always':
                // Green dot for always-included documents
                return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
            case 'fileMatch':
                // Yellow dot for file-match documents
                return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.yellow'));
            case 'manual':
                // Blue dot for manual documents
                return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.blue'));
            default:
                // Fallback to green for unknown modes
                return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
        }
    }
}

import * as vscode from 'vscode';
import { DocumentService } from '../services/DocumentService';
import { DocumentMetadata, InstalledDocument, CategoryDefinition } from '../models/types';

/**
 * Tree item types for the steering documents tree view
 */
type TreeItem = CategoryTreeItem | DocumentTreeItem;

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
            // Return documents in this category
            return this.getDocumentsForCategory(element.id);
        }

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
            // Find matching installed document
            const installed = this.installedDocuments.find(inst => inst.name === doc.name);

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

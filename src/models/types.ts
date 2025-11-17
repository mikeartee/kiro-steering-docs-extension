/**
 * Metadata about a steering document from the GitHub repository
 */
export interface DocumentMetadata {
    name: string;
    path: string;
    category: string;
    version: string;
    description: string;
    sha: string;
    size: number;
    downloadUrl: string;
}

/**
 * Information about an installed steering document
 */
export interface InstalledDocument {
    name: string;
    path: string;
    version: string;
    installedAt: Date;
    sha: string;
    inclusionMode?: 'always' | 'manual' | 'fileMatch';
    fileMatchPattern?: string;
}

/**
 * Category tree item for organizing documents
 */
export interface CategoryTreeItem {
    type: 'category';
    label: string;
    children: DocumentTreeItem[];
}

/**
 * Document tree item representing a steering document
 */
export interface DocumentTreeItem {
    type: 'document';
    label: string;
    category: string;
    path: string;
    version: string;
    description: string;
    isInstalled: boolean;
    hasUpdate: boolean;
    inclusionMode?: 'always' | 'manual' | 'fileMatch';
    isActive: boolean;
}

/**
 * Update information for a document
 */
export interface UpdateInfo {
    document: DocumentMetadata;
    currentVersion: string;
    newVersion: string;
}

/**
 * GitHub API content response
 */
export interface GitHubContent {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    html_url: string;
    git_url: string;
    download_url: string;
    type: 'file' | 'dir';
    content?: string;
    encoding?: string;
}

/**
 * Category definition from categories.json
 */
export interface CategoryDefinition {
    id: string;
    label: string;
    description: string;
}

/**
 * Error codes for extension errors
 */
export enum ErrorCode {
    NETWORK_ERROR = 'NETWORK_ERROR',
    FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
    PARSE_ERROR = 'PARSE_ERROR',
    NOT_FOUND = 'NOT_FOUND'
}

/**
 * Custom error class for extension errors
 */
export class ExtensionError extends Error {
    constructor(
        message: string,
        public code: ErrorCode,
        public recoverable: boolean
    ) {
        super(message);
        this.name = 'ExtensionError';
    }
}

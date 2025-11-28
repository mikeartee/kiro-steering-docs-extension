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
    // Optional recommendation fields
    tags?: string[];
    applicableTo?: string[];
    requiredDependencies?: string[];
    filePatterns?: string[];
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

// ============================================================================
// Recommendation System Types
// ============================================================================

/**
 * Project type classification
 */
export enum ProjectType {
    WEB_APP = 'web-app',
    LIBRARY = 'library',
    CLI_TOOL = 'cli-tool',
    VSCODE_EXTENSION = 'vscode-extension',
    API_SERVER = 'api-server',
    UNKNOWN = 'unknown'
}

/**
 * Dependency category classification
 */
export enum DependencyCategory {
    FRAMEWORK = 'framework',
    TESTING = 'testing',
    BUILD = 'build',
    UTILITY = 'utility'
}

/**
 * Information about a detected framework
 */
export interface FrameworkInfo {
    name: string;
    version: string;
    confidence: number;
}

/**
 * Information about a project dependency
 */
export interface DependencyInfo {
    name: string;
    version: string;
    isDev: boolean;
    category: DependencyCategory;
}

/**
 * Detected file pattern in workspace
 */
export interface FilePattern {
    pattern: string;
    count: number;
    significance: number;
}

/**
 * Complete workspace context for recommendations
 */
export interface WorkspaceContext {
    languages: string[];
    frameworks: FrameworkInfo[];
    dependencies: DependencyInfo[];
    filePatterns: FilePattern[];
    hasTests: boolean;
    projectType: ProjectType;
    installedDocs: string[];
}

/**
 * Reason why a document was recommended
 */
export interface MatchReason {
    type: 'framework' | 'dependency' | 'file-pattern' | 'language' | 'project-type';
    description: string;
    weight: number;
    details: string[];
}

/**
 * Document with relevance score and match reasons
 */
export interface ScoredDocument {
    document: DocumentMetadata;
    score: number;
    reasons: MatchReason[];
    isInstalled: boolean;
}

/**
 * Error codes for recommendation system
 */
export enum RecommendationErrorCode {
    NO_WORKSPACE = 'NO_WORKSPACE',
    ANALYSIS_FAILED = 'ANALYSIS_FAILED',
    FETCH_FAILED = 'FETCH_FAILED',
    INSTALL_FAILED = 'INSTALL_FAILED',
    WEBVIEW_FAILED = 'WEBVIEW_FAILED'
}

/**
 * Custom error class for recommendation errors
 */
export class RecommendationError extends Error {
    constructor(
        public code: RecommendationErrorCode,
        message: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'RecommendationError';
    }
}

/**
 * Scoring weights for different match factors
 */
export const SCORING_WEIGHTS = {
    FRAMEWORK_MATCH: 30,
    DEPENDENCY_MATCH: 20,
    FILE_PATTERN_MATCH: 15,
    LANGUAGE_MATCH: 10,
    PROJECT_TYPE_MATCH: 15,
    CATEGORY_MATCH: 10
} as const;
// ============================================================================
// Frontmatter Enhancement Types
// ============================================================================

/**
 * Location of a document in the repository
 */
export interface DocumentLocation {
  path: string;
  category: string;
  subcategory?: string;
}

/**
 * Parsed document with frontmatter and body separated
 */
export interface ParsedDocument {
  frontmatter: Record<string, any>;
  body: string;
  hasValidFrontmatter: boolean;
}

/**
 * Recommendation metadata to be added to documents
 */
export interface RecommendationMetadata {
  requiredDependencies?: string[];
  applicableTo?: ProjectType[];
  filePatterns?: string[];
  enhancedTags?: string[];
}

/**
 * Context for analyzing a document to determine metadata
 */
export interface AnalysisContext {
  documentPath: string;
  category: string;
  subcategory?: string;
  existingFrontmatter: Record<string, any>;
  bodyContent: string;
}

/**
 * Error codes for enhancement operations
 */
export enum EnhancementErrorCode {
  INVALID_YAML = 'INVALID_YAML',
  MISSING_FRONTMATTER = 'MISSING_FRONTMATTER',
  FILE_ACCESS_ERROR = 'FILE_ACCESS_ERROR',
  AMBIGUOUS_CATEGORY = 'AMBIGUOUS_CATEGORY',
  CONFLICTING_METADATA = 'CONFLICTING_METADATA'
}

/**
 * Custom error class for enhancement errors
 */
export class EnhancementError extends Error {
  constructor(
    public code: EnhancementErrorCode,
    public documentPath: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'EnhancementError';
  }
}

/**
 * Result of a write operation
 */
export interface WriteResult {
  success: boolean;
  path: string;
  error?: string;
}

/**
 * Metadata rule for determining document metadata
 */
export interface MetadataRule {
  condition: (context: AnalysisContext) => boolean;
  metadata: RecommendationMetadata | ((context: AnalysisContext) => RecommendationMetadata);
}

/**
 * Options for merging frontmatter
 */
export interface MergeOptions {
  preserveExisting: boolean;
  overwriteTags: boolean;
}

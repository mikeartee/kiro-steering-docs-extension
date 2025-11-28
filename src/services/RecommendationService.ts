import * as vscode from 'vscode';
import { DocumentService } from './DocumentService';
import { WorkspaceAnalysisCache } from './WorkspaceAnalysisCache';
import { DocumentMatcher } from './DocumentMatcher';
import {
    WorkspaceContext,
    ScoredDocument,
    DocumentMetadata,
    RecommendationError,
    RecommendationErrorCode
} from '../models/types';

/**
 * Options for recommendation requests
 */
export interface RecommendationOptions {
    maxResults?: number;
    includeInstalled?: boolean;
    minScore?: number;
}

/**
 * Service for orchestrating document recommendations
 */
export class RecommendationService {
    constructor(
        private readonly documentService: DocumentService,
        private readonly workspaceAnalysisCache: WorkspaceAnalysisCache,
        private readonly documentMatcher: DocumentMatcher
    ) {}

    /**
     * Gets document recommendations based on workspace context
     * @param options Optional configuration for recommendations
     * @returns Ranked list of scored documents
     * @throws RecommendationError if workspace analysis or document fetch fails
     */
    async getRecommendations(
        options?: RecommendationOptions
    ): Promise<ScoredDocument[]> {
        // Set default options
        const opts: Required<RecommendationOptions> = {
            maxResults: options?.maxResults ?? 10,
            includeInstalled: options?.includeInstalled ?? true,
            minScore: options?.minScore ?? 10
        };

        try {
            // Analyze workspace context
            const context = await this.analyzeWorkspace();

            // Fetch available documents
            const documents = await this.fetchAvailableDocuments();

            // Score and rank documents
            const scored = this.documentMatcher.rankDocuments(documents, context);

            // Filter and limit results
            const filtered = this.filterAndRank(scored, opts);

            return filtered;
        } catch (error) {
            if (error instanceof RecommendationError) {
                throw error;
            }
            throw new RecommendationError(
                RecommendationErrorCode.ANALYSIS_FAILED,
                'Failed to generate recommendations',
                error
            );
        }
    }

    /**
     * Analyzes the current workspace and returns context information
     * @returns Complete workspace context
     * @throws RecommendationError if no workspace is open or analysis fails
     */
    async analyzeWorkspace(): Promise<WorkspaceContext> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        
        if (!workspaceFolder) {
            throw new RecommendationError(
                RecommendationErrorCode.NO_WORKSPACE,
                'No workspace is currently open. Please open a workspace to get recommendations.'
            );
        }

        try {
            // Use WorkspaceAnalysisCache to get context (with caching)
            const context = await this.workspaceAnalysisCache.analyze(workspaceFolder.uri.fsPath);

            // Get installed documents from DocumentService
            const installedDocs = await this.documentService.getInstalledDocuments();
            context.installedDocs = installedDocs.map(doc => doc.name);

            return context;
        } catch (error) {
            if (error instanceof RecommendationError) {
                throw error;
            }
            throw new RecommendationError(
                RecommendationErrorCode.ANALYSIS_FAILED,
                'Failed to analyze workspace context',
                error
            );
        }
    }

    /**
     * Fetches available documents from the repository
     * @returns Array of document metadata
     * @throws RecommendationError if document fetch fails
     */
    private async fetchAvailableDocuments(): Promise<DocumentMetadata[]> {
        try {
            return await this.documentService.fetchDocumentList();
        } catch (error) {
            // Try to use cached documents as fallback
            try {
                // DocumentService already handles cache fallback internally
                // If we reach here, both fetch and cache failed
                throw new RecommendationError(
                    RecommendationErrorCode.FETCH_FAILED,
                    'Failed to fetch document list. Please check your network connection and try again.',
                    error
                );
            } catch (cacheError) {
                throw new RecommendationError(
                    RecommendationErrorCode.FETCH_FAILED,
                    'Failed to fetch document list. Please check your network connection and try again.',
                    error
                );
            }
        }
    }

    /**
     * Filters and ranks scored documents based on options
     * @param scored Scored documents
     * @param options Recommendation options
     * @returns Filtered and limited results
     */
    private filterAndRank(
        scored: ScoredDocument[],
        options: Required<RecommendationOptions>
    ): ScoredDocument[] {
        let filtered = scored;

        // Filter by minimum score
        filtered = filtered.filter(doc => doc.score >= options.minScore);

        // Filter out installed documents if requested
        if (!options.includeInstalled) {
            filtered = filtered.filter(doc => !doc.isInstalled);
        }

        // Limit to maxResults
        if (filtered.length > options.maxResults) {
            filtered = filtered.slice(0, options.maxResults);
        }

        return filtered;
    }
}


import * as vscode from 'vscode';
import { RecommendationService } from '../services/RecommendationService';
import { RecommendationPanel } from '../providers/RecommendationPanel';
import { ScoredDocument, RecommendationError, RecommendationErrorCode, DocumentMetadata, InstalledDocument } from '../models/types';
import { DocumentService } from '../services/DocumentService';

/**
 * Quick Pick item for a recommendation
 */
interface RecommendationQuickPickItem extends vscode.QuickPickItem {
    scoredDocument?: ScoredDocument;
    isViewAll?: boolean;
}

/**
 * Handle the recommend documents command
 * @param _context Extension context (unused)
 * @param recommendationService Recommendation service instance
 * @param _recommendationPanel Recommendation panel instance (unused - kept for compatibility)
 * @param documentService Document service instance for bulk activation
 */
export async function recommendDocuments(
    _context: vscode.ExtensionContext,
    recommendationService: RecommendationService,
    _recommendationPanel: RecommendationPanel,
    documentService: DocumentService
): Promise<void> {
    console.log('[RECOMMEND] Command triggered!');
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing workspace...',
            cancellable: true
        },
        async (progress, token) => {
            try {
                // Check for cancellation
                if (token.isCancellationRequested) {
                    return;
                }

                // Step 1: Analyze workspace
                progress.report({ message: 'Analyzing workspace context...', increment: 10 });
                
                let recommendations: ScoredDocument[];
                try {
                    // Update progress during analysis
                    progress.report({ message: 'Scanning dependencies...', increment: 20 });
                    
                    recommendations = await recommendationService.getRecommendations();
                    
                    // Update progress after fetching
                    progress.report({ message: 'Scoring documents...', increment: 40 });
                } catch (error) {
                    if (error instanceof RecommendationError) {
                        if (error.code === RecommendationErrorCode.NO_WORKSPACE) {
                            vscode.window.showErrorMessage(error.message);
                            return;
                        }
                        if (error.code === RecommendationErrorCode.ANALYSIS_FAILED) {
                            vscode.window.showErrorMessage(
                                `Failed to analyze workspace: ${error.message}`
                            );
                            return;
                        }
                        if (error.code === RecommendationErrorCode.FETCH_FAILED) {
                            vscode.window.showErrorMessage(
                                `Failed to fetch documents: ${error.message}`
                            );
                            return;
                        }
                    }
                    // Generic error
                    const message = error instanceof Error ? error.message : 'Unknown error';
                    vscode.window.showErrorMessage(
                        `Failed to generate recommendations: ${message}`
                    );
                    return;
                }

                // Check for cancellation
                if (token.isCancellationRequested) {
                    return;
                }

                // Step 2: Show Quick Pick
                progress.report({ message: 'Preparing recommendations...', increment: 30 });

                // Get installed documents for state indicators
                const installedDocs = await documentService.getInstalledDocuments();

                const selectedDocs = await showRecommendationQuickPick(recommendations);

                if (!selectedDocs || selectedDocs.length === 0) {
                    return; // User cancelled
                }

                // Step 3: Bulk activate all selected documents with smart defaults
                await bulkActivateDocuments(selectedDocs, documentService, installedDocs);

            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(
                    `An unexpected error occurred: ${message}`
                );
            }
        }
    );
}

/**
 * Show Quick Pick UI with recommendations (multi-select enabled)
 * @param recommendations Scored documents to display
 * @returns Selected scored documents array or undefined if cancelled
 */
async function showRecommendationQuickPick(
    recommendations: ScoredDocument[]
): Promise<ScoredDocument[] | undefined> {
    // Handle empty recommendations
    if (recommendations.length === 0) {
        vscode.window.showInformationMessage(
            'No recommendations found for your workspace. Try installing some popular documents from the Steering Docs Browser.'
        );
        return undefined;
    }

    // Create Quick Pick with multi-select enabled
    const quickPick = vscode.window.createQuickPick<RecommendationQuickPickItem>();
    quickPick.canSelectMany = true;
    quickPick.title = '✨ Recommended Steering Documents';
    quickPick.placeholder = 'Tab to select multiple, Enter to activate selected documents';

    // Build items - clean and simple
    const items = recommendations.map(scored => {
        // Get brief reason (first reason's description)
        const briefReason = scored.reasons.length > 0
            ? scored.reasons[0].description
            : 'Recommended for your project';

        return {
            label: scored.document.name,
            description: briefReason,
            detail: scored.document.description,
            scoredDocument: scored,
            picked: false
        };
    });

    quickPick.items = items;

    return new Promise((resolve) => {
        quickPick.onDidAccept(() => {
            const selected = quickPick.selectedItems.map(item => item.scoredDocument!);
            quickPick.dispose();
            resolve(selected.length > 0 ? selected : undefined);
        });

        quickPick.onDidHide(() => {
            quickPick.dispose();
            resolve(undefined);
        });

        quickPick.show();
    });
}

/**
 * Bulk activate multiple documents with smart default inclusion modes
 * @param documents Documents to activate
 * @param documentService Document service instance
 * @param installedDocs Currently installed documents
 */
async function bulkActivateDocuments(
    documents: ScoredDocument[],
    documentService: DocumentService,
    installedDocs: InstalledDocument[]
): Promise<void> {
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Activating ${documents.length} documents...`,
            cancellable: false
        },
        async (progress) => {
            let activated = 0;

            for (const scored of documents) {
                // Skip if already installed
                const isInstalled = installedDocs.some(d => d.path === scored.document.path);
                if (isInstalled) {
                    continue;
                }

                // Determine smart default inclusion mode
                const inclusionMode = getSmartInclusionMode(scored.document);
                const filePattern = inclusionMode === 'fileMatch'
                    ? scored.document.filePatterns?.[0]
                    : undefined;

                await documentService.installDocument(
                    scored.document,
                    inclusionMode,
                    filePattern
                );

                activated++;
                progress.report({
                    increment: (100 / documents.length),
                    message: `${activated}/${documents.length}`
                });
            }

            vscode.window.showInformationMessage(
                `✓ Activated ${activated} steering document${activated === 1 ? '' : 's'}`
            );
        }
    );
}

/**
 * Determine smart default inclusion mode based on document metadata
 * @param doc Document metadata
 * @returns Recommended inclusion mode
 */
function getSmartInclusionMode(
    doc: DocumentMetadata
): 'always' | 'fileMatch' | 'manual' {
    // Check if document has filePatterns in metadata
    if (doc.filePatterns && doc.filePatterns.length > 0) {
        return 'fileMatch';
    }

    // Check if document tags suggest file-specific usage
    if (doc.tags?.some(tag =>
        tag.toLowerCase().includes('testing') ||
        tag.toLowerCase().includes('lint') ||
        tag.toLowerCase().includes('format')
    )) {
        return 'fileMatch';
    }

    // Default to always for general guidance docs
    return 'always';
}



// External libraries
import * as vscode from 'vscode';

// Internal modules
import { GitHubClient } from './services/GitHubClient';
import { CacheManager } from './services/CacheManager';
import { FrontmatterService } from './services/FrontmatterService';
import { DocumentService } from './services/DocumentService';
import { SteeringDocsTreeProvider } from './providers/SteeringDocsTreeProvider';
import { RecommendationPanel } from './providers/RecommendationPanel';
import { registerCommands } from './commands';
import { RecommendationService } from './services/RecommendationService';
import { WorkspaceAnalyzer } from './services/WorkspaceAnalyzer';
import { WorkspaceAnalysisCache } from './services/WorkspaceAnalysisCache';
import { DocumentMatcher } from './services/DocumentMatcher';
import { handleSetToken, handleClearToken, handleCheckTokenStatus } from './commands/tokenCommands';
import { TokenManager } from './services/TokenManager';
import { AuditLogger } from './services/AuditLogger';

export function activate(context: vscode.ExtensionContext): void {
    console.log('Kiro Steering Documents Browser is now active');

    // Get configuration
    const config = vscode.workspace.getConfiguration('steeringDocs');
    const repository = config.get<string>('repository', 'mikeartee/kiro-steering-docs');
    const branch = config.get<string>('branch', 'main');

    // Initialize AuditLogger and TokenManager first (required for secure token storage)
    const auditLogger = new AuditLogger();
    const tokenManager = new TokenManager(
        context.secrets,
        config,
        auditLogger,
        context.globalState
    );

    // Initialize GitHubClient with TokenManager.getToken as the TokenProvider
    // This enables dynamic token updates without service recreation (Req 5.1, 5.4)
    const githubClient = new GitHubClient(repository, branch, () => tokenManager.getToken());
    const cacheManager = new CacheManager(context.globalState);
    const frontmatterService = new FrontmatterService();
    const documentService = new DocumentService(githubClient, cacheManager, frontmatterService);

    // Create and register tree view provider
    const treeProvider = new SteeringDocsTreeProvider(documentService);
    const treeView = vscode.window.createTreeView('steeringDocsView', {
        treeDataProvider: treeProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);

    // Initialize recommendation services
    const workspaceAnalyzer = new WorkspaceAnalyzer();
    const workspaceAnalysisCache = new WorkspaceAnalysisCache(workspaceAnalyzer);
    const documentMatcher = new DocumentMatcher();
    const recommendationService = new RecommendationService(
        documentService,
        workspaceAnalysisCache,
        documentMatcher
    );
    const recommendationPanel = new RecommendationPanel(context.extensionUri, documentService);

    // Register cache for disposal
    context.subscriptions.push({
        dispose: () => workspaceAnalysisCache.dispose()
    });

    // Register all command handlers
    registerCommands(context, documentService, treeProvider, recommendationService, recommendationPanel);

    // Subscribe to token changes to refresh tree view (Req 5.2)
    // When token changes in SecretStorage, the TreeProvider refreshes to reflect new authentication state
    context.subscriptions.push(
        tokenManager.onTokenChange(() => {
            treeProvider.refresh();
        })
    );

    // Register token management commands
    // Command: steeringDocs.setToken - Securely set GitHub token
    context.subscriptions.push(
        vscode.commands.registerCommand('steeringDocs.setToken', async () => {
            await handleSetToken(tokenManager, treeProvider);
        })
    );

    // Command: steeringDocs.clearToken - Clear stored GitHub token
    context.subscriptions.push(
        vscode.commands.registerCommand('steeringDocs.clearToken', async () => {
            await handleClearToken(tokenManager, treeProvider);
        })
    );

    // Command: steeringDocs.checkTokenStatus - Check token configuration and validity
    context.subscriptions.push(
        vscode.commands.registerCommand('steeringDocs.checkTokenStatus', async () => {
            await handleCheckTokenStatus(tokenManager);
        })
    );

    // Add disposables for AuditLogger and TokenManager
    context.subscriptions.push({
        dispose: () => {
            auditLogger.dispose();
            tokenManager.dispose();
        }
    });

    // Optionally trigger auto-check for updates
    const autoCheckUpdates = config.get<boolean>('autoCheckUpdates', true);
    
    if (autoCheckUpdates) {
        // Check for updates in the background (don't await)
        documentService.checkForUpdates().then(async updates => {
            if (updates.length > 0) {
                // Build list of file names for the notification
                const fileNames = updates.map(u => u.document.name).join(', ');
                const message = updates.length === 1
                    ? `Update available: ${fileNames}`
                    : `${updates.length} updates available: ${fileNames}`;
                
                // Show notification with action button
                const action = await vscode.window.showInformationMessage(
                    message,
                    'View Updates'
                );
                
                if (action === 'View Updates') {
                    // Show Quick Pick with update options
                    const items = updates.map(u => ({
                        label: u.document.name,
                        description: `${u.currentVersion} -> ${u.newVersion}`,
                        detail: u.document.path,
                        update: u
                    }));
                    
                    const selected = await vscode.window.showQuickPick(items, {
                        placeHolder: 'Select documents to update',
                        canPickMany: true
                    });
                    
                    if (selected && selected.length > 0) {
                        for (const item of selected) {
                            try {
                                await documentService.updateDocument(item.update.document);
                            } catch (error) {
                                vscode.window.showErrorMessage(
                                    `Failed to update ${item.label}: ${error instanceof Error ? error.message : 'Unknown error'}`
                                );
                            }
                        }
                        treeProvider.refresh();
                    }
                }
            }
        }).catch(error => {
            // Silently fail - don't bother user on activation
            console.error('Failed to check for updates on activation:', error);
        });
    }
}

export function deactivate() {
    // Clean up resources if needed
}

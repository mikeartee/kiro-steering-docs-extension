import * as vscode from 'vscode';
import { GitHubClient } from './services/GitHubClient';
import { CacheManager } from './services/CacheManager';
import { FrontmatterService } from './services/FrontmatterService';
import { DocumentService } from './services/DocumentService';
import { SteeringDocsTreeProvider } from './providers/SteeringDocsTreeProvider';
import { registerCommands } from './commands';

export function activate(context: vscode.ExtensionContext) {
    console.log('Kiro Steering Documents Browser is now active');

    // Get configuration
    const config = vscode.workspace.getConfiguration('steeringDocs');
    const repository = config.get<string>('repository', 'mikeartee/kiro-steering-docs');
    const branch = config.get<string>('branch', 'main');

    // Initialize services
    const githubClient = new GitHubClient(repository, branch);
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

    // Register all command handlers
    registerCommands(context, documentService, treeProvider);

    // Optionally trigger auto-check for updates
    const autoCheckUpdates = config.get<boolean>('autoCheckUpdates', true);
    
    if (autoCheckUpdates) {
        // Check for updates in the background (don't await)
        documentService.checkForUpdates().then(updates => {
            if (updates.length > 0) {
                const message = updates.length === 1
                    ? '1 steering document has an update available'
                    : `${updates.length} steering documents have updates available`;
                vscode.window.showInformationMessage(message);
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

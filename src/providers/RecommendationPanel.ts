import * as vscode from 'vscode';
import { DocumentService } from '../services/DocumentService';
import { ScoredDocument, RecommendationError, RecommendationErrorCode, DocumentMetadata } from '../models/types';

/**
 * Webview panel for displaying recommendation details and installation
 */
export class RecommendationPanel {
    private panel: vscode.WebviewPanel | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly documentService: DocumentService
    ) {}

    /**
     * Show the recommendation panel with document details
     * @param recommendation Scored document to display
     */
    async show(recommendation: ScoredDocument): Promise<void> {
        try {
            // Create or reveal webview panel
            if (this.panel) {
                this.panel.reveal(vscode.ViewColumn.One);
            } else {
                this.panel = vscode.window.createWebviewPanel(
                    'steeringRecommendation',
                    `Recommendation: ${recommendation.document.name}`,
                    vscode.ViewColumn.One,
                    {
                        enableScripts: true,
                        localResourceRoots: [this.extensionUri]
                    }
                );

                // Handle panel disposal
                this.panel.onDidDispose(
                    () => {
                        this.panel = undefined;
                        this.disposables.forEach(d => d.dispose());
                        this.disposables = [];
                    },
                    null,
                    this.disposables
                );
            }

            // Update panel title
            this.panel.title = `Recommendation: ${recommendation.document.name}`;

            // Fetch document content
            let documentContent: string;
            try {
                documentContent = await this.documentService.fetchDocumentContent(
                    recommendation.document.path
                );
            } catch (error) {
                // Show error in webview
                this.panel.webview.html = this.getErrorHtml(
                    'Failed to fetch document content',
                    error instanceof Error ? error.message : 'Unknown error'
                );
                return;
            }

            // Setup message handlers
            this.setupMessageHandlers(recommendation);

            // Generate and set HTML content
            this.panel.webview.html = this.getHtmlContent(recommendation, documentContent);

        } catch (error) {
            // Webview creation failed, throw error for fallback handling
            throw new RecommendationError(
                RecommendationErrorCode.WEBVIEW_FAILED,
                `Failed to create webview panel: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error
            );
        }
    }

    /**
     * Setup message handlers for webview communication
     * @param recommendation Scored document being displayed
     */
    private setupMessageHandlers(recommendation: ScoredDocument): void {
        if (!this.panel) {
            return;
        }

        // Dispose existing handler if any
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];

        // Handle messages from webview
        const messageHandler = this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'install':
                        await this.handleInstallRequest(
                            recommendation,
                            message.inclusionMode,
                            message.fileMatchPattern
                        );
                        break;
                    case 'close':
                        this.panel?.dispose();
                        break;
                }
            },
            null,
            this.disposables
        );

        this.disposables.push(messageHandler);
    }

    /**
     * Handle install button click
     * @param recommendation Scored document to install
     * @param inclusionMode Inclusion mode selected by user
     * @param fileMatchPattern File match pattern if fileMatch mode selected
     */
    private async handleInstallRequest(
        recommendation: ScoredDocument,
        inclusionMode: 'always' | 'manual' | 'fileMatch',
        fileMatchPattern?: string
    ): Promise<void> {
        try {
            await this.documentService.installDocument(
                recommendation.document,
                inclusionMode,
                fileMatchPattern
            );

            // Format mode label for notification
            const modeLabel = inclusionMode === 'always' ? 'Always Active'
                : inclusionMode === 'fileMatch' ? `File Match (${fileMatchPattern})`
                : 'Manual Only';

            // Show success notification
            vscode.window.showInformationMessage(
                `✓ ${recommendation.document.name} activated (${modeLabel})`
            );

            // Close the panel after successful installation
            this.panel?.dispose();

        } catch (error) {
            // Show error notification with details
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(
                `Failed to install document: ${errorMessage}`
            );
        }
    }

    /**
     * Generate HTML content for the webview
     * @param recommendation Scored document to display
     * @param documentContent Raw markdown content
     * @returns HTML string
     */
    private getHtmlContent(recommendation: ScoredDocument, documentContent: string): string {
        const { document, score, reasons, isInstalled } = recommendation;

        // Determine smart default inclusion mode
        const defaultMode = this.getSmartInclusionMode(document);
        const suggestedPattern = document.filePatterns?.[0] || '';

        // Convert markdown to HTML (basic conversion)
        const htmlContent = this.markdownToHtml(documentContent);

        // Generate match reasons HTML
        const reasonsHtml = reasons.map(reason => {
            const icon = this.getReasonIcon(reason.type);
            return `
                <div class="match-reason">
                    <span class="reason-icon">${icon}</span>
                    <div class="reason-content">
                        <strong>${reason.description}</strong>
                        ${reason.details.length > 0 ? `<div class="reason-details">${reason.details.join(', ')}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Generate score indicator
        const stars = Math.min(5, Math.floor(score / 20));
        const scoreIndicator = '⭐'.repeat(stars);

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${document.name}</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    line-height: 1.6;
                    padding: 0;
                    margin: 0;
                }
                .container {
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 20px;
                    margin-bottom: 20px;
                }
                .title {
                    font-size: 24px;
                    font-weight: 600;
                    margin: 0 0 8px 0;
                    color: var(--vscode-foreground);
                }
                .metadata {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                    margin-top: 8px;
                    font-size: 13px;
                    color: var(--vscode-descriptionForeground);
                }
                .metadata-item {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .score {
                    font-size: 16px;
                }
                .category-badge {
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    padding: 2px 8px;
                    border-radius: 3px;
                    font-size: 12px;
                }
                .installed-badge {
                    background-color: var(--vscode-testing-iconPassed);
                    color: var(--vscode-editor-background);
                    padding: 2px 8px;
                    border-radius: 3px;
                    font-size: 12px;
                }
                .description {
                    margin: 12px 0;
                    color: var(--vscode-descriptionForeground);
                }
                .match-reasons {
                    background-color: var(--vscode-editor-inactiveSelectionBackground);
                    border-left: 3px solid var(--vscode-textLink-foreground);
                    padding: 16px;
                    margin: 20px 0;
                    border-radius: 4px;
                }
                .match-reasons-title {
                    font-weight: 600;
                    margin: 0 0 12px 0;
                    color: var(--vscode-foreground);
                }
                .match-reason {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 12px;
                    align-items: flex-start;
                }
                .match-reason:last-child {
                    margin-bottom: 0;
                }
                .reason-icon {
                    font-size: 18px;
                    flex-shrink: 0;
                }
                .reason-content {
                    flex: 1;
                }
                .reason-details {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 4px;
                }
                .actions {
                    display: flex;
                    gap: 12px;
                    margin: 20px 0;
                    padding: 16px 0;
                    border-top: 1px solid var(--vscode-panel-border);
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                    font-size: 13px;
                    font-family: var(--vscode-font-family);
                }
                .btn-primary {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                .btn-primary:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .btn-primary:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .btn-secondary {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                .btn-secondary:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                .content {
                    margin-top: 20px;
                }
                .content h1 {
                    font-size: 20px;
                    margin: 24px 0 12px 0;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 8px;
                }
                .content h2 {
                    font-size: 18px;
                    margin: 20px 0 10px 0;
                }
                .content h3 {
                    font-size: 16px;
                    margin: 16px 0 8px 0;
                }
                .content p {
                    margin: 8px 0;
                }
                .content ul, .content ol {
                    margin: 8px 0;
                    padding-left: 24px;
                }
                .content li {
                    margin: 4px 0;
                }
                .content code {
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: var(--vscode-editor-font-family);
                    font-size: 0.9em;
                }
                .content pre {
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 12px;
                    border-radius: 4px;
                    overflow-x: auto;
                    margin: 12px 0;
                }
                .content pre code {
                    background-color: transparent;
                    padding: 0;
                }
                .content blockquote {
                    border-left: 3px solid var(--vscode-textLink-foreground);
                    margin: 12px 0;
                    padding-left: 16px;
                    color: var(--vscode-descriptionForeground);
                }
                .inclusion-mode-section {
                    margin: 20px 0;
                    padding: 16px;
                    background-color: var(--vscode-editor-inactiveSelectionBackground);
                    border-radius: 4px;
                    border: 1px solid var(--vscode-panel-border);
                }
                .inclusion-mode-section h3 {
                    margin: 0 0 12px 0;
                    font-size: 16px;
                    color: var(--vscode-foreground);
                }
                .radio-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .radio-option {
                    display: flex;
                    align-items: flex-start;
                    padding: 12px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                .radio-option:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .radio-option input[type="radio"] {
                    margin: 4px 8px 0 0;
                    cursor: pointer;
                }
                .option-content {
                    flex: 1;
                }
                .option-content strong {
                    display: block;
                    margin-bottom: 4px;
                }
                .option-content p {
                    margin: 0;
                    font-size: 13px;
                    color: var(--vscode-descriptionForeground);
                }
                .file-pattern-input {
                    margin-top: 12px;
                    padding: 12px;
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 4px;
                }
                .file-pattern-input label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                }
                .file-pattern-input input[type="text"] {
                    width: 100%;
                    padding: 6px 8px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 2px;
                    font-family: var(--vscode-editor-font-family);
                }
                .file-pattern-input .hint {
                    margin: 8px 0 0 0;
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                }
                @media (max-width: 600px) {
                    .container {
                        padding: 12px;
                    }
                    .metadata {
                        flex-direction: column;
                        gap: 8px;
                    }
                    .actions {
                        flex-direction: column;
                    }
                    .btn {
                        width: 100%;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 class="title">${this.escapeHtml(document.name)}</h1>
                    <div class="metadata">
                        <div class="metadata-item">
                            <span class="category-badge">${this.escapeHtml(document.category)}</span>
                        </div>
                        ${isInstalled ? '<div class="metadata-item"><span class="installed-badge">✓ Installed</span></div>' : ''}
                        <div class="metadata-item">
                            <span class="score">${scoreIndicator}</span>
                            <span>Score: ${score.toFixed(0)}</span>
                        </div>
                    </div>
                    ${document.description ? `<p class="description">${this.escapeHtml(document.description)}</p>` : ''}
                </div>

                ${reasons.length > 0 ? `
                <div class="match-reasons">
                    <h2 class="match-reasons-title">Why this is recommended for your project:</h2>
                    ${reasonsHtml}
                </div>
                ` : ''}

                ${!isInstalled ? `
                <div class="inclusion-mode-section">
                    <h3>Activation Mode</h3>
                    <div class="radio-group">
                        <label class="radio-option">
                            <input type="radio" name="inclusionMode" value="always" ${defaultMode === 'always' ? 'checked' : ''}>
                            <div class="option-content">
                                <strong>● Always Active</strong>
                                <p>Include in every Kiro interaction</p>
                            </div>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="inclusionMode" value="fileMatch" ${defaultMode === 'fileMatch' ? 'checked' : ''}>
                            <div class="option-content">
                                <strong>○ File Pattern Match</strong>
                                <p>Auto-activate for specific file patterns</p>
                            </div>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="inclusionMode" value="manual" ${defaultMode === 'manual' ? 'checked' : ''}>
                            <div class="option-content">
                                <strong>○ Manual Only</strong>
                                <p>Use #steering-doc-name to activate</p>
                            </div>
                        </label>
                    </div>
                    <div id="filePatternInput" class="file-pattern-input" style="${defaultMode === 'fileMatch' ? '' : 'display: none;'}">
                        <label>File Pattern:</label>
                        <input type="text" id="filePattern" value="${this.escapeHtml(suggestedPattern)}" placeholder="*.ts, **/*.test.js">
                        <p class="hint">Examples: *.ts, src/**/*.tsx, components/**/*.md</p>
                    </div>
                </div>
                ` : ''}

                <div class="actions">
                    <button class="btn btn-primary" onclick="installDocument()" ${isInstalled ? 'disabled' : ''}>
                        ${isInstalled ? '✓ Already Installed' : '📥 Activate Document'}
                    </button>
                    <button class="btn btn-secondary" onclick="closePanel()">
                        Close
                    </button>
                </div>

                <div class="content">
                    ${htmlContent}
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                // Show/hide file pattern input based on selected mode
                document.querySelectorAll('input[name="inclusionMode"]').forEach(radio => {
                    radio.addEventListener('change', (e) => {
                        const patternInput = document.getElementById('filePatternInput');
                        if (patternInput) {
                            patternInput.style.display = e.target.value === 'fileMatch' ? 'block' : 'none';
                        }
                    });
                });

                function installDocument() {
                    // Get selected inclusion mode
                    const selectedMode = document.querySelector('input[name="inclusionMode"]:checked');
                    const inclusionMode = selectedMode ? selectedMode.value : 'always';

                    // Get file pattern if fileMatch mode is selected
                    const filePatternInput = document.getElementById('filePattern');
                    const fileMatchPattern = (inclusionMode === 'fileMatch' && filePatternInput)
                        ? filePatternInput.value
                        : undefined;

                    vscode.postMessage({
                        command: 'install',
                        inclusionMode: inclusionMode,
                        fileMatchPattern: fileMatchPattern
                    });
                }

                function closePanel() {
                    vscode.postMessage({ command: 'close' });
                }
            </script>
        </body>
        </html>`;
    }

    /**
     * Get icon for match reason type
     * @param type Match reason type
     * @returns Icon string
     */
    private getReasonIcon(type: string): string {
        switch (type) {
            case 'framework':
                return '🔧';
            case 'dependency':
                return '📦';
            case 'file-pattern':
                return '📁';
            case 'language':
                return '💻';
            case 'project-type':
                return '🏗️';
            default:
                return '✨';
        }
    }

    /**
     * Convert markdown to HTML (basic conversion)
     * @param markdown Markdown content
     * @returns HTML string
     */
    private markdownToHtml(markdown: string): string {
        let html = markdown;

        // Remove frontmatter if present
        html = html.replace(/^---\n[\s\S]*?\n---\n/, '');

        // Convert headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Convert code blocks
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

        // Convert inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Convert bold
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Convert italic
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Convert links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // Convert blockquotes
        html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

        // Convert unordered lists
        html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
        html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        // Convert ordered lists
        html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');

        // Convert paragraphs
        html = html.split('\n\n').map(para => {
            if (!para.match(/^<[^>]+>/)) {
                return `<p>${para}</p>`;
            }
            return para;
        }).join('\n');

        return html;
    }

    /**
     * Escape HTML special characters
     * @param text Text to escape
     * @returns Escaped text
     */
    private escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    /**
     * Generate error HTML content
     * @param title Error title
     * @param message Error message
     * @returns HTML string
     */
    private getErrorHtml(title: string, message: string): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error</title>
        </head>
        <body>
            <div class="error-container">
                <h1>${title}</h1>
                <p>${message}</p>
                <button onclick="window.close()">Close</button>
            </div>
        </body>
        </html>`;
    }

    /**
     * Determine smart default inclusion mode based on document metadata
     * @param doc Document metadata
     * @returns Recommended inclusion mode
     */
    private getSmartInclusionMode(doc: DocumentMetadata): 'always' | 'fileMatch' | 'manual' {
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

    /**
     * Dispose of the panel and clean up resources
     */
    dispose(): void {
        this.panel?.dispose();
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}


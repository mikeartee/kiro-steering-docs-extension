// External libraries
import * as vscode from 'vscode';

// Internal modules
import { TokenManager } from '../services/TokenManager';
import { SteeringDocsTreeProvider } from '../providers/SteeringDocsTreeProvider';

/**
 * Handle "Set GitHub Token" command
 * Shows scope guidance dialog before prompting for token input.
 * Uses password masking and validates token format before storing.
 * 
 * @param tokenManager - TokenManager instance for token operations
 * @param treeProvider - Tree provider to refresh after token change
 * 
 * Validates: Requirements 2.1, 2.2, 7.1
 */
export async function handleSetToken(
    tokenManager: TokenManager,
    treeProvider: SteeringDocsTreeProvider
): Promise<void> {
    // Show scope guidance before prompting for token (Req 7.1)
    const scopeInfo = await vscode.window.showInformationMessage(
        'GitHub Token Scopes:\n' +
        '• Public repos: No scopes required\n' +
        '• Private repos: "repo" scope required\n\n' +
        'Generate a token at: GitHub Settings → Developer settings → Personal access tokens',
        'Continue',
        'Open GitHub'
    );

    if (scopeInfo === 'Open GitHub') {
        await vscode.env.openExternal(vscode.Uri.parse('https://github.com/settings/tokens'));
        return;
    }

    if (scopeInfo !== 'Continue') {
        return; // User cancelled
    }

    // Prompt for token with password masking (Req 2.1)
    const token = await vscode.window.showInputBox({
        prompt: 'Enter your GitHub Personal Access Token',
        placeHolder: 'ghp_xxxx or github_pat_xxxx',
        password: true, // CRITICAL: Password masking for security
        ignoreFocusOut: true,
        validateInput: (value: string): string | null => {
            if (!value || value.trim().length === 0) {
                return 'Token cannot be empty';
            }
            // Validate token format before storing (Req 2.2)
            const result = tokenManager.validateTokenFormat(value);
            return result.valid ? null : result.error ?? 'Invalid token format';
        }
    });

    if (!token) {
        return; // User cancelled
    }

    // Store the token
    const result = await tokenManager.setToken(token);

    if (result.valid) {
        vscode.window.showInformationMessage(
            'GitHub token saved securely. You now have authenticated API access.'
        );
        treeProvider.refresh();
    } else {
        vscode.window.showErrorMessage(`Failed to save token: ${result.error}`);
    }
}

/**
 * Handle "Clear GitHub Token" command
 * Shows confirmation dialog before clearing the token.
 * Displays success message after deletion.
 * 
 * @param tokenManager - TokenManager instance for token operations
 * @param treeProvider - Tree provider to refresh after token change
 * 
 * Validates: Requirement 2.3
 */
export async function handleClearToken(
    tokenManager: TokenManager,
    treeProvider: SteeringDocsTreeProvider
): Promise<void> {
    // Show confirmation dialog (Req 2.3)
    const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to clear your GitHub token? You will lose authenticated API access.',
        { modal: true },
        'Clear Token'
    );

    if (confirm !== 'Clear Token') {
        return; // User cancelled
    }

    await tokenManager.clearToken();
    
    // Show success message (Req 2.3)
    vscode.window.showInformationMessage('Token cleared successfully.');
    treeProvider.refresh();
}

/**
 * Handle "Check Token Status" command
 * Shows progress indicator while checking token status.
 * Displays whether token is configured, validation status, username if valid, and rate limit info.
 * 
 * @param tokenManager - TokenManager instance for token operations
 * 
 * Validates: Requirements 2.4, 2.5
 */
export async function handleCheckTokenStatus(
    tokenManager: TokenManager
): Promise<void> {
    // Show progress indicator while checking (Req 2.4)
    const status = await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Checking token status...',
            cancellable: false
        },
        async () => {
            return await tokenManager.checkTokenStatus(true);
        }
    );

    // Display result based on token status
    if (!status.hasToken) {
        vscode.window.showInformationMessage(
            'No GitHub token configured. Using anonymous access (60 requests/hour).'
        );
        return;
    }

    if (status.isValid) {
        // Build rate limit info string if available
        const rateInfo = status.rateLimit
            ? ` Rate limit: ${status.rateLimit.remaining}/${status.rateLimit.limit}`
            : '';
        
        // Show success with username and rate limit (Req 2.5)
        vscode.window.showInformationMessage(
            `Token valid. Authenticated as: ${status.username}${rateInfo}`
        );
    } else {
        vscode.window.showErrorMessage(
            `Token validation failed: ${status.error}`
        );
    }
}

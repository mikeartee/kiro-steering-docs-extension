// External libraries
import * as vscode from 'vscode';
import * as https from 'https';

// Internal modules
import { AuditLogger, AuditOperation } from './AuditLogger';

// Type imports
import type { TokenValidationResult, TokenInfo, RateLimitInfo, TokenType } from '../models/types';
import { TOKEN_PATTERNS, TokenErrorCode } from '../models/types';

/**
 * Response from GitHub API user endpoint
 */
interface GitHubUserResponse {
    login: string;
    id: number;
    name?: string;
}

/**
 * TokenManager handles secure token storage, retrieval, migration, and validation.
 * Uses VS Code's SecretStorage API for encrypted credential storage.
 * 
 * Key responsibilities:
 * - Store/retrieve tokens from SecretStorage
 * - Migrate tokens from legacy settings.json
 * - Validate token formats
 * - Optionally validate tokens against GitHub API
 * - Emit events when token changes
 */
export class TokenManager {
    private static readonly SECRET_KEY = 'steeringDocs.githubToken';
    private static readonly LEGACY_SETTING = 'githubToken';
    private static readonly MIGRATION_SHOWN_KEY = 'steeringDocs.migrationNoticeShown';

    private readonly onTokenChangeEmitter = new vscode.EventEmitter<void>();
    public readonly onTokenChange = this.onTokenChangeEmitter.event;

    constructor(
        private readonly secrets: vscode.SecretStorage,
        private readonly config: vscode.WorkspaceConfiguration,
        private readonly auditLogger: AuditLogger,
        private readonly globalState: vscode.Memento
    ) {
        // Listen for SecretStorage changes, filtering for our specific key
        this.secrets.onDidChange((e: vscode.SecretStorageChangeEvent) => {
            if (e.key === TokenManager.SECRET_KEY) {
                this.onTokenChangeEmitter.fire();
            }
        });
    }

    /**
     * Validate token format without storing.
     * Checks against known GitHub token patterns.
     * 
     * @param token - The token string to validate
     * @returns TokenValidationResult with valid status and detected token type or error message
     */
    validateTokenFormat(token: string): TokenValidationResult {
        if (!token || token.trim().length === 0) {
            return {
                valid: false,
                error: 'Token cannot be empty'
            };
        }

        const trimmedToken = token.trim();

        // Check each known pattern
        for (const [type, pattern] of Object.entries(TOKEN_PATTERNS)) {
            if (pattern.test(trimmedToken)) {
                return {
                    valid: true,
                    tokenType: type as TokenType
                };
            }
        }

        // Provide clear error message explaining expected formats
        return {
            valid: false,
            error: 'Invalid token format. Expected: ghp_* (classic PAT), github_pat_* (fine-grained PAT), gho_* (OAuth), ghs_* (GitHub Actions), or 40-character hex (legacy)'
        };
    }

    /**
     * Get the current token, handling migration from legacy settings.
     * Resolution order:
     * 1. Try SecretStorage first
     * 2. If SecretStorage fails or returns undefined, check legacy settings
     * 3. If settings token exists, migrate it to SecretStorage
     * 4. Return undefined if no token found (graceful degradation)
     * 
     * @returns The token string or undefined if not configured
     */
    async getToken(): Promise<string | undefined> {
        try {
            // Try SecretStorage first (Req 1.1)
            const secretToken = await this.secrets.get(TokenManager.SECRET_KEY);
            if (secretToken) {
                this.auditLogger.log(AuditOperation.ACCESS, true, 'from SecretStorage');
                return secretToken;
            }
        } catch (error) {
            // SecretStorage failed - log and continue to fallback (Req 1.4, 8.2)
            const errorMessage = error instanceof Error ? error.message : 'unknown error';
            this.auditLogger.log(
                AuditOperation.ACCESS,
                false,
                `SecretStorage error: ${errorMessage}. Suggest re-entering token via "Set GitHub Token" command.`,
                TokenErrorCode.STORAGE_FAILED
            );
            console.error('SecretStorage access failed:', error);
        }

        // Fallback to legacy settings (Req 1.5, 8.1)
        const settingsToken = this.config.get<string>(TokenManager.LEGACY_SETTING);
        if (settingsToken && settingsToken.trim().length > 0) {
            this.auditLogger.log(
                AuditOperation.ACCESS,
                true,
                'from settings (fallback) - SECURITY WARNING: Token stored in plaintext'
            );

            // Attempt migration (Req 1.2)
            await this.migrateFromSettings(settingsToken);

            return settingsToken;
        }

        // No token configured - graceful return (Req 8.3)
        this.auditLogger.log(AuditOperation.ACCESS, true, 'no token configured');
        return undefined;
    }

    /**
     * Store a new token after validation.
     * Format validation is required, but API validation failure only produces a warning.
     * 
     * @param token - The token to store
     * @returns TokenValidationResult indicating success or failure
     */
    async setToken(token: string): Promise<TokenValidationResult> {
        // Validate format first (Req 3.1, 3.2)
        const formatResult = this.validateTokenFormat(token);
        if (!formatResult.valid) {
            this.auditLogger.log(
                AuditOperation.SET,
                false,
                'Invalid token format',
                TokenErrorCode.INVALID_FORMAT
            );
            return formatResult;
        }

        try {
            // Store in SecretStorage
            await this.secrets.store(TokenManager.SECRET_KEY, token.trim());
            this.auditLogger.log(AuditOperation.SET, true, `Token type: ${formatResult.tokenType}`);

            // Optionally validate against API (Req 3.4 - warning only, not blocking)
            try {
                const apiResult = await this.validateTokenWithApi(token.trim());
                if (!apiResult.isValid) {
                    // Warn but don't block storage
                    vscode.window.showWarningMessage(
                        `Token saved, but API validation failed: ${apiResult.error}. ` +
                        'The token may be invalid or expired.'
                    );
                }
            } catch {
                // Network issues shouldn't block storage (Req 3.4)
                vscode.window.showWarningMessage(
                    'Token saved, but could not validate against GitHub API. ' +
                    'Network may be unavailable.'
                );
            }

            return {
                valid: true,
                tokenType: formatResult.tokenType
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'unknown error';
            this.auditLogger.log(
                AuditOperation.SET,
                false,
                `Storage failed: ${errorMessage}`,
                TokenErrorCode.STORAGE_FAILED
            );
            return {
                valid: false,
                error: `Failed to store token: ${errorMessage}`
            };
        }
    }

    /**
     * Remove the stored token from SecretStorage.
     * Logs the operation and shows confirmation message.
     */
    async clearToken(): Promise<void> {
        try {
            await this.secrets.delete(TokenManager.SECRET_KEY);
            this.auditLogger.log(AuditOperation.CLEAR, true, 'Token removed from SecretStorage');
            
            // Show confirmation message (Req 2.3)
            vscode.window.showInformationMessage('GitHub token has been cleared successfully.');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'unknown error';
            this.auditLogger.log(
                AuditOperation.CLEAR,
                false,
                `Failed to clear token: ${errorMessage}`,
                TokenErrorCode.STORAGE_FAILED
            );
            throw error;
        }
    }

    /**
     * Check token status and optionally validate against GitHub API.
     * Returns information about the configured token including username and rate limits.
     * 
     * @param validateWithApi - Whether to validate the token against GitHub API
     * @returns TokenInfo with token status, validation result, and rate limit info
     */
    async checkTokenStatus(validateWithApi: boolean = false): Promise<TokenInfo> {
        const token = await this.getToken();

        if (!token) {
            return {
                hasToken: false,
                source: 'none'
            };
        }

        // Determine token source
        let source: 'secretStorage' | 'settings' = 'secretStorage';
        try {
            const secretToken = await this.secrets.get(TokenManager.SECRET_KEY);
            if (!secretToken) {
                source = 'settings';
            }
        } catch {
            source = 'settings';
        }

        // Determine token type
        const formatResult = this.validateTokenFormat(token);

        if (!validateWithApi) {
            this.auditLogger.log(AuditOperation.VALIDATE, true, 'Format check only');
            return {
                hasToken: true,
                tokenType: formatResult.tokenType,
                source
            };
        }

        // Validate against GitHub API (Req 2.5, 3.3, 3.5)
        this.auditLogger.log(AuditOperation.VALIDATE, true, 'Validating with GitHub API');
        const apiResult = await this.validateTokenWithApi(token);

        if (apiResult.isValid) {
            return {
                hasToken: true,
                tokenType: formatResult.tokenType,
                isValid: true,
                username: apiResult.username,
                rateLimit: apiResult.rateLimit,
                source
            };
        } else {
            this.auditLogger.log(
                AuditOperation.VALIDATE_FAILED,
                false,
                apiResult.error,
                apiResult.errorCode
            );
            return {
                hasToken: true,
                tokenType: formatResult.tokenType,
                isValid: false,
                error: apiResult.error,
                source
            };
        }
    }

    /**
     * Migrate token from legacy settings to SecretStorage.
     * Shows one-time notice to user about migration.
     * 
     * @param token - The token to migrate from settings
     */
    private async migrateFromSettings(token: string): Promise<void> {
        try {
            // Store in SecretStorage
            await this.secrets.store(TokenManager.SECRET_KEY, token);
            this.auditLogger.log(AuditOperation.MIGRATE, true, 'from settings to SecretStorage');

            // Show one-time migration notice (Req 1.3, 6.3)
            const noticeShown = this.globalState.get<boolean>(TokenManager.MIGRATION_SHOWN_KEY);
            if (!noticeShown) {
                const selection = await vscode.window.showWarningMessage(
                    'Your GitHub token has been migrated to secure storage. ' +
                    'Please remove "steeringDocs.githubToken" from your settings.json for security.',
                    'Open Settings'
                );

                if (selection === 'Open Settings') {
                    await vscode.commands.executeCommand('workbench.action.openSettingsJson');
                }

                await this.globalState.update(TokenManager.MIGRATION_SHOWN_KEY, true);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'unknown error';
            this.auditLogger.log(
                AuditOperation.MIGRATE,
                false,
                `Migration failed: ${errorMessage}`,
                TokenErrorCode.STORAGE_FAILED
            );
            // Don't throw - migration failure shouldn't break token access
            console.error('Token migration failed:', error);
        }
    }

    /**
     * Validate token against GitHub API.
     * Makes a request to /user endpoint to verify token works.
     * 
     * @param token - The token to validate
     * @returns Validation result with username and rate limit info if successful
     */
    private async validateTokenWithApi(token: string): Promise<{
        isValid: boolean;
        username?: string;
        rateLimit?: RateLimitInfo;
        error?: string;
        errorCode?: string;
    }> {
        return new Promise((resolve) => {
            const options = {
                hostname: 'api.github.com',
                path: '/user',
                method: 'GET',
                headers: {
                    'User-Agent': 'VSCode-Steering-Docs-Browser',
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `Bearer ${token}`
                },
                timeout: 10000
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk: Buffer) => {
                    data += chunk.toString();
                });

                res.on('end', () => {
                    // Extract rate limit info from headers
                    const rateLimit: RateLimitInfo | undefined = res.headers['x-ratelimit-limit']
                        ? {
                            limit: parseInt(res.headers['x-ratelimit-limit'] as string, 10),
                            remaining: parseInt(res.headers['x-ratelimit-remaining'] as string, 10),
                            reset: new Date(parseInt(res.headers['x-ratelimit-reset'] as string, 10) * 1000)
                        }
                        : undefined;

                    if (res.statusCode === 200) {
                        try {
                            const user = JSON.parse(data) as GitHubUserResponse;
                            resolve({
                                isValid: true,
                                username: user.login,
                                rateLimit
                            });
                        } catch {
                            resolve({
                                isValid: false,
                                error: 'Failed to parse GitHub API response',
                                errorCode: TokenErrorCode.VALIDATION_FAILED
                            });
                        }
                    } else if (res.statusCode === 401) {
                        resolve({
                            isValid: false,
                            error: 'Token is invalid or has expired',
                            errorCode: TokenErrorCode.UNAUTHORIZED,
                            rateLimit
                        });
                    } else if (res.statusCode === 403) {
                        // Distinguish between rate limit and insufficient permissions
                        const remaining = parseInt(res.headers['x-ratelimit-remaining'] as string, 10);
                        if (remaining === 0) {
                            const resetTime = rateLimit?.reset
                                ? rateLimit.reset.toLocaleTimeString()
                                : 'unknown';
                            resolve({
                                isValid: false,
                                error: `Rate limit exceeded. Resets at ${resetTime}`,
                                errorCode: TokenErrorCode.RATE_LIMITED,
                                rateLimit
                            });
                        } else {
                            resolve({
                                isValid: false,
                                error: 'Insufficient permissions. Check token scopes.',
                                errorCode: TokenErrorCode.INSUFFICIENT_SCOPE,
                                rateLimit
                            });
                        }
                    } else {
                        resolve({
                            isValid: false,
                            error: `GitHub API error: ${res.statusCode}`,
                            errorCode: TokenErrorCode.VALIDATION_FAILED,
                            rateLimit
                        });
                    }
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    isValid: false,
                    error: 'Request timed out',
                    errorCode: TokenErrorCode.NETWORK_ERROR
                });
            });

            req.on('error', (error: Error) => {
                resolve({
                    isValid: false,
                    error: `Network error: ${error.message}`,
                    errorCode: TokenErrorCode.NETWORK_ERROR
                });
            });

            req.end();
        });
    }

    /**
     * Dispose of resources.
     * Should be called when the extension is deactivated.
     */
    dispose(): void {
        this.onTokenChangeEmitter.dispose();
    }
}

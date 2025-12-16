import * as https from 'https';
import { GitHubContent, ErrorCode, ExtensionError } from '../models/types';

/**
 * Client for interacting with the GitHub API
 */
export class GitHubClient {
    private readonly baseUrl = 'https://api.github.com';
    private readonly rawBaseUrl = 'https://raw.githubusercontent.com';
    private readonly timeout = 30000; // 30 seconds
    private readonly maxRetries = 3;
    private readonly retryDelay = 1000; // 1 second

    constructor(
        private readonly repository: string,
        private readonly branch: string = 'main',
        private readonly token?: string
    ) {}

    /**
     * Fetch directory contents from the repository
     * @param path Path within the repository
     * @returns Array of GitHub content items
     */
    async getRepositoryContents(path: string): Promise<GitHubContent[]> {
        const url = `${this.baseUrl}/repos/${this.repository}/contents/${path}?ref=${this.branch}`;
        const response = await this.makeRequestWithRetry(url);
        
        if (!Array.isArray(response)) {
            throw new ExtensionError(
                'Expected array response from GitHub API',
                ErrorCode.PARSE_ERROR,
                false
            );
        }

        return response as GitHubContent[];
    }

    /**
     * Fetch file content via GitHub API (base64 encoded)
     * @param path Path to the file in the repository
     * @returns Decoded file content as string
     */
    async getFileContent(path: string): Promise<string> {
        const url = `${this.baseUrl}/repos/${this.repository}/contents/${path}?ref=${this.branch}`;
        const response = await this.makeRequestWithRetry(url);

        if (typeof response !== 'object' || !response.content) {
            throw new ExtensionError(
                'Invalid file content response from GitHub API',
                ErrorCode.PARSE_ERROR,
                false
            );
        }

        const content = response as GitHubContent;
        if (content.encoding === 'base64' && content.content) {
            return Buffer.from(content.content, 'base64').toString('utf-8');
        }

        throw new ExtensionError(
            'Unsupported content encoding',
            ErrorCode.PARSE_ERROR,
            false
        );
    }

    /**
     * Fetch raw file content directly (not base64 encoded)
     * @param path Path to the file in the repository
     * @returns Raw file content as string
     */
    async getRawFileContent(path: string): Promise<string> {
        const url = `${this.rawBaseUrl}/${this.repository}/${this.branch}/${path}`;
        return this.makeRawRequestWithRetry(url);
    }

    /**
     * Make an HTTP request with retry logic
     * @param url Full URL to request
     * @returns Parsed JSON response
     */
    private async makeRequestWithRetry(url: string): Promise<any> {
        let lastError: ExtensionError | null = null;

        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                return await this.makeRequest(url);
            } catch (error) {
                if (error instanceof ExtensionError) {
                    lastError = error;
                    
                    // Don't retry non-recoverable errors
                    if (!error.recoverable) {
                        throw error;
                    }

                    // Don't retry on last attempt
                    if (attempt < this.maxRetries - 1) {
                        await this.delay(this.retryDelay * (attempt + 1));
                    }
                } else {
                    throw error;
                }
            }
        }

        throw lastError || new ExtensionError(
            'Request failed after maximum retries',
            ErrorCode.NETWORK_ERROR,
            false
        );
    }

    /**
     * Make a raw HTTP request with retry logic
     * @param url Full URL to request
     * @returns Raw content as string
     */
    private async makeRawRequestWithRetry(url: string): Promise<string> {
        let lastError: ExtensionError | null = null;

        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                return await this.makeRawRequest(url);
            } catch (error) {
                if (error instanceof ExtensionError) {
                    lastError = error;
                    
                    // Don't retry non-recoverable errors
                    if (!error.recoverable) {
                        throw error;
                    }

                    // Don't retry on last attempt
                    if (attempt < this.maxRetries - 1) {
                        await this.delay(this.retryDelay * (attempt + 1));
                    }
                } else {
                    throw error;
                }
            }
        }

        throw lastError || new ExtensionError(
            'Request failed after maximum retries',
            ErrorCode.NETWORK_ERROR,
            false
        );
    }

    /**
     * Delay execution for a specified time
     * @param ms Milliseconds to delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Make an HTTP request to the GitHub API
     * @param url Full URL to request
     * @returns Parsed JSON response
     */
    private makeRequest(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const headers: Record<string, string> = {
                'User-Agent': 'VSCode-Steering-Docs-Browser',
                'Accept': 'application/vnd.github.v3+json'
            };

            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }

            const req = https.get(url, {
                headers,
                timeout: this.timeout
            }, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (error) {
                            reject(new ExtensionError(
                                'Failed to parse GitHub API response',
                                ErrorCode.PARSE_ERROR,
                                false
                            ));
                        }
                    } else {
                        reject(this.handleHttpError(res.statusCode || 0, data));
                    }
                });
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new ExtensionError(
                    'Request to GitHub API timed out after 30 seconds',
                    ErrorCode.NETWORK_ERROR,
                    true
                ));
            });

            req.on('error', (error) => {
                reject(new ExtensionError(
                    `Network error: ${error.message}`,
                    ErrorCode.NETWORK_ERROR,
                    true
                ));
            });
        });
    }

    /**
     * Make an HTTP request for raw content
     * @param url Full URL to request
     * @returns Raw content as string
     */
    private makeRawRequest(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const headers: Record<string, string> = {
                'User-Agent': 'VSCode-Steering-Docs-Browser'
            };

            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }

            const req = https.get(url, {
                headers,
                timeout: this.timeout
            }, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(data);
                    } else {
                        reject(this.handleHttpError(res.statusCode || 0, data));
                    }
                });
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new ExtensionError(
                    'Request to GitHub timed out after 30 seconds',
                    ErrorCode.NETWORK_ERROR,
                    true
                ));
            });

            req.on('error', (error) => {
                reject(new ExtensionError(
                    `Network error: ${error.message}`,
                    ErrorCode.NETWORK_ERROR,
                    true
                ));
            });
        });
    }

    /**
     * Handle HTTP error responses
     * @param statusCode HTTP status code
     * @param responseBody Response body
     * @returns ExtensionError with appropriate message
     */
    private handleHttpError(statusCode: number, responseBody: string): ExtensionError {
        switch (statusCode) {
            case 404:
                return new ExtensionError(
                    'Resource not found on GitHub',
                    ErrorCode.NOT_FOUND,
                    false
                );
            case 403:
                return new ExtensionError(
                    'GitHub API rate limit exceeded or access forbidden',
                    ErrorCode.NETWORK_ERROR,
                    true
                );
            case 500:
            case 502:
            case 503:
            case 504:
                return new ExtensionError(
                    'GitHub server error. Please try again later',
                    ErrorCode.NETWORK_ERROR,
                    true
                );
            default:
                return new ExtensionError(
                    `GitHub API error (${statusCode}): ${responseBody}`,
                    ErrorCode.NETWORK_ERROR,
                    true
                );
        }
    }
}

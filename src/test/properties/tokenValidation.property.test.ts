/**
 * Property-Based Tests for Token Format Validation
 * 
 * Feature: enterprise-secure-token-storage
 * Property 4: Token Format Validation
 * 
 * **Validates: Requirements 3.1, 3.2, 2.2**
 * 
 * For any string input to validateTokenFormat():
 * - If the string matches any known GitHub token pattern (ghp_*, github_pat_*, gho_*, ghs_*, or 40-char hex),
 *   the result SHALL have valid=true and include the detected tokenType
 * - If the string does not match any pattern, the result SHALL have valid=false and include a descriptive error message
 * - The validation SHALL be pure (no side effects) and deterministic
 */

// External libraries
import * as fc from 'fast-check';

// Internal modules
import { TokenManager } from '../../services/TokenManager';
import { AuditLogger } from '../../services/AuditLogger';

// Type imports
import { TokenType } from '../../models/types';

/**
 * Mock implementations for TokenManager dependencies
 */
class MockSecretStorage {
    private storage = new Map<string, string>();
    private changeListeners: Array<(e: { key: string }) => void> = [];

    async get(key: string): Promise<string | undefined> {
        return this.storage.get(key);
    }

    async store(key: string, value: string): Promise<void> {
        this.storage.set(key, value);
        this.changeListeners.forEach(listener => listener({ key }));
    }

    async delete(key: string): Promise<void> {
        this.storage.delete(key);
        this.changeListeners.forEach(listener => listener({ key }));
    }

    onDidChange(listener: (e: { key: string }) => void): { dispose: () => void } {
        this.changeListeners.push(listener);
        return {
            dispose: () => {
                const index = this.changeListeners.indexOf(listener);
                if (index > -1) {
                    this.changeListeners.splice(index, 1);
                }
            }
        };
    }
}

class MockWorkspaceConfiguration {
    private settings = new Map<string, string>();

    get<T>(key: string): T | undefined {
        return this.settings.get(key) as T | undefined;
    }
}

class MockMemento {
    private storage = new Map<string, unknown>();

    get<T>(key: string): T | undefined {
        return this.storage.get(key) as T | undefined;
    }

    async update(key: string, value: unknown): Promise<void> {
        if (value === undefined) {
            this.storage.delete(key);
        } else {
            this.storage.set(key, value);
        }
    }

    keys(): readonly string[] {
        return Array.from(this.storage.keys());
    }

    setKeysForSync(_keys: readonly string[]): void {
        // Not needed for tests
    }
}

class MockAuditLogger extends AuditLogger {
    constructor() {
        super();
    }

    override log(): void {
        // No-op for property tests
    }
}

// Alphanumeric character set for token generation
const alphanumericChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const hexChars = 'abcdef0123456789';

/**
 * Generator for valid classic PAT tokens (ghp_*)
 * Format: ghp_ followed by exactly 36 alphanumeric characters
 */
const validClassicPATArbitrary = fc.string({
    unit: fc.constantFrom(...alphanumericChars),
    minLength: 36,
    maxLength: 36
}).map(suffix => `ghp_${suffix}`);

/**
 * Generator for valid fine-grained PAT tokens (github_pat_*)
 * Format: github_pat_ + 22 alphanumeric chars + _ + 59 alphanumeric chars
 */
const validFineGrainedPATArbitrary = fc.tuple(
    fc.string({
        unit: fc.constantFrom(...alphanumericChars),
        minLength: 22,
        maxLength: 22
    }),
    fc.string({
        unit: fc.constantFrom(...alphanumericChars),
        minLength: 59,
        maxLength: 59
    })
).map(([part1, part2]) => `github_pat_${part1}_${part2}`);

/**
 * Generator for valid OAuth tokens (gho_*)
 * Format: gho_ followed by exactly 36 alphanumeric characters
 */
const validOAuthTokenArbitrary = fc.string({
    unit: fc.constantFrom(...alphanumericChars),
    minLength: 36,
    maxLength: 36
}).map(suffix => `gho_${suffix}`);

/**
 * Generator for valid GitHub Actions tokens (ghs_*)
 * Format: ghs_ followed by exactly 36 alphanumeric characters
 */
const validGitHubActionsTokenArbitrary = fc.string({
    unit: fc.constantFrom(...alphanumericChars),
    minLength: 36,
    maxLength: 36
}).map(suffix => `ghs_${suffix}`);

/**
 * Generator for valid legacy 40-character hex tokens
 * Format: exactly 40 lowercase hex characters
 */
const validLegacyHexTokenArbitrary = fc.string({
    unit: fc.constantFrom(...hexChars),
    minLength: 40,
    maxLength: 40
});

/**
 * Generator for invalid tokens - various malformed inputs
 */
const invalidTokenArbitrary = fc.oneof(
    // Empty or whitespace
    fc.constant(''),
    fc.constant('   '),
    fc.constant('\t\n'),
    
    // Too short tokens
    fc.constant('ghp_short'),
    fc.constant('gho_tooshort'),
    fc.constant('ghs_tooshort'),
    
    // Wrong prefix
    fc.string({ minLength: 10, maxLength: 50 }).filter(s => 
        !s.startsWith('ghp_') && 
        !s.startsWith('gho_') && 
        !s.startsWith('ghs_') && 
        !s.startsWith('github_pat_') &&
        !/^[a-f0-9]{40}$/.test(s)
    ),
    
    // Invalid hex (wrong length)
    fc.string({
        unit: fc.constantFrom(...hexChars),
        minLength: 35,
        maxLength: 39
    }),
    fc.string({
        unit: fc.constantFrom(...hexChars),
        minLength: 41,
        maxLength: 45
    }),
    
    // Hex with invalid characters
    fc.constant('ghijklmnopqrstuvwxyz0123456789abcdef0123'),
    
    // Random strings
    fc.string({ minLength: 1, maxLength: 20 }),
    
    // Tokens with wrong suffix length
    fc.string({
        unit: fc.constantFrom(...alphanumericChars),
        minLength: 30,
        maxLength: 35
    }).map(suffix => `ghp_${suffix}`),
    
    fc.string({
        unit: fc.constantFrom(...alphanumericChars),
        minLength: 37,
        maxLength: 42
    }).map(suffix => `ghp_${suffix}`)
);

suite('Feature: enterprise-secure-token-storage, Property 4: Token Format Validation', () => {
    let tokenManager: TokenManager;

    setup(() => {
        const mockSecrets = new MockSecretStorage();
        const mockConfig = new MockWorkspaceConfiguration();
        const mockAuditLogger = new MockAuditLogger();
        const mockGlobalState = new MockMemento();

        tokenManager = new TokenManager(
            mockSecrets as unknown as import('vscode').SecretStorage,
            mockConfig as unknown as import('vscode').WorkspaceConfiguration,
            mockAuditLogger,
            mockGlobalState as unknown as import('vscode').Memento
        );
    });

    teardown(() => {
        tokenManager.dispose();
    });

    suite('Valid Token Recognition', () => {
        test('should accept all valid classic PATs (ghp_*) and return CLASSIC type', () => {
            fc.assert(
                fc.property(validClassicPATArbitrary, (token) => {
                    const result = tokenManager.validateTokenFormat(token);
                    return result.valid === true && 
                           result.tokenType === TokenType.CLASSIC &&
                           result.error === undefined;
                }),
                { numRuns: 100 }
            );
        });

        test('should accept all valid fine-grained PATs (github_pat_*) and return FINE_GRAINED type', () => {
            fc.assert(
                fc.property(validFineGrainedPATArbitrary, (token) => {
                    const result = tokenManager.validateTokenFormat(token);
                    return result.valid === true && 
                           result.tokenType === TokenType.FINE_GRAINED &&
                           result.error === undefined;
                }),
                { numRuns: 100 }
            );
        });

        test('should accept all valid OAuth tokens (gho_*) and return OAUTH type', () => {
            fc.assert(
                fc.property(validOAuthTokenArbitrary, (token) => {
                    const result = tokenManager.validateTokenFormat(token);
                    return result.valid === true && 
                           result.tokenType === TokenType.OAUTH &&
                           result.error === undefined;
                }),
                { numRuns: 100 }
            );
        });

        test('should accept all valid GitHub Actions tokens (ghs_*) and return GITHUB_ACTIONS type', () => {
            fc.assert(
                fc.property(validGitHubActionsTokenArbitrary, (token) => {
                    const result = tokenManager.validateTokenFormat(token);
                    return result.valid === true && 
                           result.tokenType === TokenType.GITHUB_ACTIONS &&
                           result.error === undefined;
                }),
                { numRuns: 100 }
            );
        });

        test('should accept all valid 40-char hex tokens and return UNKNOWN type', () => {
            fc.assert(
                fc.property(validLegacyHexTokenArbitrary, (token) => {
                    const result = tokenManager.validateTokenFormat(token);
                    return result.valid === true && 
                           result.tokenType === TokenType.UNKNOWN &&
                           result.error === undefined;
                }),
                { numRuns: 100 }
            );
        });
    });

    suite('Invalid Token Rejection', () => {
        test('should reject all invalid tokens with valid=false and descriptive error', () => {
            fc.assert(
                fc.property(invalidTokenArbitrary, (token) => {
                    const result = tokenManager.validateTokenFormat(token);
                    return result.valid === false && 
                           typeof result.error === 'string' && 
                           result.error.length > 0;
                }),
                { numRuns: 100 }
            );
        });
    });

    suite('Validation Purity and Determinism', () => {
        test('should be deterministic - same input always produces same output', () => {
            // Generator for any valid token type
            const anyValidToken = fc.oneof(
                validClassicPATArbitrary,
                validFineGrainedPATArbitrary,
                validOAuthTokenArbitrary,
                validGitHubActionsTokenArbitrary,
                validLegacyHexTokenArbitrary
            );

            fc.assert(
                fc.property(anyValidToken, (token) => {
                    const result1 = tokenManager.validateTokenFormat(token);
                    const result2 = tokenManager.validateTokenFormat(token);
                    
                    return result1.valid === result2.valid &&
                           result1.tokenType === result2.tokenType &&
                           result1.error === result2.error;
                }),
                { numRuns: 100 }
            );
        });

        test('should be deterministic for invalid tokens', () => {
            fc.assert(
                fc.property(invalidTokenArbitrary, (token) => {
                    const result1 = tokenManager.validateTokenFormat(token);
                    const result2 = tokenManager.validateTokenFormat(token);
                    
                    return result1.valid === result2.valid &&
                           result1.error === result2.error;
                }),
                { numRuns: 100 }
            );
        });

        test('should handle whitespace trimming consistently', () => {
            const tokenWithWhitespace = fc.tuple(
                fc.string({ unit: fc.constant(' '), minLength: 0, maxLength: 5 }),
                validClassicPATArbitrary,
                fc.string({ unit: fc.constant(' '), minLength: 0, maxLength: 5 })
            ).map(([prefix, token, suffix]) => `${prefix}${token}${suffix}`);

            fc.assert(
                fc.property(tokenWithWhitespace, (token) => {
                    const result = tokenManager.validateTokenFormat(token);
                    // Should still be valid after trimming
                    return result.valid === true && result.tokenType === TokenType.CLASSIC;
                }),
                { numRuns: 100 }
            );
        });
    });

    suite('Error Message Quality', () => {
        test('error messages should mention expected token formats', () => {
            fc.assert(
                fc.property(invalidTokenArbitrary, (token) => {
                    const result = tokenManager.validateTokenFormat(token);
                    if (!result.valid && result.error) {
                        // Error should mention at least one expected format
                        // (unless it's an empty token error)
                        if (token.trim().length === 0) {
                            return result.error.toLowerCase().includes('empty');
                        }
                        return result.error.includes('ghp_') || 
                               result.error.includes('github_pat_') ||
                               result.error.includes('gho_') ||
                               result.error.includes('ghs_') ||
                               result.error.includes('hex') ||
                               result.error.includes('Invalid');
                    }
                    return true;
                }),
                { numRuns: 100 }
            );
        });
    });
});

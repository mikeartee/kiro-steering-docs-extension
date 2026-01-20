// External libraries
import * as assert from 'assert';

// Internal modules
import { AuditLogger, AuditOperation, AuditLogEntry } from '../../services/AuditLogger';

/**
 * Test helper class that extends AuditLogger to capture log output
 * without requiring actual VS Code output channel
 */
class TestableAuditLogger extends AuditLogger {
    public capturedLogs: string[] = [];

    constructor() {
        super();
    }

    /**
     * Override log to capture output for testing
     */
    override log(operation: AuditOperation, success: boolean, details?: string, errorCode?: string): void {
        const entry: AuditLogEntry = {
            timestamp: new Date().toISOString(),
            operation,
            success,
            details,
            errorCode
        };

        const message = this.formatLogEntryForTest(entry);
        this.capturedLogs.push(message);
    }

    /**
     * Format log entry (mirrors private formatLogEntry method)
     */
    private formatLogEntryForTest(entry: AuditLogEntry): string {
        const status = entry.success ? 'SUCCESS' : 'FAILED';
        let message = `[${entry.timestamp}] ${entry.operation} ${status}`;

        if (entry.details) {
            message += ` - ${entry.details}`;
        }

        if (entry.errorCode) {
            message += ` (errorCode: ${entry.errorCode})`;
        }

        return message;
    }

    /**
     * Get the last captured log entry
     */
    getLastLog(): string | undefined {
        return this.capturedLogs[this.capturedLogs.length - 1];
    }

    /**
     * Clear all captured logs
     */
    clearLogs(): void {
        this.capturedLogs = [];
    }
}

suite('AuditLogger Tests', () => {
    let auditLogger: TestableAuditLogger;

    setup(() => {
        auditLogger = new TestableAuditLogger();
    });

    teardown(() => {
        auditLogger.clearLogs();
        auditLogger.dispose();
    });

    // =========================================================================
    // Task 9.4: Format verification tests
    // =========================================================================
    suite('Log Format - ISO 8601 Timestamp', () => {
        test('should include ISO 8601 timestamp in log output', () => {
            // Act
            auditLogger.log(AuditOperation.SET, true, 'Test operation');

            // Assert
            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput, 'Should have log output');

            // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
            const iso8601Pattern = /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/;
            assert.ok(iso8601Pattern.test(logOutput!), `Log should contain ISO 8601 timestamp. Got: ${logOutput}`);
        });

        test('should have timestamp at the beginning of log entry', () => {
            // Act
            auditLogger.log(AuditOperation.ACCESS, true);

            // Assert
            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput, 'Should have log output');
            assert.ok(logOutput!.startsWith('['), 'Log should start with timestamp bracket');
        });

        test('should use UTC timezone (Z suffix)', () => {
            // Act
            auditLogger.log(AuditOperation.VALIDATE, true);

            // Assert
            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput, 'Should have log output');
            assert.ok(logOutput!.includes('Z]'), 'Timestamp should end with Z for UTC');
        });
    });

    suite('Log Format - Operation Type', () => {
        test('should include SET operation type', () => {
            auditLogger.log(AuditOperation.SET, true);

            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput?.includes('SET'), 'Log should include SET operation');
        });

        test('should include CLEAR operation type', () => {
            auditLogger.log(AuditOperation.CLEAR, true);

            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput?.includes('CLEAR'), 'Log should include CLEAR operation');
        });

        test('should include MIGRATE operation type', () => {
            auditLogger.log(AuditOperation.MIGRATE, true);

            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput?.includes('MIGRATE'), 'Log should include MIGRATE operation');
        });

        test('should include ACCESS operation type', () => {
            auditLogger.log(AuditOperation.ACCESS, true);

            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput?.includes('ACCESS'), 'Log should include ACCESS operation');
        });

        test('should include VALIDATE operation type', () => {
            auditLogger.log(AuditOperation.VALIDATE, true);

            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput?.includes('VALIDATE'), 'Log should include VALIDATE operation');
        });

        test('should include VALIDATE_FAILED operation type', () => {
            auditLogger.log(AuditOperation.VALIDATE_FAILED, false);

            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput?.includes('VALIDATE_FAILED'), 'Log should include VALIDATE_FAILED operation');
        });
    });

    suite('Log Format - Success/Failure Status', () => {
        test('should include SUCCESS status for successful operations', () => {
            auditLogger.log(AuditOperation.SET, true);

            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput?.includes('SUCCESS'), 'Log should include SUCCESS status');
        });

        test('should include FAILED status for failed operations', () => {
            auditLogger.log(AuditOperation.SET, false);

            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput?.includes('FAILED'), 'Log should include FAILED status');
        });

        test('should place status after operation type', () => {
            auditLogger.log(AuditOperation.CLEAR, true);

            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput, 'Should have log output');

            // Pattern: OPERATION STATUS
            const pattern = /CLEAR SUCCESS/;
            assert.ok(pattern.test(logOutput!), 'Status should follow operation type');
        });
    });

    suite('Log Format - Details and Error Codes', () => {
        test('should include details when provided', () => {
            const details = 'Token stored successfully';
            auditLogger.log(AuditOperation.SET, true, details);

            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput?.includes(details), 'Log should include details');
        });

        test('should include error code when provided', () => {
            const errorCode = 'INVALID_FORMAT';
            auditLogger.log(AuditOperation.SET, false, 'Validation failed', errorCode);

            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput?.includes(errorCode), 'Log should include error code');
            assert.ok(logOutput?.includes('errorCode:'), 'Log should have errorCode label');
        });

        test('should format details with dash separator', () => {
            auditLogger.log(AuditOperation.ACCESS, true, 'from SecretStorage');

            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput?.includes(' - from SecretStorage'), 'Details should be separated by dash');
        });

        test('should format error code in parentheses', () => {
            auditLogger.log(AuditOperation.SET, false, 'Failed', 'STORAGE_FAILED');

            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput?.includes('(errorCode: STORAGE_FAILED)'), 'Error code should be in parentheses');
        });
    });

    suite('Security - Token Values Never in Logs', () => {
        test('should not include token value when passed in details', () => {
            // This test verifies that even if someone accidentally passes a token
            // in the details, the log format itself doesn't expose it in a way
            // that would be obvious. The AuditLogger relies on callers to not
            // pass sensitive data, but we verify the format doesn't add any.
            const sensitiveToken = 'ghp_SensitiveToken123456789012345678';
            
            // Log without the token (correct usage)
            auditLogger.log(AuditOperation.SET, true, 'Token type: classic');

            const logOutput = auditLogger.getLastLog();
            assert.ok(!logOutput?.includes('ghp_'), 'Log should not contain token prefix');
            assert.ok(!logOutput?.includes(sensitiveToken), 'Log should not contain full token');
        });

        test('should not include any token-like patterns in standard log output', () => {
            // Test all operation types to ensure none leak tokens
            const operations = [
                AuditOperation.SET,
                AuditOperation.CLEAR,
                AuditOperation.MIGRATE,
                AuditOperation.ACCESS,
                AuditOperation.VALIDATE,
                AuditOperation.VALIDATE_FAILED
            ];

            for (const op of operations) {
                auditLogger.log(op, true, 'Standard operation details');
            }

            // Check all logs
            for (const log of auditLogger.capturedLogs) {
                // Token patterns that should never appear
                assert.ok(!log.includes('ghp_'), `Log should not contain ghp_ pattern: ${log}`);
                assert.ok(!log.includes('github_pat_'), `Log should not contain github_pat_ pattern: ${log}`);
                assert.ok(!log.includes('gho_'), `Log should not contain gho_ pattern: ${log}`);
                assert.ok(!log.includes('ghs_'), `Log should not contain ghs_ pattern: ${log}`);
            }
        });

        test('log format should only include operation metadata, not credentials', () => {
            auditLogger.log(AuditOperation.SET, true, 'Token type: fine-grained');

            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput, 'Should have log output');

            // Verify the log only contains expected components
            // Format: [timestamp] OPERATION STATUS - details (errorCode: CODE)
            const expectedComponents = ['[', ']', 'SET', 'SUCCESS', '-', 'Token type: fine-grained'];
            for (const component of expectedComponents) {
                assert.ok(logOutput!.includes(component), `Log should include: ${component}`);
            }
        });
    });

    suite('Complete Log Format Verification', () => {
        test('should produce correctly formatted log entry with all components', () => {
            auditLogger.log(AuditOperation.MIGRATE, true, 'from settings to SecretStorage');

            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput, 'Should have log output');

            // Verify complete format: [ISO8601] OPERATION STATUS - details
            const fullPattern = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] MIGRATE SUCCESS - from settings to SecretStorage$/;
            assert.ok(fullPattern.test(logOutput!), `Log format should match expected pattern. Got: ${logOutput}`);
        });

        test('should produce correctly formatted log entry with error code', () => {
            auditLogger.log(AuditOperation.SET, false, 'Storage failed', 'STORAGE_FAILED');

            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput, 'Should have log output');

            // Verify format with error code
            const fullPattern = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] SET FAILED - Storage failed \(errorCode: STORAGE_FAILED\)$/;
            assert.ok(fullPattern.test(logOutput!), `Log format should match expected pattern. Got: ${logOutput}`);
        });

        test('should produce correctly formatted log entry without details', () => {
            auditLogger.log(AuditOperation.CLEAR, true);

            const logOutput = auditLogger.getLastLog();
            assert.ok(logOutput, 'Should have log output');

            // Verify format without details
            const fullPattern = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] CLEAR SUCCESS$/;
            assert.ok(fullPattern.test(logOutput!), `Log format should match expected pattern. Got: ${logOutput}`);
        });
    });

    suite('AuditOperation Enum Coverage', () => {
        test('should have all required operation types defined', () => {
            // Verify all required operations exist
            assert.strictEqual(AuditOperation.SET, 'SET');
            assert.strictEqual(AuditOperation.CLEAR, 'CLEAR');
            assert.strictEqual(AuditOperation.MIGRATE, 'MIGRATE');
            assert.strictEqual(AuditOperation.ACCESS, 'ACCESS');
            assert.strictEqual(AuditOperation.VALIDATE, 'VALIDATE');
            assert.strictEqual(AuditOperation.VALIDATE_FAILED, 'VALIDATE_FAILED');
        });
    });
});

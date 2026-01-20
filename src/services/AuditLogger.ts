// External libraries
import * as vscode from 'vscode';

/**
 * Enum representing security-relevant token operations for audit logging.
 * Used for ISO 27001/42001 compliance tracking.
 */
export enum AuditOperation {
    SET = 'SET',
    CLEAR = 'CLEAR',
    MIGRATE = 'MIGRATE',
    ACCESS = 'ACCESS',
    VALIDATE = 'VALIDATE',
    VALIDATE_FAILED = 'VALIDATE_FAILED'
}

/**
 * Interface representing a single audit log entry.
 * Contains all information needed for compliance auditing.
 */
export interface AuditLogEntry {
    timestamp: string;
    operation: AuditOperation;
    success: boolean;
    details?: string;
    errorCode?: string;
}

/**
 * AuditLogger provides security audit logging for token operations.
 * Logs to a dedicated VS Code output channel for ISO 27001/42001 compliance.
 * 
 * CRITICAL: This logger NEVER includes actual token values in log output.
 */
export class AuditLogger {
    private readonly outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel(
            'Steering Docs Security Audit'
        );
    }

    /**
     * Log a token operation to the audit output channel.
     * 
     * @param operation - The type of operation being performed
     * @param success - Whether the operation succeeded
     * @param details - Optional details about the operation (MUST NOT contain token values)
     * @param errorCode - Optional error code for failed operations
     */
    log(operation: AuditOperation, success: boolean, details?: string, errorCode?: string): void {
        const entry: AuditLogEntry = {
            timestamp: new Date().toISOString(),
            operation,
            success,
            details,
            errorCode
        };

        const message = this.formatLogEntry(entry);
        this.outputChannel.appendLine(message);
    }

    /**
     * Format a log entry for output.
     * Format: [ISO8601_TIMESTAMP] OPERATION SUCCESS/FAILED - details (errorCode: CODE)
     * 
     * @param entry - The audit log entry to format
     * @returns Formatted log message string
     */
    private formatLogEntry(entry: AuditLogEntry): string {
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
     * Show the audit log output channel to the user.
     */
    show(): void {
        this.outputChannel.show();
    }

    /**
     * Dispose of the output channel resources.
     * Should be called when the extension is deactivated.
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
}

# Implementation Plan: Enterprise Secure Token Storage

## ⚠️ MANDATORY - READ BEFORE EVERY TASK ⚠️

**YOU MUST FOLLOW THESE RULES FOR EVERY TASK:**

1. **Shell Commands**: Use `controlPwshProcess` ONLY. NEVER use `executePwsh`.
2. **Gap Analysis**: Perform TWO gap analysis passes BEFORE marking any task complete.
3. **Show Your Work**: Gap analysis must be visible in your response.

If you skip any of these, you have violated the protocol.

---

## Overview

This plan implements secure GitHub token storage using the SecretStorage API, migrating from plaintext settings storage. The implementation adds token management commands, audit logging, and enterprise-grade security features for ISO 27001/42001 compliance.

## Development Principles

**IMPORTANT**: Follow these principles strictly during implementation:

1. **Build ugly and working before making it clean**
   - Get it working first
   - Refactor later if needed
   - Don't optimize prematurely

2. **If something isn't specified, ask - don't invent**
   - No assumptions
   - No "improvements"
   - No "I noticed we could also..."

3. **Build exactly what's specified. Nothing more.**
   - No extra features
   - No extra abstractions
   - No extra config options

4. **Stop and ask if stuck for 10+ minutes**
   - Don't waste time debugging hallucinated APIs
   - Use Context7 to check library docs
   - Ask for clarification on ambiguous requirements

5. **Property tests are optional for MVP**
   - Tasks marked with `*` can be skipped
   - Focus on getting core functionality working
   - Add comprehensive tests in v2

## Non-Requirements (What NOT to Build)

To maintain simplicity and focus, this implementation explicitly **DOES NOT** include:

❌ Token expiry warnings or rotation reminders
❌ Multi-repository token support
❌ Proxy or corporate firewall configuration
❌ Token scope validation against GitHub API
❌ Session timeout or auto-lock features
❌ Certificate pinning
❌ External telemetry or analytics
❌ GitHub App authentication (PATs only)

**System Characteristics:**

✅ SecretStorage API for encrypted token storage
✅ Automatic migration from plaintext settings
✅ Token format validation (ghp_*, github_pat_*, etc.)
✅ Audit logging to output channel
✅ Dynamic token updates without restart
✅ Clear error messages for authentication failures

## Context7 MCP Usage (CRITICAL)

**Before writing ANY code that uses a library, query Context7 for current documentation.**

**Required libraries to query Context7 for:**

- `vscode` - SecretStorage API, commands, output channels, input boxes
- `fast-check` - Property-based testing generators and assertions

**Don't assume you know the API. Don't use outdated patterns. Check Context7 first.**

**Example Context7 queries:**

- "vscode SecretStorage API store get delete"
- "vscode extension context secrets"
- "fast-check property testing string generators"

---

## Tasks

### Phase 1: Core Infrastructure

- [x] 1. Create AuditLogger service
  - [x] 1.1 Create `src/services/AuditLogger.ts` with AuditOperation enum (SET, CLEAR, MIGRATE, ACCESS, VALIDATE) and AuditLogEntry interface including success: boolean and optional errorCode fields (Req 4.3, 4.5)
  - [x] 1.2 Implement log() method with ISO 8601 timestamp formatting, ensuring token values are NEVER included in log output (Req 4.2, 4.4)
  - [x] 1.3 Create dedicated output channel "Steering Docs Security Audit" (Req 4.1)
  - [x] 1.4 Implement show() and dispose() methods

- [x] 2. Create token types and interfaces
  - [x] 2.1 Add TokenValidationResult, TokenType, TokenInfo interfaces to `src/models/types.ts`
  - [x] 2.2 Add TOKEN_PATTERNS regex map for all GitHub token formats
  - [x] 2.3 Add RateLimitInfo interface
  - [x] 2.4 Add TokenErrorCode enum

### Phase 2: TokenManager Service

- [x] 3. Create TokenManager service
  - [x] 3.1 Create `src/services/TokenManager.ts` with constructor accepting SecretStorage, config, AuditLogger, and globalState
  - [x] 3.2 Implement validateTokenFormat() method with pattern matching for ghp_*, gho_*, github_pat_*, and 40-char hex formats, returning clear error message explaining expected formats when invalid (Req 3.1, 3.2)
  - [x] 3.3 Implement getToken() with: SecretStorage-first resolution, try/catch for failures, call migrateFromSettings() if settings token exists, log ACCESS operation, settings fallback with security warning, suggest re-entering token on unexpected failure, graceful return of undefined if both fail without crashing (Req 1.1, 1.2, 1.4, 1.5, 4.1, 8.1, 8.2, 8.3)
  - [x] 3.4 Implement setToken() with format validation, log SET operation, and warning (not blocking) on API validation failure (Req 3.4, 4.1)
  - [x] 3.5 Implement clearToken() with log CLEAR operation and confirmation message after deletion (Req 2.3, 4.1)
  - [x] 3.6 Implement checkTokenStatus() with optional API validation via log VALIDATE operation, returning username and rate limit info (Req 2.5, 3.3, 3.5, 4.1)
  - [x] 3.7 Implement migrateFromSettings() called during activation, with one-time notice using globalState flag, warning user to remove token from settings.json, log MIGRATE operation (Req 1.2, 1.3, 4.1, 6.3)
  - [x] 3.8 Set up onDidChange listener filtering for specific secret key and expose onTokenChange event (Req 5.3)

### Phase 3: GitHubClient Modifications

- [x] 4. Modify GitHubClient for dynamic tokens
  - [x] 4.1 Change constructor to accept TokenProvider function instead of static token
  - [x] 4.2 Update makeRequest() to call TokenProvider for each request, proceeding without Authorization header if token is undefined (Req 5.4)
  - [x] 4.3 Add error classification for 401 (invalid/expired token) and 403 (check X-RateLimit-Remaining to distinguish rate limit vs insufficient permissions) (Req 7.2, 7.3, 7.4)

### Phase 4: Commands

- [x] 5. Create token management commands
  - [x] 5.1 Create `src/commands/tokenCommands.ts` with handleSetToken(), handleClearToken(), handleCheckTokenStatus() - handleSetToken MUST use `password: true` in showInputBox and call validateTokenFormat() before storing (Req 2.1, 2.2)
  - [x] 5.2 Implement scope guidance dialog in handleSetToken() before token input, specifying: "repo" scope for private repos, no scopes needed for public repos (Req 7.1)
  - [x] 5.3 Add confirmation dialog in handleClearToken() and show "Token cleared successfully" message after deletion (Req 2.3)
  - [x] 5.4 Implement handleCheckTokenStatus() with progress indicator, then display result showing: whether token is configured, validation status, username if valid, rate limit info (Req 2.4, 2.5)

- [x] 6. Register commands in extension.ts
  - [x] 6.1 Register steeringDocs.setToken command
  - [x] 6.2 Register steeringDocs.clearToken command
  - [x] 6.3 Register steeringDocs.checkTokenStatus command
  - [x] 6.4 Wire up TokenManager and TreeProvider to commands

### Phase 5: Integration

- [x] 7. Update extension activation
  - [x] 7.1 Create AuditLogger instance in activate()
  - [x] 7.2 Create TokenManager instance with context.secrets and context.globalState
  - [x] 7.3 Update GitHubClient instantiation to use TokenManager.getToken as provider
  - [x] 7.4 Subscribe to TokenManager.onTokenChange to refresh TreeProvider
  - [x] 7.5 Add disposables for AuditLogger and TokenManager

- [x] 8. Update package.json
  - [x] 8.1 Add deprecation message (directing users to "Set GitHub Token" command) and ignoreSync: true to githubToken setting (Req 6.1, 6.2, 6.4)
  - [x] 8.2 Add steeringDocs.setToken command definition
  - [x] 8.3 Add steeringDocs.clearToken command definition
  - [x] 8.4 Add steeringDocs.checkTokenStatus command definition

### Phase 6: Testing

- [x] 9. Unit tests
  - [x] 9.1 Create `src/test/suite/tokenManager.test.ts` with tests for getToken resolution order
  - [x] 9.2 Add tests for validateTokenFormat() with valid and invalid tokens
  - [x] 9.3 Add tests for migration flow
  - [x] 9.4 Create `src/test/suite/auditLogger.test.ts` with format verification tests

- [x] 10. Property-based tests (optional)

  - [x] 10.1 Create `src/test/properties/tokenValidation.property.ts` for Property 4

  - [x] 10.2 Create `src/test/properties/auditLogFormat.property.ts` for Property 6


### Phase 7: Documentation

- [x] 11. Update documentation
  - [x] 11.1 Update README.md with new token management commands
  - [x] 11.2 Update GITHUB_TOKEN_SETUP.md to reference SecretStorage and new commands
  - [x] 11.3 Add note about upstream SecretStorage issue #193301
  - [x] 11.4 Update CHANGELOG.md with security enhancement entry

---

## Task Dependencies

```
1 (AuditLogger) ──┐
                  ├──▶ 3 (TokenManager) ──▶ 4 (GitHubClient) ──┐
2 (Types) ────────┘                                            │
                                                               ├──▶ 7 (Integration) ──▶ 9 (Tests)
5 (Commands) ──────────────────────────────────────────────────┤
                                                               │
6 (Register) ──────────────────────────────────────────────────┘
                                                               
8 (package.json) ──▶ 7 (Integration)

11 (Docs) - Can be done in parallel after Phase 5
```

## Verification Checklist

After completing all tasks, verify:

- [x] Token stored in SecretStorage, not settings.json
- [x] Migration from settings works with one-time notice
- [x] "Set GitHub Token" command shows scope guidance
- [x] "Clear GitHub Token" command requires confirmation
- [x] "Check Token Status" shows username and rate limit
- [x] Audit log shows operations without token values
- [x] Token changes take effect without restart
- [x] 401/403 errors show appropriate messages
- [x] Extension doesn't crash if SecretStorage unavailable


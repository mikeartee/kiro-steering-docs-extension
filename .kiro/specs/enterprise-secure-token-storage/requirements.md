# Requirements Document

## Introduction

This feature migrates GitHub token storage from plaintext settings to the secure SecretStorage API, adding enterprise-grade security features for ISO 27001/42001 compliance. The current implementation stores tokens in `settings.json` which is visible to other extensions, can be synced across machines, and poses a security risk that enterprise security teams will reject.

### Background: GitHub API Rate Limits and Authentication

The extension fetches steering documents from GitHub repositories. Each user's requests count against their own rate limits:

| Authentication | Rate Limit | Use Case |
|---------------|------------|----------|
| Anonymous (no token) | 60 requests/hour | Public repos, light usage |
| Personal Access Token | 5,000 requests/hour | Private repos, heavy usage |

Users provide their own GitHub Personal Access Tokens (PATs) - the extension never uses a shared token. This means:

- 1,000 users = 1,000 separate rate limit quotas
- Each user's token authenticates only their requests
- The extension author's rate limit is never affected

### Token Types Supported

GitHub issues several token formats, all of which this feature supports:

| Format | Pattern | Description |
|--------|---------|-------------|
| Fine-grained PAT | `github_pat_*` | Modern, scoped tokens (recommended) |
| Classic PAT | 40-char hex | Legacy format, still widely used |
| OAuth Token | `gho_*` | From GitHub OAuth Apps |
| GitHub Actions | `ghp_*` | CI/CD tokens |

### Security Problem Being Solved

Current plaintext storage in `settings.json` has these risks:

1. **Visible to other extensions**: Any VS Code extension can read settings
2. **Synced to cloud**: Settings Sync can upload tokens to Microsoft servers
3. **Stored in plaintext**: No encryption, visible in file system
4. **Enterprise non-compliance**: Fails ISO 27001/42001 credential storage requirements

SecretStorage solves these by using the OS credential manager (Windows Credential Manager, macOS Keychain, Linux Secret Service).

## Glossary

- **SecretStorage**: Kiro IDE's secure credential storage API that encrypts secrets using the operating system's credential manager (Windows Credential Manager, macOS Keychain, Linux Secret Service/libsecret)
- **Token_Manager**: Service responsible for secure token storage, retrieval, migration, and lifecycle management
- **GitHub_Client**: Service that makes authenticated requests to the GitHub API
- **Audit_Logger**: Component that logs security-relevant operations to the VS Code output channel
- **Token_Provider**: Function type that asynchronously retrieves the current token, enabling dynamic token updates
- **Plaintext_Token**: Legacy token stored in `settings.json` (deprecated, security risk)
- **Tree_Provider**: Tree view provider that displays steering documents in the Kiro IDE sidebar
- **PAT**: Personal Access Token - a GitHub credential that grants API access
- **Rate_Limit**: GitHub's throttling mechanism (60/hour anonymous, 5000/hour authenticated)
- **Fine_Grained_PAT**: Modern GitHub token format with granular permission scopes

## Requirements

### Requirement 1: SecretStorage Migration

**User Story:** As a security-conscious user, I want my GitHub token stored securely using VS Code's SecretStorage API, so that my credentials are encrypted and protected from unauthorized access.

#### Acceptance Criteria

1. WHEN the extension activates, THE Token_Manager SHALL attempt to retrieve the token from SecretStorage first
2. WHEN no token exists in SecretStorage but a Plaintext_Token exists in settings, THE Token_Manager SHALL automatically migrate the token to SecretStorage
3. WHEN a token is successfully migrated from settings, THE Token_Manager SHALL display a warning message instructing the user to remove the Plaintext_Token from settings.json
4. WHEN SecretStorage operations fail, THE Token_Manager SHALL handle the failure gracefully and log the error without crashing the extension
5. IF SecretStorage is unavailable, THEN THE Token_Manager SHALL fall back to reading from settings with a warning about reduced security

### Requirement 2: Token Management Commands

**User Story:** As a user, I want dedicated commands to manage my GitHub token, so that I can securely set, clear, and verify my authentication credentials.

#### Acceptance Criteria

1. WHEN a user executes the "Set GitHub Token" command, THE Token_Manager SHALL display a secure input box with password masking
2. WHEN a user provides a token via the "Set GitHub Token" command, THE Token_Manager SHALL validate the token format before storing
3. WHEN a user executes the "Clear GitHub Token" command, THE Token_Manager SHALL remove the token from SecretStorage and confirm the deletion
4. WHEN a user executes the "Check Token Status" command, THE Token_Manager SHALL display whether a token is configured and its validation status
5. WHEN the "Check Token Status" command runs, THE Token_Manager SHALL test the token against the GitHub API to verify it works

### Requirement 3: Token Validation

**User Story:** As a user, I want my token validated before storage, so that I don't accidentally store invalid credentials that will cause authentication failures.

#### Acceptance Criteria

1. WHEN a token is provided for storage, THE Token_Manager SHALL validate that it matches the expected GitHub token format (ghp_*, gho_*, github_pat_*, or classic 40-character hex)
2. WHEN a token format is invalid, THE Token_Manager SHALL reject the token and display a clear error message explaining the expected format
3. WHEN a token format is valid, THE Token_Manager SHALL optionally test the token against the GitHub API
4. WHEN API validation fails, THE Token_Manager SHALL warn the user but still allow storing the token (network issues shouldn't block storage)
5. WHEN API validation succeeds, THE Token_Manager SHALL display the authenticated username and rate limit information

### Requirement 4: Audit Logging

**User Story:** As an enterprise administrator, I want security-relevant token operations logged, so that I can audit credential usage for ISO 27001/42001 compliance.

#### Acceptance Criteria

1. WHEN any token operation occurs (set, clear, migrate, access), THE Audit_Logger SHALL log the operation to a dedicated output channel
2. WHEN logging token operations, THE Audit_Logger SHALL include a timestamp in ISO 8601 format
3. WHEN logging token operations, THE Audit_Logger SHALL include the operation type (SET, CLEAR, MIGRATE, ACCESS, VALIDATE)
4. WHEN logging token operations, THE Audit_Logger SHALL never include the actual token value or any portion of it
5. WHEN logging validation results, THE Audit_Logger SHALL include success/failure status and any error codes

### Requirement 5: Dynamic Token Updates

**User Story:** As a user, I want token changes to take effect immediately without restarting Kiro IDE, so that I can update my credentials seamlessly.

#### Acceptance Criteria

1. WHEN the token changes in SecretStorage, THE GitHub_Client SHALL use the new token for subsequent requests without requiring a restart
2. WHEN the token changes, THE Tree_Provider SHALL refresh to reflect the new authentication state
3. WHEN listening for SecretStorage changes, THE Token_Manager SHALL only respond to changes for its specific secret key
4. WHEN the token is cleared, THE GitHub_Client SHALL fall back to unauthenticated requests with reduced rate limits

### Requirement 6: Deprecation of Plaintext Setting

**User Story:** As a user migrating from the old token storage, I want clear guidance that the plaintext setting is deprecated, so that I understand the security implications and migration path.

#### Acceptance Criteria

1. THE package.json configuration SHALL mark the githubToken setting with a deprecation message
2. THE package.json configuration SHALL set ignoreSync: true on the githubToken setting to prevent token syncing
3. WHEN a Plaintext_Token is detected during activation, THE Token_Manager SHALL display a one-time migration notice
4. THE deprecation message SHALL direct users to use the "Set GitHub Token" command instead

### Requirement 7: Enterprise Security Considerations

**User Story:** As an enterprise user, I want clear documentation of required token scopes and proper error handling for authentication failures, so that I can configure tokens correctly for private repository access.

#### Acceptance Criteria

1. WHEN displaying token setup guidance, THE Token_Manager SHALL list the required GitHub token scopes (repo for private repos, or no scopes for public repos)
2. WHEN authentication fails with a 401 error, THE GitHub_Client SHALL display a clear message indicating invalid or expired token
3. WHEN authentication fails with a 403 error, THE GitHub_Client SHALL distinguish between rate limiting and insufficient permissions
4. WHEN accessing private repositories, THE GitHub_Client SHALL provide clear error messages if the token lacks required scopes

### Requirement 8: Known VS Code SecretStorage Issues

**User Story:** As a user, I want the extension to handle known SecretStorage bugs gracefully, so that I don't lose access to my repositories after IDE updates.

#### Acceptance Criteria

1. IF SecretStorage returns undefined for a previously stored token, THEN THE Token_Manager SHALL check for a Plaintext_Token fallback
2. WHEN SecretStorage fails unexpectedly, THE Token_Manager SHALL log the error and suggest re-entering the token
3. THE Token_Manager SHALL NOT crash or block extension activation if SecretStorage is unavailable
4. WHEN a user reports missing token after IDE update, THE extension documentation SHALL reference the known upstream issue (#193301)


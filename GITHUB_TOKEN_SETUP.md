# GitHub Token Setup

## Why Use a GitHub Token?

GitHub API has rate limits:

- **Without token**: 60 requests/hour
- **With token**: 5,000 requests/hour

If you're actively browsing and installing steering documents, you'll hit the limit quickly. Adding a token solves this.

## Secure Token Storage

This extension uses the **SecretStorage API** to store your GitHub token securely. Your token is encrypted using your operating system's credential manager:

- **Windows**: Windows Credential Manager
- **macOS**: Keychain
- **Linux**: Secret Service (libsecret)

This means your token is:

- ✅ Encrypted at rest
- ✅ Never synced to the cloud
- ✅ Protected from other extensions
- ✅ Compliant with enterprise security requirements (ISO 27001/42001)

## Setup Steps

### 1. Generate a GitHub Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)" or "Generate new token (fine-grained)"
3. Give it a name like "Kiro Steering Docs"
4. Select scopes:
   - **For public repos only**: Leave all scopes unchecked (read-only access is default)
   - **For private repos**: Check `repo` scope
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again)

### Supported Token Formats

| Format | Pattern | Description |
|--------|---------|-------------|
| Fine-grained PAT | `github_pat_*` | Modern, scoped tokens (recommended) |
| Classic PAT | `ghp_*` | Classic personal access tokens |
| OAuth Token | `gho_*` | From GitHub OAuth Apps |
| Legacy | 40-char hex | Legacy format, still supported |

### 2. Store Token Using Command

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **"Steering Docs: Set GitHub Token"**
3. Review the scope guidance dialog
4. Paste your token in the secure input box (input is masked)
5. The token is validated and stored securely

### 3. Verify Token Status

Run **"Steering Docs: Check Token Status"** to verify:

- Whether a token is configured
- Token validation against GitHub API
- Your authenticated username
- Current rate limit status

## Token Management Commands

| Command | Description |
|---------|-------------|
| `Steering Docs: Set GitHub Token` | Securely store your GitHub token |
| `Steering Docs: Clear GitHub Token` | Remove your stored token (with confirmation) |
| `Steering Docs: Check Token Status` | Verify token configuration and validity |

## Migration from Legacy Settings

If you previously stored your token in `settings.json` using the `steeringDocs.githubToken` setting:

1. **Automatic migration**: The extension will automatically migrate your token to secure storage on activation
2. **One-time notice**: You'll see a warning to remove the token from settings.json
3. **Remove from settings**: Open settings.json and delete the `steeringDocs.githubToken` line

> ⚠️ **Security Warning**: The `steeringDocs.githubToken` setting is deprecated. Tokens in settings.json are stored in plaintext and may be synced to the cloud. Please use the "Set GitHub Token" command instead.

## Security Features

### Audit Logging

All token operations are logged to the "Steering Docs Security Audit" output channel:

- Token set/clear operations
- Migration events
- Validation attempts
- Access events

Logs include ISO 8601 timestamps and operation status, but **never include the actual token value**.

To view the audit log:

1. Open the Output panel (View → Output)
2. Select "Steering Docs Security Audit" from the dropdown

### Enterprise Compliance

This implementation supports enterprise security requirements:

- **ISO 27001**: Secure credential storage and audit logging
- **ISO 42001**: AI system credential management compliance

## Known Issues

### Token Loss After IDE Updates

VS Code's SecretStorage API has a known issue ([#193301](https://github.com/microsoft/vscode/issues/193301)) that can occasionally cause stored secrets to be lost after IDE updates.

**Workaround**: If your token is missing after an IDE update, simply re-enter it using the "Steering Docs: Set GitHub Token" command.

## Troubleshooting

### Still getting rate limit errors?

- Run "Steering Docs: Check Token Status" to verify your token is configured
- Ensure the token is valid at [GitHub Settings → Tokens](https://github.com/settings/tokens)
- Check the "Steering Docs Security Audit" output channel for errors

### Token not working?

- Verify the token format matches one of the supported patterns
- Try regenerating the token on GitHub
- Run "Steering Docs: Clear GitHub Token" and then "Set GitHub Token" to re-enter

### Token missing after IDE update?

- This is a known VS Code issue ([#193301](https://github.com/microsoft/vscode/issues/193301))
- Re-enter your token using "Steering Docs: Set GitHub Token"

### Private repository access not working?

- Ensure your token has the `repo` scope
- Verify the token hasn't expired
- Check that you have access to the repository on GitHub


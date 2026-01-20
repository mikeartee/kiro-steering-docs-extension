# TODO

## Roadmap

### Private Repository Support
- **Feature**: Enable teams to use extension with private GitHub repositories
- **Status**: Partially implemented (token support exists)
- **Requirements**:
  - Private repos must follow the same schema as public repo
  - YAML frontmatter with required fields (title, description, tags, inclusion)
  - Proper directory structure with categories
  - Metadata files for organization
- **Blockers**:
  - Need migration tool to help teams convert existing docs to schema
  - Need better documentation on schema requirements
  - Need validation/error messages for non-compliant repos
- **Migration Tool Options**:
  1. CLI tool: `npx kiro-steering-migrate ./my-docs`
  2. Extension command: "Import Existing Documents"
  3. Web tool: Upload and convert online
- **Migration Tool Features**:
  - Scan existing markdown files
  - Detect content type (language, topic)
  - Generate frontmatter with sensible defaults
  - Organize into category folders
  - Validate against schema
  - Output validation report
- **Priority**: Medium - valuable for team adoption
- **Design Decision**: Schema-only approach maintains quality and enables features like recommendations, inclusion modes, and update checking

### Secure Token Storage (SecretStorage Migration)

- **Feature**: Migrate GitHub token storage from plaintext settings to VS Code SecretStorage API
- **Status**: Not started
- **Priority**: High for enterprise adoption
- **Current Problem**:
  - Token stored in `settings.json` (plaintext, can be synced, visible to other extensions)
  - Security teams will reject extensions storing tokens in plaintext
  - VS Code docs explicitly warn against this approach

#### Why This Is Not a Simple Change

1. **Timing/Race Condition**: `context.secrets.get()` is async, but tree view registration is sync
   - Tree view registers immediately on activation
   - User might expand tree before token is loaded
   - First request could go out without token

2. **GitHubClient is Immutable**: Token passed in constructor as `readonly`
   - Can't update token after construction
   - Would need to recreate entire service chain if token changes

3. **No Configuration Change Handling**: Currently requires VS Code restart to pick up token changes

4. **Known SecretStorage Issues**: Secrets can disappear after VS Code updates
   - See: https://github.com/microsoft/vscode/issues/193301

#### Implementation Plan

**Phase 1: Create TokenManager Service**

```typescript
// src/services/TokenManager.ts
import * as vscode from 'vscode';

export class TokenManager {
    private static readonly SECRET_KEY = 'steeringDocs.githubToken';
    private static readonly LEGACY_SETTING = 'githubToken';
    
    constructor(
        private readonly secrets: vscode.SecretStorage,
        private readonly config: vscode.WorkspaceConfiguration
    ) {}
    
    async getToken(): Promise<string | undefined> {
        // Try SecretStorage first
        let token = await this.secrets.get(TokenManager.SECRET_KEY);
        
        // Fallback to legacy settings (for migration)
        if (!token) {
            token = this.config.get<string>(TokenManager.LEGACY_SETTING);
            if (token) {
                // Auto-migrate to SecretStorage
                await this.setToken(token);
                // Warn user to remove from settings
                vscode.window.showWarningMessage(
                    'GitHub token migrated to secure storage. Please remove "steeringDocs.githubToken" from settings.json'
                );
            }
        }
        
        return token || undefined;
    }
    
    async setToken(token: string): Promise<void> {
        await this.secrets.store(TokenManager.SECRET_KEY, token);
    }
    
    async deleteToken(): Promise<void> {
        await this.secrets.delete(TokenManager.SECRET_KEY);
    }
}
```

**Phase 2: Modify GitHubClient**

Option A: Make token mutable
```typescript
private token?: string;

setToken(token: string | undefined): void {
    this.token = token;
}
```

Option B: Accept token provider function
```typescript
constructor(
    private readonly repository: string,
    private readonly branch: string = 'main',
    private readonly getToken: () => Promise<string | undefined>
) {}

// In makeRequest:
const token = await this.getToken();
if (token) {
    headers['Authorization'] = `Bearer ${token}`;
}
```

**Phase 3: Add Commands**

```json
{
    "command": "steeringDocs.setToken",
    "title": "Set GitHub Token",
    "category": "Steering Docs"
},
{
    "command": "steeringDocs.clearToken",
    "title": "Clear GitHub Token",
    "category": "Steering Docs"
}
```

**Phase 4: Handle Token Changes**

```typescript
context.secrets.onDidChange(async (e) => {
    if (e.key === 'steeringDocs.githubToken') {
        // Recreate GitHubClient with new token
        // Or call setToken() if using mutable approach
        treeProvider.refresh();
    }
});
```

**Phase 5: Update package.json**

```json
{
    "steeringDocs.githubToken": {
        "type": "string",
        "default": "",
        "description": "DEPRECATED: Use 'Steering Docs: Set GitHub Token' command instead. Token will be migrated automatically.",
        "deprecationMessage": "Use the 'Steering Docs: Set GitHub Token' command for secure storage",
        "ignoreSync": true
    }
}
```

#### Testing Checklist

- [ ] Fresh install (no token) - should work with public repo
- [ ] Migration from settings - token should auto-migrate
- [ ] Token set via command - should work immediately
- [ ] Token change mid-session - should update without restart
- [ ] Private repo access - should authenticate correctly
- [ ] Rate limiting - should get 5000/hour with token
- [ ] Token deletion - should fall back to unauthenticated
- [ ] SecretStorage failure - should handle gracefully

#### References

- VS Code SecretStorage API: https://code.visualstudio.com/api/references/vscode-api#SecretStorage
- VS Code Docs on Persisting Secrets: https://github.com/microsoft/vscode-docs/blob/main/api/advanced-topics/remote-extensions.md
- Stack Overflow Implementation: https://stackoverflow.com/questions/66568692/how-to-use-the-vscode-secretstorage
- Dev.to Tutorial: https://dev.to/kompotkot/how-to-use-secretstorage-in-your-vscode-extensions-2hco
- Known Issue - Secrets Disappearing: https://github.com/microsoft/vscode/issues/193301
- Security Concern - Token Isolation: https://cycode.com/blog/exposing-vscode-secrets/

#### Estimated Effort

- TokenManager service: 1 hour
- GitHubClient modifications: 30 minutes
- Commands and UI: 1 hour
- Migration logic: 30 minutes
- Testing: 1-2 hours
- **Total**: 4-5 hours

## Known Issues

### Visual Indicator Colors Not Showing
- **Issue**: Colored dots for inclusion modes showing as white instead of green/yellow/blue
- **Current Implementation**: Using `charts.green`, `charts.yellow`, `charts.blue` theme colors
- **Problem**: Theme colors may not be defined or visible in all VS Code themes
- **Potential Solutions**:
  - Use built-in status colors (`testing.iconPassed`, `editorWarning.foreground`, etc.)
  - Use different icon shapes instead of relying on color
  - Create custom SVG icon assets
  - Add emoji/unicode to labels
- **Priority**: Low - functional but not matching description
- **Version**: 0.1.1


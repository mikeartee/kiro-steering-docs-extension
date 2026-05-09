# TODO

## Completed

### Secure Token Storage (SecretStorage Migration) — v0.3.0

- **Status**: ✅ Done (shipped v0.3.0)
- TokenManager service with SecretStorage API
- GitHubClient refactored to accept TokenProvider function (dynamic token updates)
- Token commands: Set, Clear, Check Status (with password masking, format validation)
- AuditLogger for security audit trail
- Auto-migration from legacy `steeringDocs.githubToken` setting
- Token change listener refreshes tree view without restart
- Legacy setting deprecated with `ignoreSync: true`

### Visual Indicator Colors — v0.1.1 / v0.2.0 / v0.4.0

- **Status**: ✅ Iterated on across multiple releases
- v0.1.1: Colored dots (green/yellow/blue) for inclusion modes
- v0.2.0: Simplified to green (always), yellow (fileMatch), outline (manual/not installed)
- v0.4.0: Orange icon for update-available state
- **Known limitation**: ThemeIcon colors may not render consistently across all VS Code themes

## Roadmap

### Private Repository Support

- **Feature**: Enable teams to use extension with private GitHub repositories
- **Status**: Partially implemented (token auth works, schema tooling missing)
- **What works**:
  - Token authentication for private repo API access
  - Same browsing/install/update flow as public repos
- **What's missing**:
  - Migration tool to help teams convert existing docs to required schema
  - Validation/error messages for non-compliant repos
  - Documentation on schema requirements for private repo setup
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
- **Priority**: Medium — valuable for team adoption
- **Design Decision**: Schema-only approach maintains quality and enables features like recommendations, inclusion modes, and update checking


# Changelog

All notable changes to the "Kiro Steering Documents Browser" extension will be documented in this file.

## [0.4.2]

### Fixed

- Removed `js-yaml` runtime dependency — replaced with inline YAML parser to fix activation failure (`Cannot find module 'js-yaml'`) caused by missing bundler
- Tightened frontmatter types from `Record<string, any>` to `Record<string, unknown>` with proper type narrowing

## [0.4.1]

### Fixed
- VSIX package no longer bundles `node_modules/`, `out/test/`, `.kiro/`, `.husky/`, `.claude/`, workspace files, or dev-only markdown docs — package size reduced from ~1MB to ~162KB

## [0.4.0] - 2025-01-23

### Added

- **Actionable Update Notifications**: Notifications now show which files have updates (e.g., "2 updates available: file1.md, file2.md")
  - "View Updates" button opens Quick Pick to select which files to update
  - Manual "Check for Updates" command offers "Update All" or "Select Updates" options
- **Visual Update Indicators**: Orange icon indicates a document has an update available
  - Orange takes priority over inclusion mode colors when update is available
  - Description shows version diff when update available (e.g., "1.0.0 -> 1.1.0")

### Fixed

- **Skip Files Without SHA**: Files without SHA in frontmatter are now skipped during update detection
  - Prevents false "updates available" notifications for local-only files

### Changed

- Removed emojis from tooltips (not supported in Kiro tree view)

## [0.3.3] - 2025-01-21

### Fixed

- Fixed document update menu not appearing (restored `document-update-available` context value)
- Update command now correctly shows in context menu for documents with available updates

## [0.3.2] - 2025-01-21

### Fixed

- Fixed VSIX packaging to include `node_modules` dependencies
- Extension now activates correctly (was failing due to missing `js-yaml` module)

## [0.3.1] - 2025-01-21

### Changed

- Improved `.gitignore` to exclude user-specific settings (`.claude/`, `.kiro/settings/`)
- Updated `.vscodeignore` to exclude sensitive files from VSIX package

### Fixed

- Removed sensitive files from git tracking

## [0.3.0] - 2025-01-21

### Added

- **Secure Token Storage**: GitHub tokens are now stored securely using the SecretStorage API
  - Tokens are encrypted using the OS credential manager (Windows Credential Manager, macOS Keychain, Linux Secret Service)
  - Tokens are never synced to the cloud
  - Compliant with enterprise security requirements (ISO 27001/42001)
- **Token Management Commands**:
  - `Steering Docs: Set GitHub Token` - Securely store your GitHub Personal Access Token
  - `Steering Docs: Clear GitHub Token` - Remove your stored token from secure storage
  - `Steering Docs: Check Token Status` - Verify token configuration and test validity against GitHub API
- **Audit Logging**: Security-relevant token operations are logged to the "Steering Docs Security Audit" output channel
  - Logs include ISO 8601 timestamps and operation status
  - Token values are never included in logs
- **Automatic Migration**: Tokens stored in the legacy `steeringDocs.githubToken` setting are automatically migrated to secure storage
- **Token Format Validation**: Validates GitHub token formats (ghp_*, github_pat_*, gho_*, ghs_*, 40-char hex) before storage

### Changed

- **Dynamic Token Updates**: Token changes take effect immediately without requiring IDE restart
- **Improved Error Messages**: Clear, actionable error messages for authentication failures (401/403)

### Deprecated

- The `steeringDocs.githubToken` setting is now deprecated
  - Tokens in settings.json are stored in plaintext and may be synced to the cloud
  - Use the "Steering Docs: Set GitHub Token" command instead
  - Setting now has `ignoreSync: true` to prevent accidental cloud sync

### Security

- Addresses enterprise security requirements for credential storage
- Tokens are no longer visible to other extensions
- Audit trail for compliance reporting

## [0.2.0] - 2025-01-29

### Added
- AI-powered document recommendations based on workspace analysis
- Smart recommendation scoring system that analyzes:
  - Package.json dependencies and dev dependencies
  - Programming languages used in the workspace
  - Test frameworks and linting tools
  - File types and patterns
- Multi-select Quick Pick interface for bulk document activation
- Smart default inclusion modes based on document metadata
- Bulk activation with progress tracking
- Integration with Kiro sidebar view container

### Changed
- Extension now appears in Kiro sidebar instead of separate view
- Streamlined recommendation workflow - direct activation from Quick Pick
- Improved icon indicators: Green (always), Yellow (fileMatch), Outline (manual/not installed)
- Removed visual clutter from recommendation Quick Pick for cleaner UX

### Fixed
- Recommendation system now properly handles empty workspaces
- Bulk activation correctly skips already-installed documents

## [0.1.9] - 2025-11-25

### Changed
- Updated extension icon with new design

## [0.1.8] - 2025-11-24

### Fixed
- Fixed double layering in tree view where category folders were duplicated
- Tree view now correctly strips category prefix from document paths
- Documents in `agents/file.md` now appear directly under "Agents" category instead of "Agents" → "agents" → "file.md"
- Improved folder hierarchy display for cleaner navigation

## [0.1.7] - 2025-11-24

### Added
- Hierarchical folder tree view for nested document structures
- Visual folder organization within categories in the tree view
- Support for arbitrary nesting depth in folder structures
- Folder icons and collapsible folder nodes for better navigation

### Changed
- Tree view now displays documents organized in their folder hierarchy
- Documents in subdirectories are shown under their parent folders
- Improved visual organization for large document collections with nested structures

### Fixed
- Document installation now correctly creates subdirectories
- Update detection properly matches documents by their full path
- Uninstall operations work correctly for documents in subdirectories

## [0.1.6] - 2025-11-24

### Added
- Recursive directory traversal for fetching documents from GitHub
- Support for nested folder structures in the remote repository (e.g., `agents/bmad/`, `code-formatting/languages/`)

### Changed
- Extension now discovers documents at any depth within category folders
- Improved organization support for large document collections

## [0.1.1] - 2025-11-12

### Fixed
- Fixed visual indicators for document inclusion modes to match description
  - Changed from checkmarks to colored dots
  - 🟢 Green dot for "Always" documents
  - 🟡 Yellow dot for "File Match" documents
  - 🔵 Blue dot for "Manual" documents
  - ⭕ Outline circle for not installed documents

## [0.1.0] - 2025-11-12

### Added
- Initial release
- Browse steering documents from GitHub repository
- Preview document content before installation
- Install documents to local `.kiro/steering/` directory
- Manage document inclusion modes (always, manual, fileMatch)
- Check for and install updates to installed documents
- Quick load documents with automatic activation
- Tree view in Explorer sidebar with category organization


# Changelog

All notable changes to the "Kiro Steering Documents Browser" extension will be documented in this file.

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


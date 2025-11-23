# Changelog

All notable changes to the "Kiro Steering Documents Browser" extension will be documented in this file.

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


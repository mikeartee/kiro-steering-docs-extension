# Requirements Document

## Introduction

Fix the filename collision bug where multiple README.md files from different categories overwrite each other when users toggle them on/off. The extension should exclude README.md files from the browsable document list since they are repository documentation, not steering documents.

## Glossary

- **Extension**: The Kiro Steering Documents Browser VS Code extension
- **Steering Document**: A markdown file with frontmatter that provides guidance to Kiro AI
- **README.md**: Repository documentation files that exist in category folders for GitHub browsing purposes
- **Document List**: The tree view showing available steering documents organized by category

## Requirements

### Requirement 1

**User Story:** As a user, I want to install multiple steering documents from different categories without them conflicting, so that I can use guidance from various sources simultaneously

#### Acceptance Criteria

1. WHEN the Extension fetches the document list from GitHub, THE Extension SHALL exclude files named "README.md" from the results
2. WHEN a user browses available documents in the tree view, THE Extension SHALL NOT display README.md files
3. WHEN the Extension processes markdown files in category directories, THE Extension SHALL only include files that are not named "README.md"

### Requirement 2: Backward Compatibility

**User Story:** As a user, I want the extension to continue working with all existing steering documents, so that the bug fix doesn't break my current workflow

#### Acceptance Criteria for Backward Compatibility

1. WHEN the Extension fetches documents after the fix, THE Extension SHALL continue to fetch and display all non-README.md steering documents
2. WHEN a user installs a steering document after the fix, THE Extension SHALL save it to `.kiro/steering/` using the same filename as before
3. WHEN the Extension checks for updates after the fix, THE Extension SHALL continue to detect version changes for installed documents

### Requirement 3: Implementation Simplicity

**User Story:** As a developer, I want the fix to be minimal and focused, so that it doesn't introduce new bugs or complexity

#### Acceptance Criteria for Implementation

1. THE Extension SHALL implement the README.md exclusion with a single filter condition in the document fetching logic
2. THE Extension SHALL NOT modify the file installation, update, or uninstall logic
3. THE Extension SHALL NOT change how non-README.md files are processed or displayed


# Requirements Document

## Introduction

This document specifies the requirements for enhancing the Kiro Steering Documents Browser extension with simplified toggle functionality, proper Kiro sidebar integration, and marketplace publishing readiness. The extension is currently functional but needs refinements for production release and better user experience.

## Glossary

- **Extension**: The Kiro Steering Documents Browser VS Code extension
- **Steering Document**: A markdown file containing guidance or rules for Kiro AI assistant
- **Toggle**: A simple on/off action to install/activate or uninstall a steering document
- **Kiro Sidebar**: The dedicated view container in Kiro IDE where Kiro-specific extensions display their UI
- **Tree View**: The hierarchical UI component displaying steering documents
- **Marketplace**: The VS Code/Kiro extension marketplace where users discover and install extensions
- **VSIX Package**: The packaged extension file format for distribution

## Requirements

### Requirement 1

**User Story:** As a developer, I want a simple toggle switch for each steering document, so that I can quickly enable or disable documents without complex menu navigation.

#### Acceptance Criteria

1. THE Extension SHALL display a toggle control for each steering document in the Tree View
2. WHEN a document is not installed and the user activates the toggle, THE Extension SHALL install the document with inclusion mode set to "always"
3. WHEN a document is installed and the user deactivates the toggle, THE Extension SHALL uninstall the document by deleting it from the Local Steering Directory
4. THE Extension SHALL display visual feedback indicating the toggle state (on/off) for each document
5. THE Extension SHALL show a notification confirming the toggle action was successful

### Requirement 2

**User Story:** As a developer using Kiro IDE, I want the steering documents browser to appear in the Kiro sidebar, so that all Kiro-related tools are organized in one place.

#### Acceptance Criteria

1. THE Extension SHALL register its Tree View in the "kiro" view container
2. THE Extension SHALL appear in the Kiro sidebar alongside other Kiro extensions
3. THE Extension SHALL NOT appear in the Explorer sidebar
4. THE Extension SHALL maintain all existing functionality when displayed in the Kiro sidebar
5. THE Extension SHALL use appropriate Kiro-themed icons and styling

### Requirement 3

**User Story:** As an extension publisher, I want to prepare the extension for marketplace distribution, so that other Kiro users can discover and install it.

#### Acceptance Criteria

1. THE Extension SHALL have a complete README.md with usage instructions, screenshots, and feature descriptions
2. THE Extension SHALL include appropriate metadata in package.json (publisher, repository, keywords, categories)
3. THE Extension SHALL have an icon that represents the extension's purpose
4. THE Extension SHALL be packaged as a valid VSIX file
5. THE Extension SHALL include a LICENSE file with appropriate licensing terms

### Requirement 4

**User Story:** As a developer, I want to see clear visual indicators of document state, so that I understand which documents are active in my current workspace.

#### Acceptance Criteria

1. THE Extension SHALL display a distinct icon for installed and active documents
2. THE Extension SHALL display a distinct icon for available but not installed documents
3. THE Extension SHALL show document count badges or summary information
4. THE Extension SHALL maintain the existing filter functionality for showing active documents only
5. THE Extension SHALL update visual indicators immediately after toggle actions

### Requirement 5

**User Story:** As a developer, I want the extension to handle edge cases gracefully, so that I don't lose work or encounter errors during toggle operations.

#### Acceptance Criteria

1. IF a document file is manually modified by the user, THEN THE Extension SHALL preserve those modifications when toggling off and on again
2. IF the Local Steering Directory is deleted manually, THEN THE Extension SHALL recreate it when installing documents
3. IF a toggle operation fails, THEN THE Extension SHALL display an error message and revert the toggle state
4. THE Extension SHALL prevent rapid repeated toggle actions that could cause race conditions
5. THE Extension SHALL handle network failures gracefully when fetching documents for installation

# Requirements Document

## Introduction

This document specifies the requirements for a VS Code extension that enables users to browse, preview, and install steering documents from a GitHub repository (https://github.com/mikeartee/kiro-steering-docs) into their local `.kiro/steering/` directory. The extension provides a tree view interface for document discovery and management, with support for updates when new versions become available.

## Glossary

- **Extension**: The VS Code extension being developed
- **Steering Document**: A markdown file containing guidance or rules stored in the GitHub repository
- **Tree View**: A hierarchical UI component in VS Code that displays items in an expandable/collapsible structure
- **GitHub Repository**: The remote repository at https://github.com/mikeartee/kiro-steering-docs containing steering documents
- **Local Steering Directory**: The `.kiro/steering/` directory in the user's workspace
- **Category**: A logical grouping of steering documents based on their purpose or domain
- **Document Metadata**: Information about a steering document including version, category, and description
- **Frontmatter**: YAML metadata at the beginning of a markdown file that configures document behavior
- **Inclusion Mode**: A frontmatter property that determines when Kiro loads a steering document (always, manual, or fileMatch)
- **Quick Load**: An action that installs a document and immediately makes it available to Kiro's agent context

## Requirements

### Requirement 1

**User Story:** As a developer, I want to browse available steering documents from the GitHub repository, so that I can discover what guidance is available for my project.

#### Acceptance Criteria

1. WHEN the Extension activates, THE Extension SHALL fetch the list of steering documents from the GitHub Repository
2. THE Extension SHALL display steering documents in a Tree View organized by Category
3. THE Extension SHALL show document names and categories in the Tree View
4. IF the GitHub Repository is unreachable, THEN THE Extension SHALL display an error message to the user
5. THE Extension SHALL refresh the document list when the user triggers a refresh action

### Requirement 2

**User Story:** As a developer, I want to preview a steering document before installing it, so that I can understand its content and decide if it's relevant to my needs.

#### Acceptance Criteria

1. WHEN the user selects a steering document in the Tree View, THE Extension SHALL fetch the document content from the GitHub Repository
2. THE Extension SHALL display the document content in a VS Code editor tab with markdown preview
3. THE Extension SHALL show the document in read-only mode during preview
4. IF the document fetch fails, THEN THE Extension SHALL display an error message to the user

### Requirement 3

**User Story:** As a developer, I want to install selected steering documents to my local workspace, so that I can use them in my Kiro configuration.

#### Acceptance Criteria

1. WHEN the user triggers an install action on a steering document, THE Extension SHALL download the document from the GitHub Repository
2. THE Extension SHALL save the document to the Local Steering Directory with its original filename
3. IF the Local Steering Directory does not exist, THEN THE Extension SHALL create the directory before saving
4. THE Extension SHALL display a success notification when the document is installed
5. IF a document with the same filename already exists, THEN THE Extension SHALL prompt the user to confirm overwrite

### Requirement 4

**User Story:** As a developer, I want to know when updates are available for my installed steering documents, so that I can keep my guidance up to date.

#### Acceptance Criteria

1. THE Extension SHALL compare installed document versions with versions in the GitHub Repository
2. WHEN an installed document has a newer version available, THE Extension SHALL display an update indicator in the Tree View
3. THE Extension SHALL provide an action to update a specific document to the latest version
4. WHEN the user triggers an update action, THE Extension SHALL download and replace the local document with the new version
5. THE Extension SHALL display a notification confirming successful update

### Requirement 5

**User Story:** As a developer, I want the extension to handle network errors gracefully, so that I can continue working even when the GitHub repository is unavailable.

#### Acceptance Criteria

1. IF a network request to the GitHub Repository fails, THEN THE Extension SHALL display a user-friendly error message
2. THE Extension SHALL cache the last successful document list for offline viewing
3. WHEN operating in offline mode, THE Extension SHALL indicate that displayed information may be outdated
4. THE Extension SHALL retry failed requests when the user triggers a manual refresh
5. THE Extension SHALL timeout network requests after 30 seconds to prevent indefinite waiting

### Requirement 6

**User Story:** As a developer, I want to quickly install and activate steering documents in one action, so that I can immediately start using them in my Kiro agent context without manual configuration.

#### Acceptance Criteria

1. THE Extension SHALL provide a quick load action for steering documents
2. WHEN the user triggers a quick load action, THE Extension SHALL download the document to the Local Steering Directory
3. THE Extension SHALL set the Frontmatter inclusion property to "always" for quick loaded documents
4. IF the document already has Frontmatter, THEN THE Extension SHALL preserve existing frontmatter and only update the inclusion property
5. THE Extension SHALL display a notification confirming the document is active in Kiro's agent context

### Requirement 7

**User Story:** As a developer, I want to manage the inclusion mode of installed steering documents, so that I can control when Kiro loads specific guidance into the agent context.

#### Acceptance Criteria

1. THE Extension SHALL display the current Inclusion Mode for each installed document in the Tree View
2. THE Extension SHALL provide actions to change the Inclusion Mode to "always", "manual", or "fileMatch"
3. WHEN the user changes an Inclusion Mode, THE Extension SHALL update the document's Frontmatter
4. IF the document does not have Frontmatter, THEN THE Extension SHALL create valid frontmatter with the selected inclusion mode
5. THE Extension SHALL preserve all other frontmatter properties when updating inclusion mode

### Requirement 8

**User Story:** As a developer, I want to see which steering documents are currently active in my Kiro context, so that I understand what guidance is influencing the agent's behavior.

#### Acceptance Criteria

1. THE Extension SHALL display an indicator in the Tree View for documents with inclusion set to "always"
2. THE Extension SHALL display an indicator in the Tree View for documents with inclusion set to "manual"
3. THE Extension SHALL display an indicator in the Tree View for documents with inclusion set to "fileMatch"
4. THE Extension SHALL group or filter documents by their active status
5. THE Extension SHALL provide a command to show only active steering documents

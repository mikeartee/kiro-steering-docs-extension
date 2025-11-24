# Requirements Document

## Introduction

This feature adds support for organizing steering documents into subdirectories within `.kiro/steering/`, mirroring the folder structure from the remote GitHub repository. Currently, all documents are installed flat into `.kiro/steering/`, but with categories like "agents" being added to the repository, we need to preserve the folder hierarchy to maintain organization and avoid naming conflicts.

## Glossary

- **Extension**: The VS Code extension that manages steering documents
- **Remote Repository**: The GitHub repository containing steering documents (https://github.com/mikeartee/kiro-steering-docs)
- **Local Steering Directory**: The `.kiro/steering/` directory in the user's workspace
- **Category Folder**: A top-level folder in the remote repository (e.g., `/agents`, `/code-quality`)
- **Document Path**: The relative path of a document within the remote repository (e.g., `agents/bmad-spec-converter.md`)
- **Folder Structure**: The hierarchical organization of files and directories

## Requirements

### Requirement 1

**User Story:** As a user, I want documents to be organized in subfolders matching the remote repository structure, so that I can maintain clear organization and avoid naming conflicts.

#### Acceptance Criteria

1. WHEN the Extension installs a document from a category folder THEN the Extension SHALL create the corresponding subdirectory under `.kiro/steering/` if it does not exist
2. WHEN the Extension installs a document with path `agents/bmad-spec-converter.md` THEN the Extension SHALL install it to `.kiro/steering/agents/bmad-spec-converter.md`
3. WHEN multiple documents have the same filename in different categories THEN the Extension SHALL install them to separate subdirectories without conflicts
4. WHEN the Extension creates subdirectories THEN the Extension SHALL preserve the exact folder structure from the Document Path
5. WHEN a subdirectory already exists THEN the Extension SHALL reuse it without error

### Requirement 2

**User Story:** As a user, I want to see my installed documents organized by folder in the tree view, so that I can easily understand the document organization.

#### Acceptance Criteria

1. WHEN the Extension displays installed documents THEN the Extension SHALL scan the Local Steering Directory recursively to find all markdown files
2. WHEN the Extension finds documents in subdirectories THEN the Extension SHALL include them in the installed documents list
3. WHEN the Extension displays the tree view THEN the Extension SHALL show folder nodes for subdirectories containing documents
4. WHEN a user expands a folder node THEN the Extension SHALL display the documents within that folder
5. WHEN the Extension displays a document in a subfolder THEN the Extension SHALL show its relative path from the steering directory

### Requirement 3

**User Story:** As a user, I want document updates to preserve the folder structure, so that my organization remains consistent.

#### Acceptance Criteria

1. WHEN the Extension checks for updates THEN the Extension SHALL match installed documents by their relative path from the Local Steering Directory
2. WHEN the Extension updates a document in a subfolder THEN the Extension SHALL update it in the same subfolder location
3. WHEN the Extension updates a document THEN the Extension SHALL preserve the document's inclusion mode and file match pattern
4. WHEN a remote document moves to a different folder THEN the Extension SHALL detect it as a new document rather than an update

### Requirement 4

**User Story:** As a user, I want to uninstall documents from subfolders, so that I can manage my installed documents regardless of their location.

#### Acceptance Criteria

1. WHEN the Extension uninstalls a document in a subfolder THEN the Extension SHALL remove the document file from that subfolder
2. WHEN the Extension uninstalls the last document in a subfolder THEN the Extension SHALL leave the empty subfolder in place
3. WHEN a user selects a document in a subfolder for uninstallation THEN the Extension SHALL identify it by its relative path from the Local Steering Directory

### Requirement 5

**User Story:** As a developer, I want backward compatibility with existing flat installations, so that users with existing documents don't experience breaking changes.

#### Acceptance Criteria

1. WHEN the Extension scans for installed documents THEN the Extension SHALL find both root-level documents and documents in subfolders
2. WHEN the Extension displays installed documents THEN the Extension SHALL show root-level documents without a folder prefix
3. WHEN a document exists at the root level and a new version exists in a subfolder THEN the Extension SHALL treat them as separate documents
4. WHEN the Extension performs operations on root-level documents THEN the Extension SHALL continue to work without modification

### Requirement 6

**User Story:** As a user, I want the agents category to be available for browsing and installation, so that I can use agent steering documents like bmad-spec-converter.

#### Acceptance Criteria

1. WHEN the Extension fetches the document list THEN the Extension SHALL include documents from the agents category folder
2. WHEN the Extension displays the agents category THEN the Extension SHALL show all markdown files except README.md
3. WHEN a user installs an agent document THEN the Extension SHALL install it to `.kiro/steering/agents/` with the document filename
4. WHEN the Extension displays agent documents in the tree view THEN the Extension SHALL show them under an "Agents" category node

### Requirement 7

**User Story:** As a user, I want to see nested folder structures in the tree view, so that I can navigate deeply nested document hierarchies like `code-formatting/languages/` or `practices/code-quality/`.

#### Acceptance Criteria

1. WHEN the Extension displays a category with nested folders THEN the Extension SHALL show folder nodes for each subdirectory level
2. WHEN a user expands a folder node THEN the Extension SHALL display both subfolders and documents within that folder
3. WHEN the Extension displays a document path like `code-formatting/languages/typescript-formatting.md` THEN the Extension SHALL show it under "Code Formatting" → "languages" → "typescript-formatting.md"
4. WHEN a folder contains only other folders and no documents THEN the Extension SHALL still display the folder node
5. WHEN the Extension builds the tree structure THEN the Extension SHALL support arbitrary nesting depth without hardcoded limits
6. WHEN a user clicks on a folder node THEN the Extension SHALL expand or collapse that folder to show or hide its contents
7. WHEN the Extension displays folder nodes THEN the Extension SHALL use folder icons to distinguish them from document nodes

## Notes

- The current filtering logic (skipping README.md, ignoring docs/templates folders) should continue to work for all categories including agents
- The folder structure should be derived from the category ID in categories.json (e.g., category "agents" maps to folder `/agents`)
- Empty subdirectories are acceptable and don't need to be cleaned up automatically
- The extension should not attempt to migrate existing root-level documents to subfolders automatically
- Folder nodes should be collapsible/expandable to allow users to navigate deep hierarchies efficiently
- The tree view should dynamically build the folder structure from document paths, not require explicit folder definitions


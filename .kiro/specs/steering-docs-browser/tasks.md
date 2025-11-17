# Implementation Plan

- [x] 1. Set up VS Code extension project structure

  - Initialize extension project with `yo code` generator or manual setup
  - Configure TypeScript with strict mode and VS Code types
  - Set up package.json with extension metadata, activation events, and contribution points
  - Install dependencies: @types/vscode, js-yaml, @types/js-yaml
  - Create directory structure: src/, src/services/, src/providers/, src/models/
  - _Requirements: All requirements depend on proper project setup_

- [x] 2. Implement core data models and interfaces

  - [x] 2.1 Create TypeScript interfaces for DocumentMetadata, InstalledDocument, CategoryTreeItem, and DocumentTreeItem

    - Define all properties with proper types including inclusionMode and isActive
    - Add JSDoc comments for documentation
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 4.1, 7.1, 8.1_

  - [x] 2.2 Create error handling classes and error codes enum

    - Implement ExtensionError class with code and recoverable properties
    - Define ErrorCode enum for different error types
    - _Requirements: 2.4, 5.1_

- [x] 3. Implement GitHub API client

  - [x] 3.1 Create GitHubClient class with methods for repository operations

    - Implement getRepositoryContents() to fetch directory listings
    - Implement getFileContent() to fetch file content via API
    - Implement getRawFileContent() for direct raw content access
    - Add timeout handling (30 seconds)
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.5_

  - [x] 3.2 Add error handling and retry logic

    - Handle HTTP errors (404, 403, 500, etc.)
    - Implement retry logic for transient failures
    - Add user-friendly error messages
    - _Requirements: 1.4, 2.4, 5.1, 5.4_

  - [x] 3.3 Write unit tests for GitHubClient

    - Mock HTTP responses for different scenarios
    - Test error handling paths
    - Test timeout behavior
    - _Requirements: 1.4, 2.4, 5.1_

- [x] 4. Implement cache manager

  - [x] 4.1 Create CacheManager class using VS Code globalState

    - Implement get(), set(), clear(), and has() methods
    - Add TTL (time-to-live) support for cache entries
    - Store timestamps with cached data
    - _Requirements: 5.2, 5.3_

  - [x] 4.2 Write unit tests for CacheManager

    - Test cache expiration logic
    - Test cache persistence
    - _Requirements: 5.2_

- [x] 5. Implement frontmatter service

  - [x] 5.1 Create FrontmatterService class for parsing and manipulating YAML frontmatter

    - Implement parse() method to extract frontmatter and body from markdown
    - Implement stringify() method to combine frontmatter and body
    - Use a YAML library like js-yaml for parsing
    - _Requirements: 6.3, 6.4, 7.3, 7.4, 7.5_

  - [x] 5.2 Implement inclusion mode management methods

    - Implement updateInclusionMode() to update or add inclusion property
    - Implement getInclusionMode() to read current inclusion setting
    - Handle documents with and without existing frontmatter
    - Preserve all other frontmatter properties during updates
    - _Requirements: 6.4, 7.3, 7.4, 7.5_

  - [x] 5.3 Write unit tests for FrontmatterService

    - Test parsing documents with and without frontmatter
    - Test updating inclusion mode while preserving other properties
    - Test creating new frontmatter for documents without it
    - Test handling malformed frontmatter
    - _Requirements: 6.4, 7.5_

- [x] 6. Implement document service

  - [x] 6.1 Create DocumentService class with GitHub client, cache, and frontmatter service dependencies

    - Implement fetchDocumentList() with caching
    - Parse categories.json and document frontmatter
    - Organize documents by category
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 6.2 Implement fetchDocumentContent() method

    - Fetch raw markdown content from GitHub
    - Handle fetch errors gracefully
    - _Requirements: 2.1, 2.4_

  - [x] 6.3 Implement getInstalledDocuments() method

    - Read .kiro/steering/ directory
    - Parse frontmatter from installed documents including inclusion mode
    - Return list of installed documents with metadata
    - _Requirements: 4.1, 4.2, 7.1, 8.1_

  - [x] 6.4 Implement installDocument() method with optional inclusion mode

    - Create .kiro/steering/ directory if it doesn't exist
    - Download document content
    - Check for existing file and prompt for overwrite confirmation
    - Apply inclusion mode to frontmatter if specified
    - Save document to local directory
    - Show success notification
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.3, 6.4_

  - [x] 6.5 Implement quickLoadDocument() method

    - Call installDocument() with inclusion mode set to "always"
    - Show notification that document is active in Kiro context
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [x] 6.6 Implement inclusion mode management methods

    - Implement setInclusionMode() to update document frontmatter
    - Implement getInclusionMode() to read current setting
    - Handle fileMatchPattern for fileMatch mode
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [x] 6.7 Implement version comparison and update detection

    - Compare installed document SHAs with remote SHAs
    - Implement checkForUpdates() method
    - Implement updateDocument() method preserving inclusion mode
    - Show update confirmation notification
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 6.8 Write unit tests for DocumentService

    - Mock GitHubClient and file system operations
    - Test version comparison logic
    - Test inclusion mode management
    - Test quick load functionality
    - Test error scenarios
    - _Requirements: 3.5, 4.1, 5.1, 6.1, 7.3_

- [x] 7. Implement tree view provider

  - [x] 7.1 Create SteeringDocsTreeProvider class implementing TreeDataProvider

    - Implement getTreeItem() method
    - Implement getChildren() method with category and document nodes
    - Add refresh() method with event emitter
    - Support filtering to show only active documents
    - _Requirements: 1.2, 1.3, 8.5_

  - [x] 7.2 Add status indicators to tree items

    - Set tree item icons based on installed/update/active status
    - Add context values for command enablement based on inclusion mode
    - Display document descriptions and inclusion mode as tooltips
    - Show visual indicators for "always", "manual", and "fileMatch" modes
    - _Requirements: 4.2, 4.3, 7.1, 8.1, 8.2, 8.3_

  - [x] 7.3 Integrate DocumentService for data fetching

    - Call fetchDocumentList() and getInstalledDocuments() in getChildren()
    - Merge remote and local document data to show inclusion modes
    - Handle errors and display in tree view
    - Show offline indicator when using cached data
    - _Requirements: 1.1, 1.4, 5.2, 5.3, 7.1, 8.4_

- [x] 8. Implement command handlers

  - [x] 8.1 Create command handler for refresh operation

    - Clear cache and refetch document list
    - Trigger tree view refresh
    - Show progress notification
    - _Requirements: 1.5, 5.4_

  - [x] 8.2 Create command handler for preview operation

    - Fetch document content via DocumentService
    - Open content in new editor tab with markdown preview
    - Set editor to read-only mode
    - Handle fetch errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 8.3 Create command handler for install operation

    - Call DocumentService.installDocument()
    - Refresh tree view after installation
    - Handle errors and show notifications
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 8.4 Create command handler for quick load operation

    - Call DocumentService.quickLoadDocument()
    - Refresh tree view after installation
    - Show notification that document is active in Kiro context
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [x] 8.5 Create command handlers for inclusion mode changes

    - Implement handler for setInclusionAlways
    - Implement handler for setInclusionManual
    - Implement handler for setInclusionFileMatch (prompt for pattern if needed)
    - Refresh tree view after mode change
    - Show confirmation notification
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [x] 8.6 Create command handler for update operation

    - Call DocumentService.updateDocument()
    - Refresh tree view after update
    - Show confirmation notification
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 8.7 Create command handler for check updates operation

    - Call DocumentService.checkForUpdates()
    - Refresh tree view to show update indicators
    - Show summary notification of available updates
    - _Requirements: 4.1, 4.2_

  - [x] 8.8 Create command handler for show active only filter

    - Toggle tree view filter state
    - Refresh tree view to apply filter
    - _Requirements: 8.5_

- [x] 9. Wire up extension activation


  - [x] 9.1 Implement activate() function in extension.ts

    - Initialize FrontmatterService
    - Initialize DocumentService with all dependencies
    - Create and register SteeringDocsTreeProvider
    - Register tree view with VS Code
    - Register all command handlers including inclusion mode commands
    - Optionally trigger auto-check for updates
    - _Requirements: All requirements_

  - [x] 9.2 Register extension contributions in package.json

    - Define tree view contribution point
    - Register all commands with titles and icons (including quick load and inclusion mode commands)
    - Add command palette entries
    - Configure activation events
    - Add extension settings
    - Add context menu items for tree view with appropriate when clauses
    - _Requirements: All requirements_

  - [x] 9.3 Implement deactivate() function

    - Clean up resources if needed
    - _Requirements: All requirements_

- [x] 10. Add integration tests






  - Create test workspace with mock .kiro/steering/ directory
  - Test end-to-end flows: browse, preview, install, quick load, update
  - Test inclusion mode changes and frontmatter updates
  - Test offline behavior with cached data
  - Test active document filtering
  - _Requirements: All requirements_

- [x] 11. Add extension documentation





  - Create README.md with usage instructions
  - Document quick load feature and inclusion modes
  - Add screenshots of tree view showing inclusion mode indicators
  - Document configuration settings
  - Add troubleshooting section
  - Include examples of Kiro steering document usage
  - _Requirements: All requirements_

# Implementation Plan

- [x] 1. Add helper methods for path manipulation
  - Create `getRelativePath()` method to extract directory portion from document path
  - Create `scanDirectoryRecursive()` method for recursive directory scanning
  - Add path validation to prevent path traversal attacks
  - _Requirements: 1.4, 2.1_

- [x] 1.1 Write property test for path extraction
  - **Property 1: Installation path preservation**
  - **Validates: Requirements 1.2, 1.4**

- [x] 2. Update installDocument method to support subdirectories
  - Extract directory path from `doc.path` using helper method
  - Create subdirectory under `.kiro/steering/` if needed using `vscode.workspace.fs.createDirectory()`
  - Update file path construction to use subdirectory
  - Preserve existing behavior for root-level documents
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 2.1 Write property test for subdirectory creation idempotence
  - **Property 5: Subdirectory creation idempotence**
  - **Validates: Requirements 1.1, 1.5**

- [x] 3. Update getInstalledDocuments method for recursive scanning
  - Replace flat directory read with recursive scan using helper method
  - Calculate relative path from `.kiro/steering/` for each found document
  - Preserve path in `InstalledDocument.path` field
  - Ensure root-level documents have path equal to name
  - _Requirements: 2.1, 2.2, 5.1, 5.2_

- [x] 3.1 Write property test for recursive scanning completeness
  - **Property 2: Recursive scanning completeness**
  - **Validates: Requirements 2.1, 2.2**

- [x] 3.2 Write property test for root-level document compatibility
  - **Property 3: Root-level document compatibility**
  - **Validates: Requirements 5.1, 5.2, 5.4**

- [x] 4. Update uninstallDocument method to handle paths
  - Change parameter to accept relative path instead of just filename
  - Resolve relative path to full URI under `.kiro/steering/`
  - Delete file from correct subdirectory location
  - Maintain backward compatibility for root-level documents
  - _Requirements: 4.1, 4.3_

- [x] 5. Update checkForUpdates method for path-based matching
  - Change matching logic from name-only to path-based matching
  - Match `installed.path` against `remote.path` instead of just names
  - Handle both root-level and nested documents correctly
  - Treat documents with different paths as different documents
  - _Requirements: 3.1, 3.4_

- [x] 5.1 Write property test for update path matching
  - **Property 4: Update path matching**
  - **Validates: Requirements 3.1, 3.2**

- [x] 6. Update SteeringDocsTreeProvider for path handling
  - Update document matching in `getDocumentsForCategory` to use `installed.path === doc.path` instead of `installed.name === doc.name`
  - Ensure tree items reference documents by path
  - Update command arguments to include path information where needed
  - Maintain existing tree structure (flat display within categories)
  - _Requirements: 2.5, 6.4_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Add folder tree item type to SteeringDocsTreeProvider





  - Add `FolderTreeItem` interface with type, path, label, and parent category
  - Update `TreeItem` union type to include `FolderTreeItem`
  - Add helper method to extract folder structure from document paths
  - _Requirements: 7.1, 7.5_

- [x] 9. Implement hierarchical tree building logic





  - Create method to build folder hierarchy from flat document list
  - Group documents by their parent folder path
  - Create folder nodes for each unique directory in document paths
  - Support arbitrary nesting depth without hardcoded limits
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 10. Update getChildren to handle folder nodes





  - When element is a folder, return its child folders and documents
  - When element is a category, return top-level folders and documents
  - Maintain existing behavior for document nodes (no children)
  - Sort folders before documents for better UX
  - _Requirements: 7.2, 7.4_

- [x] 11. Update tree item creation for folders





  - Implement `createFolderTreeItem()` method
  - Set collapsible state to `Collapsed` for folders
  - Use folder icon (`ThemeIcon('folder')`) for folder nodes
  - Set appropriate context value for folder commands
  - _Requirements: 7.6, 7.7_

- [x] 12. Update document display to work within folder hierarchy





  - Ensure document tree items work correctly when nested under folders
  - Preserve existing document icons and context values
  - Maintain click-to-toggle functionality for documents
  - _Requirements: 7.3_

- [x] 13. Final Checkpoint - Ensure all tests pass






  - Ensure all tests pass, ask the user if questions arise.


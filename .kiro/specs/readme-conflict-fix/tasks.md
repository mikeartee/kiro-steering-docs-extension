# Implementation Plan

- [x] 1. Add README.md filter to document fetching logic





  - Modify `src/services/DocumentService.ts` in the `fetchDocumentList()` method
  - Add filter condition inside the loop that processes files from category directories
  - Use case-insensitive comparison to catch all variations (README.md, readme.md, ReadMe.md)
  - Add code comment explaining why README.md files are filtered
  - _Requirements: 1.1, 1.2, 1.3, 3.1_

- [x] 2. Test the fix manually






  - Compile the extension with `npm run compile`
  - Launch extension in development mode (F5)
  - Browse categories that contain README.md files in the remote repository
  - Verify README.md files do not appear in the tree view
  - Install a non-README.md steering document and verify it works correctly
  - Toggle the document on/off to verify install/uninstall still works
  - _Requirements: 2.1, 2.2, 2.3_


# Design Document

## Overview

This design addresses the filename collision bug where multiple README.md files from different category folders overwrite each other when installed. The solution filters out README.md files during document fetching, preventing them from appearing in the tree view or being installable.

## Problem Analysis

### Current Behavior

1. Extension fetches all `.md` files from category directories
2. Files are saved using only their filename (not full path): `.kiro/steering/{filename}`
3. Multiple README.md files from different categories (e.g., `tools/README.md`, `templates/README.md`) collide
4. When user toggles one README.md on, then toggles another, the second overwrites the first

### Root Cause

The extension uses `doc.name` (just the filename) when saving files:

```typescript
const fileUri = vscode.Uri.joinPath(steeringDirUri, doc.name);
```

This means `tools/README.md` and `templates/README.md` both save to `.kiro/steering/README.md`.

### Why README.md Files Exist

README.md files in category folders are documentation for people browsing the GitHub repository. They are not intended to be steering documents that provide guidance to Kiro AI.

## Solution Design

### Approach

Filter out README.md files during the document fetching process in `DocumentService.fetchDocumentList()`. This is the safest approach because:

1. **Minimal change**: Single filter condition added
2. **No breaking changes**: Doesn't affect how other files are processed
3. **Correct behavior**: README.md files shouldn't be steering documents anyway
4. **No UI changes**: Tree view logic remains unchanged

### Implementation Location

**File**: `src/services/DocumentService.ts`
**Method**: `fetchDocumentList()`
**Line**: Inside the loop that processes files from category directories

### Filter Logic

Add a condition to skip files named "README.md" (case-insensitive for robustness):

```typescript
for (const item of contents) {
    // Skip README.md files - they are repository documentation, not steering docs
    if (item.type === 'file' && item.name.toLowerCase() === 'readme.md') {
        continue;
    }
    
    if (item.type === 'file' && item.name.endsWith('.md')) {
        // ... existing processing logic
    }
}
```

### Alternative Approaches Considered

#### Option 1: Preserve Category in Filename

Save files as `{category}-{filename}` (e.g., `tools-README.md`)

**Rejected because:**

- Breaks existing installations
- Changes file naming convention
- More complex implementation
- Still allows README.md files (which shouldn't be steering docs)

#### Option 2: Create Category Subfolders

Save files to `.kiro/steering/{category}/{filename}`

**Rejected because:**

- Breaks existing installations
- Requires changes to multiple methods (install, uninstall, update, getInstalledDocuments)
- More complex implementation
- Kiro may not recognize nested structure

#### Option 3: Detect Collision and Warn User

Show warning when filename collision detected

**Rejected because:**

- Doesn't solve the problem, just alerts user
- Poor user experience
- README.md files still shouldn't be installable

## Components Affected

### DocumentService.ts

**Method**: `fetchDocumentList()`

**Change**: Add filter condition to skip README.md files

**Impact**: README.md files will not appear in the document list returned to the tree provider

### No Changes Required

The following components require NO changes:

- `GitHubClient.ts` - Still fetches all files as before
- `SteeringDocsTreeProvider.ts` - Receives filtered list, no logic changes needed
- `FrontmatterService.ts` - No changes needed
- `commands/index.ts` - No changes needed
- `extension.ts` - No changes needed

## Data Flow

### Before Fix

```text
GitHub Repo
├── tools/
│   ├── README.md
│   └── tool-guide.md
└── templates/
    ├── README.md
    └── template-guide.md

↓ fetchDocumentList()

Document List: [
  { name: "README.md", path: "tools/README.md", ... },
  { name: "tool-guide.md", path: "tools/tool-guide.md", ... },
  { name: "README.md", path: "templates/README.md", ... },  // Collision!
  { name: "template-guide.md", path: "templates/template-guide.md", ... }
]

↓ User toggles both README.md files

.kiro/steering/
├── README.md  (from templates/ - overwrote tools/)
├── tool-guide.md
└── template-guide.md
```

### After Fix

```text
GitHub Repo
├── tools/
│   ├── README.md
│   └── tool-guide.md
└── templates/
    ├── README.md
    └── template-guide.md

↓ fetchDocumentList() with filter

Document List: [
  { name: "tool-guide.md", path: "tools/tool-guide.md", ... },
  { name: "template-guide.md", path: "templates/template-guide.md", ... }
]
// README.md files filtered out

↓ User can only toggle actual steering docs

.kiro/steering/
├── tool-guide.md
└── template-guide.md
```

## Error Handling

No new error handling required. The filter is a simple string comparison that cannot fail.

## Testing Strategy

### Manual Testing

1. **Verify README.md files are filtered**
   - Open extension in development mode
   - Browse categories that contain README.md files
   - Confirm README.md files do not appear in tree view

2. **Verify other .md files still work**
   - Install a non-README.md steering document
   - Verify it installs correctly to `.kiro/steering/`
   - Verify it can be toggled on/off
   - Verify updates still work

3. **Verify existing installations unaffected**
   - Open workspace with already-installed steering docs
   - Verify they still appear and function correctly
   - Verify updates can be detected and installed

### Edge Cases

1. **Case variations**: `README.md`, `readme.md`, `ReadMe.md`
   - Solution: Use case-insensitive comparison (`toLowerCase()`)

2. **README files with extensions**: `README.txt`, `README`
   - These won't match the filter and will be processed normally
   - This is acceptable since they're not `.md` files anyway

3. **Files named similar to README**: `README-template.md`, `MY-README.md`
   - These won't match the filter (exact match only)
   - This is correct behavior - they're legitimate steering docs

## Backward Compatibility

### Existing Installations

No impact. Already-installed documents (including any README.md files) remain unchanged. The filter only affects fetching new documents from GitHub.

### Configuration

No configuration changes required. No new settings added.

### API Compatibility

No public API changes. The `DocumentService` interface remains the same.

## Performance Impact

Negligible. Adding one string comparison per file during document fetching has no measurable performance impact.

## Security Considerations

No security implications. The change is purely a filter on filenames.

## Documentation Updates

### README.md

No updates required. The bug fix is transparent to users - README.md files simply won't appear in the tree view anymore.

### Code Comments

Add a comment explaining why README.md files are filtered:

```typescript
// Skip README.md files - they are repository documentation, not steering docs
```

## Rollout Plan

1. Implement the filter in `DocumentService.ts`
2. Test manually with development extension
3. Compile and package extension
4. Test packaged extension in clean workspace
5. Publish update to marketplace

## Success Criteria

1. README.md files do not appear in the tree view
2. All other steering documents continue to work normally
3. No errors or warnings in console
4. Existing installations remain functional
5. Users can install multiple documents from different categories without conflicts


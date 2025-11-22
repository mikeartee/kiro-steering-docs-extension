# Design Document: Folder Structure Support

## Overview

This design adds support for organizing steering documents into subdirectories within `.kiro/steering/`, mirroring the folder structure from the remote GitHub repository. The implementation maintains backward compatibility with existing flat installations while enabling new categories (like "agents") to use hierarchical folder structures.

The key insight is that the document's `path` field already contains the full relative path from the repository root (e.g., `agents/bmad-spec-converter.md`). We'll leverage this to derive the installation path, creating subdirectories as needed.

## Architecture

### Current Architecture

The extension follows a service-oriented architecture:
- `DocumentService` - Handles document fetching, installation, and management
- `GitHubClient` - Manages GitHub API interactions
- `SteeringDocsTreeProvider` - Provides tree view UI for browsing documents
- `FrontmatterService` - Parses and manipulates YAML frontmatter

### Changes Required

The changes are localized to two main areas:

1. **DocumentService** - Update installation and scanning logic to handle subdirectories
2. **SteeringDocsTreeProvider** - Update tree view to display folder hierarchy (optional enhancement)

No changes required to:
- `GitHubClient` - Already provides full paths
- `FrontmatterService` - Works with content regardless of location
- `types.ts` - Existing interfaces support the changes

## Components and Interfaces

### DocumentService Changes

#### Modified Methods

**`installDocument()`**
- Extract directory path from `doc.path` (e.g., `agents` from `agents/bmad-spec-converter.md`)
- Create subdirectory under `.kiro/steering/` if it doesn't exist
- Install file to the subdirectory path

**`getInstalledDocuments()`**
- Change from flat directory read to recursive directory scan
- Preserve relative path from `.kiro/steering/` in the returned `InstalledDocument.path`
- Continue to work with root-level documents (no path prefix)

**`uninstallDocument()`**
- Accept relative path instead of just filename
- Resolve to full path under `.kiro/steering/`
- Delete file from subdirectory

**`updateDocument()`**
- Use relative path to locate installed document
- Preserve folder location during update

**`checkForUpdates()`**
- Match documents by relative path instead of just name
- Handle both root-level and nested documents

#### Helper Methods (New)

**`getRelativePath(fullPath: string): string`**
- Extract the directory portion from a document path
- Example: `agents/bmad-spec-converter.md` → `agents`
- Example: `tech.md` → `` (empty string for root)

**`scanDirectoryRecursive(dirUri: vscode.Uri): Promise<InstalledDocument[]>`**
- Recursively scan directory for `.md` files
- Return documents with their relative paths preserved
- Skip non-markdown files and directories

### SteeringDocsTreeProvider Changes

#### Optional Enhancement: Folder Nodes

The tree provider can be enhanced to show folder hierarchy:

**Current Structure:**
```
📁 Code Quality
  ○ typescript-strict.md
  ○ eslint-config.md
📁 Agents
  ○ bmad-spec-converter.md
```

**Enhanced Structure (Optional):**
```
📁 Code Quality
  ○ typescript-strict.md
  ○ eslint-config.md
📁 Agents
  📁 agents/
    ○ bmad-spec-converter.md
```

For the initial implementation, we'll keep the current flat display within categories. The folder structure exists on disk but isn't reflected in the tree view hierarchy.

## Data Models

### DocumentMetadata (No Changes)

```typescript
interface DocumentMetadata {
    name: string;           // Filename only: "bmad-spec-converter.md"
    path: string;           // Full path: "agents/bmad-spec-converter.md"
    category: string;       // Category ID: "agents"
    version: string;
    description: string;
    sha: string;
    size: number;
    downloadUrl: string;
}
```

The `path` field already contains the information we need for folder structure.

### InstalledDocument (Modified)

```typescript
interface InstalledDocument {
    name: string;           // Filename only: "bmad-spec-converter.md"
    path: string;           // Relative path: "agents/bmad-spec-converter.md" or "tech.md"
    version: string;
    installedAt: Date;
    sha: string;
    inclusionMode?: 'always' | 'manual' | 'fileMatch';
    fileMatchPattern?: string;
}
```

The `path` field changes from filename-only to relative path from `.kiro/steering/`. This maintains backward compatibility since root-level documents will have `path === name`.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Installation path preservation

*For any* document with path `category/filename.md`, installing it should create the file at `.kiro/steering/category/filename.md` with the exact same relative path structure.

**Validates: Requirements 1.2, 1.4**

### Property 2: Recursive scanning completeness

*For any* markdown file in `.kiro/steering/` or its subdirectories, the recursive scan should find and include it in the installed documents list.

**Validates: Requirements 2.1, 2.2**

### Property 3: Root-level document compatibility

*For any* document installed at `.kiro/steering/filename.md` (root level), all operations (update, uninstall, inclusion mode changes) should continue to work without modification.

**Validates: Requirements 5.1, 5.2, 5.4**

### Property 4: Update path matching

*For any* installed document with relative path P, checking for updates should match it against remote documents with the same path P, not just the same filename.

**Validates: Requirements 3.1, 3.2**

### Property 5: Subdirectory creation idempotence

*For any* subdirectory path, attempting to create it multiple times should succeed without error, whether the directory exists or not.

**Validates: Requirements 1.1, 1.5**

## Error Handling

### Directory Creation Failures

- **Scenario**: Unable to create subdirectory due to permissions or disk space
- **Handling**: Throw `ExtensionError` with `FILE_SYSTEM_ERROR` code
- **User Experience**: Show error notification with clear message

### Recursive Scan Failures

- **Scenario**: Unable to read subdirectory during recursive scan
- **Handling**: Log error and continue scanning other directories
- **User Experience**: Partial results shown, error logged to console

### Path Resolution Failures

- **Scenario**: Invalid or malformed path in document metadata
- **Handling**: Fall back to root-level installation with filename only
- **User Experience**: Document installs but may not be in expected location

### Backward Compatibility

- **Scenario**: Existing root-level document conflicts with new nested structure
- **Handling**: Treat as separate documents (different paths)
- **User Experience**: Both documents can coexist

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

**Path Extraction Tests:**
- `getRelativePath("agents/bmad-spec-converter.md")` returns `"agents"`
- `getRelativePath("tech.md")` returns `""`
- `getRelativePath("deeply/nested/folder/doc.md")` returns `"deeply/nested/folder"`

**Directory Creation Tests:**
- Creating a new subdirectory succeeds
- Creating an existing subdirectory succeeds (idempotent)
- Creating nested subdirectories (e.g., `a/b/c`) succeeds

**Recursive Scanning Tests:**
- Scanning empty directory returns empty array
- Scanning directory with root-level files finds them
- Scanning directory with nested files finds them
- Scanning directory with mixed root and nested files finds all

**Backward Compatibility Tests:**
- Root-level document operations continue to work
- Mixed installation (root + nested) works correctly
- Update matching works for both root and nested documents

### Property-Based Testing

We'll use the Mocha testing framework (already in use) with a property-based testing library for TypeScript. The recommended library is **fast-check**, which integrates well with Mocha.

**Installation:**
```bash
npm install --save-dev fast-check
```

**Configuration:**
- Each property test should run a minimum of 100 iterations
- Tests will be tagged with comments referencing the design document properties
- Tag format: `// Feature: folder-structure-support, Property N: <property text>`

**Property Test Implementations:**

**Property 1: Installation path preservation**
```typescript
// Feature: folder-structure-support, Property 1: Installation path preservation
// For any document with path category/filename.md, installing it should create 
// the file at .kiro/steering/category/filename.md
```
- Generate random category names and filenames
- Install document with that path
- Verify file exists at expected location with correct relative path

**Property 2: Recursive scanning completeness**
```typescript
// Feature: folder-structure-support, Property 2: Recursive scanning completeness
// For any markdown file in .kiro/steering/ or subdirectories, the recursive scan 
// should find and include it in the installed documents list
```
- Generate random directory structures with markdown files
- Create files in test directory
- Scan and verify all files are found with correct paths

**Property 3: Root-level document compatibility**
```typescript
// Feature: folder-structure-support, Property 3: Root-level document compatibility
// For any document installed at .kiro/steering/filename.md (root level), all 
// operations should continue to work without modification
```
- Generate random root-level documents
- Perform operations (update, uninstall, inclusion mode)
- Verify operations succeed and produce expected results

**Property 4: Update path matching**
```typescript
// Feature: folder-structure-support, Property 4: Update path matching
// For any installed document with relative path P, checking for updates should 
// match it against remote documents with the same path P
```
- Generate random installed and remote documents with various paths
- Check for updates
- Verify matching is by path, not just filename

**Property 5: Subdirectory creation idempotence**
```typescript
// Feature: folder-structure-support, Property 5: Subdirectory creation idempotence
// For any subdirectory path, attempting to create it multiple times should succeed 
// without error
```
- Generate random subdirectory paths
- Create same directory multiple times
- Verify no errors thrown and directory exists

### Integration Testing

Integration tests will verify end-to-end workflows:
- Install agent document → verify in correct subfolder → uninstall
- Install multiple documents in different folders → scan → verify all found
- Install document → update → verify updated in same location
- Mix of root and nested documents → all operations work correctly

## Implementation Notes

### VS Code FileSystem API

Use `vscode.workspace.fs` for all file operations:
- `createDirectory()` - Creates directory, succeeds if already exists (idempotent)
- `readDirectory()` - Reads directory contents, returns entries with types
- `stat()` - Gets file/directory metadata
- `readFile()` / `writeFile()` - File I/O operations

### Path Manipulation

Use `vscode.Uri.joinPath()` for path construction:
```typescript
const steeringDir = vscode.Uri.joinPath(workspaceFolder.uri, '.kiro/steering');
const subDir = vscode.Uri.joinPath(steeringDir, 'agents');
const filePath = vscode.Uri.joinPath(subDir, 'bmad-spec-converter.md');
```

### Recursive Directory Scanning

Implement recursive scan using async iteration:
```typescript
async function* scanRecursive(dirUri: vscode.Uri): AsyncGenerator<[string, vscode.Uri]> {
    const entries = await vscode.workspace.fs.readDirectory(dirUri);
    for (const [name, type] of entries) {
        const uri = vscode.Uri.joinPath(dirUri, name);
        if (type === vscode.FileType.File && name.endsWith('.md')) {
            yield [name, uri];
        } else if (type === vscode.FileType.Directory) {
            yield* scanRecursive(uri);
        }
    }
}
```

### Relative Path Calculation

Calculate relative path from base directory:
```typescript
function getRelativePath(baseUri: vscode.Uri, fileUri: vscode.Uri): string {
    const basePath = baseUri.fsPath;
    const filePath = fileUri.fsPath;
    return path.relative(basePath, filePath).replace(/\\/g, '/');
}
```

## Migration Strategy

### No Automatic Migration

The design explicitly avoids automatic migration of existing documents. Users with existing root-level installations will continue to work without changes.

### Future Migration (Optional)

If users want to reorganize existing documents:
1. Uninstall root-level document
2. Reinstall from remote (will use new folder structure)
3. Inclusion mode and settings are preserved during reinstall

This is a manual process initiated by the user, not automatic.

## Performance Considerations

### Recursive Scanning Performance

- Recursive scanning is only performed when displaying installed documents
- Results can be cached in the tree provider
- Expected directory depth is shallow (1-2 levels max)
- Number of files is small (typically < 50 documents)

Performance impact is negligible for expected use cases.

### Directory Creation Performance

- Directory creation is only performed during installation
- VS Code's FileSystem API is optimized for these operations
- Idempotent creation avoids unnecessary checks

No performance concerns.

## Security Considerations

### Path Traversal Prevention

Validate that extracted paths don't contain:
- Parent directory references (`..`)
- Absolute paths
- Invalid characters

Use VS Code's URI APIs which handle path normalization and validation.

### File System Permissions

Respect file system permissions:
- Handle permission errors gracefully
- Show clear error messages to users
- Don't attempt to escalate privileges

## Future Enhancements

### Enhanced Tree View

Display folder hierarchy in the tree view:
- Add folder nodes between category and documents
- Allow collapsing/expanding folders
- Show folder-level operations (install all, update all)

### Folder-Level Operations

Add operations that work on entire folders:
- Install all documents in a folder
- Update all documents in a folder
- Set inclusion mode for all documents in a folder

### Custom Folder Mapping

Allow users to customize where categories install:
- Configuration setting for folder mappings
- Example: Install "agents" to `.kiro/agents` instead of `.kiro/steering/agents`


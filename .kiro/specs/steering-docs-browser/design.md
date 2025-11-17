# Design Document

## Overview

The Steering Documents Browser extension is a VS Code extension that provides a tree view interface for browsing, previewing, and installing steering documents from a GitHub repository. The extension follows VS Code's extension architecture patterns and uses the GitHub API for fetching document metadata and content.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VS Code Extension Host                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Extension Activation                      │  │
│  │  - Register Tree View Provider                        │  │
│  │  - Register Commands                                  │  │
│  │  - Initialize Services                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Tree View       │  │  Command         │               │
│  │  Provider        │  │  Handlers        │               │
│  │                  │  │                  │               │
│  │  - Data Source   │  │  - Preview Doc   │               │
│  │  - Tree Items    │  │  - Install Doc   │               │
│  │  - Refresh       │  │  - Update Doc    │               │
│  └────────┬─────────┘  └────────┬─────────┘               │
│           │                     │                          │
│           └──────────┬──────────┘                          │
│                      │                                      │
│           ┌──────────▼──────────┐                          │
│           │  Document Service   │                          │
│           │                     │                          │
│           │  - Fetch List       │                          │
│           │  - Fetch Content    │                          │
│           │  - Version Compare  │                          │
│           │  - Cache Management │                          │
│           │  - Quick Load       │                          │
│           │  - Inclusion Modes  │                          │
│           └─────┬────────┬──────┘                          │
│                 │        │                                 │
│      ┌──────────▼──┐  ┌─▼──────────────┐                 │
│      │ Frontmatter │  │  GitHub API    │                 │
│      │  Service    │  │    Client      │                 │
│      │             │  │                │                 │
│      │ - Parse     │  │ - HTTP Req     │                 │
│      │ - Update    │  │ - Error Handle │                 │
│      │ - Inclusion │  │ - Rate Limit   │                 │
│      └─────────────┘  └────────┬───────┘                 │
│      │ - Rate Limit   │                 │
│      └────────┬───────┘                 │
└───────────────┼─────────────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  GitHub API    │
              │  (Repository)  │
              └────────────────┘
```

### Technology Stack

- **Language**: TypeScript
- **Framework**: VS Code Extension API
- **HTTP Client**: Built-in `https` module or `axios` for GitHub API calls
- **File System**: VS Code `workspace.fs` API
- **Storage**: VS Code `ExtensionContext.globalState` for caching

## Components and Interfaces

### 1. Extension Entry Point (`extension.ts`)

```typescript
export function activate(context: vscode.ExtensionContext): void
export function deactivate(): void
```

Responsibilities:
- Register tree view provider
- Register command handlers
- Initialize services with dependency injection
- Set up extension context

### 2. Tree View Provider (`SteeringDocsTreeProvider`)

```typescript
interface SteeringDocsTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  getTreeItem(element: TreeItem): vscode.TreeItem
  getChildren(element?: TreeItem): Promise<TreeItem[]>
  refresh(): void
}
```

Responsibilities:
- Provide tree structure data to VS Code
- Handle tree item expansion/collapse
- Trigger refresh on data changes
- Display update indicators

### 3. Tree Item Types

```typescript
interface CategoryTreeItem {
  type: 'category'
  label: string
  children: DocumentTreeItem[]
}

interface DocumentTreeItem {
  type: 'document'
  label: string
  category: string
  path: string
  version: string
  description: string
  isInstalled: boolean
  hasUpdate: boolean
  inclusionMode?: 'always' | 'manual' | 'fileMatch'
  isActive: boolean  // true if inclusion is 'always' or matches current context
}
```

### 4. Document Service (`DocumentService`)

```typescript
interface DocumentService {
  fetchDocumentList(): Promise<DocumentMetadata[]>
  fetchDocumentContent(path: string): Promise<string>
  getInstalledDocuments(): Promise<InstalledDocument[]>
  installDocument(doc: DocumentMetadata, inclusionMode?: string): Promise<void>
  quickLoadDocument(doc: DocumentMetadata): Promise<void>
  updateDocument(doc: DocumentMetadata): Promise<void>
  checkForUpdates(): Promise<UpdateInfo[]>
  setInclusionMode(docPath: string, mode: 'always' | 'manual' | 'fileMatch'): Promise<void>
  getInclusionMode(docPath: string): Promise<string | undefined>
}
```

Responsibilities:

- Orchestrate document operations
- Manage caching strategy
- Compare versions
- Handle file system operations
- Parse and update frontmatter for inclusion modes
- Manage Kiro steering document activation

### 5. GitHub API Client (`GitHubClient`)

```typescript
interface GitHubClient {
  getRepositoryContents(path: string): Promise<GitHubContent[]>
  getFileContent(path: string): Promise<string>
  getRawFileContent(path: string): Promise<string>
}
```

Responsibilities:
- Make HTTP requests to GitHub API
- Handle authentication (if needed)
- Implement retry logic
- Handle rate limiting
- Parse API responses

### 6. Cache Manager (`CacheManager`)

```typescript
interface CacheManager {
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T, ttl?: number): void
  clear(key?: string): void
  has(key: string): boolean
}
```

Responsibilities:
- Store document list for offline access
- Implement TTL (time-to-live) for cache entries
- Persist cache across extension reloads

## Data Models

### Document Metadata

```typescript
interface DocumentMetadata {
  name: string
  path: string
  category: string
  version: string
  description: string
  sha: string  // Git SHA for version tracking
  size: number
  downloadUrl: string
}
```

### Installed Document

```typescript
interface InstalledDocument {
  name: string
  path: string
  version: string
  installedAt: Date
  sha: string
  inclusionMode?: 'always' | 'manual' | 'fileMatch'
  fileMatchPattern?: string  // Only present if inclusionMode is 'fileMatch'
}
```

### Repository Structure

Expected structure in the GitHub repository:

```
/
├── README.md
├── categories.json          # Category definitions
└── documents/
    ├── coding-standards/
    │   ├── typescript.md
    │   └── python.md
    ├── testing/
    │   ├── unit-testing.md
    │   └── integration-testing.md
    └── documentation/
        └── readme-template.md
```

### categories.json Format

```json
{
  "categories": [
    {
      "id": "coding-standards",
      "label": "Coding Standards",
      "description": "Language-specific coding standards and best practices"
    },
    {
      "id": "testing",
      "label": "Testing",
      "description": "Testing strategies and guidelines"
    }
  ]
}
```

### Document Frontmatter

Each steering document should include frontmatter for metadata:

```markdown
---
version: "1.0.0"
category: "coding-standards"
description: "TypeScript coding standards and conventions"
---

# Document Content
```

### Kiro Steering Document Frontmatter

When installed to `.kiro/steering/`, documents can include Kiro-specific frontmatter:

```markdown
---
version: "1.0.0"
category: "coding-standards"
description: "TypeScript coding standards and conventions"
inclusion: "always"
---

# Document Content
```

Inclusion modes:
- `always`: Document is always loaded into Kiro's agent context
- `manual`: Document is only loaded when explicitly referenced with `#` in chat
- `fileMatch`: Document is loaded when files matching a pattern are in context
  - Requires additional `fileMatchPattern` property (e.g., `"*.ts"`)

Example with fileMatch:

```markdown
---
version: "1.0.0"
inclusion: "fileMatch"
fileMatchPattern: "*.ts"
---

# TypeScript Guidelines
```

## Error Handling

### Error Types

1. **Network Errors**
   - Connection timeout (30 seconds)
   - DNS resolution failure
   - HTTP errors (404, 403, 500, etc.)

2. **File System Errors**
   - Permission denied
   - Disk full
   - Invalid path

3. **Data Errors**
   - Invalid JSON format
   - Missing required fields
   - Malformed frontmatter

### Error Handling Strategy

```typescript
class ExtensionError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean
  ) {}
}

// Error codes
enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  NOT_FOUND = 'NOT_FOUND'
}
```

- Display user-friendly error messages via `vscode.window.showErrorMessage()`
- Log detailed errors to extension output channel
- Implement fallback to cached data for network errors
- Provide retry actions for recoverable errors

## Command Definitions

### Registered Commands

1. `steeringDocs.refresh` - Refresh document list
2. `steeringDocs.preview` - Preview selected document
3. `steeringDocs.install` - Install selected document
4. `steeringDocs.quickLoad` - Install and activate document with "always" inclusion
5. `steeringDocs.update` - Update selected document
6. `steeringDocs.checkUpdates` - Check all documents for updates
7. `steeringDocs.setInclusionAlways` - Set document inclusion mode to "always"
8. `steeringDocs.setInclusionManual` - Set document inclusion mode to "manual"
9. `steeringDocs.setInclusionFileMatch` - Set document inclusion mode to "fileMatch"
10. `steeringDocs.showActiveOnly` - Filter tree view to show only active documents

### Command Context

Commands are available based on tree item context:

```json
{
  "command": "steeringDocs.install",
  "when": "view == steeringDocsView && viewItem == document && !isInstalled"
}
```

## Testing Strategy

### Unit Tests

- Test document service methods in isolation
- Mock GitHub API client responses
- Test cache manager functionality
- Test version comparison logic
- Test frontmatter parsing and manipulation
- Test inclusion mode detection and updates
- Test quick load functionality

### Integration Tests

- Test tree view provider with mock data
- Test command handlers end-to-end
- Test file system operations with temporary directories
- Test error handling scenarios

### Manual Testing

- Test with actual GitHub repository
- Verify tree view rendering
- Test offline behavior
- Verify update detection
- Test concurrent operations

## Frontmatter Management

### Frontmatter Service (`FrontmatterService`)

```typescript
interface FrontmatterService {
  parse(content: string): { frontmatter: any; body: string }
  stringify(frontmatter: any, body: string): string
  updateInclusionMode(content: string, mode: string, pattern?: string): string
  getInclusionMode(content: string): string | undefined
}
```

Responsibilities:

- Parse YAML frontmatter from markdown documents
- Serialize frontmatter back to YAML format
- Update specific frontmatter properties while preserving others
- Handle documents with or without existing frontmatter
- Validate frontmatter structure

### Frontmatter Update Strategy

When updating inclusion mode:

1. Parse existing document content
2. If frontmatter exists, update only the `inclusion` property (and `fileMatchPattern` if needed)
3. If no frontmatter exists, create new frontmatter with minimal required fields
4. Preserve all other frontmatter properties
5. Maintain proper YAML formatting with `---` delimiters

Example transformation for quick load:

```markdown
// Before
# My Steering Document
Content here...

// After
---
inclusion: "always"
---

# My Steering Document
Content here...
```

## Configuration

### Extension Settings

```json
{
  "steeringDocs.repository": {
    "type": "string",
    "default": "mikeartee/kiro-steering-docs",
    "description": "GitHub repository containing steering documents"
  },
  "steeringDocs.branch": {
    "type": "string",
    "default": "main",
    "description": "Branch to fetch documents from"
  },
  "steeringDocs.cacheTimeout": {
    "type": "number",
    "default": 3600,
    "description": "Cache timeout in seconds"
  },
  "steeringDocs.autoCheckUpdates": {
    "type": "boolean",
    "default": true,
    "description": "Automatically check for updates on activation"
  }
}
```

## Performance Considerations

1. **Lazy Loading**: Load document content only when previewed or installed
2. **Caching**: Cache document list and metadata to reduce API calls
3. **Debouncing**: Debounce refresh operations to prevent excessive API calls
4. **Pagination**: Handle large repositories with pagination if needed
5. **Rate Limiting**: Respect GitHub API rate limits (60 requests/hour for unauthenticated)

## Security Considerations

1. **Input Validation**: Validate all data from GitHub API
2. **Path Traversal**: Sanitize file paths to prevent directory traversal attacks
3. **Content Sanitization**: Validate markdown content before display
4. **HTTPS Only**: Use HTTPS for all GitHub API requests
5. **No Credentials Storage**: Avoid storing GitHub tokens unless explicitly configured by user

---
version: "1.0.0"
inclusion: always
---

# Project Structure

## Directory Layout

```
src/
├── extension.ts           # Extension entry point (activate/deactivate)
├── models/
│   └── types.ts          # TypeScript interfaces and types
├── providers/
│   └── SteeringDocsTreeProvider.ts  # Tree view provider for UI
└── services/
    ├── CacheManager.ts           # Caching service for API responses
    ├── DocumentService.ts        # Core document management logic
    ├── FrontmatterService.ts     # YAML frontmatter parsing/manipulation
    └── GitHubClient.ts           # GitHub API client
```

## Architecture Patterns

### Service Layer Pattern
Business logic is organized into service classes:
- `DocumentService` - Document fetching, installation, updates
- `GitHubClient` - GitHub API interactions
- `CacheManager` - Response caching with TTL
- `FrontmatterService` - YAML frontmatter operations

### Provider Pattern
UI components use VS Code's provider pattern:
- `SteeringDocsTreeProvider` - Implements tree view for document browser

### Type Safety
All domain models are defined in `src/models/types.ts`:
- `DocumentMetadata` - Remote document information
- `InstalledDocument` - Local document state
- `CategoryDefinition` - Document categories
- Custom error types with error codes

## Key Conventions

- Services are injected via constructor (dependency injection)
- All async operations use Promise-based APIs
- Error handling uses custom `ExtensionError` class with error codes
- File operations use VS Code's FileSystem API (not Node.js fs)
- Configuration accessed via `vscode.workspace.getConfiguration()`
- Local steering documents stored in `.kiro/steering/` directory

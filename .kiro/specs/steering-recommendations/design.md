# Design Document

## Overview

The steering document recommendation feature adds intelligent discovery capabilities to the Steering Docs Browser extension. The system analyzes the user's workspace to understand their technology stack, project structure, and coding patterns, then matches this context against available steering documents to provide ranked, explained recommendations.

The feature consists of three main components:
1. **Workspace Analysis** - Extracts context from the workspace (dependencies, file patterns, configurations)
2. **Document Matching** - Scores and ranks documents based on workspace context
3. **Recommendation UI** - Presents recommendations through Quick Pick and Webview Panel interfaces

The design follows the existing extension architecture, adding new services and commands while leveraging existing infrastructure like DocumentService and GitHubClient.

## Architecture

### High-Level Flow

```
User invokes command
    ↓
WorkspaceAnalyzer scans workspace
    ↓
RecommendationService fetches available documents
    ↓
DocumentMatcher scores and ranks documents
    ↓
Quick Pick displays top 10 recommendations
    ↓
User selects recommendation
    ↓
Webview Panel shows details + install button
    ↓
DocumentService installs document
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Command Handler                       │
│              (recommendDocuments.ts)                     │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ↓                       ↓
┌────────────────────┐  ┌──────────────────────┐
│ RecommendationService│  │  DocumentService     │
│  - analyzeWorkspace │  │  - fetchDocuments    │
│  - getRecommendations│  │  - installDocument   │
│  - scoreDocuments   │  │  - getInstalled      │
└────────┬───────────┘  └──────────────────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌─────────────────┐  ┌──────────────────┐
│WorkspaceAnalyzer│  │ DocumentMatcher  │
│ - analyzeDeps   │  │ - scoreDocument  │
│ - analyzeFiles  │  │ - rankDocuments  │
│ - analyzeConfig │  │ - explainMatch   │
└─────────────────┘  └──────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│      Recommendation UI              │
│  - Quick Pick (native VS Code)      │
│  - Webview Panel (custom HTML)      │
└─────────────────────────────────────┘
```

## Components and Interfaces

### WorkspaceAnalyzer

Responsible for extracting context information from the workspace.

```typescript
interface WorkspaceContext {
  languages: string[];              // ['typescript', 'javascript']
  frameworks: FrameworkInfo[];      // Detected frameworks with versions
  dependencies: DependencyInfo[];   // All dependencies from package.json
  filePatterns: FilePattern[];      // Detected file structure patterns
  hasTests: boolean;                // Whether test files exist
  projectType: ProjectType;         // 'web-app' | 'library' | 'cli' | 'extension'
  installedDocs: string[];          // Already installed document IDs
}

interface FrameworkInfo {
  name: string;                     // 'react', 'vue', 'express'
  version: string;                  // '18.2.0'
  confidence: number;               // 0-1, how confident we are
}

interface DependencyInfo {
  name: string;
  version: string;
  isDev: boolean;
  category: DependencyCategory;     // 'framework' | 'testing' | 'build' | 'utility'
}

interface FilePattern {
  pattern: string;                  // 'components/**/*.tsx'
  count: number;                    // Number of matching files
  significance: number;             // 0-1, how significant this pattern is
}

type ProjectType = 'web-app' | 'library' | 'cli-tool' | 'vscode-extension' | 'api-server' | 'unknown';

class WorkspaceAnalyzer {
  async analyze(workspaceRoot: string): Promise<WorkspaceContext>;
  
  private async analyzePackageJson(packagePath: string): Promise<{
    dependencies: DependencyInfo[];
    frameworks: FrameworkInfo[];
  }>;
  
  private async analyzeFileStructure(workspaceRoot: string): Promise<{
    filePatterns: FilePattern[];
    hasTests: boolean;
  }>;
  
  private async analyzeConfigurations(workspaceRoot: string): Promise<{
    languages: string[];
    projectType: ProjectType;
  }>;
  
  private detectFrameworks(dependencies: DependencyInfo[]): FrameworkInfo[];
  private categorizeProjectType(context: Partial<WorkspaceContext>): ProjectType;
}
```

### DocumentMatcher

Scores and ranks documents based on workspace context.

```typescript
interface ScoredDocument {
  document: DocumentMetadata;
  score: number;                    // 0-100, relevance score
  reasons: MatchReason[];           // Why this document was recommended
  isInstalled: boolean;
}

interface MatchReason {
  type: 'framework' | 'dependency' | 'file-pattern' | 'language' | 'project-type';
  description: string;              // Human-readable explanation
  weight: number;                   // How much this contributed to score
  details: string[];                // Specific items that matched
}

class DocumentMatcher {
  scoreDocument(
    document: DocumentMetadata,
    context: WorkspaceContext
  ): ScoredDocument;
  
  rankDocuments(
    documents: DocumentMetadata[],
    context: WorkspaceContext
  ): ScoredDocument[];
  
  private calculateFrameworkScore(
    document: DocumentMetadata,
    frameworks: FrameworkInfo[]
  ): { score: number; reasons: MatchReason[] };
  
  private calculateDependencyScore(
    document: DocumentMetadata,
    dependencies: DependencyInfo[]
  ): { score: number; reasons: MatchReason[] };
  
  private calculateFilePatternScore(
    document: DocumentMetadata,
    patterns: FilePattern[]
  ): { score: number; reasons: MatchReason[] };
  
  private calculateLanguageScore(
    document: DocumentMetadata,
    languages: string[]
  ): { score: number; reasons: MatchReason[] };
}
```

### RecommendationService

Orchestrates the recommendation process.

```typescript
interface RecommendationOptions {
  maxResults?: number;              // Default: 10
  includeInstalled?: boolean;       // Default: true (but marked)
  minScore?: number;                // Default: 10 (0-100 scale)
}

class RecommendationService {
  constructor(
    private documentService: DocumentService,
    private workspaceAnalyzer: WorkspaceAnalyzer,
    private documentMatcher: DocumentMatcher
  );
  
  async getRecommendations(
    options?: RecommendationOptions
  ): Promise<ScoredDocument[]>;
  
  async analyzeWorkspace(): Promise<WorkspaceContext>;
  
  private async fetchAvailableDocuments(): Promise<DocumentMetadata[]>;
  private filterAndRank(
    scored: ScoredDocument[],
    options: RecommendationOptions
  ): ScoredDocument[];
}
```

### Command Handler

```typescript
// src/commands/recommendDocuments.ts
export async function recommendDocuments(
  context: vscode.ExtensionContext
): Promise<void> {
  // Show progress
  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Analyzing workspace...",
    cancellable: true
  }, async (progress, token) => {
    // Get recommendations
    const recommendations = await recommendationService.getRecommendations();
    
    // Show Quick Pick
    const selected = await showRecommendationQuickPick(recommendations);
    
    if (selected) {
      // Show detailed view
      await showRecommendationPanel(selected, context);
    }
  });
}
```

### Tree View Integration

The command will be accessible via:
1. **Command Palette**: "Steering Docs: Get Recommendations"
2. **Tree View Toolbar Button**: Prominent button in Steering Docs Browser view
3. **Keyboard Shortcut** (optional): Configurable shortcut

```typescript
// package.json contribution
{
  "contributes": {
    "commands": [
      {
        "command": "steeringDocs.recommend",
        "title": "Get Recommendations",
        "category": "Steering Docs",
        "icon": "$(sparkle)"
      }
    ],
    "menus": {
      "view/title": [
        {
          "command": "steeringDocs.recommend",
          "when": "view == steeringDocsBrowser",
          "group": "navigation"
        }
      ]
    }
  }
}
```

### Webview Panel

```typescript
class RecommendationPanel {
  private panel: vscode.WebviewPanel | undefined;
  
  constructor(
    private extensionUri: vscode.Uri,
    private documentService: DocumentService
  );
  
  async show(recommendation: ScoredDocument): Promise<void>;
  
  private getHtmlContent(recommendation: ScoredDocument): string;
  private setupMessageHandlers(): void;
  
  // Handle messages from webview
  private async handleInstallRequest(documentId: string): Promise<void>;
  private async handlePreviewRequest(documentId: string): Promise<void>;
}
```

## Data Models

### Extended DocumentMetadata

The existing `DocumentMetadata` interface will be extended with tags for matching:

```typescript
interface DocumentMetadata {
  // Existing fields...
  id: string;
  title: string;
  description: string;
  category: string;
  path: string;
  
  // New fields for recommendations
  tags?: string[];                  // ['react', 'typescript', 'testing']
  applicableTo?: string[];          // ['web-app', 'library']
  requiredDependencies?: string[];  // Dependencies that make this relevant
  filePatterns?: string[];          // File patterns this doc applies to
}
```

### Scoring Weights

```typescript
const SCORING_WEIGHTS = {
  FRAMEWORK_MATCH: 30,        // Exact framework match
  DEPENDENCY_MATCH: 20,       // Dependency mentioned in doc tags
  FILE_PATTERN_MATCH: 15,     // File patterns align
  LANGUAGE_MATCH: 10,         // Language match
  PROJECT_TYPE_MATCH: 15,     // Project type alignment
  CATEGORY_MATCH: 10,         // Category relevance
};
```

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After reviewing the acceptance criteria, several properties emerge as redundant or can be consolidated:

**Redundancies identified:**
- Property 3.1 and 3.4 both test sort order by score
- Property 2.5 and 7.2 both test installed document marking
- Several UI-specific tests are better suited as integration examples rather than properties

**Consolidated properties:**

Property 1: Package.json dependency extraction completeness
*For any* valid package.json file containing both dependencies and devDependencies sections, the Workspace Analyzer should extract all dependencies from both sections
**Validates: Requirements 1.2, 5.1**

Property 2: Framework detection triggers recommendations
*For any* workspace containing framework-specific files or dependencies, the Document Matcher should include framework-related documents in recommendations with non-zero scores
**Validates: Requirements 1.4**

Property 3: TypeScript detection triggers TypeScript recommendations
*For any* workspace containing tsconfig.json or TypeScript dependencies, the Recommendation System should include TypeScript-related documents in recommendations
**Validates: Requirements 1.3**

Property 4: All recommendations include explanations
*For any* recommendation generated by the system, it must include at least one MatchReason explaining why it was recommended
**Validates: Requirements 2.1**

Property 5: Dependency-based recommendations include dependency details
*For any* recommendation where dependencies contributed to the score, the MatchReason list must include the specific dependencies that triggered the match
**Validates: Requirements 2.2**

Property 6: File-pattern-based recommendations include pattern details
*For any* recommendation where file patterns contributed to the score, the MatchReason list must include descriptions of the detected patterns
**Validates: Requirements 2.3**

Property 7: All contributing factors are included
*For any* recommendation with multiple scoring factors (framework, dependency, file pattern, etc.), all factors that contributed non-zero scores must appear in the MatchReason list
**Validates: Requirements 2.4**

Property 8: Installed documents are marked
*For any* document that is already installed in the workspace, if it appears in recommendations, its isInstalled field must be true
**Validates: Requirements 2.5, 7.2**

Property 9: Recommendations are sorted by score descending
*For any* list of scored documents, they must be ordered with higher scores appearing before lower scores
**Validates: Requirements 3.1, 3.4**

Property 10: Framework matches weighted higher than language matches
*For any* document that matches both a framework and a language in the workspace context, the framework match contribution to the total score must be greater than the language match contribution
**Validates: Requirements 3.2**

Property 11: Multiple matches increase score monotonically
*For any* document, if workspace characteristics that match the document increase (more matching dependencies, patterns, etc.), the relevance score must not decrease
**Validates: Requirements 3.3**

Property 12: Equal scores sorted alphabetically
*For any* two documents with identical relevance scores, they must be ordered alphabetically by title
**Validates: Requirements 3.5**

Property 13: Install operation writes to steering directory
*For any* document installation, the document file must be written to the .kiro/steering/ directory with the correct filename
**Validates: Requirements 4.3**

Property 14: Testing framework detection triggers testing recommendations
*For any* workspace with testing framework dependencies (jest, mocha, vitest, etc.), the Document Matcher should include testing-related documents in recommendations
**Validates: Requirements 5.3**

Property 15: Component directory detection
*For any* workspace containing directories matching component patterns (components/, src/components/, etc.), the Workspace Analyzer should identify component-based architecture in the file patterns
**Validates: Requirements 6.1**

Property 16: API route detection
*For any* workspace containing files matching API route patterns (routes/, api/, pages/api/, etc.), the Workspace Analyzer should identify API development patterns
**Validates: Requirements 6.2**

Property 17: Test file detection
*For any* workspace containing files with test extensions (.test.ts, .spec.js, etc.), the Workspace Analyzer should set hasTests to true
**Validates: Requirements 6.3**

Property 18: Node modules exclusion
*For any* workspace analysis, files within node_modules directories must not be included in file pattern analysis
**Validates: Requirements 6.5**

Property 19: Installed document filtering
*For any* recommendation request with includeInstalled=false, documents where isInstalled=true must be excluded from the results
**Validates: Requirements 7.5**

Property 20: Maximum results limiting
*For any* recommendation list with more than maxResults items (default 10), only the top maxResults highest-scored items should be returned
**Validates: Requirements 9.1**

Property 21: View all option presence
*For any* recommendation scenario where more than maxResults documents are available, a "View All" option must be included in the Quick Pick items
**Validates: Requirements 9.2**

Property 22: Small result sets shown completely
*For any* recommendation list with fewer than maxResults items, all items must be included in the results without truncation
**Validates: Requirements 9.4**

Property 23: Markdown rendering preserves formatting
*For any* document content containing markdown syntax, the rendered HTML in the webview must preserve the formatting (headings, lists, code blocks, etc.)
**Validates: Requirements 10.2**

## Error Handling

### Error Scenarios

1. **No workspace open**
   - Detection: Check `vscode.workspace.workspaceFolders`
   - Response: Show error message, prevent analysis
   - User action: Open a workspace and retry

2. **Package.json parse failure**
   - Detection: JSON.parse throws error
   - Response: Log warning, continue with empty dependencies
   - Fallback: Use file pattern analysis only

3. **File system access errors**
   - Detection: File read operations throw
   - Response: Log error, skip that analysis component
   - Fallback: Use available data from successful operations

4. **Document fetch failure**
   - Detection: GitHub API or network error
   - Response: Show error notification with retry option
   - Fallback: Use cached documents if available

5. **Installation failure**
   - Detection: File write operation fails
   - Response: Show detailed error message
   - User action: Check permissions, retry

6. **Webview creation failure**
   - Detection: Webview panel creation throws
   - Response: Fall back to showing document in text editor
   - User action: View content, manual install via tree view

### Error Types

```typescript
enum RecommendationErrorCode {
  NO_WORKSPACE = 'NO_WORKSPACE',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  FETCH_FAILED = 'FETCH_FAILED',
  INSTALL_FAILED = 'INSTALL_FAILED',
  WEBVIEW_FAILED = 'WEBVIEW_FAILED',
}

class RecommendationError extends Error {
  constructor(
    public code: RecommendationErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'RecommendationError';
  }
}
```

## Testing Strategy

### Unit Testing

Unit tests will verify individual components in isolation:

**WorkspaceAnalyzer tests:**
- Parse valid package.json with various dependency structures
- Handle malformed package.json gracefully
- Detect common file patterns (components, routes, tests)
- Identify project types correctly
- Exclude node_modules from scanning

**DocumentMatcher tests:**
- Score documents based on single factors (framework, dependency, pattern)
- Combine multiple scoring factors correctly
- Apply scoring weights as configured
- Generate appropriate match reasons
- Handle edge cases (no matches, perfect matches)

**RecommendationService tests:**
- Orchestrate analysis and matching correctly
- Apply filtering options (maxResults, includeInstalled)
- Handle errors from dependencies gracefully
- Return results in correct format

### Property-Based Testing

Property-based tests will verify universal properties across many generated inputs using a property testing library (fast-check for TypeScript):

**Test configuration:**
- Minimum 100 iterations per property test
- Each test tagged with format: `**Feature: steering-recommendations, Property {number}: {property_text}**`

**Key properties to test:**
- Dependency extraction completeness (Property 1)
- Recommendation sorting order (Property 9)
- Score monotonicity with additional matches (Property 11)
- Alphabetical tiebreaking (Property 12)
- Filtering behavior (Property 19)
- Result limiting (Property 20, 22)

**Generators needed:**
- Random package.json structures with various dependencies
- Random workspace file structures
- Random document metadata with tags
- Random workspace contexts with varying characteristics

### Integration Testing

Integration tests will verify component interactions and UI flows:

- Command invocation triggers full workflow
- Quick Pick displays recommendations correctly
- Webview panel opens and displays content
- Install button triggers document installation
- Error scenarios display appropriate messages
- Progress indicators appear and dismiss correctly

### Testing Tools

- **Mocha**: Test runner (already in project)
- **fast-check**: Property-based testing library
- **VS Code Test API**: Extension testing utilities

## Implementation Notes

### Performance Considerations

1. **Workspace analysis caching**
   - Cache analysis results for 5 minutes
   - Invalidate on file system changes (package.json, tsconfig.json)
   - Use VS Code's FileSystemWatcher for invalidation

2. **Lazy document fetching**
   - Fetch document list on demand, not at extension activation
   - Use existing CacheManager for GitHub API responses
   - Parallel fetch of document content when needed

3. **File pattern analysis optimization**
   - Limit directory traversal depth (max 5 levels)
   - Use glob patterns efficiently
   - Sample large directories rather than scanning all files
   - Respect .gitignore patterns

4. **Scoring optimization**
   - Pre-compute document tag indices for fast lookup
   - Short-circuit scoring when minimum threshold not met
   - Limit number of documents scored (top 50 from catalog)

### UI/UX Considerations

1. **Tree View Toolbar Button**
   - Add prominent button in Steering Docs Browser toolbar
   - Use sparkle/lightbulb icon (✨ or 💡) for discoverability
   - Tooltip: "Get Recommendations for Your Project"
   - Position alongside existing refresh button
   - Triggers same command as Command Palette entry

2. **Quick Pick design**
   - Show score as visual indicator (⭐⭐⭐)
   - Mark installed docs with ✓ icon
   - Include brief reason in description
   - Limit description length for readability

3. **Webview Panel design**
   - Clean, readable layout with good typography
   - Syntax highlighting for code blocks
   - Prominent install button
   - Show all match reasons with icons
   - Responsive design for different panel sizes

4. **Progress feedback**
   - Show analysis steps: "Analyzing dependencies...", "Scoring documents..."
   - Allow cancellation at any point
   - Smooth transition from progress to results

### Extension Points

The design allows for future enhancements:

1. **Custom scoring rules**
   - User-configurable weights for different factors
   - Project-specific recommendation preferences

2. **Machine learning**
   - Learn from user's installation choices
   - Improve scoring based on feedback

3. **Recommendation history**
   - Track what was recommended and installed
   - Avoid re-recommending rejected documents

4. **Batch operations**
   - Install multiple recommended documents at once
   - Create recommendation "bundles" for common stacks

## Dependencies

### New Dependencies

- **fast-check** (^3.15.0) - Property-based testing library
  - Used for generating test cases and verifying properties
  - Dev dependency only

### Existing Dependencies

- **js-yaml** - Already used for frontmatter parsing
- **vscode** - Extension API
- **mocha** - Test runner

No additional runtime dependencies required.


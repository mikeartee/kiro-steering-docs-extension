# Design Document: Kiro Context Manager

## Overview

The Kiro Context Manager is a Kiro IDE extension that provides visibility into estimated context window consumption from steering files and other workspace sources. It follows the same architectural patterns as the existing Kiro Steering Documents Browser extension — service layer for business logic, provider layer for UI, and a shared types module.

The extension reads `.kiro/steering/**/*.md` files, parses their YAML frontmatter to determine inclusion modes, estimates token costs using a 4-characters-per-token heuristic, and presents this information through a status bar indicator, a tree view panel, and a warning/recommendation system.

Key design decisions:

- Reuse the `FrontmatterService` pattern from the existing extension for parsing/serializing steering file frontmatter
- Use a file system watcher to detect steering file changes in real time
- Classify files as active/dormant based on inclusion mode and open editor state
- Provide all estimates with clear "approximate" labeling since we cannot access Kiro's internal context metrics

## Architecture

```mermaid
graph TD
    subgraph "Kiro IDE Extension Host"
        EXT[extension.ts<br/>Entry Point]

        subgraph "Services"
            SFS[SteeringFileScanner<br/>Discovery & Token Estimation]
            FC[FileClassifier<br/>Active/Dormant Classification]
            CA[ContextAnalyzer<br/>Optimization & Recommendations]
            FMS[FrontmatterService<br/>Parse & Serialize YAML]
            WCE[WorkspaceContextEstimator<br/>Broader Context Estimation]
        end

        subgraph "Providers"
            SBI[StatusBarProvider<br/>Token Count Display]
            SMP[SteeringManagerTreeProvider<br/>Tree View Panel]
            WS[WarningService<br/>Threshold Notifications]
        end

        subgraph "File System"
            SF[.kiro/steering/**/*.md]
            SP[.kiro/specs/**/*]
            OE[Open Editor Files]
        end
    end

    EXT --> SFS
    EXT --> FC
    EXT --> CA
    EXT --> SBI
    EXT --> SMP
    EXT --> WS
    EXT --> WCE

    SFS --> FMS
    SFS --> SF
    FC --> SFS
    FC --> OE
    CA --> SFS
    CA --> FC
    WCE --> OE
    WCE --> SP
    WCE --> SFS

    SBI --> FC
    SMP --> SFS
    SMP --> FC
    WS --> FC
    SMP --> FMS

    SFS -.->|FileSystemWatcher| SF
    FC -.->|onDidChangeActiveTextEditor| OE


## Components and Interfaces

### SteeringFileScanner

Responsible for discovering steering files, parsing frontmatter, and computing token estimates.

```typescript
interface SteeringFileInfo {
  filePath: string;
  fileName: string;
  inclusionMode: 'always' | 'manual' | 'fileMatch';
  fileMatchPattern?: string;
  title?: string;
  description?: string;
  tags: string[];
  fileSizeChars: number;
  estimatedTokens: number;
}

interface ScanResult {
  files: SteeringFileInfo[];
  totalTokens: number;
  scanTimestamp: Date;
}

class SteeringFileScanner {
  // Discover all .md files in .kiro/steering/ recursively
  scan(): Promise<ScanResult>;

  // Estimate tokens from character count: Math.ceil(charCount / 4)
  estimateTokens(charCount: number): number;

  // Subscribe to file system changes
  onDidChange: vscode.Event<ScanResult>;

  dispose(): void;
}
```

The scanner uses a `vscode.FileSystemWatcher` on `.kiro/steering/**/*.md` to detect additions, deletions, and modifications. On any change, it re-scans and fires `onDidChange`.

The extension registers a `vscode.workspace.onDidChangeConfiguration` listener to detect changes to `contextManager.*` settings and propagates updated values to the StatusBarProvider, WarningService, and WorkspaceContextEstimator immediately without requiring a reload.

### FileClassifier

Determines whether each steering file is active or dormant based on inclusion mode and open editors.

```typescript
type FileStatus = 'active' | 'dormant';

interface ClassifiedFile extends SteeringFileInfo {
  status: FileStatus;
}

interface ClassificationResult {
  files: ClassifiedFile[];
  activeTokens: number;
  dormantTokens: number;
  totalTokens: number;
}

class FileClassifier {
  constructor(scanner: SteeringFileScanner);

  // Classify all files based on current editor state
  classify(): ClassificationResult;

  // Subscribe to classification changes
  onDidChange: vscode.Event<ClassificationResult>;

  dispose(): void;
}
```

Classification rules:

- `always` → active
- `manual` → dormant
- `fileMatch` → active if any open editor matches the glob pattern, dormant otherwise

The classifier listens to `vscode.window.onDidChangeActiveTextEditor` and `vscode.window.onDidChangeVisibleTextEditors` to re-evaluate `fileMatch` files when editors change.

### FrontmatterService

Reuses the same pattern as the existing extension. Parses YAML frontmatter delimited by `---` and serializes it back while preserving the markdown body.

```typescript
interface ParseResult {
  frontmatter: Record<string, unknown>;
  body: string;
}

class FrontmatterService {
  parse(content: string): ParseResult;
  stringify(frontmatter: Record<string, unknown>, body: string): string;
  updateInclusionMode(
    content: string,
    mode: 'always' | 'manual' | 'fileMatch',
    pattern?: string
  ): string;
  getInclusionMode(content: string): string | undefined;
}
```

### ContextAnalyzer

Generates optimization recommendations by analyzing steering file tags against workspace file patterns.

```typescript
interface OptimizationRecommendation {
  file: SteeringFileInfo;
  currentMode: 'always' | 'manual' | 'fileMatch';
  recommendedMode: 'fileMatch' | 'manual';
  suggestedPattern?: string;
  reason: string;
  estimatedSavings: number;
}

interface AlternativeRecommendation {
  file: SteeringFileInfo;
  recommendation: 'knowledge-base' | 'skill';
  reason: string;
}

class ContextAnalyzer {
  constructor(scanner: SteeringFileScanner, classifier: FileClassifier);

  // Analyze and return inclusion mode optimization recommendations
  getOptimizationRecommendations(): Promise<OptimizationRecommendation[]>;

  // Identify files that should be knowledge bases or skills
  getAlternativeRecommendations(): AlternativeRecommendation[];
}
```

Tag-to-glob mapping for recommendations:

| Tag | Suggested Pattern |
|-----|-------------------|
| typescript, ts | `**/*.ts` |
| javascript, js | `**/*.js` |
| python | `**/*.py` |
| react, jsx, tsx | `**/*.tsx` |
| css, scss | `**/*.css` |
| json | `**/*.json` |
| yaml, yml | `**/*.yml` |
| markdown, md | `**/*.md` |

Files exceeding 2000 estimated tokens with `always` inclusion are flagged for knowledge base conversion.

### WorkspaceContextEstimator

Estimates context consumption from sources beyond steering files.

```typescript
interface ContextCategory {
  name: string;
  estimatedTokens: number;
  items: ContextItem[];
}

interface ContextItem {
  label: string;
  estimatedTokens: number;
}

interface ContextBreakdown {
  categories: ContextCategory[];
  totalEstimatedTokens: number;
  budgetPercentage: number;
  disclaimer: string;
}

class WorkspaceContextEstimator {
  constructor(scanner: SteeringFileScanner, classifier: FileClassifier);

  // Get full context breakdown across all sources
  getBreakdown(contextBudget: number): Promise<ContextBreakdown>;
}
```

Categories estimated:

- Active steering files (from FileClassifier)
- Open editor files (character count of visible editors)
- Spec documents (`.kiro/specs/` files)

### StatusBarProvider

Manages the status bar item showing active token count.

```typescript
class StatusBarProvider {
  constructor(classifier: FileClassifier, contextBudget: number);

  // Update the status bar display
  update(classification: ClassificationResult): void;

  // Format token count for display
  formatTokenCount(tokens: number): string;

  // Determine severity color based on budget percentage
  getSeverity(tokens: number, budget: number): 'normal' | 'warning' | 'critical';

  dispose(): void;
}
```

Display format: `$(symbol-keyword) 5.2k tokens` with background color changing at thresholds.

### SteeringManagerTreeProvider

Tree view provider for the Steering File Manager panel.

```typescript
class SteeringManagerTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  constructor(
    scanner: SteeringFileScanner,
    classifier: FileClassifier,
    frontmatterService: FrontmatterService
  );

  // Standard tree data provider methods
  getTreeItem(element: TreeItem): vscode.TreeItem;
  getChildren(element?: TreeItem): Promise<TreeItem[]>;

  refresh(): void;
  dispose(): void;
}
```

Tree structure:

```
Context Manager
├── 🟢 Always (12.4k tokens)
│   ├── 🟢 development-guidelines.md — 3.2k tokens
│   ├── 🟢 tech.md — 1.1k tokens
│   └── 🟢 typescript-formatting.md — 8.1k tokens
├── 🟡 File Match (2.1k tokens active)
│   ├── 🟢 python-formatting.md — 2.1k tokens (active)
│   └── ⚪ css-formatting.md — 1.8k tokens (dormant)
└── ⚪ Manual (0 tokens)
    └── ⚪ legacy-patterns.md — 4.2k tokens (dormant)
```

### WarningService

Manages threshold-based notifications with session-aware deduplication.

```typescript
class WarningService {
  constructor(classifier: FileClassifier, contextBudget: number);

  // Check thresholds and show notifications if needed
  // Notifications include a "Manage Steering Files" action button
  // that executes contextManager.showPanel command
  evaluate(classification: ClassificationResult): void;

  // Reset threshold tracking (e.g., when usage drops below threshold)
  resetThreshold(level: 'warning' | 'critical'): void;

  // Update budget when configuration changes
  updateBudget(newBudget: number): void;

  dispose(): void;
}
```

The service tracks which thresholds have been triggered in the current session. A threshold notification is only shown once per crossing — if usage drops below and rises above again, the notification fires again.

At the 80% critical threshold, the notification additionally includes a "Start Fresh Conversation" action that executes `workbench.action.chat.newChat` (or the Kiro equivalent) to open a new chat session, helping the user escape context overflow.


## Data Models

### Core Types

```typescript
/**
 * Inclusion modes for steering files, matching Kiro IDE's frontmatter schema
 */
type InclusionMode = 'always' | 'manual' | 'fileMatch';

/**
 * Active/dormant classification status
 */
type FileStatus = 'active' | 'dormant';

/**
 * Severity levels for status bar and warnings
 */
type Severity = 'normal' | 'warning' | 'critical';

/**
 * Information about a discovered steering file
 */
interface SteeringFileInfo {
  filePath: string;
  fileName: string;
  inclusionMode: InclusionMode;
  fileMatchPattern?: string;
  title?: string;
  description?: string;
  tags: string[];
  fileSizeChars: number;
  estimatedTokens: number;
}

/**
 * A steering file with its active/dormant classification
 */
interface ClassifiedFile extends SteeringFileInfo {
  status: FileStatus;
}

/**
 * Result of scanning all steering files
 */
interface ScanResult {
  files: SteeringFileInfo[];
  totalTokens: number;
  scanTimestamp: Date;
}

/**
 * Result of classifying all steering files
 */
interface ClassificationResult {
  files: ClassifiedFile[];
  activeTokens: number;
  dormantTokens: number;
  totalTokens: number;
}

/**
 * Recommendation to change a file's inclusion mode
 */
interface OptimizationRecommendation {
  file: SteeringFileInfo;
  currentMode: InclusionMode;
  recommendedMode: 'fileMatch' | 'manual';
  suggestedPattern?: string;
  reason: string;
  estimatedSavings: number;
}

/**
 * Recommendation to move content to a knowledge base or skill
 */
interface AlternativeRecommendation {
  file: SteeringFileInfo;
  recommendation: 'knowledge-base' | 'skill';
  reason: string;
}

/**
 * A category in the context breakdown
 */
interface ContextCategory {
  name: string;
  estimatedTokens: number;
  items: ContextItem[];
}

/**
 * A single item contributing to context consumption
 */
interface ContextItem {
  label: string;
  estimatedTokens: number;
}

/**
 * Full context breakdown across all sources
 */
interface ContextBreakdown {
  categories: ContextCategory[];
  totalEstimatedTokens: number;
  budgetPercentage: number;
  disclaimer: string;
}

/**
 * Tree item types for the Steering Manager panel
 */
type ManagerTreeItem = GroupTreeItem | FileTreeItem;

/**
 * Group node representing an inclusion mode category
 */
interface GroupTreeItem {
  type: 'group';
  inclusionMode: InclusionMode;
  label: string;
  totalTokens: number;
  activeTokens: number;
  fileCount: number;
}

/**
 * File node representing a single steering file
 */
interface FileTreeItem {
  type: 'file';
  file: ClassifiedFile;
}

/**
 * Extension configuration schema
 */
interface ContextManagerConfig {
  contextBudget: number;
  warningThresholds: [number, number];
  enableWarnings: boolean;
}
```

### Configuration Contribution Points

```json
{
  "contextManager.contextBudget": {
    "type": "number",
    "default": 32000,
    "description": "Estimated token budget for steering files (approximate)"
  },
  "contextManager.warningThresholds": {
    "type": "array",
    "default": [50, 80],
    "description": "Warning threshold percentages [info, critical]"
  },
  "contextManager.enableWarnings": {
    "type": "boolean",
    "default": true,
    "description": "Enable context usage warning notifications"
  }
}
```

### Commands

| Command ID | Title | Description |
|---|---|---|
| `contextManager.showPanel` | Show Context Manager | Opens the Steering File Manager panel |
| `contextManager.optimizeContext` | Optimize Context | Analyzes and recommends inclusion mode changes |
| `contextManager.showBreakdown` | Show Context Breakdown | Shows token breakdown across all sources |
| `contextManager.setInclusionAlways` | Set Inclusion: Always | Changes a file to always inclusion |
| `contextManager.setInclusionManual` | Set Inclusion: Manual | Changes a file to manual inclusion |
| `contextManager.setInclusionFileMatch` | Set Inclusion: File Match | Changes a file to fileMatch inclusion |
| `contextManager.refresh` | Refresh Context Manager | Re-scans steering files |
| `contextManager.startFreshChat` | Start Fresh Conversation | Opens a new Kiro chat session to escape context overflow |


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Token estimation formula

*For any* non-negative integer character count, `estimateTokens(charCount)` should return `Math.ceil(charCount / 4)`, and the result should always be greater than or equal to zero.

**Validates: Requirements 1.3, 8.3**

### Property 2: Severity classification

*For any* non-negative token count and positive context budget, `getSeverity(tokens, budget)` should return `'critical'` when `tokens / budget > 0.8`, `'warning'` when `tokens / budget > 0.5`, and `'normal'` otherwise. The three ranges should be mutually exclusive and exhaustive.

**Validates: Requirements 2.3, 2.4**

### Property 3: Token count formatting

*For any* non-negative integer token count, `formatTokenCount(tokens)` should return a string containing the numeric value and the word "tokens". Values >= 1000 should be formatted with a "k" suffix (e.g., 1200 → "1.2k tokens"), and values < 1000 should show the exact number (e.g., 500 → "500 tokens"). The formatted string should always be parseable back to a value within rounding tolerance of the original.

**Validates: Requirements 2.2**

### Property 4: File classification correctness

*For any* steering file info and set of open editor file paths: if the inclusion mode is `always`, the status should be `active`; if the inclusion mode is `manual`, the status should be `dormant`; if the inclusion mode is `fileMatch`, the status should be `active` if and only if at least one open editor path matches the `fileMatchPattern` glob.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 5: Warning threshold state machine

*For any* sequence of active token counts and a fixed context budget with thresholds at 50% and 80%, a threshold notification should fire only on the first upward crossing of that threshold. If the count subsequently drops below the threshold and rises above it again, the notification should fire again. The notification should never fire twice consecutively for the same threshold without an intervening drop below.

**Validates: Requirements 4.1, 4.2, 4.4**

### Property 6: Tag-to-glob mapping

*For any* known language tag in the tag-to-glob mapping table, `getGlobForTag(tag)` should return a non-empty glob pattern string. For any unknown tag, it should return `undefined`. The mapping should be deterministic — the same tag always produces the same glob.

**Validates: Requirements 5.5**

### Property 7: Frontmatter round-trip

*For any* valid frontmatter object (with string keys and serializable values) and any markdown body string, `parse(stringify(frontmatter, body))` should produce a frontmatter object equivalent to the original and a body identical to the original.

**Validates: Requirements 10.3**

### Property 8: Selective frontmatter update preservation

*For any* steering file content with valid frontmatter containing arbitrary fields, calling `updateInclusionMode(content, newMode, newPattern)` should produce content where the `inclusion` field equals `newMode`, the `fileMatchPattern` field equals `newPattern` (if mode is `fileMatch`), and all other frontmatter fields remain unchanged. The markdown body should be identical.

**Validates: Requirements 10.2**

### Property 9: Token sum invariant

*For any* list of classified files, the sum of `estimatedTokens` for all files where `status === 'active'` should equal `activeTokens` in the ClassificationResult. Similarly, the sum for `status === 'dormant'` should equal `dormantTokens`, and `activeTokens + dormantTokens` should equal `totalTokens`.

**Validates: Requirements 2.1, 3.4**

### Property 10: Tree item completeness

*For any* ClassifiedFile, the tree item created from it should contain the file name, inclusion mode label, token cost string, and an icon that differs between active and dormant status. Active files should receive a distinct icon from dormant files.

**Validates: Requirements 3.1, 3.2**

### Property 11: Context breakdown correctness

*For any* set of context categories with item lists, the category's `estimatedTokens` should equal the sum of its items' `estimatedTokens`. The `totalEstimatedTokens` should equal the sum of all category totals. The `budgetPercentage` should equal `(totalEstimatedTokens / contextBudget) * 100`.

**Validates: Requirements 8.1, 8.2**

### Property 12: Large file flagging for alternative recommendations

*For any* steering file with inclusion mode `always` and `estimatedTokens > 2000`, the analyzer should include it in the alternative recommendations list. For any file with `estimatedTokens <= 2000` or inclusion mode other than `always`, it should not be flagged.

**Validates: Requirements 9.1**

### Property 13: Optimization recommendation for always-mode files with tags

*For any* steering file set to `always` inclusion that has at least one language-specific tag present in the tag-to-glob mapping, the analyzer should produce an OptimizationRecommendation with `recommendedMode` of `fileMatch` and a `suggestedPattern` matching the tag's glob. Files without recognized tags or not set to `always` should not receive fileMatch recommendations.

**Validates: Requirements 5.2**


## Error Handling

### File System Errors

- If `.kiro/steering/` directory does not exist, the scanner should return an empty `ScanResult` and log an info message — not throw an error. The extension should remain functional with zero steering files.
- If a steering file cannot be read (permissions, encoding), the scanner should skip it, log a warning, and continue scanning other files.
- If writing a frontmatter update fails (file locked, permissions), the extension should show an error notification to the user and not modify the in-memory state.

### Frontmatter Parsing Errors

- If YAML parsing fails (malformed YAML between `---` delimiters), the `FrontmatterService` should return an empty frontmatter object and treat the entire content as the body. The file should default to `always` inclusion mode per Requirement 1.4.
- If the `inclusion` field contains an unrecognized value, the scanner should treat it as `always` and log a warning.

### Configuration Errors

- If `contextManager.contextBudget` is set to zero or negative, the extension should fall back to the default value of 32000 and log a warning.
- If `contextManager.warningThresholds` contains values outside 0-100, the extension should clamp them to valid range.

### Glob Pattern Errors

- If a `fileMatchPattern` is an invalid glob, the `FileClassifier` should treat the file as dormant and log a warning rather than throwing.

## Testing Strategy

### Testing Framework

- **Test runner**: Mocha (matching the existing extension's test setup)
- **Property-based testing**: `fast-check` (already a devDependency in the existing extension)
- **Assertions**: Node.js built-in `assert` module
- **Mocking**: `sinon` for VS Code API mocks

### Unit Tests

Unit tests cover specific examples, edge cases, and error conditions:

- FrontmatterService: files with no frontmatter, empty frontmatter, malformed YAML
- Token estimation: zero characters, one character, exact multiples of 4
- Severity classification: boundary values at exactly 50% and 80%
- Format function: 0 tokens, 999 tokens, 1000 tokens, 999999 tokens
- FileClassifier: empty open editors list, glob patterns with special characters
- WarningService: empty session, single threshold crossing, rapid oscillation

### Property-Based Tests

Each correctness property is implemented as a single property-based test using `fast-check` with a minimum of 100 iterations. Each test is tagged with its design property reference.

| Property | Test Tag | Generator Strategy |
|---|---|---|
| P1: Token estimation | Feature: kiro-context-manager, Property 1: Token estimation formula | `fc.nat()` for character counts |
| P2: Severity classification | Feature: kiro-context-manager, Property 2: Severity classification | `fc.nat()` for tokens, `fc.integer({min: 1})` for budget |
| P3: Token count formatting | Feature: kiro-context-manager, Property 3: Token count formatting | `fc.nat({max: 999999})` for token counts |
| P4: File classification | Feature: kiro-context-manager, Property 4: File classification correctness | `fc.record()` for SteeringFileInfo, `fc.array(fc.string())` for editor paths |
| P5: Warning state machine | Feature: kiro-context-manager, Property 5: Warning threshold state machine | `fc.array(fc.nat())` for token count sequences |
| P6: Tag-to-glob mapping | Feature: kiro-context-manager, Property 6: Tag-to-glob mapping | `fc.constantFrom()` over known tags plus `fc.string()` for unknown |
| P7: Frontmatter round-trip | Feature: kiro-context-manager, Property 7: Frontmatter round-trip | `fc.dictionary()` for frontmatter, `fc.string()` for body |
| P8: Selective update | Feature: kiro-context-manager, Property 8: Selective frontmatter update preservation | `fc.dictionary()` for frontmatter with extra fields |
| P9: Token sum invariant | Feature: kiro-context-manager, Property 9: Token sum invariant | `fc.array(fc.record())` for classified file lists |
| P10: Tree item completeness | Feature: kiro-context-manager, Property 10: Tree item completeness | `fc.record()` for ClassifiedFile |
| P11: Breakdown correctness | Feature: kiro-context-manager, Property 11: Context breakdown correctness | `fc.array(fc.record())` for categories with items |
| P12: Large file flagging | Feature: kiro-context-manager, Property 12: Large file flagging | `fc.record()` with varying token counts and modes |
| P13: Optimization recommendation | Feature: kiro-context-manager, Property 13: Optimization recommendation | `fc.record()` with varying tags and modes |

### Test Organization

```
src/test/
├── unit/
│   ├── frontmatterService.test.ts
│   ├── tokenEstimation.test.ts
│   ├── severityClassification.test.ts
│   ├── formatTokenCount.test.ts
│   ├── fileClassifier.test.ts
│   ├── warningService.test.ts
│   └── contextAnalyzer.test.ts
└── property/
    ├── tokenEstimation.property.ts
    ├── severity.property.ts
    ├── formatting.property.ts
    ├── classification.property.ts
    ├── warningStateMachine.property.ts
    ├── tagMapping.property.ts
    ├── frontmatterRoundTrip.property.ts
    ├── frontmatterUpdate.property.ts
    ├── tokenSumInvariant.property.ts
    ├── treeItemCompleteness.property.ts
    ├── breakdownCorrectness.property.ts
    ├── largeFileFlagging.property.ts
    └── optimizationRecommendation.property.ts
```

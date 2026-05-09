# Implementation Plan: Kiro Context Manager

## ⚠️ MANDATORY - READ BEFORE EVERY TASK ⚠️

**YOU MUST FOLLOW THESE RULES FOR EVERY TASK:**

1. **Shell Commands**: Use `controlPwshProcess` ONLY. NEVER use `executePwsh`.
2. **Gap Analysis**: Perform TWO gap analysis passes BEFORE marking any task complete.
3. **Show Your Work**: Gap analysis must be visible in your response.

If you skip any of these, you have violated the protocol.

---

## Overview

This plan implements the Kiro Context Manager extension as a new feature within the existing kiro-steering-docs-extension project. It follows the established service/provider architecture pattern, reuses the existing FrontmatterService, and adds new services for scanning, classification, analysis, and UI components.

Each task builds incrementally — core services first, then UI providers, then integration wiring.

## Development Principles

**IMPORTANT**: Follow these principles strictly during implementation:

1. **Build ugly and working before making it clean**
   - Get it working first
   - Refactor later if needed
   - Don't optimize prematurely

2. **If something isn't specified, ask - don't invent**
   - No assumptions
   - No "improvements"
   - No "I noticed we could also..."

3. **Build exactly what's specified. Nothing more.**
   - No extra features
   - No extra abstractions
   - No extra config options

4. **Stop and ask if stuck for 10+ minutes**
   - Don't waste time debugging hallucinated APIs
   - Use Context7 to check library docs
   - Ask for clarification on ambiguous requirements

5. **Property tests are optional for MVP**
   - Tasks marked with `*` can be skipped
   - Focus on getting core functionality working
   - Add comprehensive tests in v2

## Non-Requirements (What NOT to Build)

To maintain simplicity and focus, this implementation explicitly **DOES NOT** include:

❌ Access to Kiro's internal context metrics or actual token counts
❌ Real-time conversation token tracking
❌ Automatic inclusion mode switching without user confirmation
❌ Integration with Kiro's conversation compaction system
❌ Custom webview panels (use tree views and quick picks only)
❌ Telemetry or usage analytics
❌ Multi-workspace support (single workspace only)

**System Characteristics:**

✅ Estimates only — all token counts are approximate (4 chars ≈ 1 token)
✅ File-system based — reads .kiro/steering/ directory
✅ Event-driven — reacts to file changes and editor switches
✅ Non-intrusive — warnings can be disabled via settings

## Context7 MCP Usage (CRITICAL)

**Before writing ANY code that uses a library, query Context7 for current documentation.**

**Required libraries to query Context7 for:**

- `vscode` — Extension API (FileSystemWatcher, TreeDataProvider, StatusBarItem, window.showInformationMessage)
- `js-yaml` — YAML parsing for frontmatter
- `fast-check` — Property-based testing library
- `mocha` — Test runner
- `sinon` — Mocking library

**Don't assume you know the API. Don't use outdated patterns. Check Context7 first.**

---

## Tasks

- [ ] 1. Define types and interfaces
  - [ ] 1.1 Create `src/models/contextManagerTypes.ts` with all interfaces and types from the design document
    - `InclusionMode`, `FileStatus`, `Severity` type aliases
    - `SteeringFileInfo`, `ClassifiedFile`, `ScanResult`, `ClassificationResult` interfaces
    - `OptimizationRecommendation`, `AlternativeRecommendation` interfaces
    - `ContextCategory`, `ContextItem`, `ContextBreakdown` interfaces
    - `ManagerTreeItem`, `GroupTreeItem`, `FileTreeItem` interfaces
    - `ContextManagerConfig` interface
    - _Requirements: 1.2, 1.3, 6.1-6.4, 8.1, 9.1_

- [ ] 2. Implement token estimation and formatting utilities
  - [ ] 2.1 Create `src/services/TokenEstimator.ts` with `estimateTokens(charCount: number): number` and `formatTokenCount(tokens: number): string` functions
    - `estimateTokens`: `Math.ceil(charCount / 4)`, handle zero and negative inputs
    - `formatTokenCount`: values < 1000 → "N tokens", values >= 1000 → "N.Nk tokens"
    - _Requirements: 1.3, 2.2, 8.3_
  - [ ]* 2.2 Write property test for token estimation formula
    - **Property 1: Token estimation formula**
    - **Validates: Requirements 1.3, 8.3**
  - [ ]* 2.3 Write property test for token count formatting
    - **Property 3: Token count formatting**
    - **Validates: Requirements 2.2**

- [ ] 3. Implement severity classification
  - [ ] 3.1 Create `src/services/SeverityClassifier.ts` with `getSeverity(tokens: number, budget: number): Severity` function
    - Return `'critical'` when ratio > 0.8, `'warning'` when ratio > 0.5, `'normal'` otherwise
    - _Requirements: 2.3, 2.4_
  - [ ]* 3.2 Write property test for severity classification
    - **Property 2: Severity classification**
    - **Validates: Requirements 2.3, 2.4**

- [ ] 4. Implement SteeringFileScanner service
  - [ ] 4.1 Create `src/services/SteeringFileScanner.ts`
    - Use `vscode.workspace.findFiles('.kiro/steering/**/*.md')` for initial scan
    - Parse each file using the existing `FrontmatterService` to extract inclusion, fileMatchPattern, title, description, tags
    - Calculate `estimatedTokens` using `estimateTokens()` on file character count
    - Default to `always` inclusion when frontmatter is missing or invalid (Req 1.4)
    - Set up `vscode.FileSystemWatcher` on `.kiro/steering/**/*.md` for add/remove/change events
    - Fire `onDidChange` event with updated `ScanResult` on file system changes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ]* 4.2 Write unit tests for SteeringFileScanner
    - Test: file with valid frontmatter extracts all fields
    - Test: file with no frontmatter defaults to always
    - Test: file with malformed YAML defaults to always
    - _Requirements: 1.2, 1.4_

- [ ] 5. Implement FileClassifier service
  - [ ] 5.1 Create `src/services/FileClassifier.ts`
    - Accept `SteeringFileScanner` as constructor dependency
    - Implement `classify(): ClassificationResult` using classification rules from design
    - `always` → active, `manual` → dormant, `fileMatch` → check open editors against glob using `minimatch` or `picomatch`
    - Listen to `vscode.window.onDidChangeVisibleTextEditors` to re-classify on editor changes
    - Compute `activeTokens`, `dormantTokens`, `totalTokens` sums
    - Fire `onDidChange` event with updated `ClassificationResult`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [ ]* 5.2 Write property test for file classification correctness
    - **Property 4: File classification correctness**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
  - [ ]* 5.3 Write property test for token sum invariant
    - **Property 9: Token sum invariant**
    - **Validates: Requirements 2.1, 3.4**

- [ ] 6. Checkpoint - Core services
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement FrontmatterService extensions
  - [ ] 7.1 Verify the existing `FrontmatterService` in `src/services/FrontmatterService.ts` supports all needed operations
    - Confirm `parse()`, `stringify()`, `updateInclusionMode()`, `getInclusionMode()` work for the context manager use cases
    - If any gaps exist, extend the service (do not duplicate it)
    - _Requirements: 10.1, 10.2, 10.4_
  - [ ]* 7.2 Write property test for frontmatter round-trip
    - **Property 7: Frontmatter round-trip**
    - **Validates: Requirements 10.3**
  - [ ]* 7.3 Write property test for selective frontmatter update preservation
    - **Property 8: Selective frontmatter update preservation**
    - **Validates: Requirements 10.2**

- [ ] 8. Implement ContextAnalyzer service
  - [ ] 8.1 Create `src/services/ContextAnalyzer.ts`
    - Implement tag-to-glob mapping table (typescript→`**/*.ts`, python→`**/*.py`, etc.)
    - Implement `getOptimizationRecommendations()`: find `always` files with language tags, recommend `fileMatch` with appropriate glob
    - Implement `getAlternativeRecommendations()`: flag `always` files with > 2000 estimated tokens as knowledge base candidates
    - Distinguish behavioral guidance vs reference material using size threshold and tag heuristics
    - _Requirements: 5.2, 5.5, 9.1, 9.2, 9.3, 9.4_
  - [ ]* 8.2 Write property test for tag-to-glob mapping
    - **Property 6: Tag-to-glob mapping**
    - **Validates: Requirements 5.5**
  - [ ]* 8.3 Write property test for large file flagging
    - **Property 12: Large file flagging for alternative recommendations**
    - **Validates: Requirements 9.1**
  - [ ]* 8.4 Write property test for optimization recommendation
    - **Property 13: Optimization recommendation for always-mode files with tags**
    - **Validates: Requirements 5.2**

- [ ] 9. Implement WorkspaceContextEstimator service
  - [ ] 9.1 Create `src/services/WorkspaceContextEstimator.ts`
    - Accept `SteeringFileScanner` and `FileClassifier` as dependencies
    - Implement `getBreakdown(contextBudget: number): Promise<ContextBreakdown>`
    - Category 1: Active steering files (from classifier)
    - Category 2: Open editor files (read `vscode.window.visibleTextEditors`, get document text length, estimate tokens)
    - Category 3: Spec documents (find `.kiro/specs/**/*` files, estimate tokens from file sizes)
    - Include disclaimer string: "These are approximate estimates. Actual Kiro context usage may differ."
    - Calculate `budgetPercentage` as `(totalEstimatedTokens / contextBudget) * 100`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [ ]* 9.2 Write property test for context breakdown correctness
    - **Property 11: Context breakdown correctness**
    - **Validates: Requirements 8.1, 8.2**

- [ ] 10. Checkpoint - All services complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement StatusBarProvider
  - [ ] 11.1 Create `src/providers/StatusBarProvider.ts`
    - Create `vscode.StatusBarItem` with alignment left and priority
    - Display formatted active token count using `formatTokenCount()`
    - Set background color based on `getSeverity()`: normal = default, warning = `statusBarItem.warningBackground`, critical = `statusBarItem.errorBackground`
    - Set command to `contextManager.showPanel` for click handling
    - Subscribe to `FileClassifier.onDidChange` to update display
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 12. Implement SteeringManagerTreeProvider
  - [ ] 12.1 Create `src/providers/SteeringManagerTreeProvider.ts`
    - Implement `vscode.TreeDataProvider<ManagerTreeItem>`
    - Root level: three `GroupTreeItem` nodes for always, fileMatch, manual
    - Each group shows label with total token count (e.g., "Always (12.4k tokens)")
    - Child level: `FileTreeItem` nodes with name, token cost, active/dormant icon
    - Active files: green circle icon, Dormant files: grey circle outline
    - Context value for menu enablement: `contextManagerFile`
    - Subscribe to scanner and classifier changes to refresh
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ]* 12.2 Write property test for tree item completeness
    - **Property 10: Tree item completeness**
    - **Validates: Requirements 3.1, 3.2**

- [ ] 13. Implement WarningService
  - [ ] 13.1 Create `src/services/WarningService.ts`
    - Track threshold crossing state: `warningTriggered` and `criticalTriggered` booleans
    - On each `ClassificationResult` update, check if active tokens cross 50% or 80% of budget
    - Fire notification only on upward crossing (was below, now above)
    - Reset triggered flag when usage drops below threshold
    - 50% notification: `vscode.window.showInformationMessage` with "Manage Steering Files" action
    - 80% notification: `vscode.window.showWarningMessage` with "Manage Steering Files" and "Start Fresh Conversation" actions
    - Handle action button clicks: execute `contextManager.showPanel` or `contextManager.startFreshChat`
    - Support `enableWarnings` config toggle
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1_
  - [ ]* 13.2 Write property test for warning threshold state machine
    - **Property 5: Warning threshold state machine**
    - **Validates: Requirements 4.1, 4.2, 4.4**

- [ ] 14. Register commands and wire extension entry point
  - [ ] 14.1 Add contribution points to `package.json`
    - Add `contextManager` view to the `kiro` view container
    - Add all commands: `contextManager.showPanel`, `contextManager.optimizeContext`, `contextManager.showBreakdown`, `contextManager.setInclusionAlways`, `contextManager.setInclusionManual`, `contextManager.setInclusionFileMatch`, `contextManager.refresh`, `contextManager.startFreshChat`
    - Add context menu contributions for `contextManagerFile` context value
    - Add configuration properties: `contextManager.contextBudget`, `contextManager.warningThresholds`, `contextManager.enableWarnings`
    - _Requirements: 7.1, 7.2, 7.3, 3.5_
  - [ ] 14.2 Wire services and providers in `src/extension.ts`
    - Initialize all services: SteeringFileScanner, FileClassifier, ContextAnalyzer, WorkspaceContextEstimator
    - Initialize all providers: StatusBarProvider, SteeringManagerTreeProvider, WarningService
    - Register tree view with `vscode.window.createTreeView`
    - Register all command handlers
    - Register `onDidChangeConfiguration` listener to propagate config changes to services
    - Add all disposables to `context.subscriptions`
    - _Requirements: 7.4, 2.5, 2.6_
  - [ ] 14.3 Implement command handlers
    - `contextManager.showPanel`: focus the tree view
    - `contextManager.optimizeContext`: call `ContextAnalyzer.getOptimizationRecommendations()` and `getAlternativeRecommendations()`, present combined quick pick, apply selected changes via `FrontmatterService`
    - `contextManager.showBreakdown`: call `WorkspaceContextEstimator.getBreakdown()`, present as quick pick items
    - `contextManager.setInclusionAlways/Manual/FileMatch`: read file, update via `FrontmatterService.updateInclusionMode()`, write back, refresh
    - `contextManager.refresh`: trigger scanner re-scan
    - `contextManager.startFreshChat`: execute `workbench.action.chat.newChat` command
    - _Requirements: 3.6, 3.7, 5.2, 5.3, 5.4, 8.1, 8.2_

- [ ] 15. Final checkpoint - Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The extension reuses the existing `FrontmatterService` — do not duplicate it
- All token counts are estimates; the disclaimer must be visible in the context breakdown

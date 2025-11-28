# Implementation Plan

- [x] 1. Set up core data models and types
  - Create TypeScript interfaces for WorkspaceContext, FrameworkInfo, DependencyInfo, FilePattern, ScoredDocument, MatchReason
  - Define ProjectType and DependencyCategory enums
  - Define RecommendationErrorCode enum and RecommendationError class
  - Define SCORING_WEIGHTS constants
  - Extend DocumentMetadata interface with optional recommendation fields (tags, applicableTo, requiredDependencies, filePatterns)
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. Implement WorkspaceAnalyzer service
  - [x] 2.1 Create WorkspaceAnalyzer class with analyze method
    - Implement main analyze method that orchestrates all analysis steps
    - Handle no workspace scenario with appropriate error
    - _Requirements: 1.1, 1.5_

  - [x] 2.2 Implement package.json analysis
    - Create analyzePackageJson method to parse dependencies and devDependencies
    - Categorize dependencies by type (framework, testing, build, utility)
    - Detect frameworks from dependency list
    - Handle malformed package.json gracefully
    - _Requirements: 1.2, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.3 Write property test for package.json parsing
    - **Property 1: Package.json dependency extraction completeness**
    - **Validates: Requirements 1.2, 5.1**

  - [x] 2.4 Implement file structure analysis
    - Create analyzeFileStructure method to detect file patterns
    - Detect component directories (components/, src/components/)
    - Detect API route patterns (routes/, api/, pages/api/)
    - Detect test files (.test.ts, .spec.js extensions)
    - Exclude node_modules from scanning
    - Limit directory traversal depth to 5 levels
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [ ]* 2.5 Write property test for file pattern detection
    - **Property 15: Component directory detection**
    - **Validates: Requirements 6.1**

  - [ ]* 2.6 Write property test for API route detection
    - **Property 16: API route detection**
    - **Validates: Requirements 6.2**

  - [ ]* 2.7 Write property test for test file detection
    - **Property 17: Test file detection**
    - **Validates: Requirements 6.3**

  - [ ]* 2.8 Write property test for node_modules exclusion
    - **Property 18: Node modules exclusion**
    - **Validates: Requirements 6.5**

  - [x] 2.9 Implement configuration analysis
    - Create analyzeConfigurations method to detect languages and project type
    - Detect TypeScript from tsconfig.json
    - Categorize project type based on dependencies and file patterns
    - _Requirements: 1.3, 1.4_

  - [ ]* 2.10 Write property test for TypeScript detection
    - **Property 3: TypeScript detection triggers TypeScript recommendations**
    - **Validates: Requirements 1.3**

  - [ ]* 2.11 Write unit tests for WorkspaceAnalyzer
    - Test framework detection logic
    - Test project type categorization
    - Test error handling for missing files
    - Test graceful degradation when analysis components fail

- [x] 3. Implement DocumentMatcher service
  - [x] 3.1 Create DocumentMatcher class with scoring methods
    - Implement scoreDocument method that combines all scoring factors
    - Implement rankDocuments method that sorts by score and title
    - _Requirements: 3.1, 3.4, 3.5_

  - [x] 3.2 Implement framework scoring
    - Create calculateFrameworkScore method
    - Match document tags against detected frameworks
    - Apply FRAMEWORK_MATCH weight (30 points)
    - Generate MatchReason with framework details
    - _Requirements: 1.4, 2.2, 3.2, 5.2, 5.5_

  - [ ]* 3.3 Write property test for framework detection
    - **Property 2: Framework detection triggers recommendations**
    - **Validates: Requirements 1.4**

  - [ ]* 3.4 Write property test for framework weighting
    - **Property 10: Framework matches weighted higher than language matches**
    - **Validates: Requirements 3.2**

  - [x] 3.5 Implement dependency scoring
    - Create calculateDependencyScore method
    - Match document requiredDependencies against workspace dependencies
    - Apply DEPENDENCY_MATCH weight (20 points)
    - Generate MatchReason with dependency details
    - _Requirements: 2.2, 5.3_

  - [ ]* 3.6 Write property test for dependency-based recommendations
    - **Property 5: Dependency-based recommendations include dependency details**
    - **Validates: Requirements 2.2**

  - [ ]* 3.7 Write property test for testing framework detection
    - **Property 14: Testing framework detection triggers testing recommendations**
    - **Validates: Requirements 5.3**

  - [x] 3.8 Implement file pattern scoring
    - Create calculateFilePatternScore method
    - Match document filePatterns against workspace file patterns
    - Apply FILE_PATTERN_MATCH weight (15 points)
    - Generate MatchReason with pattern details
    - _Requirements: 2.3, 6.1, 6.2_

  - [ ]* 3.9 Write property test for file-pattern-based recommendations
    - **Property 6: File-pattern-based recommendations include pattern details**
    - **Validates: Requirements 2.3**

  - [x] 3.10 Implement language scoring
    - Create calculateLanguageScore method
    - Match document tags against detected languages
    - Apply LANGUAGE_MATCH weight (10 points)
    - Generate MatchReason with language details
    - _Requirements: 3.2_

  - [x] 3.11 Implement ranking logic
    - Sort documents by score descending
    - Apply alphabetical tiebreaker for equal scores
    - Ensure all recommendations have at least one MatchReason
    - _Requirements: 2.1, 3.1, 3.4, 3.5_

  - [ ]* 3.12 Write property test for recommendation sorting
    - **Property 9: Recommendations are sorted by score descending**
    - **Validates: Requirements 3.1, 3.4**

  - [ ]* 3.13 Write property test for alphabetical tiebreaking
    - **Property 12: Equal scores sorted alphabetically**
    - **Validates: Requirements 3.5**

  - [ ]* 3.14 Write property test for explanation completeness
    - **Property 4: All recommendations include explanations**
    - **Validates: Requirements 2.1**

  - [ ]* 3.15 Write property test for all contributing factors
    - **Property 7: All contributing factors are included**
    - **Validates: Requirements 2.4**

  - [ ]* 3.16 Write property test for score monotonicity
    - **Property 11: Multiple matches increase score monotonically**
    - **Validates: Requirements 3.3**

  - [ ]* 3.17 Write unit tests for DocumentMatcher
    - Test single factor scoring
    - Test combined scoring
    - Test edge cases (no matches, perfect matches)

- [x] 4. Implement RecommendationService
  - [x] 4.1 Create RecommendationService class
    - Implement constructor with dependency injection (DocumentService, WorkspaceAnalyzer, DocumentMatcher)
    - Implement getRecommendations method with options support
    - Implement analyzeWorkspace method
    - _Requirements: 1.1, 7.1_

  - [x] 4.2 Implement document fetching and filtering
    - Create fetchAvailableDocuments method using DocumentService
    - Check installed documents using DocumentService
    - Mark installed documents in ScoredDocument results
    - Implement filterAndRank method with maxResults and includeInstalled options
    - _Requirements: 7.1, 7.2, 7.5, 9.1, 9.4_

  - [ ]* 4.3 Write property test for installed document marking
    - **Property 8: Installed documents are marked**
    - **Validates: Requirements 2.5, 7.2**

  - [ ]* 4.4 Write property test for installed document filtering
    - **Property 19: Installed document filtering**
    - **Validates: Requirements 7.5**

  - [ ]* 4.5 Write property test for maximum results limiting
    - **Property 20: Maximum results limiting**
    - **Validates: Requirements 9.1**

  - [ ]* 4.6 Write property test for small result sets
    - **Property 22: Small result sets shown completely**
    - **Validates: Requirements 9.4**

  - [x] 4.7 Implement error handling
    - Handle workspace analysis failures gracefully
    - Handle document fetch failures with fallback to cache
    - Throw RecommendationError with appropriate error codes
    - _Requirements: 1.5, 8.5_

  - [ ]* 4.8 Write unit tests for RecommendationService
    - Test orchestration of analyzer and matcher
    - Test filtering options
    - Test error handling and fallbacks

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement recommendation command
  - [x] 6.1 Create recommendDocuments command handler
    - Register command in extension.ts
    - Implement command with progress indicator
    - Support cancellation via CancellationToken
    - Display intermediate progress updates
    - Handle no workspace error
    - Handle analysis failures with error messages
    - _Requirements: 1.1, 1.5, 8.1, 8.2, 8.3, 8.5_

  - [x] 6.2 Implement Quick Pick UI
    - Create showRecommendationQuickPick function
    - Format recommendations with score indicators (⭐)
    - Mark installed documents with ✓ icon
    - Include brief reason in description
    - Add "View All" option when more than 10 results
    - Handle "View All" selection to show complete list
    - Show fallback suggestions when no matches found
    - _Requirements: 2.1, 2.5, 7.3, 9.1, 9.2, 9.3, 9.5_

  - [ ]* 6.3 Write property test for view all option
    - **Property 21: View all option presence**
    - **Validates: Requirements 9.2**

  - [ ]* 6.4 Write integration tests for command
    - Test command invocation triggers workflow
    - Test progress indicator display
    - Test cancellation support
    - Test error scenarios

- [x] 7. Wire up services and register command
  - [x] 7.1 Instantiate services in extension.ts
    - Create WorkspaceAnalyzer, DocumentMatcher, RecommendationService instances
    - Pass services to command registration
    - _Requirements: 1.1_

  - [x] 7.2 Register command in commands/index.ts
    - Register steeringDocs.recommend command
    - Wire up to recommendDocuments handler
    - _Requirements: 1.1_

  - [x] 7.3 Add command to package.json
    - Add command definition with title and icon
    - Set category to "Steering Docs"
    - _Requirements: 1.1_

- [x] 8. Add toolbar button to tree view






  - Add steeringDocs.recommend to view/title menu for steeringDocsView
  - Position in navigation group
  - _Requirements: 1.6_

- [x] 9. Implement RecommendationPanel webview





  - [x] 9.1 Create RecommendationPanel class



    - Implement constructor with extensionUri and DocumentService
    - Implement show method to create/reveal webview panel
    - Configure webview options (enableScripts, localResourceRoots)
    - _Requirements: 4.1, 10.1_

  - [x] 9.2 Implement HTML content generation


    - Create getHtmlContent method
    - Generate clean, readable layout with good typography
    - Display document title, description, and category
    - Show all match reasons with icons
    - Render markdown content with syntax highlighting
    - Add prominent install button
    - Add close button
    - Make layout responsive for different panel sizes
    - _Requirements: 4.2, 10.1, 10.2, 10.3, 10.5_

  - [ ]* 9.3 Write property test for markdown rendering
    - **Property 23: Markdown rendering preserves formatting**
    - **Validates: Requirements 10.2**

  - [x] 9.4 Implement message handlers

    - Create setupMessageHandlers method
    - Handle install button clicks
    - Handle close button clicks
    - Handle preview requests
    - _Requirements: 4.3_

  - [x] 9.5 Implement install functionality

    - Create handleInstallRequest method
    - Use DocumentService to install document
    - Show success notification on completion
    - Show error notification on failure with details
    - Handle webview creation failures with fallback
    - _Requirements: 4.3, 4.4, 4.5_

  - [ ]* 9.6 Write property test for install operation
    - **Property 13: Install operation writes to steering directory**
    - **Validates: Requirements 4.3**

  - [x] 9.7 Implement document content fetching

    - Fetch document content when panel opens
    - Display error message with retry on fetch failure
    - _Requirements: 10.1, 10.4_

  - [ ]* 9.8 Write integration tests for webview
    - Test webview creation and display
    - Test install button functionality
    - Test error handling
    - Test fallback behavior

  - [x] 9.9 Update recommendDocuments command to use webview


    - Replace placeholder message with RecommendationPanel.show()
    - Pass selected document to webview panel
    - _Requirements: 4.1_

- [x] 10. Add workspace analysis caching




  - [x] 10.1 Implement caching mechanism


    - Cache WorkspaceContext results for 5 minutes
    - Use VS Code's FileSystemWatcher to invalidate cache on package.json or tsconfig.json changes
    - Implement cache key based on workspace root path
    - _Requirements: 8.1, 8.3_

  - [ ]* 10.2 Write unit tests for caching
    - Test cache hit and miss scenarios
    - Test cache invalidation on file changes
    - Test cache expiration

- [x] 11. Final checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.


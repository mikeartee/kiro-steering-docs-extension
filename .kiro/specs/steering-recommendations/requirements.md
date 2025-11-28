# Requirements Document

## Introduction

This feature adds intelligent steering document recommendations to the Steering Docs Browser extension. Users can invoke a command that analyzes their workspace context (languages, frameworks, file patterns, dependencies) and recommends relevant steering documents from the remote repository. The system provides ranked recommendations with explanations, allowing users to understand why each document is suggested and quickly install relevant ones.

## Glossary

- **Recommendation System**: The component that analyzes workspace context and matches it to available steering documents
- **Workspace Context**: Information about the user's project including languages, frameworks, dependencies, file patterns, and existing steering documents
- **Recommendation Score**: A numerical value indicating how relevant a steering document is to the current workspace
- **Quick Pick**: VS Code's native dropdown menu UI for selecting from a list of options
- **Webview Panel**: A custom HTML/CSS/JS interface embedded in VS Code for rich content display
- **Workspace Analyzer**: Component that scans the workspace to extract context information
- **Document Matcher**: Component that scores and ranks documents based on workspace context

## Requirements

### Requirement 1

**User Story:** As a developer, I want to invoke a command that recommends steering documents, so that I can discover relevant documents without manually browsing the entire catalog.

#### Acceptance Criteria

1. WHEN a user executes the recommend command THEN the Recommendation System SHALL analyze the workspace and display recommendations
2. WHEN the workspace contains a package.json file THEN the Recommendation System SHALL extract dependency information for analysis
3. WHEN the workspace contains TypeScript configuration files THEN the Recommendation System SHALL identify TypeScript-specific recommendations
4. WHEN the workspace contains framework-specific files THEN the Recommendation System SHALL detect the framework and prioritize related documents
5. WHEN no workspace is open THEN the Recommendation System SHALL display an error message and prevent analysis
6. WHEN the Steering Docs Browser tree view is displayed THEN the Recommendation System SHALL show a toolbar button to trigger recommendations

### Requirement 2

**User Story:** As a developer, I want to see why each document is recommended, so that I can make informed decisions about which documents to install.

#### Acceptance Criteria

1. WHEN recommendations are displayed THEN the Recommendation System SHALL include an explanation for each recommendation
2. WHEN a recommendation is based on detected dependencies THEN the Recommendation System SHALL list the specific dependencies that triggered the recommendation
3. WHEN a recommendation is based on file patterns THEN the Recommendation System SHALL describe the detected patterns
4. WHEN multiple factors contribute to a recommendation THEN the Recommendation System SHALL present all contributing factors
5. WHEN a document is already installed THEN the Recommendation System SHALL indicate this status in the recommendation

### Requirement 3

**User Story:** As a developer, I want recommendations ranked by relevance, so that I can focus on the most applicable documents first.

#### Acceptance Criteria

1. WHEN multiple documents match the workspace context THEN the Recommendation System SHALL rank them by relevance score
2. WHEN calculating relevance scores THEN the Recommendation System SHALL weight framework matches higher than general language matches
3. WHEN a document matches multiple workspace characteristics THEN the Recommendation System SHALL increase its relevance score
4. WHEN displaying recommendations THEN the Recommendation System SHALL show the highest-scored documents first
5. WHEN two documents have equal scores THEN the Recommendation System SHALL order them alphabetically by title

### Requirement 4

**User Story:** As a developer, I want to preview and install recommended documents quickly, so that I can adopt relevant steering rules without switching contexts.

#### Acceptance Criteria

1. WHEN a user selects a recommendation from the Quick Pick THEN the Recommendation System SHALL open a detailed view with document preview
2. WHEN the detailed view is displayed THEN the Recommendation System SHALL provide an install button
3. WHEN a user clicks the install button THEN the Recommendation System SHALL install the document to the local steering directory
4. WHEN installation completes successfully THEN the Recommendation System SHALL display a success notification
5. WHEN installation fails THEN the Recommendation System SHALL display an error message with details

### Requirement 5

**User Story:** As a developer, I want the system to analyze package.json dependencies, so that recommendations match my project's technology stack.

#### Acceptance Criteria

1. WHEN package.json exists in the workspace THEN the Workspace Analyzer SHALL parse both dependencies and devDependencies
2. WHEN React is detected in dependencies THEN the Document Matcher SHALL prioritize React-related steering documents
3. WHEN testing frameworks are detected THEN the Document Matcher SHALL recommend testing best practice documents
4. WHEN TypeScript is detected THEN the Document Matcher SHALL recommend TypeScript formatting and convention documents
5. WHEN Express or Fastify are detected THEN the Document Matcher SHALL recommend API development documents

### Requirement 6

**User Story:** As a developer, I want the system to detect file patterns in my workspace, so that recommendations reflect my project structure and coding patterns.

#### Acceptance Criteria

1. WHEN the workspace contains component directories THEN the Workspace Analyzer SHALL identify component-based architecture
2. WHEN the workspace contains API route files THEN the Workspace Analyzer SHALL identify API development patterns
3. WHEN the workspace contains test files THEN the Workspace Analyzer SHALL identify testing practices
4. WHEN the workspace contains configuration files THEN the Workspace Analyzer SHALL identify configuration management needs
5. WHEN analyzing file patterns THEN the Workspace Analyzer SHALL scan common project directories without traversing node_modules

### Requirement 7

**User Story:** As a developer, I want the system to avoid recommending documents I already have installed, so that I only see new and relevant suggestions.

#### Acceptance Criteria

1. WHEN generating recommendations THEN the Recommendation System SHALL check which documents are already installed
2. WHEN a document is already installed THEN the Recommendation System SHALL mark it as installed in the recommendation list
3. WHEN displaying the Quick Pick THEN the Recommendation System SHALL show installed documents with a distinct indicator
4. WHEN all highly relevant documents are installed THEN the Recommendation System SHALL display a message indicating good coverage
5. WHEN filtering recommendations THEN the Recommendation System SHALL optionally hide already-installed documents based on user preference

### Requirement 8

**User Story:** As a developer, I want the recommendation process to be fast and non-blocking, so that I can continue working while analysis happens.

#### Acceptance Criteria

1. WHEN the recommend command is invoked THEN the Recommendation System SHALL display a progress indicator
2. WHEN workspace analysis is in progress THEN the Recommendation System SHALL allow the user to cancel the operation
3. WHEN analysis completes THEN the Recommendation System SHALL dismiss the progress indicator automatically
4. WHEN analysis takes longer than 5 seconds THEN the Recommendation System SHALL display intermediate progress updates
5. WHEN analysis fails THEN the Recommendation System SHALL display an error message and allow retry

### Requirement 9

**User Story:** As a developer, I want to see a limited number of top recommendations initially, so that I'm not overwhelmed with choices.

#### Acceptance Criteria

1. WHEN displaying the Quick Pick THEN the Recommendation System SHALL show a maximum of 10 recommendations
2. WHEN more than 10 relevant documents exist THEN the Recommendation System SHALL include an option to view all recommendations
3. WHEN the user selects "view all" THEN the Recommendation System SHALL display the complete ranked list
4. WHEN fewer than 10 documents match THEN the Recommendation System SHALL display all matching documents
5. WHEN no documents match the workspace context THEN the Recommendation System SHALL suggest popular general-purpose documents

### Requirement 10

**User Story:** As a developer, I want the detailed recommendation view to show document content, so that I can understand what rules and conventions the document provides before installing.

#### Acceptance Criteria

1. WHEN the detailed view opens THEN the Recommendation System SHALL fetch and display the document content
2. WHEN displaying document content THEN the Recommendation System SHALL render markdown formatting
3. WHEN the document is large THEN the Recommendation System SHALL provide scrolling within the view
4. WHEN document fetching fails THEN the Recommendation System SHALL display an error message with retry option
5. WHEN the detailed view is open THEN the Recommendation System SHALL provide a close button to return to the recommendation list

## Requirements
# Design Document

## Overview

This design document outlines the implementation approach for adding simple toggle functionality, migrating to the Kiro sidebar, and preparing the extension for marketplace publication. The design focuses on minimal code changes while maximizing user experience improvements.

## Architecture

### Current Architecture
The extension follows a service-oriented architecture with:
- **DocumentService**: Handles document fetching, installation, and management
- **SteeringDocsTreeProvider**: Manages tree view display and user interactions
- **Command Handlers**: Process user actions from the UI

### Proposed Changes
1. **Toggle Command**: New unified command that handles install/uninstall based on current state
2. **View Container Migration**: Change package.json contribution from "explorer" to "kiro"
3. **Tree Item Enhancement**: Add toggle button to tree items with state-aware icons
4. **Uninstall Functionality**: New method in DocumentService to remove installed documents

## Components and Interfaces

### 1. Toggle Command Handler

**Purpose**: Provide a single command that intelligently toggles document state

**Interface**:
```typescript
async function handleToggleDocument(doc: DocumentMetadata): Promise<void>
```

**Logic Flow**:
1. Check if document is currently installed (query DocumentService)
2. If not installed:
   - Call `installDocument(doc, 'always')`
   - Show "Document activated" notification
3. If installed:
   - Call new `uninstallDocument(doc.name)`
   - Show "Document deactivated" notification
4. Refresh tree view to update UI

### 2. Uninstall Method in DocumentService

**Purpose**: Remove a steering document from the local directory

**Interface**:
```typescript
async uninstallDocument(docName: string): Promise<void>
```

**Implementation**:
- Construct file URI for document in `.kiro/steering/`
- Use VS Code FileSystem API to delete file
- Handle errors gracefully (file not found, permission issues)
- Show success notification

### 3. Tree Item Toggle Button

**Purpose**: Display toggle control inline with each document

**Implementation**:
- Add `TreeItemCollapsibleState.None` to document items
- Set `contextValue` based on installation state:
  - `"document-not-installed"` → Show "toggle on" icon
  - `"document-installed"` → Show "toggle off" icon
- Use inline command in tree item for immediate toggle action

**Icons**:
- Not installed: `$(circle-outline)` or `$(add)`
- Installed/Active: `$(check)` or `$(circle-filled)`

### 4. View Container Migration

**Purpose**: Move extension to Kiro sidebar

**Changes in package.json**:
```json
"contributes": {
  "views": {
    "kiro": [
      {
        "id": "steeringDocsView",
        "name": "Steering Documents",
        "icon": "$(book)"
      }
    ]
  }
}
```

**Considerations**:
- Remove "explorer" view contribution
- Update all `when` clauses to reference correct view ID
- Ensure activation events still trigger properly
- Test alongside other Kiro sidebar extensions (MCP Manager)

## Data Models

### Enhanced DocumentMetadata

No changes needed - existing model supports all required information.

### Tree Item Context Values

Update context values for toggle functionality:
- `document-not-installed`: Document available but not in workspace
- `document-installed-active`: Document installed with "always" mode
- `document-installed-inactive`: Document installed with "manual" mode

## Error Handling

### Toggle Operation Failures

**Scenarios**:
1. Network failure during install
2. File system permission error during uninstall
3. Document already being modified

**Handling**:
- Wrap toggle operations in try-catch
- Show user-friendly error messages
- Revert UI state if operation fails
- Log detailed errors to console for debugging

### Sidebar Integration Issues

**Scenarios**:
1. Kiro view container not available (running in standard VS Code)
2. Conflicting view IDs with other extensions

**Handling**:
- Fallback to explorer view if "kiro" container unavailable
- Use unique view ID to prevent conflicts
- Document Kiro IDE requirement in README

## Testing Strategy

### Manual Testing Checklist

**Toggle Functionality**:
- [ ] Toggle on installs document with "always" mode
- [ ] Toggle off removes document from file system
- [ ] Toggle state persists across tree view refreshes
- [ ] Multiple rapid toggles don't cause errors
- [ ] Toggle works for all document categories

**Sidebar Integration**:
- [ ] Extension appears in Kiro sidebar
- [ ] Extension does not appear in Explorer sidebar
- [ ] Tree view displays correctly in Kiro container
- [ ] Commands work from Kiro sidebar context
- [ ] Extension coexists with MCP Manager

**Edge Cases**:
- [ ] Toggle when offline (should fail gracefully)
- [ ] Toggle when `.kiro/steering/` is deleted
- [ ] Toggle when document file is manually modified
- [ ] Toggle when workspace has no folders open

### Automated Testing

**Unit Tests**:
- Test `uninstallDocument()` method with mocked file system
- Test toggle command logic with various document states
- Test tree item context value assignment

**Integration Tests**:
- Test full toggle workflow (install → verify → uninstall → verify)
- Test sidebar registration in Kiro container
- Test error handling for network and file system failures

## Marketplace Preparation

### Package.json Enhancements

**Required Fields**:
```json
{
  "publisher": "mikeartee",
  "repository": {
    "type": "git",
    "url": "https://github.com/mikeartee/kiro-steering-docs-extension"
  },
  "keywords": ["kiro", "steering", "ai", "assistant", "documents"],
  "categories": ["Other"],
  "icon": "icon.png",
  "license": "MIT"
}
```

### README.md Structure

**Sections**:
1. **Overview**: What the extension does
2. **Features**: Key capabilities with screenshots
3. **Installation**: How to install from marketplace
4. **Usage**: Step-by-step guide with visuals
5. **Configuration**: Settings and customization options
6. **Requirements**: Kiro IDE requirement
7. **Known Issues**: Current limitations
8. **Contributing**: How to contribute
9. **License**: License information

### Visual Assets

**Icon Requirements**:
- 128x128 PNG
- Represents steering/guidance concept
- Kiro brand colors if available
- Simple, recognizable design

**Screenshots**:
- Extension in Kiro sidebar
- Toggle functionality demonstration
- Document preview
- Installation confirmation

### Packaging Process

**Steps**:
1. Install `vsce` (Visual Studio Code Extension Manager)
2. Run `vsce package` to create VSIX
3. Test VSIX installation locally
4. Create publisher account on marketplace
5. Publish using `vsce publish`

**Pre-publish Checklist**:
- [ ] All tests passing
- [ ] README complete with screenshots
- [ ] Icon added and displays correctly
- [ ] Version number set appropriately (0.1.0 for initial release)
- [ ] License file included
- [ ] Repository URL correct
- [ ] Keywords optimized for discovery

## Implementation Phases

### Phase 1: Toggle Functionality
1. Add `uninstallDocument()` method to DocumentService
2. Create toggle command handler
3. Update tree item context values
4. Add toggle button to tree items
5. Test toggle workflow

### Phase 2: Sidebar Migration
1. Update package.json view contribution
2. Test in Kiro IDE
3. Verify no conflicts with other extensions
4. Update documentation

### Phase 3: Marketplace Preparation
1. Create extension icon
2. Write comprehensive README
3. Add screenshots
4. Update package.json metadata
5. Package and test VSIX
6. Publish to marketplace

## Design Decisions and Rationale

### Why Simple Toggle vs. Multi-State?

**Decision**: Two-state toggle (on/off) instead of three-state (not installed/manual/always)

**Rationale**:
- User requested simple toggle functionality
- Most users want documents either active or not present
- Reduces cognitive load and UI complexity
- "Manual" mode is edge case - users can still access via right-click if needed

### Why Delete on Toggle Off?

**Decision**: Uninstall removes file completely instead of just changing inclusion mode

**Rationale**:
- Cleaner workspace - no orphaned files
- Clear mental model: toggle on = file exists, toggle off = file gone
- Users can always re-toggle to reinstall
- Matches user expectation of "turning off" a feature

### Why Kiro Sidebar Only?

**Decision**: No fallback to Explorer sidebar

**Rationale**:
- Extension is Kiro-specific by design
- Steering documents only work with Kiro IDE
- Clear positioning as Kiro ecosystem tool
- Avoids confusion for non-Kiro users

## Future Enhancements

**Not in scope for this release but documented for future consideration**:

1. **Bulk Toggle**: Select multiple documents and toggle all at once
2. **Workspace Profiles**: Save/load sets of active documents per project type
3. **Document Search**: Filter documents by keyword or tag
4. **Custom Categories**: User-defined document organization
5. **Offline Mode**: Cache documents for offline toggle operations
6. **Document Editor**: Edit steering docs directly in extension

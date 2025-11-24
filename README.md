# Kiro Steering Documents Browser

A VS Code extension that enables browsing, previewing, and installing Kiro steering documents from a GitHub repository. Discover and adopt community-created steering rules and conventions to enhance your Kiro AI assistant experience.

## Features

- **Simple Toggle Control**: One-click toggle to activate or deactivate steering documents
- **Kiro Sidebar Integration**: Access documents directly from the Kiro sidebar alongside other Kiro tools
- **Browse Documents**: Explore available steering documents organized by category and folder hierarchy
- **Hierarchical Organization**: Navigate nested folder structures within categories for better document organization
- **Preview Content**: View document content before installation with markdown preview
- **Quick Load**: Install and activate documents in one action
- **Manage Inclusion Modes**: Control when Kiro loads specific guidance into the agent context
- **Update Management**: Check for and install updates to installed documents
- **Offline Support**: Continue browsing with cached data when offline

## Requirements

- **Kiro IDE**: This extension is designed specifically for Kiro IDE and requires Kiro to be installed
- **VS Code 1.80.0 or higher**: Compatible with VS Code and Kiro IDE

## Getting Started

### Installation

1. Install the extension from your extension marketplace
2. Open a workspace with Kiro installed
3. Find the "Steering Documents" view in the Kiro sidebar (left panel)

### Basic Usage

1. **Browse Documents**: Expand categories in the tree view to see available steering documents
2. **Preview**: Click the eye icon (👁️) to preview a document's content
3. **Toggle On/Off**: Click the toggle button next to any document to activate or deactivate it
   - Toggle ON: Installs the document and activates it (sets inclusion to "always")
   - Toggle OFF: Removes the document from your workspace
4. **Quick Load**: Right-click a document and select "Quick Load" to install and immediately activate it

## Inclusion Modes

Steering documents support three inclusion modes that control when Kiro loads them into the agent context:

### Always
Documents are automatically loaded into every Kiro conversation. Use this for core guidelines you want Kiro to follow consistently.

**Example**: Coding standards, project conventions, team best practices

**Visual Indicator**: 🟢 Green dot in tree view

### Manual
Documents are only loaded when you explicitly reference them using `#` in chat. Use this for specialized guidance you need occasionally.

**Example**: Deployment procedures, specific framework documentation

**Visual Indicator**: 🔵 Blue dot in tree view

### File Match
Documents are automatically loaded when files matching a specific pattern are in context. Use this for language or framework-specific guidance.

**Example**: TypeScript guidelines (pattern: `*.ts`), React conventions (pattern: `*.tsx`)

**Visual Indicator**: 🟡 Yellow dot in tree view

### Changing Inclusion Modes

1. Right-click an installed document in the tree view
2. Select "Set Inclusion: Always", "Set Inclusion: Manual", or "Set Inclusion: File Match"
3. For File Match mode, enter a glob pattern when prompted (e.g., `*.ts`, `src/**/*.py`)

## Commands

Access these commands from the Command Palette (Ctrl+Shift+P / Cmd+Shift+P):

- **Toggle Document**: Simple on/off control for activating or deactivating documents
- **Refresh**: Reload the document list from GitHub
- **Check for Updates**: Check all installed documents for available updates
- **Show Active Documents Only**: Filter the tree view to show only documents with "always" inclusion mode
- **Preview Document**: View document content in a read-only editor
- **Install Document**: Download and save a document to `.kiro/steering/`
- **Quick Load (Install & Activate)**: Install a document with "always" inclusion mode
- **Update Document**: Update an installed document to the latest version
- **Set Inclusion: Always/Manual/File Match**: Change how a document is loaded

## Configuration

Configure the extension through VS Code settings (File > Preferences > Settings):

```json
{
  // GitHub repository containing steering documents
  "steeringDocs.repository": "mikeartee/kiro-steering-docs",
  
  // Branch to fetch documents from
  "steeringDocs.branch": "main",
  
  // Cache timeout in seconds (default: 1 hour)
  "steeringDocs.cacheTimeout": 3600,
  
  // Automatically check for updates on activation
  "steeringDocs.autoCheckUpdates": true
}
```

## Tree View Icons

The tree view uses icons to indicate document status and organization:

- ⚪ **Not Installed**: Circle outline - document is available for installation
- 🟢 **Always Active**: Green filled circle - inclusion mode is "always"
- 🔵 **Manual**: Blue filled circle - inclusion mode is "manual"
- 🟡 **File Match**: Yellow filled circle - inclusion mode is "fileMatch"
- 📁 **Category**: Folder icon - document category grouping
- 📂 **Folder**: Folder icon - nested folder within a category (collapsible)

## Examples

### Example 1: Installing TypeScript Coding Standards

1. Expand the "Coding Standards" category
2. Find "TypeScript Best Practices"
3. Click the eye icon to preview the content
4. Right-click and select "Quick Load (Install & Activate)"
5. The document is now active in all Kiro conversations

### Example 2: Setting Up Language-Specific Guidance

1. Install "Python Style Guide"
2. Right-click the installed document
3. Select "Set Inclusion: File Match"
4. Enter pattern: `*.py`
5. The guide now loads automatically when working with Python files

### Example 3: Using Manual Reference Documents

1. Install "Deployment Checklist"
2. Right-click and select "Set Inclusion: Manual"
3. In Kiro chat, reference it with: `#deployment-checklist.md`
4. Kiro loads the checklist only for that conversation

## Kiro Steering Document Usage

Once installed, steering documents guide Kiro's behavior. Here's how they work:

### Document Structure

Steering documents are markdown files with YAML frontmatter:

```markdown
---
version: "1.0.0"
category: "coding-standards"
description: "TypeScript coding standards"
inclusion: "always"
---

# TypeScript Guidelines

## Naming Conventions
- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces
...
```

### How Kiro Uses Steering Documents

- **Always mode**: Content is included in every Kiro conversation automatically
- **Manual mode**: Content is included only when you reference the file with `#filename.md`
- **File Match mode**: Content is included when relevant files are in the conversation context

### Best Practices

1. **Start with Quick Load**: Use Quick Load for essential documents you want active immediately
2. **Use File Match for Language Rules**: Set language-specific guides to fileMatch mode
3. **Keep Manual for Reference**: Use manual mode for checklists and procedures
4. **Review Before Installing**: Always preview documents to understand their guidance
5. **Update Regularly**: Check for updates to get the latest best practices

## Troubleshooting

### Documents Not Loading

**Problem**: Tree view shows "Loading..." indefinitely

**Solutions**:
- Check your internet connection
- Verify the GitHub repository is accessible
- Try clicking the Refresh button
- Check VS Code's Output panel (View > Output) and select "Kiro Steering Documents" for error details

### Installation Fails

**Problem**: Error when installing a document

**Solutions**:
- Ensure you have write permissions to the workspace
- Check that `.kiro/steering/` directory is not read-only
- Verify disk space is available
- Try installing to a different workspace

### Updates Not Detected

**Problem**: Update indicators don't appear for installed documents

**Solutions**:
- Click "Check for Updates" in the tree view toolbar
- Verify `steeringDocs.autoCheckUpdates` is enabled in settings
- Clear the cache by reloading VS Code
- Check that installed documents have valid version frontmatter

### Inclusion Mode Not Working

**Problem**: Document with "always" mode doesn't appear in Kiro context

**Solutions**:
- Verify the frontmatter includes `inclusion: "always"`
- Reload VS Code to ensure Kiro picks up the changes
- Check the document is in `.kiro/steering/` directory
- Ensure the document has valid YAML frontmatter

### Offline Mode Issues

**Problem**: Cannot browse documents when offline

**Solutions**:
- The extension caches the last successful document list
- Connect to the internet and click Refresh to update the cache
- Cached data expires after the configured timeout (default: 1 hour)
- Installed documents remain accessible offline

### GitHub Rate Limiting

**Problem**: "Rate limit exceeded" error

**Solutions**:
- GitHub API allows 60 requests/hour for unauthenticated users
- Wait for the rate limit to reset (check error message for reset time)
- Consider configuring a GitHub personal access token (future feature)
- Use cached data while waiting for rate limit reset

## Contributing

Contributions are welcome! Here's how you can help:

1. **Report Issues**: Found a bug? Open an issue on GitHub with details
2. **Suggest Features**: Have an idea? Create a feature request
3. **Submit Pull Requests**: Want to contribute code? Fork the repo and submit a PR
4. **Share Steering Documents**: Create and share your own steering documents

### Development Setup

```bash
# Clone the repository
git clone https://github.com/mikeartee/kiro-steering-docs-extension.git

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests
npm test

# Launch extension in debug mode
# Press F5 in VS Code
```

## Support

For issues, feature requests, or contributions:

- **GitHub Repository**: [mikeartee/kiro-steering-docs-extension](https://github.com/mikeartee/kiro-steering-docs-extension)
- **Report Issues**: Check existing issues before creating new ones
- **Include Details**: VS Code version, extension version, and error messages help us help you

## License

MIT License - see [LICENSE](LICENSE) file for details

Copyright (c) 2025 Michael Rewiri-Thorsen

## Changelog

### 0.1.8 (2025-11-24)

- **Fixed**: Double layering in tree view where category folders were duplicated
- **Fixed**: Tree view now correctly strips category prefix from document paths
- **Improved**: Cleaner folder hierarchy display for better navigation

### 0.1.7 (2025-11-24)

- **Feature**: Hierarchical folder tree view for nested document structures
- **Feature**: Visual folder organization within categories
- **Improved**: Better navigation for large document collections with nested folders
- **Fixed**: Document installation, updates, and uninstall now work correctly with subdirectories

### 0.1.6 (2025-11-24)

- **Feature**: Recursive directory traversal for fetching documents from GitHub
- **Feature**: Support for nested folder structures in remote repository

### 0.1.5 (2025-11-17)

- **Metadata**: Added repository, bugs, and homepage links to package.json for better marketplace integration

### 0.1.4 (2025-11-17)

- **Documentation**: Updated README with correct dates and removed broken image references

### 0.1.3 (2025-11-17)

- **Fixed**: README.md files are now filtered from document list (repository documentation, not steering docs)
- **Fixed**: Docs and Templates folders are now excluded from categories (repository infrastructure)
- **Improved**: Cache clearing functionality now works correctly with refresh command
- **Enhanced**: Cleaner document browsing experience with better filtering

### 0.1.2 (2025-11-17)

- Internal improvements and bug fixes

### 0.1.1 (2025-11-17)

- Initial marketplace release
- Bug fixes and stability improvements

### 0.1.0 (Initial Development)

- Simple toggle functionality for activating/deactivating documents
- Kiro sidebar integration for better organization
- Browse and preview steering documents from GitHub
- Install documents with inclusion mode management
- Quick Load feature for instant activation
- Update detection and management
- Offline support with caching
- Document categories and organization
- Markdown preview for documents

## Acknowledgments

- Built for the Kiro IDE ecosystem
- Inspired by package managers and extension browsers
- Thanks to the Kiro community for feedback and testing

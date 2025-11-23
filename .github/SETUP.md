# GitHub Actions Setup Guide

This guide explains how to set up automatic publishing to Open VSX and VS Code Marketplace.

## Prerequisites

1. **Open VSX Account**: Create an account at [open-vsx.org](https://open-vsx.org/)
2. **VS Code Marketplace Account** (optional): Create a publisher account at [Visual Studio Marketplace](https://marketplace.visualstudio.com/)

## Getting Your Tokens

### Open VSX Token

1. Go to [open-vsx.org](https://open-vsx.org/)
2. Sign in with your account
3. Go to your user settings
4. Generate a new Access Token
5. Copy the token (you won't be able to see it again)

### VS Code Marketplace Token (Optional)

1. Go to [Azure DevOps](https://dev.azure.com/)
2. Create a Personal Access Token (PAT)
3. Set the scope to **Marketplace (Manage)**
4. Copy the token

## Setting Up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

   - **OVSX_TOKEN**: Your Open VSX access token (required)
   - **VSCE_TOKEN**: Your VS Code Marketplace PAT (optional)

## Publishing Your Extension

The workflow will automatically run when you:

1. **Create a GitHub Release**:
   ```bash
   git tag v0.1.7
   git push origin v0.1.7
   ```
   Then create a release from that tag on GitHub

2. **Manual Trigger**:
   - Go to **Actions** tab in your repository
   - Select **Publish Extension** workflow
   - Click **Run workflow**

## What the Workflow Does

1. Checks out your code
2. Installs dependencies
3. Runs linter
4. Compiles TypeScript
5. Runs tests
6. Packages the extension as `.vsix`
7. Publishes to Open VSX
8. Publishes to VS Code Marketplace (if token is provided)
9. Uploads the `.vsix` file as an artifact

## Troubleshooting

### Publishing Fails

- Verify your tokens are correct in GitHub Secrets
- Check that the version in `package.json` hasn't been published before
- Review the workflow logs in the Actions tab

### Tests Fail

- The workflow will not publish if tests fail
- Fix the tests locally and push the changes

### Version Conflicts

- Open VSX and VS Code Marketplace don't allow republishing the same version
- Increment the version in `package.json` before creating a new release

## Local Testing

Before creating a release, you can test the package locally:

```bash
npm install -g @vscode/vsce ovsx
vsce package
```

This creates a `.vsix` file you can install manually in VS Code.

## Next Steps

After setup:

1. Update version in `package.json`
2. Commit and push changes
3. Create a git tag: `git tag v0.1.7`
4. Push the tag: `git push origin v0.1.7`
5. Create a GitHub release from the tag
6. The workflow will automatically publish your extension!

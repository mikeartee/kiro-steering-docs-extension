---
title: "Extension Versioning Rules"
description: "Rules for version bumping and VSIX packaging to ensure rollback capability"
tags: ["versioning", "packaging", "release"]
inclusion: always
---

## Core Principle

**ALWAYS bump the version before packaging.** Old VSIX files must be preserved for rollback capability.

## RULES

You MUST follow these rules when packaging the extension:

1. You MUST bump the version in `package.json` BEFORE running `npx vsce package`
2. You MUST NOT overwrite existing VSIX files with the same version number
3. You MUST use semantic versioning (MAJOR.MINOR.PATCH)
4. You MUST update CHANGELOG.md with the new version entry

## Version Bump Guidelines

### When to bump PATCH (0.0.X)

- Bug fixes
- Documentation updates
- Minor refactoring with no feature changes

### When to bump MINOR (0.X.0)

- New features (like adding token management commands)
- New configuration options
- Backward-compatible API changes

### When to bump MAJOR (X.0.0)

- Breaking changes
- Major architecture changes
- Removal of deprecated features

## Packaging Workflow

```powershell
# 1. Bump version in package.json (e.g., 0.2.2 -> 0.3.0)
# 2. Update CHANGELOG.md
# 3. Compile
npm run compile

# 4. Package (use ; not && in PowerShell)
npx vsce package --allow-package-secrets github

# 5. Commit the version bump
git add package.json CHANGELOG.md
git commit -m "chore: bump version to X.Y.Z"
git push
```

## What This Prevents

- Lost rollback capability from overwritten VSIX files
- Version confusion when debugging issues
- Inability to track which version introduced a bug

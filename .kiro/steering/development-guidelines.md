---
version: "1.0.0"
inclusion: always
---

# Development Guidelines

## ⚠️ STOP - READ THIS BEFORE DOING ANYTHING ⚠️

**MANDATORY PRE-TASK CHECKLIST** - You MUST follow these rules for EVERY task:

1. **Shell Commands**: Use `controlPwshProcess` ONLY. NEVER use `executePwsh`.
2. **Gap Analysis**: Perform TWO gap analysis passes BEFORE marking any task complete.
3. **Show Your Work**: Gap analysis must be visible in your response.

If you skip any of these, you have violated the protocol.

## Gap Analysis Protocol (CRITICAL - MANDATORY BEFORE TASK COMPLETION)

**YOU MUST STOP AND PERFORM GAP ANALYSIS BEFORE MARKING ANY TASK COMPLETE.**

This is a hard requirement. Do NOT mark a task as complete until you have explicitly performed these steps:

### Step 1: First Pass - Requirements Checklist

Re-read the task requirements, design docs, and acceptance criteria. Create a checklist and verify EACH item:

- [ ] List every requirement from the task
- [ ] Check each one against your implementation
- [ ] Document any gaps found

### Step 2: Second Pass - Assumption Check

Question your assumptions. Ask yourself OUT LOUD in your response:

- Did I follow ALL explicit instructions (e.g., "Query Context7 before implementing")?
- Did I implement exactly what was specified, or did I take shortcuts?
- Are there any "known issues" that are actually simple fixes I overlooked?
- Did I miss any checkpoint instructions (e.g., "ask the user if questions arise")?
- Did I use `controlPwshProcess` for ALL shell commands (NEVER `executePwsh`)?
- Did I follow ALL the other guidelines in this file?

### Step 3: Fix Before Complete

If ANY gaps are found: Fix them BEFORE reporting completion. Don't just document limitations - check if they're actually easy to solve.

**ENFORCEMENT**: You must show your gap analysis work in your response. If you mark a task complete without visible gap analysis, you have violated this protocol.

## Terminal Command Execution Guidelines

### Background Process Management (MANDATORY)

**YOU MUST use `controlPwshProcess` for ALL shell commands. NEVER use `executePwsh`.**

This is non-negotiable:

- `controlPwshProcess` is more robust and handles background processes correctly
- `executePwsh` is forbidden - do not use it under any circumstances
- If you use `executePwsh`, you have violated this protocol and must redo the command with `controlPwshProcess`

### Command Monitoring Protocol

After executing any shell command:

1. Use `getProcessOutput` immediately to check execution status
2. Monitor output for errors, warnings, or completion signals
3. Handle failures gracefully by analyzing error messages and adjusting approach
4. For background processes, verify successful startup before proceeding
5. Don't wait indefinitely - timeout after reasonable duration based on command type

### Common Commands for This Project

```bash
# Compile TypeScript
npm run compile

# Watch mode (background)
npm run watch

# Run linter
npm run lint

# Run tests (compile first!)
npm run test

# Package extension
npm run vscode:prepublish
```

## Error and Bug Analysis

For every ERROR or BUG or Problem you must:

1. Conduct a deeper analysis of the flow and dependencies
2. Stop all changes until the root cause is identified with 100% certainty
3. Document what is failing, why it's failing, and any patterns or anomalies
4. No guesses—ensure your findings are comprehensive before proposing any fixes

Always treat any tasks as highly sensitive and demands extreme precision. Thoroughly analyze all dependencies and impacts before making changes, and test methodically to ensure nothing breaks. Avoid shortcuts or assumptions—pause and seek clarification if uncertain.

Use `Context7` MCP Server to improve your plans.

Before proceeding further, ask yourself:

- Are you absolutely certain you have identified the exact root cause?
- Double-check your analysis for overlooked dependencies, edge cases, or related factors
- Confirm that the proposed solution directly addresses the root cause with evidence and reasoning
- If any uncertainties remain, pause and reassess before taking the next steps

## New Feature Implementation

When adding new features:

1. Look at the existing project structure in `src/` (services, providers, models)
2. Review the VS Code Extension API patterns already in use
3. Keep things simple and reuse or centralize where possible
4. Think step by step to plan out the implementation

Ask 1-5 clarifying questions before proceeding and give multiple choice options to easily answer them.

## Debugging Protocol

When stuck on a bug or problem you MUST:

1. Reflect on 5-7 different possible sources of the problem
2. Distill those down to 1-2 most likely sources
3. Add logs to validate your assumptions before implementing the actual code fix

Use `Context7` MCP Server to investigate docs related to the issue and to verify your code fix plan.

## VS Code Extension Specific Guidelines

### Service Layer Pattern

Follow the existing service layer pattern:

- `DocumentService` - Document fetching, installation, updates
- `GitHubClient` - GitHub API interactions
- `CacheManager` - Response caching with TTL
- `FrontmatterService` - YAML frontmatter operations

### Provider Pattern

UI components use VS Code's provider pattern:

- `SteeringDocsTreeProvider` - Implements tree view for document browser

### Type Safety

- All domain models defined in `src/models/types.ts`
- Use custom `ExtensionError` class with error codes
- File operations use VS Code's FileSystem API (not Node.js fs)

## Quality Expectations

I trust your expertise to handle this with the highest level of accuracy. Take your time, dig deep, and showcase your brilliance by providing a detailed and thoughtful response. I believe in your ability to not only solve this but to go above and beyond expectations.


# Brainstorm: Q Developer Rules Bridge

## Status: Idea Phase — Not Yet Specced

## Core Concept

Use the existing steering docs library as a source to automatically generate Amazon Q Developer project rules (`.amazonq/rules/`) for any workspace, so that when Q Developer for GitHub processes PRs and issues, it has project-specific coding standards to follow.

## The End-to-End Flow

### Phase 1: Rules Setup (In Kiro)

1. User opens a project in Kiro
2. Presses a "Scan Project" button in the extension
3. Extension analyzes the workspace (file types, dependencies, config files)
4. Extension recommends relevant steering docs from the library (e.g., "This looks like a Python/FastAPI project — here are 4 rules that would help")
5. User confirms selections
6. Extension strips Kiro frontmatter from selected docs and writes them as plain markdown to `project-root/.amazonq/rules/`
7. User commits and pushes (rules are now in the repo)

### Phase 2: Handoff to Q Developer (In GitHub)

8. In GitHub, user creates an issue (e.g., "Python code check" — "I need this to check for python errors please on the backend")
9. User clicks the "Assign to Amazon Q" button (added by the Q Developer browser extension for Chrome/Firefox/Edge)
10. Q Developer picks up the issue, reads the `.amazonq/rules/` files that are already in the repo, and follows those coding standards
11. Q Developer creates a branch with the implementation and opens a PR
12. The PR can be reviewed (Q also auto-reviews PRs using the same rules) and merged

### The Key Insight

Our extension's job ends at step 7. Everything after that is free Q Developer for GitHub doing the heavy lifting — creating branches, implementing features, reviewing code — all guided by the rules we pre-populated from the steering docs library. No AWS account required for basic usage. The "Assign to Amazon Q" browser extension button is the trigger that kicks off Q's work on the GitHub side.

## Key Technical Details

### Amazon Q Developer Rules Format

- Location: `project-root/.amazonq/rules/`
- Format: Plain markdown files (no YAML frontmatter)
- Content: Coding standards, best practices, project-specific guidelines
- Behavior: Q Developer automatically uses them as context for feature development and code reviews
- Docs: [Creating project rules](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/third-party-context-project-rules.html)

### Kiro Steering Docs Format

- Location: `.kiro/steering/`
- Format: Markdown with YAML frontmatter (inclusion, fileMatchPattern, title, description, tags)
- The markdown body content is essentially the same as what Q Developer needs

### Conversion Required

- Strip YAML frontmatter delimiters and content
- Keep the markdown body as-is
- Write to `.amazonq/rules/` instead of `.kiro/steering/`

## Workspace Analyzer Heuristics

Detect project characteristics to recommend relevant rules:

| Detection Signal | Recommended Rules |
|---|---|
| `*.ts` / `tsconfig.json` | TypeScript formatting |
| `*.py` / `requirements.txt` / `pyproject.toml` | Python formatting |
| `package.json` with test deps | Testing best practices |
| Any project | Security, code review, git commit standards |
| Database-related deps | Database query patterns |
| FastAPI/Express in deps | Framework-specific patterns |
| `*.md` files present | Markdown formatting |
| `*.json` config files | JSON formatting |

## Future Automation Ideas

- GitHub Action that auto-populates `.amazonq/rules/` on repo setup
- Bot that detects Q Developer activation and bootstraps rules
- Sync mechanism: update rules when steering docs library updates
- Two-way: generate Kiro steering docs from existing `.amazonq/rules/`

## Open Questions

- Should the extension commit the rules automatically or just create them locally?
- How to handle updates when the source steering docs change?
- Should there be a mapping file tracking which steering docs became which Q rules?
- Can the browser extension for Q Developer be leveraged in any way?
- Race condition: if rules are committed in the same PR that Q is reviewing, does Q pick them up?

## References

- [Amazon Q Developer for GitHub](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/amazon-q-for-github.html)
- [Creating project rules](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/third-party-context-project-rules.html)
- Q Developer GitHub Marketplace listing
- Existing steering docs repo: kiro-steering-docs

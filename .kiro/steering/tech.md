---
version: "1.0.0"
inclusion: always
---

# Tech Stack

## Core Technologies

- **TypeScript 5.1+** - Primary language with strict mode enabled
- **VS Code Extension API 1.80.0+** - Extension host platform
- **Node.js 18.x** - Runtime environment

## Key Dependencies

- `js-yaml` - YAML frontmatter parsing
- `mocha` - Testing framework

## Build System

The project uses TypeScript compiler directly (no bundler):

- **Compile**: `npm run compile` - Compiles TypeScript to JavaScript in `out/` directory
- **Watch**: `npm run watch` - Watches for changes and recompiles automatically
- **Lint**: `npm run lint` - Runs ESLint on TypeScript files
- **Test**: `npm run test` - Runs test suite (requires compilation first)
- **Package**: `npm run vscode:prepublish` - Prepares extension for publishing

## TypeScript Configuration

Strict mode is enabled with all strict checks:
- `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`
- `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`
- Target: ES2020, Module: CommonJS

## Linting

ESLint with TypeScript parser enforces:
- Naming conventions
- Semicolons required
- Curly braces for control statements
- Strict equality (`===`)
- No throw literals

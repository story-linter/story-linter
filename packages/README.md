# Story Linter Packages

This directory contains all the packages for the Story Linter monorepo, managed by Lerna.

## Monorepo Structure

Story Linter uses a monorepo architecture to organize its modular components. Each package in this directory represents a distinct module that can be developed, tested, and potentially published independently while sharing common tooling and dependencies.

## Current Packages

### Core Package (`./core`)
The foundation of Story Linter, containing:
- Configuration loading system
- Validation framework and orchestrator
- File system utilities and adapters
- Base validator interfaces
- Type definitions

### CLI Package (`./cli`)
Command-line interface implementation with:
- CLI factory and command handler
- Output formatting (text, JSON, etc.)
- Validation runner
- Color output adapter

### Validator Plugins
- **Character Validator** (`./plugin-character`) - Validates character consistency across narratives
- **Link Validator** (`./plugin-link`) - Validates link references and relationships between story elements

## Development Workflow

### Installing Dependencies
```bash
# Install all dependencies for all packages
npm install

# Bootstrap packages (link local dependencies)
npx lerna bootstrap
```

### Running Commands Across Packages
```bash
# Run tests in all packages
npx lerna run test

# Build all packages
npx lerna run build

# Run a specific command in a specific package
npx lerna run test --scope=@story-linter/core
```

### Creating a New Package
```bash
# Create a new package
npx lerna create @story-linter/package-name
```

## Package Naming Convention

All packages follow the `@story-linter/` namespace:
- `@story-linter/core` - Core validation framework
- `@story-linter/cli` - Command-line interface
- `@story-linter/plugin-character` - Character consistency validator
- `@story-linter/plugin-link` - Link reference validator

## Inter-package Dependencies

Packages can depend on each other using standard npm dependencies. Lerna will automatically link local packages during development:

```json
{
  "dependencies": {
    "@story-linter/core": "^1.0.0"
  }
}
```

## Publishing

Packages can be published independently or together:
```bash
# Publish changed packages
npx lerna publish

# Publish a specific package
npx lerna publish --scope=@story-linter/core
```

## Benefits of Monorepo

1. **Shared tooling**: Single configuration for TypeScript, ESLint, testing
2. **Atomic commits**: Changes across multiple packages in one commit
3. **Simplified dependency management**: Local packages automatically linked
4. **Consistent versioning**: Coordinated releases across packages
5. **Code sharing**: Easy to share utilities and types between packages

## Development Standards

All packages must follow the project's development standards outlined in CLAUDE.md:
- Test-Driven Development (TDD) is mandatory
- SOLID principles with dependency injection
- TypeScript-first development
- No direct file system or external service access (use ports/adapters)
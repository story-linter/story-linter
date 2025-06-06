# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Story Linter is a modular validation engine for narrative consistency in longform fiction. It's designed as "TypeScript for stories" - providing automated validation to help writers maintain consistency across complex narratives.

**Current Status**: MVP feature-complete but needs refactoring to meet standards.

## Architecture

The system follows a plugin-based architecture with these core components:

1. **Configuration Manager** - Central configuration handling via `.story-linter.yml`
2. **Validation Framework** - Core engine that orchestrates validators
3. **Schema Engine** - Learns patterns from existing narratives using AI
4. **Plugin Manager** - Loads and manages validator plugins
5. **Event Manager** - Event-driven communication between components

Data Flow:
```
Narrative Files → Parser → Pattern Detector → Schema Generation → Validators → Results
```

## 🚨 CRITICAL: Development Standards (MANDATORY) 🚨

### Test-Driven Development (TDD) - NO EXCEPTIONS

**YOU MUST FOLLOW TDD - WRITE TESTS FIRST!**

1. **Red**: Write a failing test BEFORE any implementation
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Clean up the code while keeping tests green

```typescript
// 1. ALWAYS START WITH A TEST
describe('ConfigLoader', () => {
  it('should load YAML configuration', async () => {
    // This test MUST be written BEFORE ConfigLoader exists!
    const fileSystem = new TestFileSystem();
    fileSystem.addFile('/config.yml', 'validators:\n  character: true');
    const loader = new ConfigLoader(fileSystem);
    
    const config = await loader.load('/config.yml');
    
    expect(config.validators.character).toBe(true);
  });
});

// 2. THEN implement minimal code to pass
// 3. THEN refactor if needed
```

### SOLID Principles & Dependency Injection

**EVERY CLASS MUST:**

1. **Single Responsibility** - One class, one reason to change
2. **Dependency Injection** - ALL dependencies injected via constructor
3. **Test Doubles** - NO SPIES! Use proper test doubles

```typescript
// ❌ WRONG - Direct dependency
class ConfigLoader {
  async load(path: string) {
    const content = await fs.readFile(path); // NO! Direct fs usage
  }
}

// ✅ CORRECT - Injected dependency
class ConfigLoader {
  constructor(private fileSystem: FileSystemPort) {} // YES! Injected
  
  async load(path: string) {
    const content = await this.fileSystem.readFile(path);
  }
}
```

### Test Standards

- **NO SPIES** - Use test doubles (stubs, fakes, dummies)
- **Test behavior, not implementation**
- **Test FIRST** - TDD is mandatory
- **One assertion per test** (when practical)
- **Descriptive test names** - `it('should reject invalid config with clear error')`

## Development Commands

Since the project is not yet implemented, here are the planned development commands:

```bash
# Build
npm run build

# Run tests
npm test
npm run test:unit
npm run test:integration

# Lint
npm run lint
npm run lint:fix

# Type checking
npm run typecheck

# Development mode
npm run dev

# CLI usage (planned)
story-lint validate <path>
story-lint watch <path>
story-lint schema extract <path>
story-lint schema validate
```

## Key Implementation Priorities

When implementing features, follow this order (from TODO.md):

1. **Foundation** - File utilities, configuration system, validation framework
2. **Core Features** - Schema extraction (AI pattern learning), CLI interface
3. **Enhanced UX** - Interactive mode, watch mode
4. **Validators** - Character, timeline, plot consistency validators
5. **IDE Integration** - VS Code extension

## Important Architectural Decisions

1. **TypeScript-first** - All code should be written in TypeScript
2. **Plugin Architecture** - Validators must implement the plugin interface
3. **Event-driven** - Components communicate through the Event Manager
4. **Schema Learning** - The system learns patterns from existing content rather than requiring manual rules
5. **Incremental Validation** - Support for validating only changed content

## Testing Strategy

- Unit tests for all core components
- Integration tests for plugin interactions
- E2E tests for CLI commands
- Plugin testing framework for validator development

## File Structure Conventions

- Core components in `/src/core/`
- Built-in validators in `/src/validators/`
- CLI implementation in `/src/cli/`
- Plugin interfaces in `/src/plugins/`
- Configuration schemas in `/src/schemas/`

## Key Features to Remember

1. **Schema Extraction** - Automatically learns narrative patterns from existing stories
2. **Real-time Validation** - Watch mode for continuous checking
3. **Interactive Mode** - Guided fixing with suggestions
4. **Multiple Output Formats** - Text, JSON, HTML
5. **Git Integration** - Validate only changed files in commits
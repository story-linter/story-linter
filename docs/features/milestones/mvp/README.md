# Milestone: MVP (v0.1.0)

> ⚠️ **Current Status**: In Development (Week 4 of 8) - Core Complete, Validators Next

## Overview

The MVP milestone focuses on achieving feature parity with the current GitScrolls validation tools while establishing the foundation for the extensible Story Linter framework.

**Target Date**: 6-8 weeks from project start  
**Goal**: Replace existing GitScrolls validators with Story Linter  
**Implementation Checklist**: [TODO.md](./TODO.md)

## Success Criteria

1. ✅ GitScrolls project validates successfully
2. ✅ All existing GitScrolls tests pass
3. ✅ Performance equal or better than current implementation
4. ✅ Basic plugin architecture functional
5. ✅ CLI provides same capabilities as current tools

## Required Features

### Core Framework

#### 1. File Processing System
- **Feature**: [File Utils](../../features/validation-framework.md)
- **Requirements**:
  - Markdown file parsing
  - Front matter extraction
  - Efficient file reading with caching
  - Support for `.gitignore` patterns

#### 2. Base Validator Framework
- **Feature**: [Validation Framework](../../features/validation-framework.md)
- **Requirements**:
  - Abstract base validator class
  - Issue reporting structure
  - Validation context management
  - Error handling and recovery

#### 3. Configuration System (Minimal)
- **Feature**: [Configuration System](../../features/configuration-system.md)
- **Requirements**:
  - Load configuration from `.story-linter.yml`
  - Support for enabling/disabling validators
  - Basic option passing to validators
  - Default configuration

### Validators (Port from GitScrolls)

#### 4. Character Consistency Validator
- **Plugin**: [Character Consistency](../../plugins/built-in/character-consistency.md)
- **Requirements**:
  - Port existing character validation logic
  - Character name consistency checking
  - Reference validation
  - Maintain current accuracy

#### 5. Link Graph Validator
- **Current Implementation**: `src/validators/link-graph-validator.ts`
- **Requirements**:
  - Port link validation logic
  - Validate internal links
  - Check for broken references
  - Maintain bidirectional link checking

### CLI Interface

#### 6. Basic CLI
- **Feature**: [CLI Interface](../../features/cli-interface.md)
- **Requirements**:
  - `story-linter validate` command
  - File/directory selection
  - Output formatting (pretty, JSON)
  - Exit codes for CI/CD integration
  - Progress indication

## Implementation Order

### Week 1-2: Foundation
1. Set up monorepo structure with Lerna
2. Create core package with TypeScript
3. Implement file processing utilities
4. Create base validator framework

### Week 3-4: Validators
1. Port character consistency validator
2. Port link graph validator
3. Ensure GitScrolls tests pass
4. Performance optimization

### Week 5-6: CLI & Integration
1. Implement CLI package
2. Add configuration loading
3. Create output formatters
4. Integration testing with GitScrolls

### Week 7-8: Polish & Release
1. Documentation updates
2. Performance testing
3. Bug fixes
4. Release preparation

## Technical Specifications

### Package Structure
```
@story-linter/core
├── src/
│   ├── validators/
│   │   ├── base-validator.ts
│   │   └── types.ts
│   ├── utils/
│   │   ├── file-utils.ts
│   │   └── markdown-parser.ts
│   └── index.ts

@story-linter/plugin-character
├── src/
│   ├── character-validator.ts
│   └── index.ts

@story-linter/cli
├── src/
│   ├── commands/
│   │   └── validate.ts
│   └── index.ts
```

### Dependencies
- **Core**: 
  - `gray-matter` (front matter parsing)
  - `glob` (file matching)
  - `chalk` (terminal colors)
- **CLI**:
  - `commander` (CLI framework)
  - `ora` (progress spinners)

### Performance Requirements
- Validate 100 files in < 5 seconds
- Memory usage < 200MB for 1000 files
- Support incremental validation (future)

## Out of Scope for MVP

These features are important but not required for MVP:

1. **Schema Extraction** - Learning from narratives
2. **Interactive Mode** - User prompts and fixes
3. **Watch Mode** - File system monitoring
4. **Plugin Discovery** - Dynamic plugin loading
5. **Web UI** - Browser-based interface
6. **Advanced Configuration** - Complex rule customization

## Migration Guide

For GitScrolls users to migrate to Story Linter:

```bash
# Install
npm install -g @story-linter/cli

# Create configuration
cat > .story-linter.yml << EOF
plugins:
  character-consistency:
    enabled: true
  link-graph:
    enabled: true
EOF

# Run validation
story-linter validate scrolls/
```

## Risks and Mitigations

### Risk: Performance Regression
**Mitigation**: Benchmark against current implementation, optimize critical paths

### Risk: Breaking Changes
**Mitigation**: Maintain same validation rules and output format

### Risk: Complex Setup
**Mitigation**: Provide migration script and clear documentation

## Success Metrics

- ✅ Zero regression in GitScrolls validation
- ✅ < 10% performance overhead vs current
- ✅ Successfully published to npm
- ✅ GitScrolls CI/CD updated to use Story Linter

## Next Milestone Preview

[v0.2.0 - Schema Extraction](./v0.2.0-schema-extraction.md) will add:
- Pattern learning from existing content
- Schema generation and refinement
- Confidence scoring
- Custom validation rules
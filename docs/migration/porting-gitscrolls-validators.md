# Porting GitScrolls Validators to Story Linter

## Overview

This guide walks through the process of porting existing GitScrolls validators to the Story Linter plugin architecture. We'll use the character consistency and link graph validators as examples.

## Current GitScrolls Architecture

### File Structure
```
gitscrolls/
├── src/
│   ├── validators/
│   │   ├── character-consistency-validator.ts
│   │   ├── link-graph-validator.ts
│   │   └── simple-character-validator.ts
│   ├── utils/
│   │   ├── file-utils.ts
│   │   └── markdown-parser.ts
│   └── validate-gitscrolls.ts
```

### Current Implementation Pattern
```typescript
// Current validator structure
export class CharacterConsistencyValidator {
  async validate(files: string[]): Promise<ValidationResult> {
    // Direct file reading
    // In-memory processing
    // Console output
  }
}
```

## Story Linter Architecture

### Target Structure
```
@story-linter/
├── core/
│   └── src/
│       ├── validator-base.ts
│       └── types.ts
├── plugin-character/
│   └── src/
│       ├── index.ts
│       └── character-validator.ts
└── plugin-link-graph/
    └── src/
        ├── index.ts
        └── link-validator.ts
```

## Step-by-Step Porting Guide

### Step 1: Analyze Current Validator

First, understand what the current validator does:

```typescript
// Current character-consistency-validator.ts
import { readFile } from '../utils/file-utils';
import { parseMarkdown } from '../utils/markdown-parser';

export class CharacterConsistencyValidator {
  private characters: Map<string, CharacterInfo> = new Map();
  
  async validate(files: string[]): Promise<ValidationResult> {
    // 1. Read all files
    for (const file of files) {
      const content = await readFile(file);
      this.extractCharacters(content, file);
    }
    
    // 2. Check consistency
    const issues = this.checkConsistency();
    
    // 3. Return results
    return { issues, stats: this.getStats() };
  }
}
```

### Step 2: Create Plugin Structure

Create a new plugin package:

```bash
mkdir -p packages/plugin-character-consistency/src
cd packages/plugin-character-consistency
npm init -y
```

Update `package.json`:
```json
{
  "name": "@story-linter/plugin-character-consistency",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@story-linter/core": "^0.1.0"
  }
}
```

### Step 3: Implement Base Validator Interface

Create the validator following Story Linter's interface:

```typescript
// packages/plugin-character-consistency/src/character-validator.ts
import { 
  BaseValidator, 
  ValidationContext, 
  ValidationIssue,
  FileContent 
} from '@story-linter/core';

export class CharacterConsistencyValidator extends BaseValidator {
  name = 'character-consistency';
  version = '0.1.0';
  
  // State management per validation run
  private context: ValidationContext;
  private characters: Map<string, CharacterInfo>;
  
  async initialize(context: ValidationContext): Promise<void> {
    this.context = context;
    this.characters = new Map();
    
    // Load any saved schema if available
    const schema = await context.schemaStore.load('characters');
    if (schema) {
      this.initializeFromSchema(schema);
    }
  }
  
  async validate(
    file: string, 
    content: string, 
    context: ValidationContext
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    
    // Parse the file
    const parsed = context.markdownParser.parse(content);
    
    // Extract characters from this file
    const fileCharacters = this.extractCharacters(parsed, file);
    
    // Check consistency with known characters
    issues.push(...this.checkConsistency(fileCharacters, file));
    
    // Update global character state
    this.updateCharacterState(fileCharacters);
    
    return issues;
  }
  
  async afterValidation(): Promise<void> {
    // Save learned patterns for next run
    await this.context.schemaStore.save('characters', {
      characters: Array.from(this.characters.entries())
    });
  }
}
```

### Step 4: Port Core Logic

Transform the validation logic to work with the new architecture:

```typescript
// Before (GitScrolls)
private extractCharacters(content: string, file: string): void {
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    // Direct regex matching
    const match = /\b([A-Z][a-z]+)\b/.exec(line);
    if (match) {
      this.characters.set(match[1], { 
        file, 
        line: index + 1 
      });
    }
  });
}

// After (Story Linter)
private extractCharacters(
  parsed: ParsedMarkdown, 
  file: string
): CharacterReference[] {
  const references: CharacterReference[] = [];
  
  parsed.sections.forEach(section => {
    // Use parsed AST instead of raw text
    section.paragraphs.forEach(paragraph => {
      const names = this.findCharacterNames(paragraph);
      names.forEach(name => {
        references.push({
          name: name.value,
          file,
          line: name.position.line,
          column: name.position.column,
          context: paragraph.text
        });
      });
    });
  });
  
  return references;
}
```

### Step 5: Adapt Issue Reporting

Convert console output to structured issues:

```typescript
// Before (GitScrolls)
console.error(`Character "${name}" inconsistent: ${file1} vs ${file2}`);

// After (Story Linter)
issues.push({
  severity: 'error',
  code: 'CHAR001',
  message: `Character "${name}" has inconsistent references`,
  file: file1,
  line: reference1.line,
  column: reference1.column,
  validator: this.name,
  fix: {
    description: `Change "${reference1.text}" to "${reference2.text}"`,
    changes: [{
      file: file1,
      line: reference1.line,
      column: reference1.column,
      length: reference1.text.length,
      replacement: reference2.text
    }]
  }
});
```

### Step 6: Create Plugin Export

Create the main plugin export:

```typescript
// packages/plugin-character-consistency/src/index.ts
import { StoryLinterPlugin } from '@story-linter/core';
import { CharacterConsistencyValidator } from './character-validator';
import { configSchema } from './config';

const plugin: StoryLinterPlugin = {
  name: '@story-linter/plugin-character-consistency',
  version: '0.1.0',
  description: 'Validates character name consistency and references',
  
  validators: [CharacterConsistencyValidator],
  
  configSchema,
  
  // Optional: provide patterns for schema extraction
  patterns: [{
    name: 'character-names',
    extract: (content) => {
      // Pattern extraction logic
    }
  }]
};

export default plugin;
```

### Step 7: Add Configuration

Port configuration options:

```typescript
// packages/plugin-character-consistency/src/config.ts
import { z } from 'zod';

export const configSchema = z.object({
  enabled: z.boolean().default(true),
  evolution: z.object({
    track: z.boolean().default(true),
    requireExplicit: z.boolean().default(false)
  }).default({}),
  references: z.object({
    checkPronouns: z.boolean().default(true),
    checkNicknames: z.boolean().default(true)
  }).default({}),
  ignore: z.array(z.string()).default([])
});

export type PluginConfig = z.infer<typeof configSchema>;
```

## Porting Checklist

### For Each Validator:

- [ ] **Analyze current implementation**
  - [ ] Identify core validation logic
  - [ ] List dependencies and utilities used
  - [ ] Document current output format

- [ ] **Create plugin structure**
  - [ ] Set up package directory
  - [ ] Configure package.json
  - [ ] Set up TypeScript config

- [ ] **Implement validator class**
  - [ ] Extend BaseValidator
  - [ ] Implement required methods
  - [ ] Port validation logic

- [ ] **Adapt to new patterns**
  - [ ] Use ValidationContext instead of direct file access
  - [ ] Return structured ValidationIssue objects
  - [ ] Support incremental validation

- [ ] **Add plugin features**
  - [ ] Configuration schema
  - [ ] Pattern extractors
  - [ ] Fix suggestions

- [ ] **Test thoroughly**
  - [ ] Port existing tests
  - [ ] Add plugin-specific tests
  - [ ] Verify GitScrolls compatibility

## Common Porting Patterns

### Pattern 1: File Reading
```typescript
// GitScrolls
const content = await fs.readFile(file, 'utf-8');

// Story Linter (handled by framework)
async validate(file: string, content: string, context: ValidationContext)
```

### Pattern 2: Cross-file State
```typescript
// GitScrolls
class Validator {
  private globalState = new Map();
  
  validate(files: string[]) {
    files.forEach(file => {
      // Process all files
    });
  }
}

// Story Linter
class Validator extends BaseValidator {
  private state: ValidatorState;
  
  async initialize(context: ValidationContext) {
    // Initialize state
  }
  
  async validate(file: string, content: string) {
    // Process single file, update state
  }
  
  async afterValidation() {
    // Finalize cross-file validation
  }
}
```

### Pattern 3: Error Reporting
```typescript
// GitScrolls
console.log(chalk.red(`Error: ${message}`));
return { success: false };

// Story Linter
return [{
  severity: 'error',
  code: 'VAL001',
  message,
  file,
  line,
  column
}];
```

## Testing the Ported Validator

### 1. Unit Tests
```typescript
import { CharacterConsistencyValidator } from '../src/character-validator';
import { createTestContext } from '@story-linter/test-utils';

describe('CharacterConsistencyValidator', () => {
  let validator: CharacterConsistencyValidator;
  let context: ValidationContext;
  
  beforeEach(() => {
    context = createTestContext();
    validator = new CharacterConsistencyValidator();
  });
  
  it('should detect inconsistent character names', async () => {
    const issues = await validator.validate(
      'test.md',
      'John went to the store. Jon came back.',
      context
    );
    
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('CHAR001');
  });
});
```

### 2. Integration Tests
```typescript
it('should work with GitScrolls content', async () => {
  const validator = new CharacterConsistencyValidator();
  const context = createTestContext();
  
  // Use actual GitScrolls content
  const content = await fs.readFile(
    'scrolls/01-Unbroken-Line.md', 
    'utf-8'
  );
  
  const issues = await validator.validate(
    'scrolls/01-Unbroken-Line.md',
    content,
    context
  );
  
  // Should produce same results as original
  expect(issues).toMatchSnapshot();
});
```

## Migration Path

### Phase 1: Direct Port (Week 1-2)
1. Port character-consistency-validator
2. Port link-graph-validator
3. Ensure feature parity

### Phase 2: Enhancement (Week 3-4)
1. Add fix suggestions
2. Implement schema learning
3. Add configuration options

### Phase 3: Optimization (Week 5-6)
1. Add caching support
2. Implement incremental validation
3. Performance testing

## Troubleshooting

### Common Issues:

**Issue**: Global state not working
**Solution**: Use `initialize()` and `afterValidation()` lifecycle hooks

**Issue**: File paths different
**Solution**: Use `context.resolvePath()` for consistent paths

**Issue**: Performance regression
**Solution**: Implement caching using `context.cache`

**Issue**: Lost features
**Solution**: Check if feature should be in core or plugin

## Resources

- [Story Linter Plugin API](../plugins/development/plugin-structure.md)
- [Validation Framework](../architecture/core-components/validation-framework.md)
- [Testing Plugins](../plugins/development/testing-plugins.md)
- [GitScrolls Source](https://github.com/gitscrolls/gitscrolls)
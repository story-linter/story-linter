# GitScrolls to Story Linter - Quick Reference

## API Mapping

### Validator Structure

| GitScrolls | Story Linter |
|------------|--------------|
| `class MyValidator` | `class MyValidator extends BaseValidator` |
| `validate(files: string[])` | `validate(file: string, content: string, context: ValidationContext)` |
| Constructor initialization | `initialize(context: ValidationContext)` |
| Final processing | `afterValidation(context: ValidationContext)` |
| Direct file reading | Content provided by framework |

### File Operations

| GitScrolls | Story Linter |
|------------|--------------|
| `fs.readFile(path)` | Content passed to `validate()` |
| `getScrollFiles(dir)` | `context.fileSystem.glob(pattern)` |
| `path.resolve()` | `context.paths.resolve()` |
| `fs.existsSync()` | `context.fileSystem.exists()` |

### Parsing

| GitScrolls | Story Linter |
|------------|--------------|
| `new MarkdownParser()` | `context.parser` |
| `parser.parseFile(path)` | `context.parser.parse(content)` |
| Manual regex parsing | AST traversal with `parsed.traverse()` |
| Line splitting | Position tracking in AST |

### Error Reporting

| GitScrolls | Story Linter |
|------------|--------------|
| `console.error()` | Return `ValidationIssue` |
| Custom result object | Standardized issue format |
| Success/failure boolean | Issue severity levels |
| Print to console | Structured data return |

### State Management

| GitScrolls | Story Linter |
|------------|--------------|
| Instance variables | Lifecycle-aware state |
| Process all files at once | Per-file processing |
| Global state | Context-scoped state |
| In-memory only | Optional persistence via schema |

## Code Templates

### Basic Validator

```typescript
// GitScrolls
export class MyValidator {
  private data: Map<string, any> = new Map();
  
  async validate(files: string[]): Promise<Result> {
    for (const file of files) {
      const content = await readFile(file);
      // Process...
    }
    return { success: true };
  }
}

// Story Linter
export class MyValidator extends BaseValidator {
  name = 'my-validator';
  private state: ValidatorState;
  
  async initialize(context: ValidationContext) {
    this.state = new ValidatorState();
  }
  
  async validate(
    file: string, 
    content: string, 
    context: ValidationContext
  ): Promise<ValidationIssue[]> {
    // Process single file
    return issues;
  }
  
  async afterValidation(context: ValidationContext) {
    // Final processing
    return additionalIssues;
  }
}
```

### Issue Creation

```typescript
// GitScrolls
console.error(`Error in ${file}:${line}: ${message}`);
errors.push({ file, line, message });

// Story Linter
issues.push({
  severity: 'error',
  code: 'VAL001',
  message: message,
  file: file,
  line: line,
  column: column,
  validator: this.name,
  fix: {
    description: 'How to fix',
    changes: [{
      file, line, column,
      length: oldText.length,
      replacement: newText
    }]
  }
});
```

### Configuration

```typescript
// GitScrolls
const CONFIG = {
  checkThis: true,
  threshold: 0.8
};

// Story Linter
import { z } from 'zod';

export const configSchema = z.object({
  checkThis: z.boolean().default(true),
  threshold: z.number().min(0).max(1).default(0.8)
});

// Access in validator
const config = context.config.get<PluginConfig>('my-validator');
```

### Testing

```typescript
// GitScrolls
test('validates correctly', async () => {
  const validator = new MyValidator();
  const result = await validator.validate(['test.md']);
  expect(result.success).toBe(true);
});

// Story Linter
test('validates correctly', async () => {
  const validator = new MyValidator();
  const context = createTestContext();
  await validator.initialize(context);
  
  const issues = await validator.validate(
    'test.md',
    'content here',
    context
  );
  
  expect(issues).toHaveLength(0);
});
```

## Common Patterns

### Cross-File Validation

```typescript
// Story Linter approach
class CrossFileValidator extends BaseValidator {
  private collectedData: Map<string, FileData> = new Map();
  
  async validate(file: string, content: string, context: ValidationContext) {
    // Collect data from each file
    this.collectedData.set(file, extractData(content));
    
    // Return file-specific issues only
    return localIssues;
  }
  
  async afterValidation(context: ValidationContext) {
    // Now check across all files
    const crossFileIssues: ValidationIssue[] = [];
    
    for (const [file, data] of this.collectedData) {
      // Check consistency across files
      crossFileIssues.push(...checkConsistency(file, data, this.collectedData));
    }
    
    return crossFileIssues;
  }
}
```

### Caching

```typescript
// Story Linter caching
class CachedValidator extends BaseValidator {
  async validate(file: string, content: string, context: ValidationContext) {
    // Check cache first
    const cached = await context.cache.get(file, this.name);
    if (cached && !context.hasChanged(file, cached.timestamp)) {
      return cached.issues;
    }
    
    // Validate
    const issues = await this.doValidation(content);
    
    // Cache results
    await context.cache.set(file, this.name, {
      issues,
      timestamp: Date.now()
    });
    
    return issues;
  }
}
```

### Schema Integration

```typescript
// Learn from content
class SchemaAwareValidator extends BaseValidator {
  async initialize(context: ValidationContext) {
    // Load learned patterns
    const schema = await context.schemas.get('characters');
    if (schema) {
      this.knownCharacters = schema.characters;
    }
  }
  
  async afterValidation(context: ValidationContext) {
    // Save learned patterns
    await context.schemas.set('characters', {
      characters: this.discoveredCharacters
    });
  }
}
```

## Migration Checklist

1. **Structure**
   - [ ] Create plugin package
   - [ ] Extend BaseValidator
   - [ ] Add name and version

2. **Lifecycle**
   - [ ] Move setup to `initialize()`
   - [ ] Split validation into per-file
   - [ ] Add `afterValidation()` for cross-file

3. **I/O**
   - [ ] Remove file reading
   - [ ] Use provided content
   - [ ] Use context utilities

4. **Results**
   - [ ] Convert to ValidationIssue[]
   - [ ] Add error codes
   - [ ] Include fix suggestions

5. **Configuration**
   - [ ] Create Zod schema
   - [ ] Export configuration types
   - [ ] Use context.config

6. **Testing**
   - [ ] Use test utilities
   - [ ] Mock context
   - [ ] Test edge cases

## Performance Tips

1. **Use caching** - Don't revalidate unchanged files
2. **Lazy loading** - Only load what you need
3. **Streaming** - Process large files in chunks
4. **Parallel-safe** - Make validators stateless when possible
5. **Incremental** - Support partial revalidation

## Need Help?

- [Full Porting Guide](./porting-gitscrolls-validators.md)
- [Link Graph Example](./port-link-graph-example.md)
- [Plugin Development](../plugins/development/getting-started.md)
- [API Reference](../api/)
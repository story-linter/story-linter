# Plugin Development Best Practices

## Overview

This guide outlines best practices for developing high-quality, maintainable, and performant Story Linter plugins that provide value to writers while integrating seamlessly with the ecosystem.

## Code Quality

### TypeScript Best Practices

Use strict TypeScript configuration:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

Type everything explicitly:

```typescript
// Good
interface RuleOptions {
  maxLength: number;
  allowExceptions: string[];
}

async function validateRule(
  file: StoryFile,
  options: RuleOptions
): Promise<ValidationError[]> {
  // Implementation
}

// Bad
async function validateRule(file: any, options: any) {
  // Avoid 'any' types
}
```

### Error Handling

Always handle errors gracefully:

```typescript
export class MyPlugin implements Plugin {
  async initialize(context: PluginContext): Promise<void> {
    try {
      await this.loadResources();
    } catch (error) {
      // Log error but don't crash
      context.logger.error('Failed to load resources', error);
      
      // Provide fallback behavior
      this.useFallbackMode();
    }
  }
  
  async validate(file: StoryFile): Promise<ValidationResult> {
    try {
      return await this.performValidation(file);
    } catch (error) {
      // Return empty result instead of throwing
      return {
        errors: [],
        warnings: [{
          message: `Plugin error: ${error.message}`,
          rule: 'PLUGIN_ERROR'
        }]
      };
    }
  }
}
```

### Logging

Use proper logging levels:

```typescript
class MyPlugin {
  private logger: Logger;
  
  async initialize(context: PluginContext): Promise<void> {
    this.logger = context.getLogger();
    
    // Use appropriate levels
    this.logger.debug('Initializing plugin');
    this.logger.info('Plugin loaded successfully');
    this.logger.warn('Deprecated feature used');
    this.logger.error('Critical error occurred', error);
  }
}
```

## Performance

### Efficient File Processing

Process files efficiently:

```typescript
// Good - Stream large files
async function processLargeFile(path: string): Promise<void> {
  const stream = createReadStream(path);
  const rl = readline.createInterface({ input: stream });
  
  for await (const line of rl) {
    await processLine(line);
  }
}

// Bad - Loading entire file into memory
async function processLargeFile(path: string): Promise<void> {
  const content = await readFile(path, 'utf-8');
  const lines = content.split('\n'); // Memory intensive
}
```

### Caching

Implement smart caching:

```typescript
class CachedValidator {
  private cache = new Map<string, ValidationResult>();
  
  async validate(file: StoryFile): Promise<ValidationResult> {
    const cacheKey = this.getCacheKey(file);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    // Perform validation
    const result = await this.performValidation(file);
    
    // Cache result
    this.cache.set(cacheKey, result);
    
    return result;
  }
  
  private getCacheKey(file: StoryFile): string {
    return `${file.path}:${file.lastModified}`;
  }
}
```

### Lazy Loading

Load dependencies only when needed:

```typescript
class MyPlugin {
  private heavyDependency?: HeavyLibrary;
  
  async initialize(context: PluginContext): Promise<void> {
    // Don't load heavy dependencies during init
    context.registerRule({
      id: 'HEAVY001',
      validate: async (file) => {
        // Load only when rule is actually used
        if (!this.heavyDependency) {
          this.heavyDependency = await import('heavy-library');
        }
        
        return this.heavyDependency.analyze(file);
      }
    });
  }
}
```

## User Experience

### Clear Error Messages

Provide helpful, actionable error messages:

```typescript
// Good
{
  message: 'Character "Sarah" referenced but not introduced. First introduce the character before using them.',
  rule: 'CHAR001',
  fix: 'Add character introduction before line 42',
  docs: 'https://docs.story-linter.com/rules/CHAR001'
}

// Bad
{
  message: 'Invalid character reference',
  rule: 'CHAR001'
}
```

### Progressive Enhancement

Start with basic functionality:

```typescript
class ProgressivePlugin {
  async initialize(context: PluginContext): Promise<void> {
    // Basic rule always available
    context.registerRule(this.basicRule);
    
    // Advanced features if available
    if (await this.checkAdvancedSupport()) {
      context.registerRule(this.advancedRule);
    }
    
    // Optional integrations
    if (context.hasFeature('ai-analysis')) {
      context.registerRule(this.aiRule);
    }
  }
}
```

### Configuration Validation

Validate user configuration:

```typescript
import { z } from 'zod';

const configSchema = z.object({
  enabled: z.boolean().default(true),
  severity: z.enum(['error', 'warning', 'info']).default('warning'),
  options: z.object({
    maxErrors: z.number().min(1).max(100).default(10)
  })
});

async function configure(userConfig: unknown): Promise<void> {
  try {
    const config = configSchema.parse(userConfig);
    this.applyConfig(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid configuration: ${error.message}`);
    }
    throw error;
  }
}
```

## Documentation

### Inline Documentation

Document all public APIs:

```typescript
/**
 * Validates character consistency across story files
 * 
 * @param file - The story file to validate
 * @param options - Validation options
 * @returns Array of validation errors found
 * 
 * @example
 * ```typescript
 * const errors = await validateCharacters(file, {
 *   trackEvolution: true,
 *   allowNicknames: false
 * });
 * ```
 */
export async function validateCharacters(
  file: StoryFile,
  options: CharacterOptions
): Promise<ValidationError[]> {
  // Implementation
}
```

### README Structure

Essential README sections:

```markdown
# My Story Linter Plugin

## Features
- Clear bullet points of what the plugin does

## Installation
```bash
npm install @story-linter/plugin-my-plugin
```

## Configuration
```yaml
plugins:
  my-plugin:
    enabled: true
    options:
      setting: value
```

## Rules
### RULE001 - Rule Name
Description of what the rule checks

## Examples
Show real-world usage examples

## Troubleshooting
Common issues and solutions

## Contributing
How to contribute to the plugin
```

## Testing

### Comprehensive Test Coverage

Test all scenarios:

```typescript
describe('MyRule', () => {
  // Happy path
  it('should validate correct content', async () => {
    const result = await rule.validate(validFile);
    expect(result.errors).toHaveLength(0);
  });
  
  // Error cases
  it('should detect errors', async () => {
    const result = await rule.validate(invalidFile);
    expect(result.errors).toHaveLength(1);
  });
  
  // Edge cases
  it('should handle empty files', async () => {
    const result = await rule.validate(emptyFile);
    expect(result).toBeDefined();
  });
  
  // Configuration
  it('should respect configuration', async () => {
    const configured = rule.withConfig({ severity: 'error' });
    const result = await configured.validate(file);
    expect(result.errors[0].severity).toBe('error');
  });
});
```

## Security

### Input Validation

Never trust user input:

```typescript
function processUserPattern(pattern: string): RegExp {
  // Validate pattern before using
  if (pattern.length > 1000) {
    throw new Error('Pattern too long');
  }
  
  try {
    // Use safe regex library to prevent ReDoS
    return new SafeRegExp(pattern, { timeout: 1000 });
  } catch (error) {
    throw new Error(`Invalid pattern: ${error.message}`);
  }
}
```

### Resource Limits

Implement resource limits:

```typescript
class ResourceLimitedPlugin {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_PROCESSING_TIME = 30000; // 30 seconds
  
  async validate(file: StoryFile): Promise<ValidationResult> {
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        errors: [{
          message: 'File too large for processing',
          rule: 'SIZE_LIMIT'
        }]
      };
    }
    
    return await this.validateWithTimeout(file);
  }
}
```

## Compatibility

### Version Support

Support multiple Story Linter versions:

```typescript
class CompatiblePlugin {
  async initialize(context: PluginContext): Promise<void> {
    const version = context.version;
    
    if (version.major >= 2) {
      // Use new API
      context.registerRuleV2(this.rule);
    } else {
      // Fall back to old API
      context.registerRule(this.rule);
    }
  }
}
```

### Graceful Degradation

Handle missing features:

```typescript
async function useOptionalFeature(context: PluginContext): Promise<void> {
  if (context.hasFeature?.('advanced-analysis')) {
    // Use advanced feature
    await context.enableAdvancedAnalysis();
  } else {
    // Fall back to basic functionality
    this.logger.info('Advanced analysis not available');
  }
}
```

## Publishing

### Semantic Versioning

Follow semantic versioning:

- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes

### Changelog

Maintain a clear changelog:

```markdown
# Changelog

## [2.1.0] - 2024-01-15
### Added
- New rule for detecting plot holes
- Configuration option for severity levels

### Fixed
- Memory leak in large file processing
- Incorrect line numbers in error reports

### Changed
- Improved error messages for clarity
```

## Community

### Open Source Best Practices

1. **License** - Choose appropriate license (MIT, Apache 2.0)
2. **Contributing** - Clear contribution guidelines
3. **Code of Conduct** - Foster inclusive community
4. **Issue Templates** - Help users report issues
5. **PR Process** - Document review process

### Support Channels

Provide clear support options:

```markdown
## Getting Help

- 📖 [Documentation](https://docs.myplugin.com)
- 💬 [Discord Community](https://discord.gg/myplugin)
- 🐛 [Issue Tracker](https://github.com/me/myplugin/issues)
- 📧 [Email Support](mailto:support@myplugin.com)
```

## Next Steps

- Learn about [Distribution](distribution.md)
- Review [Example Plugins](https://github.com/story-linter/plugins)
- Join the [Developer Community](https://discord.gg/story-linter-dev)
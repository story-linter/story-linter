# Testing Plugins

## Overview

Comprehensive testing ensures your Story Linter plugin works correctly across different scenarios, configurations, and edge cases. This guide covers testing strategies, tools, and best practices.

## Testing Setup

### Dependencies

Install testing dependencies:

```bash
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @story-linter/test-utils
npm install --save-dev @testing-library/jest-dom
```

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## Unit Testing

### Testing Validation Rules

```typescript
// tests/unit/rules/example-rule.test.ts
import { exampleRule } from '../../../src/rules/example-rule';
import { createMockFile } from '@story-linter/test-utils';

describe('Example Rule', () => {
  it('should detect issues', async () => {
    const file = createMockFile({
      path: 'chapter-1.md',
      content: 'This is an example text'
    });
    
    const errors = await exampleRule.validate(file);
    
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      line: 1,
      column: 12,
      message: 'Found example text',
      rule: 'MY001',
      severity: 'warning'
    });
  });
  
  it('should not flag clean content', async () => {
    const file = createMockFile({
      content: 'This is clean text'
    });
    
    const errors = await exampleRule.validate(file);
    
    expect(errors).toHaveLength(0);
  });
  
  it('should fix issues when requested', async () => {
    const file = createMockFile({
      content: 'This is an example'
    });
    
    const error = await exampleRule.validate(file)[0];
    const result = await exampleRule.fix(file, error);
    
    expect(result.fixed).toBe(true);
    expect(result.content).toBe('This is an sample');
  });
});
```

### Testing Plugin Initialization

```typescript
// tests/unit/plugin.test.ts
import MyPlugin from '../../src/plugin';
import { createMockContext } from '@story-linter/test-utils';

describe('MyPlugin', () => {
  let plugin: MyPlugin;
  let context: MockPluginContext;
  
  beforeEach(() => {
    plugin = new MyPlugin();
    context = createMockContext();
  });
  
  it('should initialize successfully', async () => {
    await expect(plugin.initialize(context)).resolves.not.toThrow();
  });
  
  it('should register rules', async () => {
    await plugin.initialize(context);
    
    expect(context.registerRule).toHaveBeenCalledTimes(2);
    expect(context.registerRule).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'MY001',
        name: 'example-rule'
      })
    );
  });
  
  it('should apply configuration', async () => {
    await plugin.initialize(context);
    await plugin.configure({
      rules: {
        MY001: { severity: 'error' }
      }
    });
    
    // Verify configuration was applied
    const rule = context.getRule('MY001');
    expect(rule.severity).toBe('error');
  });
});
```

## Integration Testing

### Testing with Real Files

```typescript
// tests/integration/real-files.test.ts
import { runPlugin } from '@story-linter/test-utils';
import MyPlugin from '../../src';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Real File Integration', () => {
  it('should validate actual story files', async () => {
    const content = readFileSync(
      join(__dirname, '../fixtures/sample-story.md'),
      'utf-8'
    );
    
    const results = await runPlugin(MyPlugin, {
      files: [{
        path: 'story.md',
        content
      }],
      config: {
        rules: {
          MY001: { severity: 'warning' }
        }
      }
    });
    
    expect(results.errors).toHaveLength(3);
    expect(results.warnings).toHaveLength(2);
  });
});
```

### Testing Plugin Interactions

```typescript
// tests/integration/plugin-interaction.test.ts
describe('Plugin Interactions', () => {
  it('should work with other plugins', async () => {
    const results = await runMultiplePlugins([
      MyPlugin,
      CharacterConsistencyPlugin
    ], {
      files: [/* test files */],
      config: {/* combined config */}
    });
    
    // Verify no conflicts
    expect(results.conflicts).toHaveLength(0);
  });
});
```

## Performance Testing

### Testing Large Files

```typescript
// tests/performance/large-files.test.ts
describe('Performance', () => {
  it('should handle large files efficiently', async () => {
    const largeContent = 'word '.repeat(100000); // 100k words
    
    const start = Date.now();
    const results = await runPlugin(MyPlugin, {
      files: [{ content: largeContent }]
    });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000); // Under 1 second
    expect(results.memoryUsage).toBeLessThan(100 * 1024 * 1024); // Under 100MB
  });
  
  it('should validate incrementally', async () => {
    const files = Array(100).fill(null).map((_, i) => ({
      path: `chapter-${i}.md`,
      content: 'Sample content'
    }));
    
    // First run - full validation
    const firstRun = await measurePerformance(() => 
      runPlugin(MyPlugin, { files })
    );
    
    // Second run - incremental (only one file changed)
    files[50].content = 'Modified content';
    const secondRun = await measurePerformance(() =>
      runPlugin(MyPlugin, { files, incremental: true })
    );
    
    expect(secondRun.duration).toBeLessThan(firstRun.duration * 0.1);
  });
});
```

## Test Utilities

### Mock Factories

Create reusable mocks:

```typescript
// tests/utils/mocks.ts
export function createMockStoryFile(overrides?: Partial<StoryFile>): StoryFile {
  return {
    path: 'test.md',
    content: 'Test content',
    metadata: {},
    ...overrides
  };
}

export function createMockValidationError(overrides?: Partial<ValidationError>): ValidationError {
  return {
    line: 1,
    column: 1,
    message: 'Test error',
    rule: 'TEST001',
    severity: 'error',
    ...overrides
  };
}
```

### Test Fixtures

Organize test data:

```
tests/fixtures/
├── valid/
│   ├── clean-story.md
│   └── well-formatted.md
├── invalid/
│   ├── many-errors.md
│   └── edge-cases.md
└── config/
    ├── minimal.json
    └── complex.json
```

### Custom Matchers

Create Jest matchers:

```typescript
// tests/utils/matchers.ts
expect.extend({
  toHaveValidationError(received, expected) {
    const pass = received.some(error =>
      error.rule === expected.rule &&
      error.message.includes(expected.message)
    );
    
    return {
      pass,
      message: () => pass
        ? `Expected not to have error ${expected.rule}`
        : `Expected to have error ${expected.rule}`
    };
  }
});

// Usage
expect(errors).toHaveValidationError({
  rule: 'MY001',
  message: 'example'
});
```

## Testing Best Practices

### 1. Test Organization

```typescript
describe('RuleName', () => {
  describe('when condition X', () => {
    it('should behave like Y', () => {
      // Single assertion focus
    });
  });
  
  describe('edge cases', () => {
    it.each([
      ['empty content', ''],
      ['single line', 'one line'],
      ['unicode', 'émojis 🎉']
    ])('should handle %s', (scenario, content) => {
      // Parameterized tests
    });
  });
});
```

### 2. Test Coverage

Aim for comprehensive coverage:

- **Happy path** - Normal usage
- **Edge cases** - Boundary conditions
- **Error cases** - Invalid inputs
- **Performance** - Large inputs
- **Configuration** - All options

### 3. Async Testing

Handle promises correctly:

```typescript
// Good
it('should validate async', async () => {
  const result = await rule.validate(file);
  expect(result).toHaveLength(1);
});

// Also good
it('should reject invalid input', () => {
  return expect(rule.validate(null)).rejects.toThrow('Invalid input');
});
```

## Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test Plugin
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [14, 16, 18]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
      
      - run: npm ci
      - run: npm test
      - run: npm run lint
      
      - name: Coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Debugging Tests

### VS Code Configuration

```json
// .vscode/launch.json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache", "${relativeFile}"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## Next Steps

- Review [Best Practices](best-practices.md)
- Learn about [Distribution](distribution.md)
- See [Example Tests](https://github.com/story-linter/plugin-examples)
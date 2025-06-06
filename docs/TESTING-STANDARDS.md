# Story Linter Testing Standards

## Core Principles

### 1. Test-Driven Development (TDD)
- Write tests FIRST
- Red → Green → Refactor cycle
- One failing test at a time

### 2. SOLID Principles
- **S**ingle Responsibility: One reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable
- **I**nterface Segregation: Many specific interfaces
- **D**ependency Inversion: Depend on abstractions

### 3. Clean Code Principles
- **KISS**: Keep It Simple, Stupid
- **YAGNI**: You Aren't Gonna Need It
- **DRY**: Don't Repeat Yourself (but don't over-abstract)

## Testing Strategy

### Unit Tests
- Test single units in isolation
- Use dependency injection
- Test doubles (NOT spies/mocks)
- Test behavior, not implementation
- File naming: `*.test.ts`

### Integration Tests
- Test component interactions
- Real implementations where possible
- Test doubles for external dependencies
- File naming: `*.integration.test.ts`

### End-to-End Tests
- Test complete user scenarios
- Real files, real config
- Verify actual output
- File naming: `*.e2e.test.ts`

## Test Structure

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should perform expected behavior when given valid input', () => {
      // Arrange
      const input = createTestInput();
      const expected = createExpectedOutput();
      
      // Act
      const result = component.method(input);
      
      // Assert
      expect(result).toEqual(expected);
    });
    
    it('should handle edge case appropriately', () => {
      // Test edge cases separately
    });
  });
});
```

## Dependency Injection Pattern

```typescript
// Bad - Hard to test
class FileReader {
  private fs = require('fs');
  read(path: string) {
    return this.fs.readFileSync(path);
  }
}

// Good - Testable
interface FileSystem {
  readFile(path: string): Promise<string>;
}

class FileReader {
  constructor(private fs: FileSystem) {}
  
  async read(path: string) {
    return this.fs.readFile(path);
  }
}
```

## Test Doubles

```typescript
// Stub - Provides canned answers
class StubFileSystem implements FileSystem {
  async readFile(path: string): Promise<string> {
    return 'test content';
  }
}

// Fake - Working implementation for tests
class FakeFileSystem implements FileSystem {
  private files = new Map<string, string>();
  
  addFile(path: string, content: string) {
    this.files.set(path, content);
  }
  
  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (!content) throw new Error('File not found');
    return content;
  }
}
```

## Coverage Requirements

- Minimum 80% code coverage
- 100% coverage for critical paths
- Focus on behavior coverage, not line coverage

## Test Organization

```
packages/core/
├── src/
│   ├── validators/
│   │   ├── base-validator.ts
│   │   └── base-validator.test.ts
│   └── utils/
│       ├── file-reader.ts
│       └── file-reader.test.ts
└── test/
    ├── fixtures/
    ├── doubles/
    └── integration/
        └── validation-framework.integration.test.ts
```

## Naming Conventions

- Test files: Same name as source + `.test.ts`
- Test suites: Match class/module name
- Test cases: Start with "should"
- Be specific about expectations

## No-No List

❌ NO spies - Use test doubles  
❌ NO testing implementation details  
❌ NO shared mutable state between tests  
❌ NO complex setup in tests  
❌ NO time-dependent tests  
❌ NO network calls in unit tests  

## Yes-Yes List

✅ Each test tests ONE thing  
✅ Tests are independent  
✅ Tests are deterministic  
✅ Tests are fast  
✅ Tests document behavior  
✅ Tests use clear names  

## Example: Refactoring for Testability

```typescript
// Before - Untestable
class ConfigLoader {
  async load(path: string) {
    const content = await fs.readFile(path);
    return yaml.parse(content);
  }
}

// After - Testable with DI
interface FileReader {
  read(path: string): Promise<string>;
}

interface ConfigParser {
  parse(content: string): Config;
}

class ConfigLoader {
  constructor(
    private fileReader: FileReader,
    private parser: ConfigParser
  ) {}
  
  async load(path: string): Promise<Config> {
    const content = await this.fileReader.read(path);
    return this.parser.parse(content);
  }
}
```
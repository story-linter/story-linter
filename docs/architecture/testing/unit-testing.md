# Unit Testing

## Overview

Unit testing is fundamental to ensuring the reliability and maintainability of the Story Linter. This document outlines comprehensive unit testing strategies, patterns, and best practices for testing individual components in isolation.

## Testing Framework

### Core Testing Architecture

```typescript
interface TestFramework {
  // Test organization
  describe(name: string, fn: () => void): void
  it(name: string, fn: TestFunction): void
  
  // Setup and teardown
  beforeEach(fn: SetupFunction): void
  afterEach(fn: TeardownFunction): void
  beforeAll(fn: SetupFunction): void
  afterAll(fn: TeardownFunction): void
  
  // Assertions
  expect<T>(actual: T): Assertion<T>
  
  // Mocking
  mock<T>(module: string): Mock<T>
  spy<T>(obj: T, method: keyof T): Spy
  
  // Test utilities
  skip(name: string, fn: TestFunction): void
  only(name: string, fn: TestFunction): void
  timeout(ms: number): void
}

interface TestContext {
  // Test metadata
  testName: string
  suiteName: string
  
  // Test state
  state: Map<string, any>
  
  // Utilities
  fixture<T>(name: string): T
  snapshot(value: any): void
  
  // Cleanup
  addCleanup(fn: CleanupFunction): void
}
```

### Test Configuration

```typescript
interface TestConfig {
  // Test environment
  testEnvironment: 'node' | 'jsdom'
  
  // Coverage settings
  collectCoverage: boolean
  coverageThreshold: {
    global: {
      branches: number
      functions: number
      lines: number
      statements: number
    }
  }
  
  // Test patterns
  testMatch: string[]
  testPathIgnorePatterns: string[]
  
  // Timeouts
  testTimeout: number
  
  // Mocking
  clearMocks: boolean
  resetMocks: boolean
  restoreMocks: boolean
}

const testConfig: TestConfig = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  testTimeout: 5000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
}
```

## Component Testing

### Validator Unit Tests

```typescript
describe('ChapterLengthValidator', () => {
  let validator: ChapterLengthValidator
  let context: ValidationContext
  
  beforeEach(() => {
    validator = new ChapterLengthValidator()
    context = createMockContext({
      options: {
        minWords: 100,
        maxWords: 5000
      }
    })
  })
  
  describe('validateFile', () => {
    it('should detect chapters that are too short', async () => {
      const file = createParsedFile(`
        # Chapter 1
        This is a very short chapter with only a few words.
        
        # Chapter 2
        This chapter has more content...
      `)
      
      const issues = await validator.validateFile(file, context)
      
      expect(issues).toHaveLength(1)
      expect(issues[0]).toMatchObject({
        type: 'chapter-too-short',
        severity: 'warning',
        line: 1,
        message: expect.stringContaining('only')
      })
    })
    
    it('should detect chapters that are too long', async () => {
      const file = createParsedFile(`
        # Chapter 1
        ${generateWords(6000)}
      `)
      
      const issues = await validator.validateFile(file, context)
      
      expect(issues).toHaveLength(1)
      expect(issues[0]).toMatchObject({
        type: 'chapter-too-long',
        severity: 'warning'
      })
    })
    
    it('should handle files without chapters', async () => {
      const file = createParsedFile('Just some text without chapters')
      
      const issues = await validator.validateFile(file, context)
      
      expect(issues).toHaveLength(0)
    })
    
    it('should respect code counting option', async () => {
      const contextWithCode = createMockContext({
        options: {
          minWords: 100,
          maxWords: 5000,
          countCode: true
        }
      })
      
      const file = createParsedFile(`
        # Chapter 1
        Some text
        \`\`\`
        const code = "This should be counted";
        \`\`\`
      `)
      
      const issuesWithoutCode = await validator.validateFile(file, context)
      const issuesWithCode = await validator.validateFile(file, contextWithCode)
      
      expect(issuesWithoutCode.length).toBeGreaterThan(issuesWithCode.length)
    })
  })
})
```

### Schema Extractor Unit Tests

```typescript
describe('CharacterExtractor', () => {
  let extractor: CharacterExtractor
  
  beforeEach(() => {
    extractor = new CharacterExtractor()
  })
  
  describe('extract', () => {
    it('should extract character introductions', () => {
      const content = parseContent(`
        Alice entered the room with confidence.
        "Hello," she said to Bob.
      `)
      
      const characters = extractor.extract(content)
      
      expect(characters).toHaveLength(2)
      expect(characters.map(c => c.name)).toContain('Alice')
      expect(characters.map(c => c.name)).toContain('Bob')
    })
    
    it('should handle character aliases', () => {
      const content = parseContent(`
        The detective, John Smith, arrived.
        Later, Detective Smith questioned the suspect.
      `)
      
      const characters = extractor.extract(content)
      
      expect(characters).toHaveLength(1)
      expect(characters[0].name).toBe('John Smith')
      expect(characters[0].aliases).toContain('Detective Smith')
    })
    
    it('should extract character attributes', () => {
      const content = parseContent(`
        The tall, dark-haired detective entered.
      `)
      
      const characters = extractor.extract(content)
      
      expect(characters[0].attributes).toMatchObject({
        physical: expect.arrayContaining(['tall', 'dark-haired']),
        role: 'detective'
      })
    })
    
    it('should ignore false positives', () => {
      const content = parseContent(`
        The sun rose over the city.
        Time passed quickly.
      `)
      
      const characters = extractor.extract(content)
      
      expect(characters).toHaveLength(0)
    })
  })
})
```

### Parser Unit Tests

```typescript
describe('MarkdownParser', () => {
  let parser: MarkdownParser
  
  beforeEach(() => {
    parser = new MarkdownParser()
  })
  
  describe('parse', () => {
    it('should parse headings correctly', () => {
      const ast = parser.parse('# Heading 1\n## Heading 2')
      
      expect(ast.children).toHaveLength(2)
      expect(ast.children[0]).toMatchObject({
        type: 'heading',
        depth: 1,
        text: 'Heading 1'
      })
      expect(ast.children[1]).toMatchObject({
        type: 'heading',
        depth: 2,
        text: 'Heading 2'
      })
    })
    
    it('should parse code blocks with language', () => {
      const ast = parser.parse('```javascript\nconst x = 1;\n```')
      
      expect(ast.children[0]).toMatchObject({
        type: 'code',
        lang: 'javascript',
        value: 'const x = 1;'
      })
    })
    
    it('should handle edge cases', () => {
      const cases = [
        { input: '', expectedChildren: 0 },
        { input: '\\# Not a heading', expectedChildren: 1 },
        { input: '```\nunclosed', expectedChildren: 1 }
      ]
      
      cases.forEach(({ input, expectedChildren }) => {
        const ast = parser.parse(input)
        expect(ast.children).toHaveLength(expectedChildren)
      })
    })
    
    it('should preserve position information', () => {
      const ast = parser.parse('Line 1\n\nLine 3')
      
      expect(ast.children[0].position).toMatchObject({
        start: { line: 1, column: 1 },
        end: { line: 1, column: 6 }
      })
      
      expect(ast.children[1].position).toMatchObject({
        start: { line: 3, column: 1 },
        end: { line: 3, column: 6 }
      })
    })
  })
})
```

## Mocking Strategies

### Mock Factories

```typescript
class MockFactory {
  static createMockContext(overrides?: Partial<ValidationContext>): ValidationContext {
    return {
      options: {},
      config: createMockConfig(),
      schema: createMockSchema(),
      logger: createMockLogger(),
      cache: createMockCache(),
      state: new Map(),
      signal: new AbortController().signal,
      ...overrides
    }
  }
  
  static createMockFile(content: string, path = 'test.md'): ParsedFile {
    const parser = new MarkdownParser()
    return {
      path,
      content,
      ast: parser.parse(content),
      metadata: {},
      hash: crypto.createHash('md5').update(content).digest('hex')
    }
  }
  
  static createMockSchema(overrides?: Partial<NarrativeSchema>): NarrativeSchema {
    return {
      version: '1.0',
      characters: new Map(),
      locations: new Map(),
      timeline: [],
      relationships: [],
      ...overrides
    }
  }
}
```

### Service Mocks

```typescript
describe('ValidationEngine', () => {
  let engine: ValidationEngine
  let mockFileSystem: MockFileSystem
  let mockCache: MockCache
  
  beforeEach(() => {
    mockFileSystem = new MockFileSystem()
    mockCache = new MockCache()
    
    engine = new ValidationEngine({
      fileSystem: mockFileSystem,
      cache: mockCache
    })
  })
  
  it('should use cache when available', async () => {
    const cachedResult = { issues: [] }
    mockCache.get.mockResolvedValue(cachedResult)
    
    const result = await engine.validateFile('test.md')
    
    expect(mockCache.get).toHaveBeenCalledWith('validation:test.md')
    expect(result).toBe(cachedResult)
    expect(mockFileSystem.readFile).not.toHaveBeenCalled()
  })
  
  it('should handle file system errors gracefully', async () => {
    mockFileSystem.readFile.mockRejectedValue(new Error('File not found'))
    
    await expect(engine.validateFile('missing.md')).rejects.toThrow('File not found')
  })
})

class MockFileSystem implements FileSystem {
  readFile = jest.fn()
  writeFile = jest.fn()
  exists = jest.fn()
  
  // Helper methods for test setup
  setupFile(path: string, content: string): void {
    this.readFile.mockImplementation(async (p) => {
      if (p === path) return content
      throw new Error('File not found')
    })
    
    this.exists.mockImplementation(async (p) => p === path)
  }
}
```

## Testing Patterns

### Parameterized Tests

```typescript
describe('SeverityMapper', () => {
  const testCases = [
    { input: 'error', expected: Severity.ERROR },
    { input: 'warning', expected: Severity.WARNING },
    { input: 'info', expected: Severity.INFO },
    { input: 'unknown', expected: Severity.WARNING },
    { input: '', expected: Severity.WARNING }
  ]
  
  testCases.forEach(({ input, expected }) => {
    it(`should map "${input}" to ${expected}`, () => {
      const result = mapSeverity(input)
      expect(result).toBe(expected)
    })
  })
})
```

### Snapshot Testing

```typescript
describe('ReportFormatter', () => {
  let formatter: ReportFormatter
  
  beforeEach(() => {
    formatter = new ReportFormatter()
  })
  
  it('should format validation results consistently', () => {
    const results = createValidationResults({
      issues: [
        {
          type: 'test-error',
          severity: 'error',
          message: 'Test error message',
          file: 'test.md',
          line: 10,
          column: 5
        }
      ]
    })
    
    const formatted = formatter.format(results)
    
    expect(formatted).toMatchSnapshot()
  })
  
  it('should handle complex schemas', () => {
    const schema = createComplexSchema()
    const formatted = formatter.formatSchema(schema)
    
    expect(formatted).toMatchSnapshot('complex-schema')
  })
})
```

### Property-Based Testing

```typescript
import * as fc from 'fast-check'

describe('StringSanitizer', () => {
  it('should never increase string length', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const sanitized = sanitize(input)
        return sanitized.length <= input.length
      })
    )
  })
  
  it('should be idempotent', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const once = sanitize(input)
        const twice = sanitize(once)
        return once === twice
      })
    )
  })
  
  it('should remove all control characters', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const sanitized = sanitize(input)
        return !/[\x00-\x1F\x7F]/.test(sanitized)
      })
    )
  })
})
```

## Test Isolation

### State Management

```typescript
describe('StatefulValidator', () => {
  let validator: StatefulValidator
  let initialState: ValidatorState
  
  beforeEach(() => {
    // Save initial state
    initialState = {
      cache: new Map(),
      metrics: { validated: 0, errors: 0 }
    }
    
    validator = new StatefulValidator(initialState)
  })
  
  afterEach(() => {
    // Verify state isolation
    expect(validator.getState()).not.toBe(initialState)
    expect(initialState.metrics.validated).toBe(0)
  })
  
  it('should not affect other tests', () => {
    validator.validate('test')
    expect(validator.getState().metrics.validated).toBe(1)
  })
})
```

### Resource Cleanup

```typescript
describe('ResourceIntensiveComponent', () => {
  let component: ResourceIntensiveComponent
  const cleanupFns: (() => Promise<void>)[] = []
  
  beforeEach(() => {
    component = new ResourceIntensiveComponent()
  })
  
  afterEach(async () => {
    // Clean up all resources
    await Promise.all(cleanupFns.map(fn => fn()))
    cleanupFns.length = 0
  })
  
  it('should clean up file handles', async () => {
    const handle = await component.openFile('test.txt')
    cleanupFns.push(() => handle.close())
    
    expect(handle.isOpen()).toBe(true)
  })
  
  it('should clean up timers', () => {
    const timerId = component.startTimer()
    cleanupFns.push(() => Promise.resolve(clearInterval(timerId)))
    
    expect(component.isTimerActive()).toBe(true)
  })
})
```

## Error Testing

### Exception Testing

```typescript
describe('Parser Error Handling', () => {
  let parser: Parser
  
  beforeEach(() => {
    parser = new Parser()
  })
  
  it('should throw on invalid syntax', () => {
    expect(() => parser.parse('{{invalid')).toThrow(ParseError)
    expect(() => parser.parse('{{invalid')).toThrow('Unclosed template')
  })
  
  it('should provide helpful error messages', () => {
    try {
      parser.parse('Line 1\n{{invalid\nLine 3')
    } catch (error) {
      expect(error).toBeInstanceOf(ParseError)
      expect(error.line).toBe(2)
      expect(error.column).toBe(1)
      expect(error.message).toContain('line 2')
    }
  })
  
  it('should handle async errors', async () => {
    const asyncParser = new AsyncParser()
    
    await expect(asyncParser.parse('invalid')).rejects.toThrow(ParseError)
    
    // Alternative syntax
    const parsePromise = asyncParser.parse('invalid')
    await expect(parsePromise).rejects.toMatchObject({
      name: 'ParseError',
      code: 'INVALID_SYNTAX'
    })
  })
})
```

### Error Recovery Testing

```typescript
describe('Error Recovery', () => {
  it('should recover from partial failures', async () => {
    const processor = new BatchProcessor()
    const items = [
      { id: 1, valid: true },
      { id: 2, valid: false }, // Will throw
      { id: 3, valid: true }
    ]
    
    const results = await processor.processWithRecovery(items)
    
    expect(results).toMatchObject({
      successful: [
        { id: 1, result: 'processed' },
        { id: 3, result: 'processed' }
      ],
      failed: [
        { id: 2, error: expect.any(Error) }
      ]
    })
  })
})
```

## Performance Testing

### Execution Time Tests

```typescript
describe('Performance', () => {
  it('should process large files efficiently', async () => {
    const largeFile = generateLargeFile(1000000) // 1MB
    const parser = new Parser()
    
    const start = performance.now()
    await parser.parse(largeFile)
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(1000) // Should complete within 1 second
  })
  
  it('should handle many small operations efficiently', () => {
    const validator = new Validator()
    const iterations = 10000
    
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      validator.validateString(`test-${i}`)
    }
    const duration = performance.now() - start
    
    const averageTime = duration / iterations
    expect(averageTime).toBeLessThan(0.1) // Less than 0.1ms per operation
  })
})
```

### Memory Usage Tests

```typescript
describe('Memory Usage', () => {
  it('should not leak memory', async () => {
    const initialMemory = process.memoryUsage().heapUsed
    const processor = new DataProcessor()
    
    // Process many items
    for (let i = 0; i < 1000; i++) {
      await processor.process(generateData(1000))
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
    
    const finalMemory = process.memoryUsage().heapUsed
    const memoryIncrease = finalMemory - initialMemory
    
    // Allow for some memory increase but not linear with iterations
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024) // 10MB
  })
})
```

## Test Utilities

### Custom Matchers

```typescript
// Custom Jest matchers
expect.extend({
  toBeValidIssue(received: any) {
    const pass = 
      received &&
      typeof received.type === 'string' &&
      ['error', 'warning', 'info'].includes(received.severity) &&
      typeof received.message === 'string' &&
      typeof received.line === 'number'
    
    return {
      pass,
      message: () => 
        pass
          ? `expected ${received} not to be a valid issue`
          : `expected ${received} to be a valid issue`
    }
  },
  
  toContainIssueType(received: ValidationIssue[], type: string) {
    const pass = received.some(issue => issue.type === type)
    
    return {
      pass,
      message: () =>
        pass
          ? `expected issues not to contain type "${type}"`
          : `expected issues to contain type "${type}"`
    }
  }
})

// Usage
expect(issue).toBeValidIssue()
expect(issues).toContainIssueType('syntax-error')
```

### Test Helpers

```typescript
class TestHelpers {
  static async withTempFile(
    content: string,
    fn: (path: string) => Promise<void>
  ): Promise<void> {
    const tempPath = path.join(os.tmpdir(), `test-${Date.now()}.md`)
    
    try {
      await fs.writeFile(tempPath, content)
      await fn(tempPath)
    } finally {
      await fs.unlink(tempPath).catch(() => {})
    }
  }
  
  static async measureTime<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now()
    const result = await fn()
    const duration = performance.now() - start
    
    return { result, duration }
  }
  
  static createFixture<T>(
    name: string,
    factory: () => T
  ): () => T {
    let instance: T | undefined
    
    return () => {
      if (!instance) {
        instance = factory()
      }
      return instance
    }
  }
}
```

## Best Practices

### Test Structure

```typescript
// Good: Clear test structure with AAA pattern
describe('Calculator', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      // Arrange
      const calculator = new Calculator()
      const a = 5
      const b = 3
      
      // Act
      const result = calculator.add(a, b)
      
      // Assert
      expect(result).toBe(8)
    })
  })
})

// Good: Descriptive test names
it('should return empty array when no validation issues are found', () => {
  // Test implementation
})

// Bad: Vague test names
it('should work', () => {
  // Test implementation
})
```

### Test Independence

```typescript
// Good: Independent tests
describe('UserService', () => {
  let service: UserService
  
  beforeEach(() => {
    // Fresh instance for each test
    service = new UserService(new MockDatabase())
  })
  
  it('should create user', async () => {
    const user = await service.create({ name: 'Alice' })
    expect(user.id).toBeDefined()
  })
  
  it('should find user', async () => {
    // This test doesn't depend on the previous one
    const mockDb = new MockDatabase()
    mockDb.users = [{ id: '1', name: 'Bob' }]
    service = new UserService(mockDb)
    
    const user = await service.find('1')
    expect(user.name).toBe('Bob')
  })
})
```

## Future Enhancements

1. **AI-Assisted Testing**
   - Test generation from specifications
   - Intelligent test case selection
   - Automated assertion generation

2. **Visual Testing**
   - Component screenshot testing
   - Visual regression detection
   - Cross-browser testing

3. **Mutation Testing**
   - Code mutation analysis
   - Test effectiveness measurement
   - Coverage gap detection

4. **Performance Profiling**
   - Automated performance regression detection
   - Memory leak detection
   - CPU profiling integration
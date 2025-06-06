# Integration Testing

## Overview

Integration testing validates the interactions between different components of the Story Linter, ensuring they work together correctly. This document outlines strategies for testing component integration, API contracts, and system workflows.

## Integration Test Architecture

### Test Environment Setup

```typescript
interface IntegrationTestEnvironment {
  // Services
  services: {
    database: TestDatabase
    fileSystem: TestFileSystem
    cache: TestCache
    eventBus: TestEventBus
  }
  
  // Configuration
  config: TestConfiguration
  
  // Utilities
  fixtures: FixtureManager
  cleanup: CleanupManager
  
  // Lifecycle
  setup(): Promise<void>
  teardown(): Promise<void>
}

class TestEnvironmentBuilder {
  private environment: Partial<IntegrationTestEnvironment> = {}
  
  withDatabase(config?: DatabaseConfig): this {
    this.environment.database = new TestDatabase(config)
    return this
  }
  
  withFileSystem(rootPath?: string): this {
    this.environment.fileSystem = new TestFileSystem(rootPath)
    return this
  }
  
  withRealServices(): this {
    this.environment.services = {
      database: new RealDatabase({ inMemory: true }),
      fileSystem: new RealFileSystem({ sandbox: true }),
      cache: new RealCache({ ttl: 0 }),
      eventBus: new RealEventBus()
    }
    return this
  }
  
  async build(): Promise<IntegrationTestEnvironment> {
    const env = this.environment as IntegrationTestEnvironment
    await env.setup()
    return env
  }
}
```

### Test Containers

```typescript
class IntegrationTestContainer {
  private container: DIContainer
  private services: Map<string, any> = new Map()
  
  async initialize(): Promise<void> {
    this.container = new DIContainer()
    
    // Register core services
    this.container.register('config', ConfigurationManager)
    this.container.register('fileSystem', FileSystemService)
    this.container.register('cache', CacheService)
    this.container.register('eventBus', EventBus)
    
    // Register domain services
    this.container.register('validationEngine', ValidationEngine)
    this.container.register('schemaExtractor', SchemaExtractor)
    this.container.register('reportGenerator', ReportGenerator)
    
    // Initialize services
    await this.container.initialize()
  }
  
  get<T>(service: string): T {
    return this.container.get<T>(service)
  }
  
  replace<T>(service: string, implementation: T): void {
    this.container.replace(service, implementation)
  }
}
```

## Component Integration Tests

### Validation Pipeline Integration

```typescript
describe('Validation Pipeline Integration', () => {
  let env: IntegrationTestEnvironment
  let pipeline: ValidationPipeline
  
  beforeAll(async () => {
    env = await new TestEnvironmentBuilder()
      .withRealServices()
      .build()
    
    pipeline = new ValidationPipeline({
      fileSystem: env.services.fileSystem,
      cache: env.services.cache,
      eventBus: env.services.eventBus
    })
  })
  
  afterAll(async () => {
    await env.teardown()
  })
  
  it('should validate a complete story project', async () => {
    // Setup test project
    await env.fixtures.createProject('test-story', {
      files: [
        {
          path: 'chapter1.md',
          content: `# Chapter 1\nAlice met Bob in the garden.`
        },
        {
          path: 'chapter2.md',
          content: `# Chapter 2\nBob gave Alice a mysterious key.`
        }
      ],
      config: {
        validators: ['character-consistency', 'timeline-validator']
      }
    })
    
    // Run validation
    const results = await pipeline.validate('test-story')
    
    // Verify results
    expect(results.status).toBe('success')
    expect(results.files.length).toBe(2)
    expect(results.totalIssues).toBe(0)
    
    // Verify schema extraction
    expect(results.schema.characters.size).toBe(2)
    expect(results.schema.characters.has('Alice')).toBe(true)
    expect(results.schema.characters.has('Bob')).toBe(true)
    
    // Verify caching
    const cachedResults = await pipeline.validate('test-story')
    expect(cachedResults.fromCache).toBe(true)
  })
  
  it('should handle validation errors gracefully', async () => {
    await env.fixtures.createProject('error-story', {
      files: [
        {
          path: 'invalid.md',
          content: `# Chapter 1\n{{unclosed template`
        }
      ]
    })
    
    const results = await pipeline.validate('error-story')
    
    expect(results.status).toBe('completed-with-errors')
    expect(results.parseErrors.length).toBeGreaterThan(0)
    expect(results.parseErrors[0]).toMatchObject({
      file: 'invalid.md',
      error: expect.stringContaining('unclosed')
    })
  })
})
```

### Schema Extraction Integration

```typescript
describe('Schema Extraction Integration', () => {
  let extractor: SchemaExtractor
  let parser: MarkdownParser
  let env: IntegrationTestEnvironment
  
  beforeAll(async () => {
    env = await new TestEnvironmentBuilder()
      .withFileSystem()
      .build()
    
    parser = new MarkdownParser()
    extractor = new SchemaExtractor({
      parser,
      patterns: await loadDefaultPatterns()
    })
  })
  
  it('should extract complete schema from multi-file story', async () => {
    const files = await env.fixtures.createStoryFiles([
      {
        name: 'characters.md',
        content: `
          # Characters
          
          ## Alice
          A curious young woman with a love for adventure.
          
          ## Bob
          Alice's mysterious companion, always carrying an old key.
        `
      },
      {
        name: 'chapter1.md',
        content: `
          # The Garden Meeting
          
          Alice wandered through the garden when she met Bob.
          "I've been waiting for you," Bob said, revealing the key.
        `
      }
    ])
    
    const schema = await extractor.extractFromFiles(files)
    
    // Verify character extraction
    expect(schema.characters.size).toBe(2)
    
    const alice = schema.characters.get('Alice')
    expect(alice).toMatchObject({
      name: 'Alice',
      description: expect.stringContaining('curious'),
      firstMention: {
        file: 'characters.md',
        line: expect.any(Number)
      }
    })
    
    // Verify relationship extraction
    expect(schema.relationships.length).toBeGreaterThan(0)
    expect(schema.relationships[0]).toMatchObject({
      source: 'Alice',
      target: 'Bob',
      type: 'companion',
      evidence: expect.arrayContaining([
        expect.objectContaining({
          file: 'chapter1.md'
        })
      ])
    })
  })
})
```

### Plugin System Integration

```typescript
describe('Plugin System Integration', () => {
  let pluginManager: PluginManager
  let validationEngine: ValidationEngine
  let env: IntegrationTestEnvironment
  
  beforeAll(async () => {
    env = await new TestEnvironmentBuilder()
      .withRealServices()
      .build()
    
    pluginManager = new PluginManager({
      pluginPath: env.fixtures.path('plugins'),
      sandbox: true
    })
    
    validationEngine = new ValidationEngine({
      pluginManager
    })
  })
  
  it('should load and execute custom validator plugin', async () => {
    // Create test plugin
    await env.fixtures.createPlugin('custom-validator', {
      manifest: {
        id: 'custom-validator',
        name: 'Custom Validator',
        version: '1.0.0',
        main: './index.js'
      },
      code: `
        module.exports = {
          validators: [{
            id: 'custom-rule',
            name: 'Custom Rule',
            validate: async (file) => {
              if (file.content.includes('forbidden')) {
                return [{
                  type: 'custom-error',
                  severity: 'error',
                  message: 'Forbidden word detected',
                  line: 1
                }]
              }
              return []
            }
          }]
        }
      `
    })
    
    // Load plugin
    await pluginManager.loadPlugin('custom-validator')
    
    // Validate with plugin
    const results = await validationEngine.validate([
      {
        path: 'test.md',
        content: 'This contains a forbidden word'
      }
    ])
    
    expect(results.issues).toContainEqual(
      expect.objectContaining({
        type: 'custom-error',
        message: 'Forbidden word detected'
      })
    )
  })
  
  it('should handle plugin errors safely', async () => {
    await env.fixtures.createPlugin('faulty-plugin', {
      manifest: {
        id: 'faulty-plugin',
        name: 'Faulty Plugin',
        version: '1.0.0',
        main: './index.js'
      },
      code: `
        module.exports = {
          validators: [{
            id: 'faulty',
            validate: async () => {
              throw new Error('Plugin crashed!')
            }
          }]
        }
      `
    })
    
    await pluginManager.loadPlugin('faulty-plugin')
    
    // Should not crash the system
    const results = await validationEngine.validate([
      { path: 'test.md', content: 'Test' }
    ])
    
    expect(results.pluginErrors).toContainEqual(
      expect.objectContaining({
        plugin: 'faulty-plugin',
        error: expect.stringContaining('Plugin crashed!')
      })
    )
  })
})
```

## API Integration Tests

### REST API Integration

```typescript
describe('REST API Integration', () => {
  let app: Application
  let server: Server
  let env: IntegrationTestEnvironment
  
  beforeAll(async () => {
    env = await new TestEnvironmentBuilder()
      .withRealServices()
      .build()
    
    app = createApp(env.services)
    server = app.listen(0) // Random port
  })
  
  afterAll(async () => {
    server.close()
    await env.teardown()
  })
  
  describe('POST /api/validate', () => {
    it('should validate story content', async () => {
      const response = await request(app)
        .post('/api/validate')
        .send({
          files: [
            {
              path: 'story.md',
              content: '# My Story\nOnce upon a time...'
            }
          ],
          options: {
            validators: ['basic-structure']
          }
        })
        .expect(200)
      
      expect(response.body).toMatchObject({
        status: 'success',
        results: {
          totalIssues: 0,
          files: expect.arrayContaining([
            expect.objectContaining({
              path: 'story.md',
              issues: []
            })
          ])
        }
      })
    })
    
    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/validate')
        .send({
          files: [
            {
              path: 'invalid.md',
              content: '{{invalid}}'
            }
          ]
        })
        .expect(200)
      
      expect(response.body.status).toBe('completed-with-errors')
      expect(response.body.results.totalIssues).toBeGreaterThan(0)
    })
    
    it('should respect rate limits', async () => {
      // Make multiple requests
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/validate')
          .send({ files: [] })
      )
      
      const responses = await Promise.all(requests)
      const rateLimited = responses.filter(r => r.status === 429)
      
      expect(rateLimited.length).toBeGreaterThan(0)
    })
  })
})
```

### GraphQL API Integration

```typescript
describe('GraphQL API Integration', () => {
  let schema: GraphQLSchema
  let env: IntegrationTestEnvironment
  
  beforeAll(async () => {
    env = await new TestEnvironmentBuilder()
      .withRealServices()
      .build()
    
    schema = await buildSchema({
      resolvers: createResolvers(env.services),
      typeDefs: await loadTypeDefs()
    })
  })
  
  it('should execute validation query', async () => {
    const query = `
      mutation ValidateStory($input: ValidationInput!) {
        validate(input: $input) {
          status
          results {
            totalIssues
            issues {
              type
              severity
              message
              location {
                file
                line
                column
              }
            }
          }
        }
      }
    `
    
    const variables = {
      input: {
        files: [
          {
            path: 'story.md',
            content: '# Story\nContent here'
          }
        ]
      }
    }
    
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables
    })
    
    expect(result.errors).toBeUndefined()
    expect(result.data.validate).toMatchObject({
      status: 'SUCCESS',
      results: {
        totalIssues: 0,
        issues: []
      }
    })
  })
  
  it('should handle subscription for real-time validation', async () => {
    const subscription = `
      subscription OnValidationProgress {
        validationProgress {
          file
          progress
          issues
        }
      }
    `
    
    const iterator = await subscribe({
      schema,
      document: parse(subscription)
    })
    
    // Trigger validation
    env.services.validationEngine.validateAsync(['test.md'])
    
    // Collect events
    const events = []
    for await (const event of iterator) {
      events.push(event)
      if (event.data.validationProgress.progress === 1) break
    }
    
    expect(events.length).toBeGreaterThan(0)
    expect(events[events.length - 1].data.validationProgress).toMatchObject({
      file: 'test.md',
      progress: 1
    })
  })
})
```

## Workflow Integration Tests

### Complete Validation Workflow

```typescript
describe('Complete Validation Workflow', () => {
  let workflow: ValidationWorkflow
  let env: IntegrationTestEnvironment
  
  beforeAll(async () => {
    env = await new TestEnvironmentBuilder()
      .withRealServices()
      .build()
    
    workflow = new ValidationWorkflow(env.services)
  })
  
  it('should execute full validation workflow', async () => {
    // Create test project
    const projectPath = await env.fixtures.createProject('full-story', {
      structure: {
        'story/': {
          'chapter1.md': '# The Beginning\nAlice started her journey.',
          'chapter2.md': '# The Middle\nAlice met Bob.',
          'chapter3.md': '# The End\nThey lived happily.'
        },
        '.story-linter.json': JSON.stringify({
          include: ['story/**/*.md'],
          validators: {
            'character-consistency': { enabled: true },
            'plot-structure': { enabled: true }
          }
        })
      }
    })
    
    // Execute workflow
    const result = await workflow.execute({
      projectPath,
      outputFormat: 'json',
      fix: true
    })
    
    // Verify all stages completed
    expect(result.stages).toMatchObject({
      discovery: { status: 'completed', filesFound: 3 },
      parsing: { status: 'completed', filesParsed: 3 },
      schemaExtraction: { status: 'completed', entitiesFound: expect.any(Number) },
      validation: { status: 'completed', issuesFound: expect.any(Number) },
      fixing: { status: 'completed', issuesFixed: expect.any(Number) },
      reporting: { status: 'completed', reportGenerated: true }
    })
    
    // Verify output file created
    const reportPath = path.join(projectPath, 'story-linter-report.json')
    expect(await env.services.fileSystem.exists(reportPath)).toBe(true)
  })
})
```

### Watch Mode Integration

```typescript
describe('Watch Mode Integration', () => {
  let watcher: ValidationWatcher
  let env: IntegrationTestEnvironment
  
  beforeAll(async () => {
    env = await new TestEnvironmentBuilder()
      .withFileSystem()
      .withEventBus()
      .build()
    
    watcher = new ValidationWatcher({
      fileSystem: env.services.fileSystem,
      eventBus: env.services.eventBus
    })
  })
  
  afterEach(async () => {
    await watcher.stop()
  })
  
  it('should validate on file changes', async () => {
    const projectPath = await env.fixtures.createProject('watched-story')
    const events: any[] = []
    
    // Subscribe to validation events
    env.services.eventBus.on('validation:complete', (event) => {
      events.push(event)
    })
    
    // Start watching
    await watcher.watch(projectPath, {
      debounce: 100
    })
    
    // Modify a file
    await env.services.fileSystem.writeFile(
      path.join(projectPath, 'chapter1.md'),
      '# Updated Chapter\nNew content here'
    )
    
    // Wait for validation
    await waitFor(() => events.length > 0, 1000)
    
    expect(events[0]).toMatchObject({
      type: 'validation:complete',
      files: expect.arrayContaining(['chapter1.md']),
      results: expect.any(Object)
    })
  })
  
  it('should batch multiple changes', async () => {
    const projectPath = await env.fixtures.createProject('batch-story')
    let validationCount = 0
    
    env.services.eventBus.on('validation:start', () => {
      validationCount++
    })
    
    await watcher.watch(projectPath, {
      debounce: 200
    })
    
    // Make multiple rapid changes
    await Promise.all([
      env.services.fileSystem.writeFile(
        path.join(projectPath, 'file1.md'),
        'Content 1'
      ),
      env.services.fileSystem.writeFile(
        path.join(projectPath, 'file2.md'),
        'Content 2'
      ),
      env.services.fileSystem.writeFile(
        path.join(projectPath, 'file3.md'),
        'Content 3'
      )
    ])
    
    // Wait for debounce
    await wait(300)
    
    // Should batch into single validation
    expect(validationCount).toBe(1)
  })
})
```

## Database Integration Tests

### Schema Storage Integration

```typescript
describe('Schema Storage Integration', () => {
  let storage: SchemaStorage
  let db: TestDatabase
  
  beforeAll(async () => {
    db = await TestDatabase.create({
      type: 'postgres',
      schema: 'test_schema'
    })
    
    storage = new SchemaStorage(db)
    await storage.initialize()
  })
  
  afterAll(async () => {
    await db.destroy()
  })
  
  it('should persist and retrieve schemas', async () => {
    const schema = createTestSchema({
      characters: ['Alice', 'Bob'],
      locations: ['Garden', 'Castle']
    })
    
    // Save schema
    const id = await storage.save(schema, {
      project: 'test-story',
      version: '1.0.0'
    })
    
    expect(id).toBeDefined()
    
    // Retrieve schema
    const retrieved = await storage.get(id)
    
    expect(retrieved).toMatchObject({
      id,
      schema,
      metadata: {
        project: 'test-story',
        version: '1.0.0'
      }
    })
  })
  
  it('should handle concurrent operations', async () => {
    const schemas = Array(10).fill(null).map((_, i) =>
      createTestSchema({ id: `schema-${i}` })
    )
    
    // Save concurrently
    const ids = await Promise.all(
      schemas.map(schema => storage.save(schema))
    )
    
    expect(new Set(ids).size).toBe(10) // All unique IDs
    
    // Query all
    const results = await storage.query({
      limit: 20
    })
    
    expect(results.length).toBeGreaterThanOrEqual(10)
  })
  
  it('should support transactions', async () => {
    await db.transaction(async (tx) => {
      const schema1 = createTestSchema({ id: 'tx-1' })
      const schema2 = createTestSchema({ id: 'tx-2' })
      
      await storage.save(schema1, {}, tx)
      await storage.save(schema2, {}, tx)
      
      // Rollback
      throw new Error('Rollback test')
    }).catch(() => {})
    
    // Verify rollback
    const results = await storage.query({
      filter: { id: { $in: ['tx-1', 'tx-2'] } }
    })
    
    expect(results.length).toBe(0)
  })
})
```

## Performance Integration Tests

### Load Testing

```typescript
describe('Load Testing', () => {
  let system: StoryLinterSystem
  let env: IntegrationTestEnvironment
  
  beforeAll(async () => {
    env = await new TestEnvironmentBuilder()
      .withRealServices()
      .build()
    
    system = new StoryLinterSystem(env.services)
  })
  
  it('should handle large projects efficiently', async () => {
    // Create large project
    const files = Array(100).fill(null).map((_, i) => ({
      path: `chapter${i}.md`,
      content: generateChapterContent(1000) // 1000 words each
    }))
    
    const projectPath = await env.fixtures.createProject('large-story', { files })
    
    const start = performance.now()
    const results = await system.validate(projectPath)
    const duration = performance.now() - start
    
    expect(results.status).toBe('success')
    expect(results.filesProcessed).toBe(100)
    expect(duration).toBeLessThan(30000) // 30 seconds max
    
    // Check memory usage
    const memoryUsage = process.memoryUsage()
    expect(memoryUsage.heapUsed).toBeLessThan(500 * 1024 * 1024) // 500MB max
  })
  
  it('should process requests concurrently', async () => {
    const projects = Array(10).fill(null).map((_, i) =>
      env.fixtures.createProject(`concurrent-${i}`, {
        files: [{ path: 'story.md', content: `Story ${i}` }]
      })
    )
    
    const projectPaths = await Promise.all(projects)
    
    const start = performance.now()
    const results = await Promise.all(
      projectPaths.map(path => system.validate(path))
    )
    const duration = performance.now() - start
    
    expect(results.every(r => r.status === 'success')).toBe(true)
    
    // Should be faster than sequential processing
    const expectedSequentialTime = 10 * 1000 // 1s per project
    expect(duration).toBeLessThan(expectedSequentialTime * 0.5)
  })
})
```

## Test Utilities

### Integration Test Helpers

```typescript
class IntegrationTestHelpers {
  static async waitForEvent(
    eventBus: EventBus,
    eventName: string,
    timeout = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventName}`))
      }, timeout)
      
      eventBus.once(eventName, (data) => {
        clearTimeout(timer)
        resolve(data)
      })
    })
  }
  
  static async retryUntilSuccess<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number
      delay?: number
      backoff?: number
    } = {}
  ): Promise<T> {
    const { maxRetries = 10, delay = 100, backoff = 1.5 } = options
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        if (i === maxRetries - 1) throw error
        
        await wait(delay * Math.pow(backoff, i))
      }
    }
    
    throw new Error('Max retries exceeded')
  }
  
  static createMockService<T>(
    service: T,
    overrides: Partial<T>
  ): T & { resetMocks: () => void } {
    const mocked = { ...service }
    const originalMethods: any = {}
    
    for (const [key, value] of Object.entries(overrides)) {
      originalMethods[key] = (service as any)[key]
      ;(mocked as any)[key] = value
    }
    
    return {
      ...mocked,
      resetMocks: () => {
        for (const key of Object.keys(overrides)) {
          ;(mocked as any)[key] = originalMethods[key]
        }
      }
    }
  }
}
```

### Test Data Builders

```typescript
class TestDataBuilder {
  static story(): StoryBuilder {
    return new StoryBuilder()
  }
  
  static schema(): SchemaBuilder {
    return new SchemaBuilder()
  }
  
  static validationResult(): ValidationResultBuilder {
    return new ValidationResultBuilder()
  }
}

class StoryBuilder {
  private chapters: Chapter[] = []
  private metadata: any = {}
  
  withChapter(title: string, content: string): this {
    this.chapters.push({ title, content })
    return this
  }
  
  withCharacters(...names: string[]): this {
    this.metadata.characters = names
    return this
  }
  
  build(): StoryProject {
    return {
      files: this.chapters.map((ch, i) => ({
        path: `chapter${i + 1}.md`,
        content: `# ${ch.title}\n\n${ch.content}`
      })),
      metadata: this.metadata
    }
  }
}
```

## Best Practices

### Test Organization

```typescript
// Good: Organized by feature
describe('Character Tracking Feature', () => {
  describe('Character Extraction', () => {
    // Tests for extraction
  })
  
  describe('Character Validation', () => {
    // Tests for validation
  })
  
  describe('Character Reporting', () => {
    // Tests for reporting
  })
})

// Good: Clear integration boundaries
describe('ValidationEngine <-> SchemaExtractor Integration', () => {
  // Tests specifically for this integration
})
```

### Test Data Management

```typescript
// Good: Isolated test data
describe('Integration Test', () => {
  let testDir: string
  
  beforeEach(async () => {
    testDir = await createTempDir('integration-test')
  })
  
  afterEach(async () => {
    await removeTempDir(testDir)
  })
  
  it('should work with real files', async () => {
    // Use testDir for all file operations
  })
})
```

## Future Enhancements

1. **Contract Testing**
   - Consumer-driven contracts
   - API versioning tests
   - Schema evolution testing

2. **Chaos Engineering**
   - Fault injection
   - Network simulation
   - Resource constraints

3. **Performance Regression**
   - Automated benchmarking
   - Trend analysis
   - Alert thresholds

4. **Test Orchestration**
   - Distributed testing
   - Parallel execution
   - Test result aggregation
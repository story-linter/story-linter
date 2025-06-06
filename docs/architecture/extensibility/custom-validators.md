# Custom Validators

## Overview

Custom validators enable users to extend the Story Linter's validation capabilities with domain-specific rules, project-specific conventions, and unique narrative requirements. This document outlines how to create, register, and manage custom validators.

## Validator Architecture

### Base Validator Interface

```typescript
interface CustomValidator<TOptions = any> {
  // Metadata
  id: string
  name: string
  description: string
  category: ValidatorCategory
  version: string
  
  // Configuration
  defaultOptions?: TOptions
  optionsSchema?: JSONSchema
  
  // Lifecycle methods
  initialize?(context: ValidatorContext): Promise<void>
  finalize?(context: ValidatorContext): Promise<void>
  
  // Validation methods
  validateFile(
    file: ParsedFile,
    context: ValidatorContext<TOptions>
  ): Promise<ValidationIssue[]>
  
  validateProject?(
    files: ParsedFile[],
    context: ValidatorContext<TOptions>
  ): Promise<ValidationIssue[]>
  
  // Optional capabilities
  capabilities?: ValidatorCapabilities
}

interface ValidatorCapabilities {
  parallel: boolean
  streaming: boolean
  incremental: boolean
  crossFile: boolean
  schemaAware: boolean
}
```

### Validator Context

```typescript
interface ValidatorContext<TOptions = any> {
  // Configuration
  options: TOptions
  config: Configuration
  
  // Schema access
  schema: NarrativeSchema
  getSchema(file: string): FileSchema
  
  // File system
  readFile(path: string): Promise<string>
  fileExists(path: string): Promise<boolean>
  
  // Utilities
  logger: Logger
  cache: ValidatorCache
  metrics: MetricsCollector
  
  // State management
  state: ValidatorState
  
  // Cancellation
  signal: AbortSignal
}
```

## Creating Custom Validators

### Simple Custom Validator

```typescript
class ChapterLengthValidator implements CustomValidator {
  id = 'chapter-length'
  name = 'Chapter Length Validator'
  description = 'Ensures chapters are within specified length limits'
  category = ValidatorCategory.STRUCTURE
  version = '1.0.0'
  
  defaultOptions = {
    minWords: 1000,
    maxWords: 5000,
    countCode: false
  }
  
  optionsSchema = {
    type: 'object',
    properties: {
      minWords: {
        type: 'number',
        minimum: 0,
        description: 'Minimum words per chapter'
      },
      maxWords: {
        type: 'number',
        minimum: 0,
        description: 'Maximum words per chapter'
      },
      countCode: {
        type: 'boolean',
        description: 'Include code blocks in word count'
      }
    }
  }
  
  async validateFile(
    file: ParsedFile,
    context: ValidatorContext
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = []
    const options = context.options
    
    // Find chapters
    const chapters = this.findChapters(file)
    
    for (const chapter of chapters) {
      const wordCount = this.countWords(chapter, options.countCode)
      
      if (wordCount < options.minWords) {
        issues.push({
          type: 'chapter-too-short',
          severity: 'warning',
          message: `Chapter "${chapter.title}" has only ${wordCount} words (minimum: ${options.minWords})`,
          file: file.path,
          line: chapter.line,
          column: 1,
          suggestion: 'Consider expanding this chapter with more detail'
        })
      }
      
      if (wordCount > options.maxWords) {
        issues.push({
          type: 'chapter-too-long',
          severity: 'warning',
          message: `Chapter "${chapter.title}" has ${wordCount} words (maximum: ${options.maxWords})`,
          file: file.path,
          line: chapter.line,
          column: 1,
          suggestion: 'Consider splitting this chapter into smaller sections'
        })
      }
    }
    
    return issues
  }
  
  private findChapters(file: ParsedFile): Chapter[] {
    const chapters: Chapter[] = []
    let currentChapter: Chapter | null = null
    
    for (const node of file.ast.children) {
      if (node.type === 'heading' && node.depth === 1) {
        if (currentChapter) {
          chapters.push(currentChapter)
        }
        
        currentChapter = {
          title: node.text,
          line: node.position.start.line,
          content: []
        }
      } else if (currentChapter) {
        currentChapter.content.push(node)
      }
    }
    
    if (currentChapter) {
      chapters.push(currentChapter)
    }
    
    return chapters
  }
  
  private countWords(chapter: Chapter, includeCode: boolean): number {
    let count = 0
    
    for (const node of chapter.content) {
      if (node.type === 'text' || node.type === 'paragraph') {
        count += node.text.split(/\s+/).filter(w => w.length > 0).length
      } else if (includeCode && node.type === 'code') {
        count += node.value.split(/\s+/).filter(w => w.length > 0).length
      }
    }
    
    return count
  }
}
```

### Advanced Custom Validator

```typescript
class NarrativeConsistencyValidator implements CustomValidator {
  id = 'narrative-consistency'
  name = 'Narrative Consistency Validator'
  description = 'Checks for narrative inconsistencies across files'
  category = ValidatorCategory.SEMANTIC
  version = '2.0.0'
  
  capabilities = {
    parallel: false, // Needs sequential processing
    streaming: true,
    incremental: true,
    crossFile: true,
    schemaAware: true
  }
  
  private timeline: Timeline
  private characterStates: Map<string, CharacterState[]>
  
  async initialize(context: ValidatorContext): Promise<void> {
    // Load previous state if incremental
    if (context.state.has('timeline')) {
      this.timeline = context.state.get('timeline')
      this.characterStates = context.state.get('characterStates')
    } else {
      this.timeline = new Timeline()
      this.characterStates = new Map()
    }
  }
  
  async validateFile(
    file: ParsedFile,
    context: ValidatorContext
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = []
    
    // Extract events from file
    const events = await this.extractEvents(file, context.schema)
    
    // Check each event
    for (const event of events) {
      // Check timeline consistency
      const timelineIssues = this.checkTimelineConsistency(event, file)
      issues.push(...timelineIssues)
      
      // Check character state consistency
      const characterIssues = this.checkCharacterConsistency(event, file)
      issues.push(...characterIssues)
      
      // Update state
      this.updateState(event)
    }
    
    return issues
  }
  
  async validateProject(
    files: ParsedFile[],
    context: ValidatorContext
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = []
    
    // Global consistency checks
    const globalIssues = this.checkGlobalConsistency()
    issues.push(...globalIssues)
    
    // Character arc validation
    for (const [character, states] of this.characterStates) {
      const arcIssues = this.validateCharacterArc(character, states)
      issues.push(...arcIssues)
    }
    
    return issues
  }
  
  private checkTimelineConsistency(
    event: NarrativeEvent,
    file: ParsedFile
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    
    // Check for timeline conflicts
    const conflicts = this.timeline.findConflicts(event)
    
    for (const conflict of conflicts) {
      issues.push({
        type: 'timeline-conflict',
        severity: 'error',
        message: `Timeline conflict: ${event.description} conflicts with "${conflict.description}"`,
        file: file.path,
        line: event.line,
        relatedFiles: [{
          file: conflict.file,
          line: conflict.line
        }],
        context: {
          event: event.timestamp,
          conflict: conflict.timestamp
        }
      })
    }
    
    // Check for impossible sequences
    if (this.isImpossibleSequence(event)) {
      issues.push({
        type: 'impossible-sequence',
        severity: 'error',
        message: `Impossible sequence: ${event.description} cannot occur given previous events`,
        file: file.path,
        line: event.line
      })
    }
    
    return issues
  }
  
  private validateCharacterArc(
    character: string,
    states: CharacterState[]
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    
    // Sort states by timeline
    const sorted = states.sort((a, b) => a.timestamp - b.timestamp)
    
    // Check for arc consistency
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      
      // Check for regression
      if (this.isCharacterRegression(prev, curr)) {
        issues.push({
          type: 'character-regression',
          severity: 'warning',
          message: `Character regression: ${character} seems to have lost development`,
          file: curr.file,
          line: curr.line,
          suggestion: 'Consider if this regression is intentional or needs explanation'
        })
      }
      
      // Check for sudden changes
      if (this.isSuddenChange(prev, curr)) {
        issues.push({
          type: 'sudden-character-change',
          severity: 'warning',
          message: `Sudden character change: ${character} changed dramatically without explanation`,
          file: curr.file,
          line: curr.line,
          context: {
            before: prev.traits,
            after: curr.traits
          }
        })
      }
    }
    
    return issues
  }
}
```

## Validator Registration

### Registering Validators

```typescript
class ValidatorRegistry {
  private validators = new Map<string, CustomValidator>()
  private instances = new Map<string, ValidatorInstance>()
  
  register(validator: CustomValidator): void {
    // Validate validator
    this.validateValidator(validator)
    
    // Check for conflicts
    if (this.validators.has(validator.id)) {
      throw new Error(`Validator ${validator.id} already registered`)
    }
    
    // Register
    this.validators.set(validator.id, validator)
    
    // Emit event
    this.events.emit('validator:registered', {
      id: validator.id,
      name: validator.name
    })
  }
  
  async createInstance(
    id: string,
    options?: any
  ): Promise<ValidatorInstance> {
    const validator = this.validators.get(id)
    if (!validator) {
      throw new Error(`Validator ${id} not found`)
    }
    
    // Merge options
    const finalOptions = {
      ...validator.defaultOptions,
      ...options
    }
    
    // Validate options
    if (validator.optionsSchema) {
      this.validateOptions(finalOptions, validator.optionsSchema)
    }
    
    // Create instance
    const instance = new ValidatorInstance(validator, finalOptions)
    this.instances.set(instance.id, instance)
    
    return instance
  }
  
  private validateValidator(validator: CustomValidator): void {
    // Check required fields
    if (!validator.id || !validator.name) {
      throw new Error('Validator must have id and name')
    }
    
    // Check ID format
    if (!/^[a-z0-9-]+$/.test(validator.id)) {
      throw new Error('Validator ID must be lowercase alphanumeric with hyphens')
    }
    
    // Check version format
    if (!semver.valid(validator.version)) {
      throw new Error('Invalid validator version')
    }
    
    // Check methods
    if (!validator.validateFile && !validator.validateProject) {
      throw new Error('Validator must implement at least one validation method')
    }
  }
}
```

### Dynamic Validator Loading

```typescript
class DynamicValidatorLoader {
  async loadFromFile(path: string): Promise<CustomValidator> {
    try {
      // Read validator file
      const code = await fs.readFile(path, 'utf8')
      
      // Create sandboxed environment
      const sandbox = this.createSandbox()
      
      // Load validator
      const module = await sandbox.evaluate(code)
      
      // Extract validator
      const validator = module.default || module.validator
      
      if (!validator) {
        throw new Error('No validator exported')
      }
      
      // Validate and return
      this.validateLoadedValidator(validator)
      
      return validator
    } catch (error) {
      throw new Error(`Failed to load validator from ${path}: ${error.message}`)
    }
  }
  
  async loadFromPackage(packageName: string): Promise<CustomValidator[]> {
    try {
      // Import package
      const pkg = await import(packageName)
      
      // Find validators
      const validators: CustomValidator[] = []
      
      if (pkg.validators && Array.isArray(pkg.validators)) {
        validators.push(...pkg.validators)
      }
      
      if (pkg.default && this.isValidator(pkg.default)) {
        validators.push(pkg.default)
      }
      
      // Validate all
      validators.forEach(v => this.validateLoadedValidator(v))
      
      return validators
    } catch (error) {
      throw new Error(`Failed to load validators from ${packageName}: ${error.message}`)
    }
  }
}
```

## Validator Development Kit

### Validator Testing Framework

```typescript
class ValidatorTestFramework {
  async testValidator(
    validator: CustomValidator,
    testCases: ValidatorTestCase[]
  ): Promise<TestResults> {
    const results: TestResult[] = []
    
    for (const testCase of testCases) {
      const result = await this.runTestCase(validator, testCase)
      results.push(result)
    }
    
    return {
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results
    }
  }
  
  private async runTestCase(
    validator: CustomValidator,
    testCase: ValidatorTestCase
  ): Promise<TestResult> {
    try {
      // Create test context
      const context = this.createTestContext(testCase.context)
      
      // Initialize validator
      if (validator.initialize) {
        await validator.initialize(context)
      }
      
      // Run validation
      const issues = await validator.validateFile(
        testCase.file,
        context
      )
      
      // Check expectations
      const passed = this.checkExpectations(
        issues,
        testCase.expected
      )
      
      return {
        name: testCase.name,
        passed,
        issues,
        expected: testCase.expected
      }
    } catch (error) {
      return {
        name: testCase.name,
        passed: false,
        error: error.message
      }
    }
  }
}

// Example test case
const testCase: ValidatorTestCase = {
  name: 'detects short chapters',
  file: {
    path: 'test.md',
    ast: parseMarkdown(`
      # Chapter 1
      This is a very short chapter.
      
      # Chapter 2
      This chapter has more content...
    `)
  },
  context: {
    options: {
      minWords: 100,
      maxWords: 5000
    }
  },
  expected: {
    issues: [
      {
        type: 'chapter-too-short',
        severity: 'warning',
        line: 1
      }
    ]
  }
}
```

### Validator Utilities

```typescript
class ValidatorUtilities {
  // AST traversal helpers
  static traverse(
    node: ASTNode,
    visitor: NodeVisitor
  ): void {
    visitor.enter?.(node)
    
    if (node.children) {
      for (const child of node.children) {
        this.traverse(child, visitor)
      }
    }
    
    visitor.exit?.(node)
  }
  
  // Pattern matching
  static findPattern(
    file: ParsedFile,
    pattern: Pattern
  ): Match[] {
    const matches: Match[] = []
    
    this.traverse(file.ast, {
      enter(node) {
        if (pattern.matches(node)) {
          matches.push({
            node,
            captures: pattern.capture(node)
          })
        }
      }
    })
    
    return matches
  }
  
  // Schema queries
  static querySchema(
    schema: NarrativeSchema,
    query: SchemaQuery
  ): QueryResult {
    return new SchemaQueryEngine(schema).execute(query)
  }
  
  // Issue builders
  static createIssue(
    template: IssueTemplate,
    context: IssueContext
  ): ValidationIssue {
    return {
      type: template.type,
      severity: template.severity || 'warning',
      message: this.formatMessage(template.message, context),
      file: context.file,
      line: context.line,
      column: context.column,
      suggestion: template.suggestion
        ? this.formatMessage(template.suggestion, context)
        : undefined
    }
  }
}
```

## Validator Composition

### Combining Validators

```typescript
class CompositeValidator implements CustomValidator {
  id = 'composite'
  name = 'Composite Validator'
  description = 'Combines multiple validators'
  category = ValidatorCategory.META
  version = '1.0.0'
  
  constructor(
    private validators: CustomValidator[],
    private strategy: CompositionStrategy = 'all'
  ) {}
  
  async validateFile(
    file: ParsedFile,
    context: ValidatorContext
  ): Promise<ValidationIssue[]> {
    const allIssues: ValidationIssue[] = []
    
    switch (this.strategy) {
      case 'all':
        // Run all validators
        for (const validator of this.validators) {
          const issues = await validator.validateFile(file, context)
          allIssues.push(...issues)
        }
        break
        
      case 'first':
        // Stop at first validator with issues
        for (const validator of this.validators) {
          const issues = await validator.validateFile(file, context)
          if (issues.length > 0) {
            return issues
          }
        }
        break
        
      case 'conditional':
        // Run based on conditions
        for (const validator of this.validators) {
          if (this.shouldRun(validator, file, context)) {
            const issues = await validator.validateFile(file, context)
            allIssues.push(...issues)
          }
        }
        break
    }
    
    return this.deduplicateIssues(allIssues)
  }
}
```

### Validator Pipelines

```typescript
class ValidatorPipeline {
  private stages: PipelineStage[] = []
  
  addStage(
    validator: CustomValidator,
    options?: StageOptions
  ): this {
    this.stages.push({
      validator,
      options: options || {}
    })
    return this
  }
  
  async execute(
    files: ParsedFile[],
    context: ValidatorContext
  ): Promise<PipelineResult> {
    const results: StageResult[] = []
    let shouldContinue = true
    
    for (const stage of this.stages) {
      if (!shouldContinue) break
      
      const result = await this.executeStage(
        stage,
        files,
        context
      )
      
      results.push(result)
      
      // Check if should continue
      if (stage.options.stopOnError && result.hasErrors) {
        shouldContinue = false
      }
      
      // Filter files for next stage
      if (stage.options.filter) {
        files = files.filter(f => 
          !result.issues.some(i => 
            i.file === f.path && i.severity === 'error'
          )
        )
      }
    }
    
    return {
      stages: results,
      completed: shouldContinue,
      totalIssues: results.reduce((sum, r) => sum + r.issues.length, 0)
    }
  }
}
```

## Performance Optimization

### Caching Validator Results

```typescript
class CachedValidator implements CustomValidator {
  private cache: ValidatorCache
  
  constructor(
    private validator: CustomValidator,
    cacheOptions: CacheOptions
  ) {
    this.cache = new ValidatorCache(cacheOptions)
  }
  
  async validateFile(
    file: ParsedFile,
    context: ValidatorContext
  ): Promise<ValidationIssue[]> {
    // Generate cache key
    const key = this.generateCacheKey(file, context.options)
    
    // Check cache
    const cached = await this.cache.get(key)
    if (cached && !this.isStale(cached, file)) {
      return cached.issues
    }
    
    // Run validation
    const issues = await this.validator.validateFile(file, context)
    
    // Cache result
    await this.cache.set(key, {
      issues,
      fileHash: this.hashFile(file),
      timestamp: Date.now()
    })
    
    return issues
  }
  
  private isStale(cached: CachedResult, file: ParsedFile): boolean {
    // Check file modification
    if (cached.fileHash !== this.hashFile(file)) {
      return true
    }
    
    // Check age
    const age = Date.now() - cached.timestamp
    return age > this.cache.maxAge
  }
}
```

### Parallel Validator Execution

```typescript
class ParallelValidatorExecutor {
  async executeValidators(
    validators: CustomValidator[],
    files: ParsedFile[],
    context: ValidatorContext
  ): Promise<ValidationResult[]> {
    // Group validators by parallelization capability
    const parallel = validators.filter(v => v.capabilities?.parallel)
    const sequential = validators.filter(v => !v.capabilities?.parallel)
    
    // Run parallel validators
    const parallelResults = await Promise.all(
      parallel.map(v => this.runValidator(v, files, context))
    )
    
    // Run sequential validators
    const sequentialResults: ValidationResult[] = []
    for (const validator of sequential) {
      const result = await this.runValidator(validator, files, context)
      sequentialResults.push(result)
    }
    
    return [...parallelResults, ...sequentialResults]
  }
}
```

## Best Practices

### Validator Design Guidelines

1. **Single Responsibility**
   ```typescript
   // Good: Focused validator
   class DialogueFormatValidator {
     // Only validates dialogue formatting
   }
   
   // Bad: Doing too much
   class EverythingValidator {
     // Validates formatting, grammar, plot, etc.
   }
   ```

2. **Clear Error Messages**
   ```typescript
   // Good: Specific and actionable
   {
     message: 'Character "Alice" speaks before being introduced',
     suggestion: 'Introduce Alice before line 42 or move this dialogue after her introduction'
   }
   
   // Bad: Vague
   {
     message: 'Character error'
   }
   ```

3. **Performance Awareness**
   ```typescript
   class EfficientValidator {
     private compiledPatterns: RegExp[]
     
     async initialize(context): Promise<void> {
       // Pre-compile patterns once
       this.compiledPatterns = this.patterns.map(p => new RegExp(p))
     }
     
     validateFile(file): Promise<ValidationIssue[]> {
       // Reuse compiled patterns
       return this.checkPatterns(file, this.compiledPatterns)
     }
   }
   ```

## Future Enhancements

1. **AI-Powered Validators**
   - Natural language rule definition
   - Machine learning-based pattern detection
   - Adaptive validation rules

2. **Visual Validator Builder**
   - Drag-and-drop validator creation
   - Visual rule composition
   - Live testing interface

3. **Validator Marketplace**
   - Community validators
   - Validator ratings and reviews
   - Automatic updates

4. **Advanced Composition**
   - Conditional execution graphs
   - Dynamic validator loading
   - Rule inference
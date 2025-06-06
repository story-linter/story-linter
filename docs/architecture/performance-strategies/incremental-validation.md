# Incremental Validation

## Overview

Incremental validation is a performance optimization strategy that validates only the parts of a story that have changed, rather than re-validating the entire narrative. This approach significantly reduces validation time for large projects and enables real-time feedback during editing.

## Core Concepts

### Change Detection

```typescript
interface ChangeDetector {
  // Detect changes between versions
  detectChanges(
    previous: ProjectState,
    current: ProjectState
  ): ChangeSet
  
  // Track file modifications
  trackFile(path: string, content: string): FileState
  
  // Calculate change impact
  analyzeImpact(changes: ChangeSet): ImpactAnalysis
}

interface ChangeSet {
  added: string[]
  modified: ModifiedFile[]
  deleted: string[]
  renamed: RenamedFile[]
}

interface ModifiedFile {
  path: string
  hunks: ChangeHunk[]
  checksum: string
  previousChecksum: string
}
```

### Dependency Tracking

```typescript
interface DependencyTracker {
  // Build dependency graph
  buildGraph(files: ParsedFile[]): DependencyGraph
  
  // Track cross-file references
  trackReferences(
    file: ParsedFile,
    schema: NarrativeSchema
  ): Reference[]
  
  // Find affected files
  findAffected(
    changed: string[],
    graph: DependencyGraph
  ): string[]
}

interface DependencyGraph {
  nodes: Map<string, DependencyNode>
  edges: Map<string, Set<string>>
  
  // Query methods
  getDependents(file: string): string[]
  getDependencies(file: string): string[]
  getTransitiveDependents(file: string): string[]
}
```

## Implementation Strategy

### Incremental Validation Engine

```typescript
class IncrementalValidationEngine {
  private state: ValidationState
  private cache: ValidationCache
  private dependencies: DependencyGraph
  
  async validateIncremental(
    changes: ChangeSet
  ): Promise<ValidationResult> {
    // Update dependency graph
    await this.updateDependencies(changes)
    
    // Determine affected scope
    const scope = this.calculateValidationScope(changes)
    
    // Invalidate cached results
    this.invalidateCache(scope)
    
    // Run targeted validation
    const results = await this.runValidation(scope)
    
    // Update state
    this.updateState(results)
    
    // Merge with cached results
    return this.mergeResults(results)
  }
  
  private calculateValidationScope(
    changes: ChangeSet
  ): ValidationScope {
    const scope = new ValidationScope()
    
    // Add directly changed files
    scope.addFiles(changes.added)
    scope.addFiles(changes.modified.map(m => m.path))
    
    // Add dependent files
    for (const file of scope.files) {
      const dependents = this.dependencies.getTransitiveDependents(file)
      scope.addFiles(dependents)
    }
    
    // Add validators affected by deletions
    for (const deleted of changes.deleted) {
      const validators = this.getAffectedValidators(deleted)
      scope.addValidators(validators)
    }
    
    return scope
  }
}
```

### State Management

```typescript
interface ValidationState {
  // File states
  files: Map<string, FileValidationState>
  
  // Schema state
  schema: SchemaState
  
  // Validator states
  validators: Map<string, ValidatorState>
  
  // Global metadata
  metadata: {
    lastValidation: Date
    version: number
    checksum: string
  }
}

class StateManager {
  private state: ValidationState
  
  async saveState(): Promise<void> {
    const serialized = this.serialize(this.state)
    await this.storage.write(STATE_FILE, serialized)
  }
  
  async loadState(): Promise<ValidationState | null> {
    try {
      const data = await this.storage.read(STATE_FILE)
      return this.deserialize(data)
    } catch {
      return null
    }
  }
  
  updateFileState(
    path: string,
    validation: FileValidationResult
  ): void {
    this.state.files.set(path, {
      path,
      checksum: validation.checksum,
      issues: validation.issues,
      validatedAt: new Date(),
      validators: validation.validators
    })
  }
}
```

### Change Detection Implementation

```typescript
class FileChangeDetector {
  private checksums = new Map<string, string>()
  
  async detectChanges(
    files: string[]
  ): Promise<FileChange[]> {
    const changes: FileChange[] = []
    
    for (const file of files) {
      const content = await this.readFile(file)
      const checksum = this.calculateChecksum(content)
      const previous = this.checksums.get(file)
      
      if (!previous) {
        changes.push({
          type: 'added',
          path: file,
          checksum
        })
      } else if (previous !== checksum) {
        const diff = await this.calculateDiff(
          file,
          previous,
          checksum
        )
        
        changes.push({
          type: 'modified',
          path: file,
          checksum,
          previousChecksum: previous,
          diff
        })
      }
      
      this.checksums.set(file, checksum)
    }
    
    // Check for deletions
    for (const [file, checksum] of this.checksums) {
      if (!files.includes(file)) {
        changes.push({
          type: 'deleted',
          path: file,
          previousChecksum: checksum
        })
        this.checksums.delete(file)
      }
    }
    
    return changes
  }
}
```

## Validation Caching

### Cache Structure

```typescript
interface ValidationCache {
  // File-level cache
  fileResults: Map<string, CachedFileResult>
  
  // Cross-file validation cache
  crossFileResults: Map<string, CachedCrossFileResult>
  
  // Schema cache
  schemas: Map<string, CachedSchema>
  
  // Invalidation tracking
  invalidation: InvalidationTracker
}

interface CachedFileResult {
  checksum: string
  issues: ValidationIssue[]
  validators: string[]
  timestamp: number
  dependencies: string[]
}

class CacheManager {
  private cache: ValidationCache
  
  async get(
    key: string,
    validator: string
  ): Promise<CachedResult | null> {
    const cached = this.cache.fileResults.get(key)
    
    if (!cached) return null
    
    // Check if cache is valid
    if (this.isValid(cached, validator)) {
      return cached
    }
    
    return null
  }
  
  private isValid(
    cached: CachedResult,
    validator: string
  ): boolean {
    // Check if validator was run
    if (!cached.validators.includes(validator)) {
      return false
    }
    
    // Check dependencies
    for (const dep of cached.dependencies) {
      if (this.invalidation.isInvalidated(dep)) {
        return false
      }
    }
    
    // Check age
    const age = Date.now() - cached.timestamp
    if (age > this.config.maxCacheAge) {
      return false
    }
    
    return true
  }
}
```

### Invalidation Strategy

```typescript
class InvalidationTracker {
  private invalidated = new Set<string>()
  private invalidationGraph = new Map<string, Set<string>>()
  
  invalidate(key: string): void {
    if (this.invalidated.has(key)) return
    
    this.invalidated.add(key)
    
    // Cascade invalidation
    const dependents = this.invalidationGraph.get(key)
    if (dependents) {
      for (const dependent of dependents) {
        this.invalidate(dependent)
      }
    }
  }
  
  trackDependency(key: string, dependency: string): void {
    const deps = this.invalidationGraph.get(dependency) || new Set()
    deps.add(key)
    this.invalidationGraph.set(dependency, deps)
  }
  
  clear(): void {
    this.invalidated.clear()
  }
}
```

## Dependency Analysis

### Cross-File Dependencies

```typescript
interface CrossFileDependency {
  source: string
  target: string
  type: DependencyType
  references: Reference[]
}

enum DependencyType {
  CHARACTER_REFERENCE = 'character',
  LOCATION_REFERENCE = 'location',
  EVENT_REFERENCE = 'event',
  PLOT_CONTINUATION = 'plot',
  THEME_REFERENCE = 'theme'
}

class DependencyAnalyzer {
  analyze(
    files: ParsedFile[],
    schema: NarrativeSchema
  ): DependencyGraph {
    const graph = new DependencyGraph()
    
    for (const file of files) {
      // Extract references
      const refs = this.extractReferences(file, schema)
      
      // Build dependencies
      for (const ref of refs) {
        const target = this.resolveReference(ref, schema)
        if (target) {
          graph.addEdge(file.path, target.file, {
            type: ref.type,
            reference: ref
          })
        }
      }
    }
    
    return graph
  }
  
  private extractReferences(
    file: ParsedFile,
    schema: NarrativeSchema
  ): Reference[] {
    const references: Reference[] = []
    
    // Character references
    const characters = this.extractCharacterReferences(file)
    references.push(...characters)
    
    // Location references
    const locations = this.extractLocationReferences(file)
    references.push(...locations)
    
    // Event references
    const events = this.extractEventReferences(file)
    references.push(...events)
    
    return references
  }
}
```

### Impact Analysis

```typescript
class ImpactAnalyzer {
  analyze(
    changes: ChangeSet,
    dependencies: DependencyGraph
  ): ImpactAnalysis {
    const impact: ImpactAnalysis = {
      direct: new Set<string>(),
      indirect: new Set<string>(),
      validators: new Set<string>(),
      severity: 'low'
    }
    
    // Direct impact
    for (const file of changes.modified) {
      impact.direct.add(file.path)
      
      // Analyze change severity
      const severity = this.analyzeChangeSeverity(file)
      impact.severity = this.maxSeverity(impact.severity, severity)
    }
    
    // Indirect impact
    for (const file of impact.direct) {
      const dependents = dependencies.getTransitiveDependents(file)
      for (const dependent of dependents) {
        impact.indirect.add(dependent)
      }
    }
    
    // Affected validators
    const validators = this.determineAffectedValidators(
      impact,
      changes
    )
    impact.validators = new Set(validators)
    
    return impact
  }
  
  private analyzeChangeSeverity(
    file: ModifiedFile
  ): Severity {
    // Major structural changes
    if (this.hasStructuralChanges(file)) {
      return 'high'
    }
    
    // Character or plot changes
    if (this.hasSemanticChanges(file)) {
      return 'medium'
    }
    
    // Minor text changes
    return 'low'
  }
}
```

## Optimization Techniques

### Parallel Incremental Validation

```typescript
class ParallelIncrementalValidator {
  async validate(
    scope: ValidationScope
  ): Promise<ValidationResult[]> {
    // Group files by independence
    const groups = this.groupIndependentFiles(scope.files)
    
    // Validate each group in parallel
    const results = await Promise.all(
      groups.map(group => this.validateGroup(group))
    )
    
    // Flatten results
    return results.flat()
  }
  
  private groupIndependentFiles(
    files: string[]
  ): string[][] {
    const groups: string[][] = []
    const processed = new Set<string>()
    
    for (const file of files) {
      if (processed.has(file)) continue
      
      const group = [file]
      const dependencies = this.dependencies.getDependencies(file)
      
      // Add files that don't depend on each other
      for (const other of files) {
        if (
          !processed.has(other) &&
          !dependencies.includes(other) &&
          !this.dependencies.getDependencies(other).includes(file)
        ) {
          group.push(other)
          processed.add(other)
        }
      }
      
      processed.add(file)
      groups.push(group)
    }
    
    return groups
  }
}
```

### Smart Validation Ordering

```typescript
class ValidationScheduler {
  schedule(
    scope: ValidationScope,
    priorities: ValidationPriorities
  ): ValidationPlan {
    const plan = new ValidationPlan()
    
    // High priority validations first
    const highPriority = this.filterByPriority(
      scope,
      priorities,
      'high'
    )
    plan.addPhase(highPriority)
    
    // Dependencies next
    const dependencies = this.orderByDependencies(
      scope.files.filter(f => !highPriority.includes(f))
    )
    plan.addPhase(dependencies)
    
    // Low priority last
    const remaining = scope.files.filter(
      f => !highPriority.includes(f) && !dependencies.includes(f)
    )
    plan.addPhase(remaining)
    
    return plan
  }
}
```

## Integration with Watch Mode

### File Watcher Integration

```typescript
class IncrementalWatcher {
  private validator: IncrementalValidationEngine
  private watcher: FSWatcher
  private debouncer: Debouncer
  
  async start(paths: string[]): Promise<void> {
    this.watcher = chokidar.watch(paths, {
      persistent: true,
      ignoreInitial: true
    })
    
    this.watcher
      .on('add', path => this.handleFileAdded(path))
      .on('change', path => this.handleFileChanged(path))
      .on('unlink', path => this.handleFileDeleted(path))
  }
  
  private handleFileChanged(path: string): void {
    this.debouncer.debounce(async () => {
      const changes: ChangeSet = {
        added: [],
        modified: [{
          path,
          hunks: await this.calculateHunks(path)
        }],
        deleted: [],
        renamed: []
      }
      
      const result = await this.validator.validateIncremental(changes)
      this.emitResults(result)
    }, 300)
  }
}
```

### Real-time Feedback

```typescript
class RealTimeFeedback {
  private pendingValidations = new Map<string, Promise<ValidationResult>>()
  
  async provideInstantFeedback(
    file: string,
    change: TextChange
  ): Promise<QuickFeedback> {
    // Quick syntax check
    const syntaxIssues = await this.quickSyntaxCheck(file, change)
    
    // Check cache for nearby issues
    const cachedIssues = await this.getNearbyIssues(file, change.range)
    
    // Start full validation in background
    if (!this.pendingValidations.has(file)) {
      const validation = this.validator.validateFile(file)
      this.pendingValidations.set(file, validation)
      
      validation.then(() => {
        this.pendingValidations.delete(file)
      })
    }
    
    return {
      syntax: syntaxIssues,
      cached: cachedIssues,
      pending: true
    }
  }
}
```

## Performance Metrics

### Incremental Validation Metrics

```typescript
interface IncrementalMetrics {
  // Efficiency metrics
  filesValidated: number
  filesSkipped: number
  cacheHitRate: number
  
  // Performance metrics
  totalTime: number
  validationTime: number
  cacheTime: number
  dependencyAnalysisTime: number
  
  // Accuracy metrics
  incrementalResults: ValidationResult[]
  fullResults?: ValidationResult[]
  accuracy?: number
}

class MetricsCollector {
  collect(
    validation: IncrementalValidation
  ): IncrementalMetrics {
    return {
      filesValidated: validation.scope.files.length,
      filesSkipped: validation.totalFiles - validation.scope.files.length,
      cacheHitRate: validation.cacheHits / validation.cacheQueries,
      totalTime: validation.endTime - validation.startTime,
      validationTime: validation.validationTime,
      cacheTime: validation.cacheTime,
      dependencyAnalysisTime: validation.dependencyTime,
      incrementalResults: validation.results
    }
  }
}
```

## Error Recovery

### Incremental State Recovery

```typescript
class StateRecovery {
  async recover(
    error: Error,
    state: ValidationState
  ): Promise<RecoveryResult> {
    // Try to restore from backup
    const backup = await this.loadBackupState()
    if (backup && this.isValidBackup(backup)) {
      return {
        recovered: true,
        state: backup,
        strategy: 'backup'
      }
    }
    
    // Rebuild state incrementally
    try {
      const rebuilt = await this.rebuildState()
      return {
        recovered: true,
        state: rebuilt,
        strategy: 'rebuild'
      }
    } catch (rebuildError) {
      // Fall back to full validation
      return {
        recovered: false,
        state: null,
        strategy: 'full_validation_required'
      }
    }
  }
}
```

## Best Practices

### When to Use Incremental Validation

1. **Large Projects**
   - Projects with 50+ files
   - Deep dependency chains
   - Complex cross-references

2. **Interactive Development**
   - Real-time validation
   - IDE integration
   - Watch mode

3. **Continuous Integration**
   - Pull request validation
   - Incremental builds
   - Change-based testing

### When to Avoid

1. **First-time Validation**
   - No existing state
   - Major structural changes
   - Version migrations

2. **Unreliable State**
   - Corrupted cache
   - Inconsistent results
   - Unknown changes

## Future Enhancements

1. **Machine Learning Integration**
   - Predict validation impact
   - Smart cache invalidation
   - Adaptive scheduling

2. **Distributed Incremental Validation**
   - Multi-machine coordination
   - Shared cache systems
   - Cloud-based validation

3. **Advanced Change Detection**
   - Semantic diff analysis
   - AST-based comparison
   - Intent recognition

4. **Predictive Validation**
   - Pre-validate likely changes
   - Background validation
   - Speculative execution
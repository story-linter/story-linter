# Error Recovery

## Overview

This document outlines comprehensive error recovery strategies for the Story Linter, ensuring system resilience and continuity of service even when errors occur. Effective error recovery minimizes disruption and maintains data integrity.

## Recovery Strategy Framework

### Recovery Levels

```typescript
enum RecoveryLevel {
  AUTOMATIC = 'automatic',     // No user intervention needed
  ASSISTED = 'assisted',       // Minimal user input required
  MANUAL = 'manual',          // Full user intervention required
  IMPOSSIBLE = 'impossible'    // Cannot recover
}

interface RecoveryStrategy {
  level: RecoveryLevel
  confidence: number // 0-1, likelihood of success
  estimatedTime: number // milliseconds
  dataLoss: DataLossRisk
  execute(): Promise<RecoveryResult>
}

enum DataLossRisk {
  NONE = 'none',
  MINIMAL = 'minimal',
  PARTIAL = 'partial',
  SIGNIFICANT = 'significant'
}
```

### Recovery Manager

```typescript
class RecoveryManager {
  private strategies: Map<string, RecoveryStrategy[]> = new Map()
  private history: RecoveryHistory
  
  async recover(error: StoryLinterError): Promise<RecoveryResult> {
    // Log error occurrence
    this.logError(error)
    
    // Find applicable strategies
    const strategies = this.findStrategies(error)
    
    if (strategies.length === 0) {
      return {
        success: false,
        error,
        reason: 'No recovery strategies available'
      }
    }
    
    // Try strategies in order of confidence
    const sorted = this.sortStrategies(strategies)
    
    for (const strategy of sorted) {
      try {
        const result = await this.executeStrategy(strategy, error)
        
        if (result.success) {
          this.recordSuccess(error, strategy, result)
          return result
        }
      } catch (strategyError) {
        this.recordFailure(error, strategy, strategyError)
        continue
      }
    }
    
    return {
      success: false,
      error,
      reason: 'All recovery strategies failed'
    }
  }
  
  private sortStrategies(strategies: RecoveryStrategy[]): RecoveryStrategy[] {
    return strategies.sort((a, b) => {
      // Prefer automatic recovery
      if (a.level !== b.level) {
        return this.levelPriority(a.level) - this.levelPriority(b.level)
      }
      
      // Then by confidence
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence
      }
      
      // Then by data loss risk
      return this.riskPriority(a.dataLoss) - this.riskPriority(b.dataLoss)
    })
  }
}
```

## File System Recovery

### File Access Recovery

```typescript
class FileAccessRecovery {
  async recover(error: FileAccessError): Promise<RecoveryResult> {
    const strategies: RecoveryStrategy[] = [
      new RetryWithDelayStrategy(error),
      new AlternativePathStrategy(error),
      new PermissionFixStrategy(error),
      new CachedVersionStrategy(error)
    ]
    
    for (const strategy of strategies) {
      const result = await strategy.execute()
      if (result.success) return result
    }
    
    return {
      success: false,
      error,
      reason: 'Unable to recover file access'
    }
  }
}

class RetryWithDelayStrategy implements RecoveryStrategy {
  level = RecoveryLevel.AUTOMATIC
  confidence = 0.7
  estimatedTime = 5000
  dataLoss = DataLossRisk.NONE
  
  constructor(private error: FileAccessError) {}
  
  async execute(): Promise<RecoveryResult> {
    const maxRetries = 3
    const delays = [100, 500, 2000]
    
    for (let i = 0; i < maxRetries; i++) {
      await this.delay(delays[i])
      
      try {
        const content = await fs.readFile(this.error.context.file)
        return {
          success: true,
          recovered: content,
          strategy: 'retry-with-delay'
        }
      } catch {
        continue
      }
    }
    
    return { success: false }
  }
}

class AlternativePathStrategy implements RecoveryStrategy {
  level = RecoveryLevel.AUTOMATIC
  confidence = 0.5
  estimatedTime = 1000
  dataLoss = DataLossRisk.NONE
  
  async execute(): Promise<RecoveryResult> {
    const alternatives = this.findAlternativePaths()
    
    for (const path of alternatives) {
      try {
        const content = await fs.readFile(path)
        return {
          success: true,
          recovered: content,
          strategy: 'alternative-path',
          metadata: { alternativePath: path }
        }
      } catch {
        continue
      }
    }
    
    return { success: false }
  }
  
  private findAlternativePaths(): string[] {
    const original = this.error.context.file
    return [
      // Try different case
      original.toLowerCase(),
      original.toUpperCase(),
      // Try with/without extension
      original.replace(/\.md$/, ''),
      original + '.md',
      // Try backup locations
      path.join('.backup', path.basename(original)),
      path.join(path.dirname(original), '.backup', path.basename(original))
    ]
  }
}
```

### Parse Error Recovery

```typescript
class ParseErrorRecovery {
  async recover(error: FileParseError): Promise<RecoveryResult> {
    const strategies = [
      new PartialParseStrategy(error),
      new FallbackParserStrategy(error),
      new ErrorCorrectionStrategy(error),
      new ManualCorrectionStrategy(error)
    ]
    
    return this.executeStrategies(strategies)
  }
}

class PartialParseStrategy implements RecoveryStrategy {
  level = RecoveryLevel.AUTOMATIC
  confidence = 0.8
  estimatedTime = 2000
  dataLoss = DataLossRisk.MINIMAL
  
  async execute(): Promise<RecoveryResult> {
    const { file, position } = this.error.context
    const content = await fs.readFile(file, 'utf8')
    
    try {
      // Try to parse before and after error position
      const beforeError = content.substring(0, position.offset)
      const afterError = content.substring(position.offset + 100)
      
      const partialResult = {
        before: await this.parseSection(beforeError),
        after: await this.parseSection(afterError),
        errorSection: {
          start: position.offset,
          end: position.offset + 100,
          content: content.substring(position.offset, position.offset + 100)
        }
      }
      
      return {
        success: true,
        recovered: partialResult,
        strategy: 'partial-parse',
        warnings: ['Some content could not be parsed']
      }
    } catch {
      return { success: false }
    }
  }
}

class ErrorCorrectionStrategy implements RecoveryStrategy {
  level = RecoveryLevel.AUTOMATIC
  confidence = 0.6
  estimatedTime = 3000
  dataLoss = DataLossRisk.NONE
  
  async execute(): Promise<RecoveryResult> {
    const corrections = [
      this.fixUnmatchedBrackets,
      this.fixInvalidYAML,
      this.fixEncodingIssues,
      this.fixLineEndings
    ]
    
    let content = await fs.readFile(this.error.context.file, 'utf8')
    
    for (const correction of corrections) {
      content = await correction.call(this, content)
    }
    
    try {
      const parsed = await this.parser.parse(content)
      return {
        success: true,
        recovered: parsed,
        strategy: 'error-correction',
        corrections: this.appliedCorrections
      }
    } catch {
      return { success: false }
    }
  }
  
  private async fixUnmatchedBrackets(content: string): Promise<string> {
    // Count brackets
    const open = (content.match(/\[/g) || []).length
    const close = (content.match(/\]/g) || []).length
    
    if (open > close) {
      // Add missing closing brackets
      content += ']'.repeat(open - close)
      this.appliedCorrections.push('Added missing closing brackets')
    } else if (close > open) {
      // Remove extra closing brackets
      const regex = /\](?=[^\[]*$)/
      for (let i = 0; i < close - open; i++) {
        content = content.replace(regex, '')
      }
      this.appliedCorrections.push('Removed extra closing brackets')
    }
    
    return content
  }
}
```

## Validation Recovery

### Validator Failure Recovery

```typescript
class ValidatorFailureRecovery {
  async recover(error: ValidatorExecutionError): Promise<RecoveryResult> {
    const strategies = [
      new ValidatorRetryStrategy(error),
      new FallbackValidatorStrategy(error),
      new ReducedScopeStrategy(error),
      new SkipValidatorStrategy(error)
    ]
    
    return this.executeStrategies(strategies)
  }
}

class ReducedScopeStrategy implements RecoveryStrategy {
  level = RecoveryLevel.AUTOMATIC
  confidence = 0.7
  estimatedTime = 5000
  dataLoss = DataLossRisk.MINIMAL
  
  async execute(): Promise<RecoveryResult> {
    const { validator, files } = this.error.context
    
    // Try validating files individually
    const results: ValidationResult[] = []
    const failures: string[] = []
    
    for (const file of files) {
      try {
        const result = await this.runValidator(validator, [file])
        results.push(result)
      } catch {
        failures.push(file)
      }
    }
    
    if (results.length > 0) {
      return {
        success: true,
        recovered: this.mergeResults(results),
        strategy: 'reduced-scope',
        warnings: failures.length > 0 
          ? [`Failed to validate ${failures.length} files`]
          : undefined
      }
    }
    
    return { success: false }
  }
}

class FallbackValidatorStrategy implements RecoveryStrategy {
  level = RecoveryLevel.AUTOMATIC
  confidence = 0.5
  estimatedTime = 3000
  dataLoss = DataLossRisk.PARTIAL
  
  async execute(): Promise<RecoveryResult> {
    const fallbacks = this.findFallbackValidators()
    
    for (const fallback of fallbacks) {
      try {
        const result = await this.runValidator(fallback)
        return {
          success: true,
          recovered: result,
          strategy: 'fallback-validator',
          metadata: { 
            originalValidator: this.error.context.validator,
            fallbackValidator: fallback.name
          }
        }
      } catch {
        continue
      }
    }
    
    return { success: false }
  }
}
```

### Schema Recovery

```typescript
class SchemaRecovery {
  async recover(error: SchemaExtractionError): Promise<RecoveryResult> {
    const strategies = [
      new CachedSchemaStrategy(error),
      new PartialSchemaStrategy(error),
      new SchemaRebuildStrategy(error),
      new MinimalSchemaStrategy(error)
    ]
    
    return this.executeStrategies(strategies)
  }
}

class SchemaRebuildStrategy implements RecoveryStrategy {
  level = RecoveryLevel.AUTOMATIC
  confidence = 0.6
  estimatedTime = 10000
  dataLoss = DataLossRisk.MINIMAL
  
  async execute(): Promise<RecoveryResult> {
    try {
      // Use alternative extraction methods
      const extractors = [
        this.regexExtractor,
        this.astExtractor,
        this.nlpExtractor
      ]
      
      const schemas: Partial<NarrativeSchema>[] = []
      
      for (const extractor of extractors) {
        try {
          const partial = await extractor.extract(this.error.context.file)
          schemas.push(partial)
        } catch {
          continue
        }
      }
      
      if (schemas.length > 0) {
        const merged = this.mergePartialSchemas(schemas)
        return {
          success: true,
          recovered: merged,
          strategy: 'schema-rebuild',
          confidence: schemas.length / extractors.length
        }
      }
    } catch {
      // Continue to next strategy
    }
    
    return { success: false }
  }
}
```

## System Recovery

### Memory Recovery

```typescript
class MemoryRecovery {
  async recover(error: OutOfMemoryError): Promise<RecoveryResult> {
    const strategies = [
      new GarbageCollectionStrategy(error),
      new CacheClearingStrategy(error),
      new ProcessRestartStrategy(error),
      new ResourceReallocationStrategy(error)
    ]
    
    return this.executeStrategies(strategies)
  }
}

class CacheClearingStrategy implements RecoveryStrategy {
  level = RecoveryLevel.AUTOMATIC
  confidence = 0.8
  estimatedTime = 1000
  dataLoss = DataLossRisk.NONE
  
  async execute(): Promise<RecoveryResult> {
    const caches = [
      this.validationCache,
      this.schemaCache,
      this.parseCache
    ]
    
    let freedMemory = 0
    
    // Clear caches by priority
    for (const cache of caches) {
      const before = process.memoryUsage().heapUsed
      await cache.clear()
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const after = process.memoryUsage().heapUsed
      freedMemory += before - after
      
      // Check if enough memory freed
      const available = this.getAvailableMemory()
      if (available > this.error.context.required) {
        return {
          success: true,
          strategy: 'cache-clearing',
          metadata: { freedMemory }
        }
      }
    }
    
    return { success: false }
  }
}
```

### Process Recovery

```typescript
class ProcessRecovery {
  async recover(error: WorkerError): Promise<RecoveryResult> {
    const strategies = [
      new WorkerRestartStrategy(error),
      new WorkerReplaceStrategy(error),
      new WorkloadRedistributionStrategy(error),
      new GracefulDegradationStrategy(error)
    ]
    
    return this.executeStrategies(strategies)
  }
}

class WorkloadRedistributionStrategy implements RecoveryStrategy {
  level = RecoveryLevel.AUTOMATIC
  confidence = 0.9
  estimatedTime = 2000
  dataLoss = DataLossRisk.NONE
  
  async execute(): Promise<RecoveryResult> {
    const failedWorker = this.error.context.workerId
    const failedTasks = await this.getWorkerTasks(failedWorker)
    
    // Find healthy workers
    const healthyWorkers = await this.getHealthyWorkers()
    
    if (healthyWorkers.length === 0) {
      return { success: false }
    }
    
    // Redistribute tasks
    const redistributed = await this.redistributeTasks(
      failedTasks,
      healthyWorkers
    )
    
    // Remove failed worker from pool
    await this.removeWorker(failedWorker)
    
    return {
      success: true,
      strategy: 'workload-redistribution',
      metadata: {
        redistributedTasks: redistributed.length,
        targetWorkers: healthyWorkers.length
      }
    }
  }
}
```

## Configuration Recovery

### Configuration Error Recovery

```typescript
class ConfigurationRecovery {
  async recover(error: ConfigurationError): Promise<RecoveryResult> {
    const strategies = [
      new DefaultConfigurationStrategy(error),
      new ConfigurationMigrationStrategy(error),
      new InteractiveConfigurationStrategy(error),
      new MinimalConfigurationStrategy(error)
    ]
    
    return this.executeStrategies(strategies)
  }
}

class ConfigurationMigrationStrategy implements RecoveryStrategy {
  level = RecoveryLevel.AUTOMATIC
  confidence = 0.7
  estimatedTime = 3000
  dataLoss = DataLossRisk.MINIMAL
  
  async execute(): Promise<RecoveryResult> {
    try {
      // Detect config version
      const version = await this.detectConfigVersion()
      
      // Find migration path
      const migrations = this.getMigrationPath(version, CURRENT_VERSION)
      
      // Apply migrations
      let config = await this.loadRawConfig()
      
      for (const migration of migrations) {
        config = await migration.apply(config)
      }
      
      // Validate migrated config
      const validation = await this.validateConfig(config)
      
      if (validation.valid) {
        return {
          success: true,
          recovered: config,
          strategy: 'configuration-migration',
          metadata: {
            fromVersion: version,
            toVersion: CURRENT_VERSION,
            migrationsApplied: migrations.length
          }
        }
      }
    } catch {
      // Continue to next strategy
    }
    
    return { success: false }
  }
}
```

## Plugin Recovery

### Plugin Failure Recovery

```typescript
class PluginRecovery {
  async recover(error: PluginError): Promise<RecoveryResult> {
    const strategies = [
      new PluginReloadStrategy(error),
      new PluginDowngradeStrategy(error),
      new PluginIsolationStrategy(error),
      new PluginDisableStrategy(error)
    ]
    
    return this.executeStrategies(strategies)
  }
}

class PluginIsolationStrategy implements RecoveryStrategy {
  level = RecoveryLevel.AUTOMATIC
  confidence = 0.8
  estimatedTime = 5000
  dataLoss = DataLossRisk.MINIMAL
  
  async execute(): Promise<RecoveryResult> {
    const pluginId = this.error.pluginId
    
    try {
      // Create isolated environment
      const sandbox = await this.createStrictSandbox(pluginId)
      
      // Reload plugin in isolation
      const isolated = await this.loadInSandbox(pluginId, sandbox)
      
      // Test basic functionality
      const test = await this.testPlugin(isolated)
      
      if (test.passed) {
        // Replace with isolated version
        await this.replacePlugin(pluginId, isolated)
        
        return {
          success: true,
          strategy: 'plugin-isolation',
          warnings: ['Plugin running in restricted mode'],
          metadata: {
            restrictions: sandbox.getRestrictions()
          }
        }
      }
    } catch {
      // Continue to next strategy
    }
    
    return { success: false }
  }
}
```

## Recovery Monitoring

### Recovery Metrics

```typescript
interface RecoveryMetrics {
  totalAttempts: number
  successfulRecoveries: number
  failedRecoveries: number
  averageRecoveryTime: number
  recoveryByStrategy: Map<string, StrategyMetrics>
  dataLossIncidents: number
}

class RecoveryMonitor {
  private metrics: RecoveryMetrics
  
  recordRecovery(
    error: StoryLinterError,
    strategy: RecoveryStrategy,
    result: RecoveryResult
  ): void {
    this.metrics.totalAttempts++
    
    if (result.success) {
      this.metrics.successfulRecoveries++
    } else {
      this.metrics.failedRecoveries++
    }
    
    // Update strategy metrics
    const strategyMetrics = this.getStrategyMetrics(strategy)
    strategyMetrics.attempts++
    
    if (result.success) {
      strategyMetrics.successes++
      strategyMetrics.totalTime += result.duration
    }
    
    // Check for data loss
    if (strategy.dataLoss !== DataLossRisk.NONE && result.success) {
      this.metrics.dataLossIncidents++
    }
  }
  
  getRecommendations(): RecoveryRecommendation[] {
    const recommendations: RecoveryRecommendation[] = []
    
    // Analyze success rates
    for (const [strategy, metrics] of this.metrics.recoveryByStrategy) {
      const successRate = metrics.successes / metrics.attempts
      
      if (successRate < 0.3) {
        recommendations.push({
          type: 'disable-strategy',
          strategy,
          reason: `Low success rate: ${(successRate * 100).toFixed(1)}%`
        })
      }
    }
    
    // Check for patterns
    const patterns = this.analyzePatterns()
    recommendations.push(...patterns)
    
    return recommendations
  }
}
```

### Recovery History

```typescript
class RecoveryHistory {
  private history: RecoveryRecord[] = []
  private maxRecords = 1000
  
  record(record: RecoveryRecord): void {
    this.history.push(record)
    
    // Maintain size limit
    if (this.history.length > this.maxRecords) {
      this.history.shift()
    }
    
    // Persist to disk
    this.persist()
  }
  
  findSimilar(error: StoryLinterError): RecoveryRecord[] {
    return this.history.filter(record => 
      record.error.code === error.code &&
      this.contextSimilarity(record.error.context, error.context) > 0.8
    )
  }
  
  getMostSuccessfulStrategy(errorCode: string): string | null {
    const strategies = this.history
      .filter(r => r.error.code === errorCode && r.success)
      .reduce((acc, record) => {
        acc[record.strategy] = (acc[record.strategy] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    
    const sorted = Object.entries(strategies)
      .sort(([, a], [, b]) => b - a)
    
    return sorted[0]?.[0] || null
  }
}
```

## Best Practices

### Recovery Guidelines

1. **Prioritize Data Integrity**
   - Never sacrifice data for speed
   - Always validate recovered data
   - Maintain audit trails

2. **Fail Fast, Recover Smart**
   - Don't retry indefinitely
   - Use exponential backoff
   - Know when to give up

3. **User Communication**
   - Inform users of recovery attempts
   - Provide progress updates
   - Explain any data loss

4. **Learn from Failures**
   - Analyze recovery patterns
   - Update strategies based on success rates
   - Share learnings across components

### Recovery Implementation

```typescript
// Good: Comprehensive recovery with fallbacks
async function recoverableOperation<T>(
  operation: () => Promise<T>,
  context: OperationContext
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    const recovery = new RecoveryManager()
    const result = await recovery.recover(error)
    
    if (result.success) {
      logger.info('Recovered from error', {
        error: error.code,
        strategy: result.strategy
      })
      return result.recovered
    }
    
    throw new UnrecoverableError(
      'Operation failed and recovery was unsuccessful',
      error
    )
  }
}

// Good: Recovery with user notification
async function interactiveRecovery(error: StoryLinterError): Promise<void> {
  const ui = new RecoveryUI()
  
  await ui.notify('An error occurred, attempting recovery...')
  
  const result = await recoveryManager.recover(error)
  
  if (result.success) {
    await ui.notifySuccess('Recovery successful', result)
  } else {
    const action = await ui.promptAction(
      'Automatic recovery failed',
      ['Retry', 'Skip', 'Abort']
    )
    
    await handleUserAction(action, error)
  }
}
```

## Future Enhancements

1. **Machine Learning Recovery**
   - Predict recovery success
   - Learn optimal strategies
   - Adaptive recovery selection

2. **Distributed Recovery**
   - Cross-node recovery coordination
   - Distributed state reconstruction
   - Consensus-based recovery

3. **Proactive Recovery**
   - Predict failures before they occur
   - Preemptive resource allocation
   - Continuous health monitoring

4. **Advanced User Interaction**
   - Visual recovery progress
   - Interactive recovery options
   - Recovery simulation mode
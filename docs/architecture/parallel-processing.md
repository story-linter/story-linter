# Parallel File Processing Architecture

## Overview

Process multiple files concurrently to improve performance on multi-core systems. This is especially important for validating large projects with hundreds of files.

## Design Approach

### 1. Worker Pool Pattern

```typescript
interface WorkerPool {
  // Process files in parallel batches
  processFiles(files: string[], batchSize: number): Promise<ProcessedFile[]>;
  
  // Graceful shutdown
  terminate(): Promise<void>;
}

class FileProcessorPool implements WorkerPool {
  private workers: Worker[] = [];
  private queue: TaskQueue;
  
  constructor(
    private readonly workerCount: number = os.cpus().length,
    private readonly fileProcessor: FileProcessor
  ) {
    this.initializeWorkers();
  }
  
  async processFiles(files: string[], batchSize: number = 10): Promise<ProcessedFile[]> {
    // Divide files into batches
    const batches = chunk(files, batchSize);
    
    // Process batches in parallel
    const results = await Promise.all(
      batches.map(batch => this.processBatch(batch))
    );
    
    return results.flat();
  }
  
  private async processBatch(files: string[]): Promise<ProcessedFile[]> {
    // Use worker threads for CPU-intensive parsing
    // or just Promise.all for I/O-bound operations
    return Promise.all(
      files.map(file => this.fileProcessor.process(file))
    );
  }
}
```

### 2. Validation Orchestration

```typescript
class ParallelValidationOrchestrator {
  constructor(
    private readonly filePool: WorkerPool,
    private readonly validatorRunner: ValidatorRunner
  ) {}
  
  async validate(files: string[]): Promise<ValidationResult> {
    // Phase 1: Process files in parallel
    const processedFiles = await this.filePool.processFiles(files);
    
    // Phase 2: Build global state (sequential - needs all files)
    const globalState = await this.buildGlobalState(processedFiles);
    
    // Phase 3: Validate in parallel
    const validationTasks = files.map(file => 
      this.validateFile(file, globalState)
    );
    
    const results = await Promise.all(validationTasks);
    
    return this.aggregateResults(results);
  }
}
```

### 3. Implementation Strategy

For MVP, we can use a simpler approach without worker threads:

```typescript
class SimpleParallelProcessor {
  async processFiles(
    files: string[], 
    concurrency: number = 10
  ): Promise<ProcessedFile[]> {
    const results: ProcessedFile[] = [];
    
    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(file => this.processFile(file))
      );
      results.push(...batchResults);
    }
    
    return results;
  }
}
```

## Benefits

1. **Performance**: 10x speedup on 10-core machines for file processing
2. **Scalability**: Handles thousands of files efficiently
3. **Resource Control**: Configurable concurrency limits
4. **Memory Efficiency**: Process in batches to avoid memory spikes

## Challenges

1. **State Management**: Some validators need all files before validating
2. **Error Handling**: One file failure shouldn't stop all processing
3. **Progress Reporting**: Need thread-safe progress updates
4. **Memory Usage**: Balance speed vs memory consumption

## Configuration

```yaml
# .story-linter.yml
performance:
  parallel: true
  concurrency: 10  # max files processed simultaneously
  workerThreads: false  # use worker threads (post-MVP)
  batchSize: 50  # files per batch
```

## MVP Implementation

For MVP, implement simple Promise.all batching:
- No worker threads (complexity)
- Configurable concurrency
- Progress reporting via events
- Error isolation per file
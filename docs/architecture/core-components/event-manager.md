# Event Manager

## Overview

The Event Manager is a core component that implements an event-driven architecture for the Story Linter. It provides a centralized system for component communication, enabling loose coupling between different parts of the application while maintaining performance and type safety.

## Responsibilities

1. **Event Registration and Dispatching**
   - Event type registration
   - Event listener management
   - Event emission and propagation
   - Event priority handling

2. **Event Lifecycle Management**
   - Event creation and validation
   - Event queuing and scheduling
   - Event completion tracking
   - Event history management

3. **Performance Optimization**
   - Event batching
   - Async event handling
   - Event throttling and debouncing
   - Memory-efficient event storage

4. **Error Handling**
   - Listener error isolation
   - Error propagation strategies
   - Failed event recovery
   - Dead letter queuing

5. **Type Safety**
   - Strongly typed events
   - Type-safe event handlers
   - Runtime type validation
   - Event schema enforcement

## Architecture

### Core Interfaces

```typescript
interface EventManager<TEventMap extends EventMap = EventMap> {
  // Registration
  on<K extends keyof TEventMap>(
    event: K,
    handler: EventHandler<TEventMap[K]>,
    options?: EventHandlerOptions
  ): Unsubscribe
  
  once<K extends keyof TEventMap>(
    event: K,
    handler: EventHandler<TEventMap[K]>
  ): Unsubscribe
  
  off<K extends keyof TEventMap>(
    event: K,
    handler?: EventHandler<TEventMap[K]>
  ): void
  
  // Emission
  emit<K extends keyof TEventMap>(
    event: K,
    payload: TEventMap[K]
  ): Promise<void>
  
  emitSync<K extends keyof TEventMap>(
    event: K,
    payload: TEventMap[K]
  ): void
  
  // Utilities
  waitFor<K extends keyof TEventMap>(
    event: K,
    timeout?: number
  ): Promise<TEventMap[K]>
  
  hasListeners(event: keyof TEventMap): boolean
  listenerCount(event?: keyof TEventMap): number
}
```

### Event Types

```typescript
interface EventMap {
  // Validation events
  'validation:started': ValidationStartedEvent
  'validation:completed': ValidationCompletedEvent
  'validation:failed': ValidationFailedEvent
  'validation:progress': ValidationProgressEvent
  
  // File events
  'file:changed': FileChangedEvent
  'file:created': FileCreatedEvent
  'file:deleted': FileDeletedEvent
  
  // Plugin events
  'plugin:loaded': PluginLoadedEvent
  'plugin:activated': PluginActivatedEvent
  'plugin:deactivated': PluginDeactivatedEvent
  'plugin:error': PluginErrorEvent
  
  // Schema events
  'schema:extracted': SchemaExtractedEvent
  'schema:updated': SchemaUpdatedEvent
  'schema:validated': SchemaValidatedEvent
  
  // System events
  'system:ready': SystemReadyEvent
  'system:shutdown': SystemShutdownEvent
  'system:error': SystemErrorEvent
}
```

### Event Handler Options

```typescript
interface EventHandlerOptions {
  priority?: EventPriority
  async?: boolean
  timeout?: number
  maxRetries?: number
  filter?: (payload: any) => boolean
}

enum EventPriority {
  HIGHEST = 0,
  HIGH = 10,
  NORMAL = 50,
  LOW = 90,
  LOWEST = 100
}
```

## Implementation Details

### Event Registration System

```typescript
class EventManager<TEventMap extends EventMap> {
  private handlers = new Map<keyof TEventMap, HandlerRegistry>()
  private eventQueue = new EventQueue()
  
  on<K extends keyof TEventMap>(
    event: K,
    handler: EventHandler<TEventMap[K]>,
    options: EventHandlerOptions = {}
  ): Unsubscribe {
    const registry = this.getOrCreateRegistry(event)
    const wrappedHandler = this.wrapHandler(handler, options)
    
    registry.add(wrappedHandler, options.priority)
    
    return () => {
      registry.remove(wrappedHandler)
    }
  }
  
  private wrapHandler<T>(
    handler: EventHandler<T>,
    options: EventHandlerOptions
  ): WrappedHandler<T> {
    return {
      original: handler,
      options,
      execute: async (payload: T) => {
        if (options.filter && !options.filter(payload)) {
          return
        }
        
        if (options.timeout) {
          return this.executeWithTimeout(handler, payload, options.timeout)
        }
        
        return handler(payload)
      }
    }
  }
}
```

### Event Emission System

```typescript
class EventManager<TEventMap extends EventMap> {
  async emit<K extends keyof TEventMap>(
    event: K,
    payload: TEventMap[K]
  ): Promise<void> {
    const eventData = this.createEventData(event, payload)
    
    if (this.shouldQueue(event)) {
      return this.eventQueue.enqueue(eventData)
    }
    
    return this.executeHandlers(eventData)
  }
  
  private async executeHandlers(eventData: EventData): Promise<void> {
    const registry = this.handlers.get(eventData.type)
    if (!registry) return
    
    const handlers = registry.getHandlersByPriority()
    const errors: Error[] = []
    
    for (const handler of handlers) {
      try {
        if (handler.options.async === false) {
          await handler.execute(eventData.payload)
        } else {
          // Fire and forget for async handlers
          handler.execute(eventData.payload).catch(error => {
            this.handleError(eventData, handler, error)
          })
        }
      } catch (error) {
        errors.push(error as Error)
        
        if (!this.shouldContinueOnError(handler.options)) {
          throw new AggregateError(errors, `Event ${eventData.type} failed`)
        }
      }
    }
  }
}
```

### Event Queue Implementation

```typescript
class EventQueue {
  private queue: EventData[] = []
  private processing = false
  private batchSize = 100
  private batchDelay = 10
  
  async enqueue(event: EventData): Promise<void> {
    this.queue.push(event)
    
    if (!this.processing) {
      this.startProcessing()
    }
  }
  
  private async startProcessing(): Promise<void> {
    this.processing = true
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize)
      
      await Promise.all(
        batch.map(event => this.processEvent(event))
      )
      
      if (this.queue.length > 0) {
        await this.delay(this.batchDelay)
      }
    }
    
    this.processing = false
  }
}
```

### Event Filtering and Transformation

```typescript
class EventManager<TEventMap extends EventMap> {
  private filters = new Map<keyof TEventMap, EventFilter[]>()
  private transformers = new Map<keyof TEventMap, EventTransformer[]>()
  
  addFilter<K extends keyof TEventMap>(
    event: K,
    filter: EventFilter<TEventMap[K]>
  ): void {
    const filters = this.filters.get(event) || []
    filters.push(filter)
    this.filters.set(event, filters)
  }
  
  addTransformer<K extends keyof TEventMap>(
    event: K,
    transformer: EventTransformer<TEventMap[K]>
  ): void {
    const transformers = this.transformers.get(event) || []
    transformers.push(transformer)
    this.transformers.set(event, transformers)
  }
  
  private async applyFiltersAndTransformers<K extends keyof TEventMap>(
    event: K,
    payload: TEventMap[K]
  ): Promise<TEventMap[K] | null> {
    // Apply filters
    const filters = this.filters.get(event) || []
    for (const filter of filters) {
      if (!await filter(payload)) {
        return null
      }
    }
    
    // Apply transformers
    const transformers = this.transformers.get(event) || []
    let transformed = payload
    
    for (const transformer of transformers) {
      transformed = await transformer(transformed)
    }
    
    return transformed
  }
}
```

## Integration Points

### With Validation Engine

```typescript
class ValidationEngine {
  constructor(private events: EventManager) {
    this.setupEventHandlers()
  }
  
  private setupEventHandlers(): void {
    this.events.on('file:changed', this.handleFileChange.bind(this))
    this.events.on('schema:updated', this.handleSchemaUpdate.bind(this))
  }
  
  async validate(files: string[]): Promise<ValidationResult> {
    await this.events.emit('validation:started', {
      files,
      timestamp: Date.now()
    })
    
    try {
      const result = await this.performValidation(files)
      
      await this.events.emit('validation:completed', {
        result,
        timestamp: Date.now()
      })
      
      return result
    } catch (error) {
      await this.events.emit('validation:failed', {
        error,
        files,
        timestamp: Date.now()
      })
      
      throw error
    }
  }
}
```

### With Plugin Manager

```typescript
class PluginManager {
  constructor(private events: EventManager) {
    this.registerPluginEvents()
  }
  
  private registerPluginEvents(): void {
    // Allow plugins to register event handlers
    this.pluginAPI = {
      on: (event, handler) => {
        return this.events.on(event, handler, {
          priority: EventPriority.LOW // Plugins have lower priority
        })
      },
      emit: (event, payload) => {
        // Validate plugin has permission to emit this event
        if (this.canEmitEvent(this.currentPlugin, event)) {
          return this.events.emit(event, payload)
        }
        throw new PermissionError(`Plugin cannot emit ${event}`)
      }
    }
  }
}
```

### With File Watcher

```typescript
class FileWatcher {
  constructor(
    private events: EventManager,
    private config: ConfigurationManager
  ) {
    this.setupWatchers()
  }
  
  private setupWatchers(): void {
    const paths = this.config.get('watch.paths', [])
    
    for (const path of paths) {
      this.watch(path, {
        onChange: (file) => {
          this.events.emit('file:changed', {
            path: file,
            timestamp: Date.now()
          })
        },
        onCreate: (file) => {
          this.events.emit('file:created', {
            path: file,
            timestamp: Date.now()
          })
        },
        onDelete: (file) => {
          this.events.emit('file:deleted', {
            path: file,
            timestamp: Date.now()
          })
        }
      })
    }
  }
}
```

## Error Handling

### Error Types

```typescript
class EventError extends Error {
  constructor(
    message: string,
    public event: string,
    public handler: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'EventError'
  }
}

class EventTimeoutError extends EventError {
  constructor(event: string, handler: string, timeout: number) {
    super(
      `Event handler timed out after ${timeout}ms`,
      event,
      handler
    )
    this.name = 'EventTimeoutError'
  }
}
```

### Error Recovery

```typescript
class EventManager<TEventMap extends EventMap> {
  private deadLetterQueue = new DeadLetterQueue()
  
  private async handleError(
    event: EventData,
    handler: WrappedHandler,
    error: Error
  ): Promise<void> {
    const errorEvent: SystemErrorEvent = {
      error,
      context: {
        event: event.type,
        handler: handler.original.name,
        payload: event.payload
      },
      timestamp: Date.now()
    }
    
    // Emit system error event
    await this.emit('system:error', errorEvent)
    
    // Add to dead letter queue if configured
    if (handler.options.maxRetries) {
      await this.deadLetterQueue.add(event, handler, error)
    }
    
    // Log the error
    logger.error('Event handler error:', {
      event: event.type,
      handler: handler.original.name,
      error: error.message,
      stack: error.stack
    })
  }
}
```

## Performance Optimizations

### Event Batching

```typescript
class EventBatcher<T> {
  private batch: T[] = []
  private timer: NodeJS.Timeout | null = null
  
  constructor(
    private handler: (batch: T[]) => Promise<void>,
    private options: BatchOptions = {}
  ) {}
  
  add(item: T): void {
    this.batch.push(item)
    
    if (this.batch.length >= (this.options.maxSize || 100)) {
      this.flush()
    } else if (!this.timer) {
      this.timer = setTimeout(
        () => this.flush(),
        this.options.delay || 100
      )
    }
  }
  
  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    
    if (this.batch.length === 0) return
    
    const items = this.batch
    this.batch = []
    
    await this.handler(items)
  }
}
```

### Event Throttling

```typescript
class EventThrottler {
  private lastEmit = new Map<string, number>()
  private queued = new Map<string, any>()
  
  shouldEmit(event: string, interval: number): boolean {
    const now = Date.now()
    const last = this.lastEmit.get(event) || 0
    
    if (now - last >= interval) {
      this.lastEmit.set(event, now)
      return true
    }
    
    return false
  }
  
  throttle<T>(
    event: string,
    payload: T,
    interval: number,
    emit: (payload: T) => Promise<void>
  ): void {
    if (this.shouldEmit(event, interval)) {
      emit(payload)
    } else {
      this.queued.set(event, payload)
      
      setTimeout(() => {
        const queued = this.queued.get(event)
        if (queued) {
          this.queued.delete(event)
          this.throttle(event, queued, interval, emit)
        }
      }, interval - (Date.now() - (this.lastEmit.get(event) || 0)))
    }
  }
}
```

## Testing Strategies

### Unit Tests

```typescript
describe('EventManager', () => {
  let events: EventManager<TestEventMap>
  
  beforeEach(() => {
    events = new EventManager()
  })
  
  describe('on/off', () => {
    it('should register and unregister handlers', () => {
      const handler = jest.fn()
      const unsubscribe = events.on('test:event', handler)
      
      expect(events.hasListeners('test:event')).toBe(true)
      expect(events.listenerCount('test:event')).toBe(1)
      
      unsubscribe()
      
      expect(events.hasListeners('test:event')).toBe(false)
    })
  })
  
  describe('emit', () => {
    it('should call handlers in priority order', async () => {
      const calls: number[] = []
      
      events.on('test:event', () => calls.push(2), {
        priority: EventPriority.NORMAL
      })
      
      events.on('test:event', () => calls.push(1), {
        priority: EventPriority.HIGH
      })
      
      events.on('test:event', () => calls.push(3), {
        priority: EventPriority.LOW
      })
      
      await events.emit('test:event', {})
      
      expect(calls).toEqual([1, 2, 3])
    })
  })
  
  describe('error handling', () => {
    it('should isolate handler errors', async () => {
      const handler1 = jest.fn().mockRejectedValue(new Error('Handler 1 error'))
      const handler2 = jest.fn()
      
      events.on('test:event', handler1)
      events.on('test:event', handler2)
      
      await events.emit('test:event', {})
      
      expect(handler2).toHaveBeenCalled()
    })
  })
})
```

### Integration Tests

```typescript
describe('EventManager Integration', () => {
  it('should handle complex event flows', async () => {
    const events = new EventManager<ApplicationEventMap>()
    const results: string[] = []
    
    // Set up event chain
    events.on('validation:started', async () => {
      results.push('validation started')
      await events.emit('validation:progress', { percent: 50 })
    })
    
    events.on('validation:progress', async ({ percent }) => {
      results.push(`progress: ${percent}%`)
      
      if (percent === 50) {
        await events.emit('validation:completed', {
          errors: [],
          warnings: []
        })
      }
    })
    
    events.on('validation:completed', () => {
      results.push('validation completed')
    })
    
    // Trigger the chain
    await events.emit('validation:started', { files: ['test.md'] })
    
    expect(results).toEqual([
      'validation started',
      'progress: 50%',
      'validation completed'
    ])
  })
})
```

## Future Enhancements

1. **Event Sourcing**
   - Complete event history
   - Event replay capabilities
   - Time-travel debugging

2. **Distributed Events**
   - Multi-process event handling
   - Network event propagation
   - Event clustering

3. **Advanced Analytics**
   - Event metrics collection
   - Performance profiling
   - Event flow visualization

4. **Schema Evolution**
   - Event versioning
   - Backward compatibility
   - Migration strategies
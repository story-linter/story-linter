# Plugin Interface

## Overview

This document defines the comprehensive plugin interface for the Story Linter. The plugin system allows developers to extend functionality through a well-defined API, ensuring plugins are powerful, safe, and maintainable.

## Core Plugin Interface

### Base Plugin Structure

```typescript
interface Plugin {
  // Metadata
  manifest: PluginManifest
  
  // Lifecycle hooks
  activate(context: PluginContext): Promise<void>
  deactivate(): Promise<void>
  
  // Optional capabilities
  capabilities?: PluginCapabilities
}

interface PluginManifest {
  // Required fields
  id: string
  name: string
  version: string
  author: string | Author
  main: string
  
  // Optional fields
  description?: string
  repository?: string
  homepage?: string
  license?: string
  keywords?: string[]
  
  // Dependencies
  dependencies?: PluginDependency[]
  peerDependencies?: PluginDependency[]
  
  // Requirements
  engines?: {
    storyLinter: string
    node?: string
  }
  
  // Permissions
  permissions?: PluginPermission[]
  
  // Configuration
  contributes?: PluginContributions
  configurationSchema?: JSONSchema
}
```

### Plugin Context

```typescript
interface PluginContext {
  // Plugin information
  plugin: {
    id: string
    version: string
    directory: string
  }
  
  // Core APIs
  validation: ValidationAPI
  schema: SchemaAPI
  fileSystem: FileSystemAPI
  configuration: ConfigurationAPI
  
  // Extension points
  extensionPoints: ExtensionPointAPI
  
  // Communication
  events: EventAPI
  commands: CommandAPI
  
  // Storage
  storage: StorageAPI
  
  // Utilities
  logger: LoggerAPI
  utilities: UtilityAPI
}
```

## Plugin Capabilities

### Capability Declaration

```typescript
interface PluginCapabilities {
  // What the plugin can provide
  provides: {
    validators?: ValidatorDescriptor[]
    extractors?: ExtractorDescriptor[]
    formatters?: FormatterDescriptor[]
    commands?: CommandDescriptor[]
    schemas?: SchemaDescriptor[]
  }
  
  // What the plugin requires
  requires: {
    apis?: string[]
    permissions?: string[]
    features?: string[]
  }
  
  // Plugin characteristics
  characteristics: {
    stateless?: boolean
    cacheable?: boolean
    parallelizable?: boolean
    deterministic?: boolean
  }
}
```

### Validator Interface

```typescript
interface ValidatorDescriptor {
  name: string
  description: string
  category: ValidatorCategory
  severity: SeverityLevel
  enabled: boolean
  configuration?: JSONSchema
}

interface Validator {
  // Metadata
  descriptor: ValidatorDescriptor
  
  // Validation methods
  validateFile(
    file: ParsedFile,
    context: ValidationContext
  ): Promise<ValidationIssue[]>
  
  validateProject?(
    files: ParsedFile[],
    context: ValidationContext
  ): Promise<ValidationIssue[]>
  
  // Configuration
  configure?(config: any): Promise<void>
  
  // Lifecycle
  initialize?(context: ValidationContext): Promise<void>
  finalize?(context: ValidationContext): Promise<void>
}
```

### Extractor Interface

```typescript
interface ExtractorDescriptor {
  name: string
  description: string
  extractionTypes: ExtractionType[]
  supportedFormats: string[]
  configuration?: JSONSchema
}

interface Extractor {
  // Metadata
  descriptor: ExtractorDescriptor
  
  // Extraction methods
  extract(
    content: string,
    options: ExtractorOptions
  ): Promise<ExtractionResult>
  
  extractFromFile(
    file: ParsedFile,
    options: ExtractorOptions
  ): Promise<ExtractionResult>
  
  // Configuration
  configure?(config: any): Promise<void>
}
```

### Formatter Interface

```typescript
interface FormatterDescriptor {
  name: string
  description: string
  format: OutputFormat
  mimeType: string
  fileExtension: string
  configuration?: JSONSchema
}

interface Formatter {
  // Metadata
  descriptor: FormatterDescriptor
  
  // Formatting methods
  format(
    results: ValidationResult,
    options: FormatterOptions
  ): Promise<string>
  
  formatStream?(
    results: AsyncIterable<ValidationResult>,
    options: FormatterOptions
  ): AsyncIterable<string>
  
  // Configuration
  configure?(config: any): Promise<void>
}
```

## API Interfaces

### Validation API

```typescript
interface ValidationAPI {
  // Run validation
  validate(
    files: string[],
    options?: ValidationOptions
  ): Promise<ValidationResult>
  
  // Register validators
  registerValidator(
    validator: Validator
  ): Disposable
  
  // Query validation state
  getValidationState(): ValidationState
  
  // Validation events
  onValidationStarted(
    handler: (e: ValidationStartedEvent) => void
  ): Disposable
  
  onValidationCompleted(
    handler: (e: ValidationCompletedEvent) => void
  ): Disposable
  
  onValidationProgress(
    handler: (e: ValidationProgressEvent) => void
  ): Disposable
}
```

### Schema API

```typescript
interface SchemaAPI {
  // Extract schemas
  extractSchema(
    files: string[],
    options?: SchemaOptions
  ): Promise<NarrativeSchema>
  
  // Query schemas
  getSchema(id: string): NarrativeSchema | undefined
  getCurrentSchema(): NarrativeSchema | undefined
  
  // Register extractors
  registerExtractor(
    extractor: Extractor
  ): Disposable
  
  // Schema events
  onSchemaUpdated(
    handler: (e: SchemaUpdatedEvent) => void
  ): Disposable
  
  // Schema utilities
  validateSchema(
    schema: NarrativeSchema
  ): SchemaValidationResult
  
  mergeSchemas(
    schemas: NarrativeSchema[]
  ): NarrativeSchema
}
```

### File System API

```typescript
interface FileSystemAPI {
  // File operations (restricted)
  readFile(
    path: string,
    options?: ReadOptions
  ): Promise<string>
  
  writeFile(
    path: string,
    content: string,
    options?: WriteOptions
  ): Promise<void>
  
  exists(path: string): Promise<boolean>
  
  // Directory operations
  readDirectory(
    path: string,
    options?: ReadDirectoryOptions
  ): Promise<DirectoryEntry[]>
  
  // File watching
  watch(
    pattern: string,
    handler: (e: FileChangeEvent) => void
  ): Disposable
  
  // Path utilities
  resolve(...paths: string[]): string
  relative(from: string, to: string): string
  isAbsolute(path: string): boolean
}
```

### Configuration API

```typescript
interface ConfigurationAPI {
  // Get configuration
  get<T>(key: string, defaultValue?: T): T
  
  // Update configuration
  update(
    key: string,
    value: any,
    target?: ConfigurationTarget
  ): Promise<void>
  
  // Configuration events
  onDidChangeConfiguration(
    handler: (e: ConfigurationChangeEvent) => void
  ): Disposable
  
  // Plugin-specific configuration
  getPluginConfiguration<T>(): T
  
  updatePluginConfiguration(
    config: any
  ): Promise<void>
}
```

### Event API

```typescript
interface EventAPI {
  // Emit events
  emit<T>(event: string, data: T): Promise<void>
  
  // Subscribe to events
  on<T>(
    event: string,
    handler: (data: T) => void
  ): Disposable
  
  once<T>(
    event: string,
    handler: (data: T) => void
  ): Disposable
  
  // Event utilities
  waitFor<T>(
    event: string,
    timeout?: number
  ): Promise<T>
  
  // Plugin-specific events
  createEventEmitter<T>(): EventEmitter<T>
}
```

### Command API

```typescript
interface CommandAPI {
  // Register commands
  registerCommand(
    command: string,
    handler: CommandHandler
  ): Disposable
  
  // Execute commands
  executeCommand<T>(
    command: string,
    ...args: any[]
  ): Promise<T>
  
  // Query commands
  getCommands(): string[]
  hasCommand(command: string): boolean
}
```

### Storage API

```typescript
interface StorageAPI {
  // Local storage (plugin-specific)
  local: {
    get<T>(key: string, defaultValue?: T): T
    set(key: string, value: any): Promise<void>
    delete(key: string): Promise<void>
    clear(): Promise<void>
  }
  
  // Global storage (shared)
  global: {
    get<T>(key: string, defaultValue?: T): T
    set(key: string, value: any): Promise<void>
  }
  
  // Temporary storage
  temp: {
    createFile(
      prefix: string,
      content: string
    ): Promise<string>
    
    createDirectory(prefix: string): Promise<string>
  }
}
```

## Extension Points

### Extension Point Registration

```typescript
interface ExtensionPointAPI {
  // Register extension points
  register(
    point: ExtensionPoint
  ): Disposable
  
  // Query extension points
  getExtensionPoint(
    id: string
  ): ExtensionPoint | undefined
  
  getAllExtensionPoints(): ExtensionPoint[]
  
  // Contribute to extension points
  contribute(
    pointId: string,
    contribution: any
  ): Disposable
}

interface ExtensionPoint {
  id: string
  description: string
  schema: JSONSchema
  multiple: boolean
  validator?: (contribution: any) => boolean
}
```

### Common Extension Points

```typescript
// Validation rules
interface ValidationRuleContribution {
  rule: ValidationRule
  priority?: number
  enabledByDefault?: boolean
}

// Schema patterns
interface SchemaPatternContribution {
  pattern: SchemaPattern
  extractor: Extractor
  weight?: number
}

// Output formats
interface OutputFormatContribution {
  format: string
  formatter: Formatter
  mimeType: string
  fileExtension: string
}

// Language support
interface LanguageContribution {
  language: string
  fileExtensions: string[]
  parser: Parser
  validators?: Validator[]
}
```

## Security Model

### Permission System

```typescript
enum PluginPermission {
  // File system
  READ_FILES = 'fs.read',
  WRITE_FILES = 'fs.write',
  
  // Network
  NETWORK_ACCESS = 'network.access',
  
  // System
  EXECUTE_COMMANDS = 'system.execute',
  ENVIRONMENT_VARIABLES = 'system.env',
  
  // Data
  SCHEMA_WRITE = 'schema.write',
  CONFIGURATION_WRITE = 'config.write',
  
  // UI
  SHOW_NOTIFICATIONS = 'ui.notifications',
  SHOW_DIALOGS = 'ui.dialogs'
}

interface PermissionRequest {
  permission: PluginPermission
  reason: string
  optional?: boolean
}
```

### Sandbox Restrictions

```typescript
interface PluginSandbox {
  // Resource limits
  limits: {
    memory: number // bytes
    cpu: number // percentage
    timeout: number // milliseconds
    fileSize: number // bytes
  }
  
  // Access restrictions
  restrictions: {
    allowedPaths: string[]
    deniedPaths: string[]
    allowedHosts: string[]
    deniedCommands: string[]
  }
  
  // API restrictions
  apiRestrictions: {
    maxEventsPerSecond: number
    maxStorageSize: number
    maxConcurrentOperations: number
  }
}
```

## Plugin Development

### Plugin Template

```typescript
// plugin.ts
import { Plugin, PluginContext } from '@story-linter/plugin-api'

export default class MyPlugin implements Plugin {
  manifest = {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    author: 'Plugin Author',
    main: './dist/index.js'
  }
  
  async activate(context: PluginContext): Promise<void> {
    // Register validators
    context.validation.registerValidator(
      new MyValidator()
    )
    
    // Register commands
    context.commands.registerCommand(
      'myPlugin.doSomething',
      this.doSomething.bind(this)
    )
    
    // Subscribe to events
    context.events.on(
      'validation:completed',
      this.onValidationCompleted.bind(this)
    )
  }
  
  async deactivate(): Promise<void> {
    // Cleanup resources
  }
  
  private async doSomething(): Promise<void> {
    // Command implementation
  }
  
  private onValidationCompleted(
    event: ValidationCompletedEvent
  ): void {
    // Event handler
  }
}
```

### Type Definitions

```typescript
// @types/story-linter-plugin.d.ts
declare module '@story-linter/plugin-api' {
  export interface Plugin { /* ... */ }
  export interface PluginContext { /* ... */ }
  export interface Validator { /* ... */ }
  // ... other exports
}
```

## Testing Support

### Plugin Test Framework

```typescript
interface PluginTestContext extends PluginContext {
  // Test utilities
  test: {
    createFile(path: string, content: string): void
    deleteFile(path: string): void
    
    runValidation(
      files: string[]
    ): Promise<ValidationResult>
    
    expectIssue(
      issue: Partial<ValidationIssue>
    ): void
    
    expectNoIssues(): void
  }
  
  // Mock APIs
  mock: {
    configuration(config: any): void
    schema(schema: NarrativeSchema): void
    fileSystem(fs: Partial<FileSystemAPI>): void
  }
}
```

### Test Example

```typescript
import { test } from '@story-linter/plugin-test'
import MyPlugin from './plugin'

test('validates character consistency', async (t) => {
  const plugin = new MyPlugin()
  await plugin.activate(t.context)
  
  t.test.createFile('story.md', `
    # Chapter 1
    Alice walked into the room.
    
    # Chapter 2
    Alise entered quietly.
  `)
  
  const result = await t.test.runValidation(['story.md'])
  
  t.test.expectIssue({
    type: 'character-inconsistency',
    message: /Alice.*Alise/
  })
})
```

## Best Practices

### Plugin Guidelines

1. **Stateless Design**
   - Avoid global state
   - Use context-provided storage
   - Support multiple instances

2. **Error Handling**
   - Never crash the host
   - Provide meaningful error messages
   - Support graceful degradation

3. **Performance**
   - Minimize startup time
   - Use async operations
   - Support cancellation

4. **Security**
   - Request minimal permissions
   - Validate all inputs
   - Avoid eval() and dynamic code

5. **Compatibility**
   - Follow semantic versioning
   - Maintain backward compatibility
   - Document breaking changes

### API Usage Examples

```typescript
// Good: Using provided APIs
const content = await context.fileSystem.readFile(path)

// Bad: Direct file system access
const content = fs.readFileSync(path, 'utf8')

// Good: Respecting cancellation
async validateFile(file, context) {
  for (const check of checks) {
    if (context.isCancelled) {
      return []
    }
    await performCheck(check)
  }
}

// Good: Proper error handling
try {
  const result = await riskyOperation()
} catch (error) {
  context.logger.error('Operation failed', error)
  return defaultResult
}
```

## Future Considerations

1. **WebAssembly Plugins**
   - WASM runtime support
   - Language-agnostic plugins
   - Enhanced sandboxing

2. **Remote Plugins**
   - Network-based plugins
   - Plugin marketplace
   - Auto-updates

3. **AI Integration**
   - ML model support
   - Training data API
   - Inference optimization

4. **Performance APIs**
   - Profiling support
   - Metrics collection
   - Optimization hints
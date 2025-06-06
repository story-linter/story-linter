# Error Hierarchy

## Overview

This document defines the comprehensive error hierarchy for the Story Linter, providing a structured approach to error handling, categorization, and recovery. A well-designed error hierarchy enables better debugging, user experience, and system reliability.

## Base Error Classes

### Core Error Structure

```typescript
abstract class StoryLinterError extends Error {
  readonly code: string
  readonly severity: ErrorSeverity
  readonly recoverable: boolean
  readonly context: ErrorContext
  readonly timestamp: Date
  readonly id: string
  
  constructor(
    message: string,
    code: string,
    options: ErrorOptions = {}
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.severity = options.severity || 'error'
    this.recoverable = options.recoverable ?? false
    this.context = options.context || {}
    this.timestamp = new Date()
    this.id = generateErrorId()
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor)
  }
  
  toJSON(): ErrorJSON {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      recoverable: this.recoverable,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    }
  }
}

enum ErrorSeverity {
  CRITICAL = 'critical', // System cannot continue
  ERROR = 'error',       // Operation failed
  WARNING = 'warning',   // Operation completed with issues
  INFO = 'info'         // Informational only
}

interface ErrorContext {
  file?: string
  line?: number
  column?: number
  validator?: string
  operation?: string
  [key: string]: any
}
```

### Error Categories

```typescript
abstract class ValidationError extends StoryLinterError {
  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message, `VALIDATION_${code}`, options)
  }
}

abstract class SystemError extends StoryLinterError {
  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message, `SYSTEM_${code}`, options)
  }
}

abstract class ConfigurationError extends StoryLinterError {
  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message, `CONFIG_${code}`, options)
  }
}

abstract class PluginError extends StoryLinterError {
  readonly pluginId: string
  
  constructor(
    message: string,
    code: string,
    pluginId: string,
    options?: ErrorOptions
  ) {
    super(message, `PLUGIN_${code}`, options)
    this.pluginId = pluginId
  }
}
```

## Validation Errors

### File Processing Errors

```typescript
class FileNotFoundError extends ValidationError {
  constructor(file: string) {
    super(
      `File not found: ${file}`,
      'FILE_NOT_FOUND',
      {
        severity: 'error',
        recoverable: false,
        context: { file }
      }
    )
  }
}

class FileAccessError extends ValidationError {
  constructor(file: string, reason: string) {
    super(
      `Cannot access file ${file}: ${reason}`,
      'FILE_ACCESS',
      {
        severity: 'error',
        recoverable: false,
        context: { file, reason }
      }
    )
  }
}

class FileParseError extends ValidationError {
  constructor(file: string, error: Error, position?: Position) {
    super(
      `Failed to parse ${file}: ${error.message}`,
      'FILE_PARSE',
      {
        severity: 'error',
        recoverable: false,
        context: {
          file,
          parseError: error.message,
          position
        }
      }
    )
  }
}

class EncodingError extends ValidationError {
  constructor(file: string, encoding: string) {
    super(
      `Unsupported encoding in ${file}: ${encoding}`,
      'ENCODING',
      {
        severity: 'error',
        recoverable: true,
        context: { file, encoding }
      }
    )
  }
}
```

### Schema Errors

```typescript
class SchemaExtractionError extends ValidationError {
  constructor(file: string, reason: string) {
    super(
      `Failed to extract schema from ${file}: ${reason}`,
      'SCHEMA_EXTRACTION',
      {
        severity: 'error',
        recoverable: true,
        context: { file, reason }
      }
    )
  }
}

class SchemaValidationError extends ValidationError {
  constructor(schema: string, violations: SchemaViolation[]) {
    super(
      `Schema validation failed: ${violations.length} violations`,
      'SCHEMA_VALIDATION',
      {
        severity: 'error',
        recoverable: false,
        context: { schema, violations }
      }
    )
  }
}

class SchemaMergeError extends ValidationError {
  constructor(schemas: string[], conflict: string) {
    super(
      `Cannot merge schemas: ${conflict}`,
      'SCHEMA_MERGE',
      {
        severity: 'error',
        recoverable: false,
        context: { schemas, conflict }
      }
    )
  }
}
```

### Validator Errors

```typescript
class ValidatorNotFoundError extends ValidationError {
  constructor(validator: string) {
    super(
      `Validator not found: ${validator}`,
      'VALIDATOR_NOT_FOUND',
      {
        severity: 'error',
        recoverable: false,
        context: { validator }
      }
    )
  }
}

class ValidatorExecutionError extends ValidationError {
  constructor(validator: string, error: Error) {
    super(
      `Validator ${validator} failed: ${error.message}`,
      'VALIDATOR_EXECUTION',
      {
        severity: 'error',
        recoverable: true,
        context: {
          validator,
          originalError: error.message,
          stack: error.stack
        }
      }
    )
  }
}

class ValidatorTimeoutError extends ValidationError {
  constructor(validator: string, timeout: number) {
    super(
      `Validator ${validator} timed out after ${timeout}ms`,
      'VALIDATOR_TIMEOUT',
      {
        severity: 'error',
        recoverable: true,
        context: { validator, timeout }
      }
    )
  }
}
```

## System Errors

### Resource Errors

```typescript
class OutOfMemoryError extends SystemError {
  constructor(operation: string, required: number, available: number) {
    super(
      `Out of memory during ${operation}: required ${required}MB, available ${available}MB`,
      'OUT_OF_MEMORY',
      {
        severity: 'critical',
        recoverable: false,
        context: { operation, required, available }
      }
    )
  }
}

class DiskSpaceError extends SystemError {
  constructor(path: string, required: number, available: number) {
    super(
      `Insufficient disk space at ${path}: required ${required}MB, available ${available}MB`,
      'DISK_SPACE',
      {
        severity: 'critical',
        recoverable: false,
        context: { path, required, available }
      }
    )
  }
}

class ResourceLimitError extends SystemError {
  constructor(resource: string, limit: number, requested: number) {
    super(
      `Resource limit exceeded for ${resource}: limit ${limit}, requested ${requested}`,
      'RESOURCE_LIMIT',
      {
        severity: 'error',
        recoverable: true,
        context: { resource, limit, requested }
      }
    )
  }
}
```

### Process Errors

```typescript
class WorkerError extends SystemError {
  readonly workerId: string
  
  constructor(workerId: string, error: Error) {
    super(
      `Worker ${workerId} error: ${error.message}`,
      'WORKER_ERROR',
      {
        severity: 'error',
        recoverable: true,
        context: {
          workerId,
          originalError: error.message
        }
      }
    )
    this.workerId = workerId
  }
}

class ProcessCommunicationError extends SystemError {
  constructor(process: string, reason: string) {
    super(
      `Failed to communicate with ${process}: ${reason}`,
      'PROCESS_COMMUNICATION',
      {
        severity: 'error',
        recoverable: true,
        context: { process, reason }
      }
    )
  }
}
```

## Configuration Errors

### Configuration Loading Errors

```typescript
class ConfigFileNotFoundError extends ConfigurationError {
  constructor(configFile: string) {
    super(
      `Configuration file not found: ${configFile}`,
      'FILE_NOT_FOUND',
      {
        severity: 'warning',
        recoverable: true,
        context: { configFile }
      }
    )
  }
}

class ConfigParseError extends ConfigurationError {
  constructor(configFile: string, error: Error) {
    super(
      `Failed to parse configuration file ${configFile}: ${error.message}`,
      'PARSE_ERROR',
      {
        severity: 'error',
        recoverable: false,
        context: {
          configFile,
          parseError: error.message
        }
      }
    )
  }
}

class ConfigValidationError extends ConfigurationError {
  constructor(violations: ConfigViolation[]) {
    super(
      `Configuration validation failed: ${violations.length} violations`,
      'VALIDATION_ERROR',
      {
        severity: 'error',
        recoverable: false,
        context: { violations }
      }
    )
  }
}
```

### Configuration Value Errors

```typescript
class InvalidConfigValueError extends ConfigurationError {
  constructor(key: string, value: any, expected: string) {
    super(
      `Invalid configuration value for ${key}: expected ${expected}, got ${typeof value}`,
      'INVALID_VALUE',
      {
        severity: 'error',
        recoverable: false,
        context: { key, value, expected }
      }
    )
  }
}

class MissingRequiredConfigError extends ConfigurationError {
  constructor(key: string) {
    super(
      `Missing required configuration: ${key}`,
      'MISSING_REQUIRED',
      {
        severity: 'error',
        recoverable: false,
        context: { key }
      }
    )
  }
}
```

## Plugin Errors

### Plugin Loading Errors

```typescript
class PluginLoadError extends PluginError {
  constructor(pluginId: string, reason: string) {
    super(
      `Failed to load plugin ${pluginId}: ${reason}`,
      'LOAD_ERROR',
      pluginId,
      {
        severity: 'error',
        recoverable: false,
        context: { reason }
      }
    )
  }
}

class PluginDependencyError extends PluginError {
  constructor(pluginId: string, dependency: string, reason: string) {
    super(
      `Plugin ${pluginId} dependency error: ${dependency} - ${reason}`,
      'DEPENDENCY_ERROR',
      pluginId,
      {
        severity: 'error',
        recoverable: false,
        context: { dependency, reason }
      }
    )
  }
}

class PluginVersionError extends PluginError {
  constructor(pluginId: string, required: string, found: string) {
    super(
      `Plugin ${pluginId} version mismatch: required ${required}, found ${found}`,
      'VERSION_ERROR',
      pluginId,
      {
        severity: 'error',
        recoverable: false,
        context: { required, found }
      }
    )
  }
}
```

### Plugin Runtime Errors

```typescript
class PluginExecutionError extends PluginError {
  constructor(pluginId: string, operation: string, error: Error) {
    super(
      `Plugin ${pluginId} execution error during ${operation}: ${error.message}`,
      'EXECUTION_ERROR',
      pluginId,
      {
        severity: 'error',
        recoverable: true,
        context: {
          operation,
          originalError: error.message
        }
      }
    )
  }
}

class PluginPermissionError extends PluginError {
  constructor(pluginId: string, permission: string) {
    super(
      `Plugin ${pluginId} lacks required permission: ${permission}`,
      'PERMISSION_ERROR',
      pluginId,
      {
        severity: 'error',
        recoverable: false,
        context: { permission }
      }
    )
  }
}

class PluginTimeoutError extends PluginError {
  constructor(pluginId: string, operation: string, timeout: number) {
    super(
      `Plugin ${pluginId} timed out during ${operation} after ${timeout}ms`,
      'TIMEOUT_ERROR',
      pluginId,
      {
        severity: 'error',
        recoverable: true,
        context: { operation, timeout }
      }
    )
  }
}
```

## Aggregate Errors

### Multiple Error Handling

```typescript
class AggregateError extends StoryLinterError {
  readonly errors: StoryLinterError[]
  
  constructor(errors: StoryLinterError[], message?: string) {
    const errorMessage = message || 
      `Multiple errors occurred: ${errors.length} errors`
    
    super(
      errorMessage,
      'AGGREGATE_ERROR',
      {
        severity: AggregateError.calculateSeverity(errors),
        recoverable: errors.some(e => e.recoverable),
        context: {
          errorCount: errors.length,
          errorCodes: errors.map(e => e.code)
        }
      }
    )
    
    this.errors = errors
  }
  
  static calculateSeverity(errors: StoryLinterError[]): ErrorSeverity {
    // Return the highest severity
    const severities = errors.map(e => e.severity)
    if (severities.includes('critical')) return 'critical'
    if (severities.includes('error')) return 'error'
    if (severities.includes('warning')) return 'warning'
    return 'info'
  }
  
  getErrorsByType<T extends StoryLinterError>(
    errorClass: new (...args: any[]) => T
  ): T[] {
    return this.errors.filter(e => e instanceof errorClass) as T[]
  }
}
```

### Validation Error Collection

```typescript
class ValidationErrorCollection extends AggregateError {
  constructor(errors: ValidationError[]) {
    super(errors, `Validation failed with ${errors.length} errors`)
  }
  
  getErrorsByFile(file: string): ValidationError[] {
    return this.errors.filter(
      e => e.context.file === file
    ) as ValidationError[]
  }
  
  getErrorsBySeverity(severity: ErrorSeverity): ValidationError[] {
    return this.errors.filter(
      e => e.severity === severity
    ) as ValidationError[]
  }
  
  toReport(): ValidationErrorReport {
    return {
      summary: {
        total: this.errors.length,
        bySeverity: this.groupBySeverity(),
        byFile: this.groupByFile(),
        byValidator: this.groupByValidator()
      },
      errors: this.errors.map(e => e.toJSON())
    }
  }
}
```

## Error Utilities

### Error Factory

```typescript
class ErrorFactory {
  private static builders = new Map<string, ErrorBuilder>()
  
  static register(code: string, builder: ErrorBuilder): void {
    this.builders.set(code, builder)
  }
  
  static create(code: string, params: any): StoryLinterError {
    const builder = this.builders.get(code)
    
    if (!builder) {
      return new StoryLinterError(
        `Unknown error code: ${code}`,
        'UNKNOWN_ERROR'
      )
    }
    
    return builder(params)
  }
}

// Usage
ErrorFactory.register('FILE_NOT_FOUND', (params) => 
  new FileNotFoundError(params.file)
)
```

### Error Serialization

```typescript
class ErrorSerializer {
  static serialize(error: StoryLinterError): string {
    return JSON.stringify(error.toJSON(), null, 2)
  }
  
  static deserialize(data: string): StoryLinterError {
    const json = JSON.parse(data)
    return ErrorFactory.create(json.code, json.context)
  }
  
  static toUserFriendly(error: StoryLinterError): string {
    const parts = [`${error.severity.toUpperCase()}: ${error.message}`]
    
    if (error.context.file) {
      parts.push(`  File: ${error.context.file}`)
    }
    
    if (error.context.line) {
      parts.push(`  Line: ${error.context.line}`)
    }
    
    if (error.recoverable) {
      parts.push(`  This error may be recoverable`)
    }
    
    return parts.join('\n')
  }
}
```

### Error Filtering

```typescript
class ErrorFilter {
  private filters: ErrorFilterRule[] = []
  
  addFilter(rule: ErrorFilterRule): void {
    this.filters.push(rule)
  }
  
  filter(errors: StoryLinterError[]): StoryLinterError[] {
    return errors.filter(error => 
      this.filters.every(filter => filter.shouldInclude(error))
    )
  }
}

interface ErrorFilterRule {
  shouldInclude(error: StoryLinterError): boolean
}

class SeverityFilter implements ErrorFilterRule {
  constructor(private minSeverity: ErrorSeverity) {}
  
  shouldInclude(error: StoryLinterError): boolean {
    return this.compareSeverity(error.severity) >= 0
  }
}
```

## Best Practices

### Error Creation Guidelines

1. **Be Specific**
   - Use descriptive error messages
   - Include relevant context
   - Provide actionable information

2. **Set Appropriate Severity**
   - Critical: System cannot continue
   - Error: Operation failed
   - Warning: Operation completed with issues
   - Info: Informational only

3. **Include Recovery Information**
   - Mark errors as recoverable when appropriate
   - Provide recovery suggestions in context

4. **Maintain Consistency**
   - Use consistent error codes
   - Follow naming conventions
   - Include standard context fields

### Error Handling Patterns

```typescript
// Good: Specific error with context
throw new FileParseError(
  file,
  originalError,
  { line: 42, column: 10 }
)

// Good: Aggregate related errors
const errors = files.map(file => validateFile(file))
if (errors.length > 0) {
  throw new ValidationErrorCollection(errors)
}

// Good: Provide recovery information
throw new ConfigurationError(
  'Invalid theme color',
  'INVALID_THEME_COLOR',
  {
    recoverable: true,
    context: {
      suggestion: 'Use a valid hex color code'
    }
  }
)
```

## Future Enhancements

1. **Error Analytics**
   - Error frequency tracking
   - Pattern detection
   - Automated error reporting

2. **Smart Error Recovery**
   - ML-based recovery suggestions
   - Automated fix attempts
   - Error prediction

3. **Enhanced Context**
   - Source code snippets
   - Visual error representation
   - Interactive debugging

4. **Internationalization**
   - Multi-language error messages
   - Localized recovery suggestions
   - Cultural adaptation
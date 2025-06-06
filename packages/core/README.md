# @story-linter/core

Core validation framework for Story Linter - the foundation that powers narrative consistency validation.

## Overview

The core package provides the essential infrastructure for Story Linter:
- Configuration management system
- Validation framework and orchestrator
- File system abstractions
- Base validator interfaces
- Plugin architecture foundation
- Type definitions and interfaces

## Installation

```bash
npm install @story-linter/core
```

## Key Components

### Configuration System
- **ConfigLoader**: Loads and parses `.story-linter.yml` configuration files
- Supports YAML configuration with validation
- Provides defaults and merging capabilities

### Validation Framework
- **ValidationOrchestrator**: Coordinates validation across multiple validators
- **ValidationFramework**: Core engine that manages the validation pipeline
- Event-driven architecture for extensibility
- Support for parallel and incremental validation

### File System Utilities
- **FileDiscovery**: Finds narrative files based on patterns
- **FileReader**: Reads and parses narrative files (Markdown, etc.)
- **NodeFileSystem**: Node.js file system adapter
- Abstracted file system interface for testing

### Base Components
- **BaseValidator**: Abstract base class for all validators
- Standard interfaces for validation results
- Plugin lifecycle management

## Architecture

The core follows SOLID principles with dependency injection:

```typescript
// All dependencies are injected
const fileSystem = new NodeFileSystem();
const configLoader = new ConfigLoader(fileSystem);
const orchestrator = new ValidationOrchestrator(validators, eventManager);
```

## Usage Example

```typescript
import { 
  ConfigLoader, 
  ValidationOrchestrator,
  NodeFileSystem 
} from '@story-linter/core';

// Initialize components
const fileSystem = new NodeFileSystem();
const configLoader = new ConfigLoader(fileSystem);

// Load configuration
const config = await configLoader.load('.story-linter.yml');

// Create and run validation
const orchestrator = new ValidationOrchestrator(validators);
const results = await orchestrator.validate(files);
```

## Type Definitions

The core package exports all essential TypeScript types:

```typescript
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface Validator {
  name: string;
  validate(context: ValidationContext): Promise<ValidationResult>;
}
```

## Development

The package follows Test-Driven Development (TDD):
- All components have comprehensive test coverage
- Uses dependency injection for testability
- No direct file system or external service access

## API Documentation

See the [API documentation](https://story-linter.dev/api/core) for detailed component references.

## License

MIT
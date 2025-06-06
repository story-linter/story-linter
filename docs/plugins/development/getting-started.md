# Getting Started with Plugin Development

## Overview

This guide will help you create your first Story Linter plugin. Plugins extend the core functionality by adding new validation rules, integrations, or features specific to your needs.

## Prerequisites

Before starting, ensure you have:

- Node.js 14+ installed
- Basic TypeScript/JavaScript knowledge
- Familiarity with Story Linter usage
- npm or yarn package manager

## Quick Start

### 1. Set Up Your Project

```bash
# Create plugin directory
mkdir story-linter-plugin-example
cd story-linter-plugin-example

# Initialize npm project
npm init -y

# Install dependencies
npm install --save-dev typescript @story-linter/plugin-api
npm install --save-dev @types/node jest

# Initialize TypeScript
npx tsc --init
```

### 2. Create Plugin Structure

```
story-linter-plugin-example/
├── src/
│   ├── index.ts          # Plugin entry point
│   ├── rules/            # Validation rules
│   │   └── example-rule.ts
│   └── types/            # TypeScript types
├── tests/                # Test files
├── package.json
├── tsconfig.json
└── README.md
```

### 3. Write Your First Plugin

```typescript
// src/index.ts
import { Plugin, PluginContext } from '@story-linter/plugin-api';

export default class ExamplePlugin implements Plugin {
  name = 'example-plugin';
  version = '1.0.0';
  
  async initialize(context: PluginContext): Promise<void> {
    // Register your rules
    context.registerRule({
      id: 'EXAMPLE001',
      name: 'example-rule',
      description: 'An example validation rule',
      severity: 'warning',
      validate: async (file) => {
        const errors = [];
        
        // Your validation logic here
        if (file.content.includes('TODO')) {
          errors.push({
            line: 1,
            column: 1,
            message: 'Found TODO comment',
            rule: 'EXAMPLE001'
          });
        }
        
        return errors;
      }
    });
  }
}
```

### 4. Build and Test

```bash
# Build TypeScript
npx tsc

# Run tests
npm test

# Link for local testing
npm link

# In a test project
npm link story-linter-plugin-example
```

## Core Concepts

### Plugin Lifecycle

1. **Discovery** - Story Linter finds your plugin
2. **Loading** - Plugin module is loaded
3. **Initialization** - `initialize()` method called
4. **Configuration** - User settings applied
5. **Execution** - Rules run on files
6. **Cleanup** - Plugin cleanup if needed

### Plugin API

Key interfaces and methods:

```typescript
interface Plugin {
  name: string;
  version: string;
  initialize(context: PluginContext): Promise<void>;
  configure?(config: any): Promise<void>;
  cleanup?(): Promise<void>;
}

interface PluginContext {
  registerRule(rule: ValidationRule): void;
  registerCommand(command: Command): void;
  registerHook(hook: Hook): void;
  getConfig(): PluginConfig;
  getLogger(): Logger;
}
```

### Validation Rules

Rules are the core of most plugins:

```typescript
interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  validate(file: StoryFile): Promise<ValidationError[]>;
  fix?(file: StoryFile, error: ValidationError): Promise<FixResult>;
}
```

## Common Plugin Types

### 1. Validation Plugins

Add new validation rules:

```typescript
context.registerRule({
  id: 'CUSTOM001',
  name: 'chapter-length',
  description: 'Validates chapter length',
  severity: 'warning',
  validate: async (file) => {
    const wordCount = file.content.split(/\s+/).length;
    if (wordCount < 1000) {
      return [{
        line: 1,
        column: 1,
        message: `Chapter too short: ${wordCount} words`,
        rule: 'CUSTOM001'
      }];
    }
    return [];
  }
});
```

### 2. Integration Plugins

Connect with external services:

```typescript
export default class GitHubPlugin implements Plugin {
  async initialize(context: PluginContext): Promise<void> {
    context.registerCommand({
      name: 'github:sync',
      description: 'Sync with GitHub',
      execute: async () => {
        // GitHub API integration
      }
    });
  }
}
```

### 3. Format Plugins

Support new file formats:

```typescript
context.registerFileHandler({
  extensions: ['.fountain'],
  parse: async (content: string) => {
    // Parse Fountain screenplay format
    return parsedContent;
  }
});
```

## Best Practices

1. **Start Simple** - Begin with basic functionality
2. **Test Thoroughly** - Write comprehensive tests
3. **Document Well** - Clear README and examples
4. **Handle Errors** - Graceful error handling
5. **Performance** - Optimize for large files
6. **Configuration** - Make behavior configurable

## Next Steps

- Read the [Plugin Structure](plugin-structure.md) guide
- Learn about [Testing Plugins](testing-plugins.md)
- Review [Best Practices](best-practices.md)
- See [Example Plugins](https://github.com/story-linter/plugins)

## Getting Help

- **Documentation**: [docs.story-linter.com](https://docs.story-linter.com)
- **Discord**: [Join our community](https://discord.gg/story-linter)
- **GitHub**: [Report issues](https://github.com/story-linter/cli)
- **Forum**: [Discussions](https://forum.story-linter.com)
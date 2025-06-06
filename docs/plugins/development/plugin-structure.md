# Plugin Structure

## Overview

This guide details the recommended structure and organization for Story Linter plugins, covering file layout, architecture patterns, and essential components.

## Standard Plugin Structure

```
my-story-linter-plugin/
├── src/
│   ├── index.ts              # Main entry point
│   ├── plugin.ts             # Plugin class implementation
│   ├── rules/                # Validation rules
│   │   ├── index.ts
│   │   ├── rule-one.ts
│   │   └── rule-two.ts
│   ├── commands/             # CLI commands
│   │   ├── index.ts
│   │   └── analyze.ts
│   ├── hooks/                # Lifecycle hooks
│   │   ├── pre-validate.ts
│   │   └── post-validate.ts
│   ├── utils/                # Utility functions
│   │   ├── parser.ts
│   │   └── helpers.ts
│   ├── types/                # TypeScript definitions
│   │   └── index.ts
│   └── config/               # Configuration schemas
│       └── schema.ts
├── tests/                    # Test files
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docs/                     # Documentation
│   ├── README.md
│   ├── configuration.md
│   └── examples.md
├── examples/                 # Example usage
│   └── basic-setup/
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
└── .gitignore
```

## Core Components

### Entry Point (index.ts)

The main export that Story Linter loads:

```typescript
// src/index.ts
import MyPlugin from './plugin';

export default MyPlugin;

// Optional named exports
export { MyPlugin };
export * from './types';
```

### Plugin Class

The main plugin implementation:

```typescript
// src/plugin.ts
import { Plugin, PluginContext } from '@story-linter/plugin-api';
import { registerRules } from './rules';
import { registerCommands } from './commands';
import { registerHooks } from './hooks';

export default class MyPlugin implements Plugin {
  name = 'my-plugin';
  version = '1.0.0';
  description = 'A custom Story Linter plugin';

  private context!: PluginContext;
  private config: MyPluginConfig = defaultConfig;

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    
    // Register components
    registerRules(context);
    registerCommands(context);
    registerHooks(context);
    
    // Set up any required resources
    await this.setupResources();
  }

  async configure(config: Partial<MyPluginConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.applyConfiguration();
  }

  async cleanup(): Promise<void> {
    // Clean up resources
    await this.cleanupResources();
  }

  private async setupResources(): Promise<void> {
    // Initialize databases, connections, etc.
  }

  private async cleanupResources(): Promise<void> {
    // Close connections, save state, etc.
  }
}
```

### Validation Rules

Individual rule implementations:

```typescript
// src/rules/example-rule.ts
import { ValidationRule, StoryFile, ValidationError } from '@story-linter/plugin-api';

export const exampleRule: ValidationRule = {
  id: 'MY001',
  name: 'example-rule',
  description: 'Checks for example issues',
  severity: 'warning',
  tags: ['style', 'example'],
  
  async validate(file: StoryFile): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const lines = file.content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.includes('example')) {
        errors.push({
          line: index + 1,
          column: line.indexOf('example') + 1,
          message: 'Found example text',
          rule: this.id,
          severity: this.severity
        });
      }
    });
    
    return errors;
  },
  
  async fix(file: StoryFile, error: ValidationError): Promise<FixResult> {
    // Implement auto-fix logic
    const fixed = file.content.replace('example', 'sample');
    return {
      fixed: true,
      content: fixed
    };
  }
};
```

### Configuration Schema

Define plugin configuration:

```typescript
// src/config/schema.ts
import { z } from 'zod';

export const configSchema = z.object({
  enabled: z.boolean().default(true),
  rules: z.object({
    MY001: z.object({
      severity: z.enum(['error', 'warning', 'info']).default('warning'),
      options: z.object({
        maxLength: z.number().default(100)
      })
    })
  }),
  features: z.object({
    autoFix: z.boolean().default(false),
    suggestions: z.boolean().default(true)
  })
});

export type MyPluginConfig = z.infer<typeof configSchema>;

export const defaultConfig: MyPluginConfig = {
  enabled: true,
  rules: {
    MY001: {
      severity: 'warning',
      options: {
        maxLength: 100
      }
    }
  },
  features: {
    autoFix: false,
    suggestions: true
  }
};
```

## Package Configuration

### package.json

Essential package configuration:

```json
{
  "name": "@story-linter/plugin-my-plugin",
  "version": "1.0.0",
  "description": "A Story Linter plugin for X",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "README.md"
  ],
  "keywords": [
    "story-linter",
    "story-linter-plugin",
    "validation",
    "linting"
  ],
  "peerDependencies": {
    "@story-linter/plugin-api": "^1.0.0"
  },
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "prepublishOnly": "npm run build && npm test"
  },
  "story-linter": {
    "type": "plugin",
    "config": "./dist/config/schema.js"
  }
}
```

### TypeScript Configuration

Recommended tsconfig.json:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## Advanced Patterns

### Async Initialization

For plugins requiring async setup:

```typescript
class AsyncPlugin implements Plugin {
  private db?: Database;
  
  async initialize(context: PluginContext): Promise<void> {
    // Connect to database
    this.db = await connectDatabase(this.config.dbUrl);
    
    // Load resources
    await this.loadResources();
    
    // Register rules that depend on resources
    this.registerDynamicRules(context);
  }
}
```

### Dynamic Rule Registration

Register rules based on configuration:

```typescript
private registerDynamicRules(context: PluginContext): void {
  const { rules } = this.config;
  
  Object.entries(rules).forEach(([ruleId, ruleConfig]) => {
    if (ruleConfig.enabled) {
      context.registerRule(createRule(ruleId, ruleConfig));
    }
  });
}
```

### State Management

Managing plugin state:

```typescript
class StatefulPlugin implements Plugin {
  private state = new PluginState();
  
  async initialize(context: PluginContext): Promise<void> {
    // Restore state from disk
    await this.state.restore();
    
    // Register state-aware rules
    context.registerRule({
      id: 'STATE001',
      validate: async (file) => {
        return this.state.validateWithHistory(file);
      }
    });
  }
  
  async cleanup(): Promise<void> {
    // Save state before shutdown
    await this.state.save();
  }
}
```

## Best Practices

1. **Modular Design** - Separate concerns into modules
2. **Type Safety** - Use TypeScript strictly
3. **Error Handling** - Graceful degradation
4. **Performance** - Lazy load heavy dependencies
5. **Documentation** - Document all public APIs
6. **Testing** - Comprehensive test coverage

## Next Steps

- Learn about [Testing Plugins](testing-plugins.md)
- Review [Best Practices](best-practices.md)
- Explore [Advanced Patterns](advanced-patterns.md)
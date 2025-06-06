import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { parse as parseYaml } from 'yaml';

export interface StoryLinterConfig {
  // File processing
  files?: {
    include?: string[];
    exclude?: string[];
  };
  
  // Framework settings
  framework?: {
    parallel?: boolean;
    workers?: number;
    cache?: boolean;
    cacheLocation?: string;
  };
  
  // Validation settings
  validation?: {
    stopOnError?: boolean;
    severity?: 'error' | 'warning' | 'info';
  };
  
  // Output settings
  output?: {
    format?: 'text' | 'json' | 'html';
    groupBy?: 'file' | 'validator' | 'severity';
    verbose?: boolean;
    colors?: boolean;
  };
  
  // Validator configurations
  validators?: Record<string, any>;
  
  // Plugin configurations (for MVP, same as validators)
  plugins?: Record<string, any>;
}

const DEFAULT_CONFIG: StoryLinterConfig = {
  files: {
    include: ['**/*.md', '**/*.txt'],
    exclude: ['**/node_modules/**', '**/.*'],
  },
  framework: {
    parallel: true,
    workers: 4,
    cache: true,
    cacheLocation: '.story-linter-cache',
  },
  validation: {
    stopOnError: false,
    severity: 'warning',
  },
  output: {
    format: 'text',
    groupBy: 'file',
    verbose: false,
    colors: true,
  },
  validators: {},
};

export class ConfigLoader {
  private configCache = new Map<string, StoryLinterConfig>();
  
  /**
   * Load configuration from a file or directory
   */
  async loadConfig(pathOrDir: string): Promise<StoryLinterConfig> {
    const configPath = await this.findConfigFile(pathOrDir);
    
    if (!configPath) {
      return DEFAULT_CONFIG;
    }
    
    // Check cache
    const cached = this.configCache.get(configPath);
    if (cached) return cached;
    
    // Load and parse config
    const config = await this.parseConfigFile(configPath);
    const merged = this.mergeWithDefaults(config);
    
    // Cache and return
    this.configCache.set(configPath, merged);
    return merged;
  }
  
  /**
   * Find config file in directory or parent directories
   */
  private async findConfigFile(startPath: string): Promise<string | null> {
    const configNames = [
      '.story-linter.yml',
      '.story-linter.yaml',
      '.story-linter.json',
      'story-linter.config.js',
    ];
    
    let currentDir = resolve(startPath);
    const root = resolve('/');
    
    while (currentDir !== root) {
      for (const configName of configNames) {
        const configPath = resolve(currentDir, configName);
        try {
          await readFile(configPath);
          return configPath;
        } catch {
          // File doesn't exist, continue
        }
      }
      currentDir = dirname(currentDir);
    }
    
    return null;
  }
  
  /**
   * Parse configuration file based on extension
   */
  private async parseConfigFile(configPath: string): Promise<Partial<StoryLinterConfig>> {
    const content = await readFile(configPath, 'utf8');
    
    if (configPath.endsWith('.yml') || configPath.endsWith('.yaml')) {
      return parseYaml(content) as StoryLinterConfig;
    }
    
    if (configPath.endsWith('.json')) {
      return JSON.parse(content) as StoryLinterConfig;
    }
    
    if (configPath.endsWith('.js')) {
      // Dynamic import for JS config
      const module = await import(configPath);
      return module.default || module;
    }
    
    throw new Error(`Unsupported config file format: ${configPath}`);
  }
  
  /**
   * Merge user config with defaults
   */
  private mergeWithDefaults(userConfig: Partial<StoryLinterConfig>): StoryLinterConfig {
    return {
      files: {
        ...DEFAULT_CONFIG.files,
        ...userConfig.files,
      },
      framework: {
        ...DEFAULT_CONFIG.framework,
        ...userConfig.framework,
      },
      validation: {
        ...DEFAULT_CONFIG.validation,
        ...userConfig.validation,
      },
      output: {
        ...DEFAULT_CONFIG.output,
        ...userConfig.output,
      },
      validators: {
        ...DEFAULT_CONFIG.validators,
        ...userConfig.validators,
      },
      plugins: userConfig.plugins,
    };
  }
  
  /**
   * Get validator-specific configuration
   */
  getValidatorConfig(config: StoryLinterConfig, validatorName: string): any {
    // Check both validators and plugins sections
    return config.validators?.[validatorName] || 
           config.plugins?.[validatorName] || 
           { enabled: true };
  }
  
  /**
   * Clear config cache
   */
  clearCache(): void {
    this.configCache.clear();
  }
}
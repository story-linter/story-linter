import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigLoader, StoryLinterConfig } from './config-loader';

// TDD - Test doubles for dependency injection
interface FileSystemPort {
  readFile(path: string, encoding?: string): Promise<string>;
  fileExists(path: string): Promise<boolean>;
}

interface PathResolverPort {
  resolve(...paths: string[]): string;
  dirname(path: string): string;
}

// Test doubles implementation
class TestFileSystem implements FileSystemPort {
  private files = new Map<string, string>();
  
  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }
  
  async readFile(path: string, encoding?: string): Promise<string> {
    const content = this.files.get(path);
    if (!content) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return content;
  }
  
  async fileExists(path: string): Promise<boolean> {
    return this.files.has(path);
  }
}

class TestPathResolver implements PathResolverPort {
  resolve(...paths: string[]): string {
    return paths.join('/').replace(/\/+/g, '/');
  }
  
  dirname(path: string): string {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/') || '/';
  }
}

// The actual tests (TDD - these come FIRST!)
describe('ConfigLoader', () => {
  let configLoader: ConfigLoader;
  let fileSystem: TestFileSystem;
  let pathResolver: TestPathResolver;

  beforeEach(() => {
    fileSystem = new TestFileSystem();
    pathResolver = new TestPathResolver();
    // ConfigLoader will be refactored to accept these dependencies
    configLoader = new ConfigLoader(fileSystem, pathResolver);
  });

  describe('loadConfig', () => {
    it('should return default config when no config file exists', async () => {
      // Arrange - no files in test filesystem
      
      // Act
      const config = await configLoader.loadConfig('/some/dir');
      
      // Assert
      expect(config.files?.include).toEqual(['**/*.md', '**/*.txt']);
      expect(config.framework?.parallel).toBe(true);
      expect(config.validation?.stopOnError).toBe(false);
    });

    it('should load and parse YAML config file', async () => {
      // Arrange
      const yamlConfig = `
files:
  include:
    - "**/*.story"
framework:
  parallel: false
validation:
  stopOnError: true
`;
      fileSystem.setFile('/project/.story-linter.yml', yamlConfig);
      
      // Act
      const config = await configLoader.loadConfig('/project');
      
      // Assert
      expect(config.files?.include).toEqual(['**/*.story']);
      expect(config.framework?.parallel).toBe(false);
      expect(config.validation?.stopOnError).toBe(true);
    });

    it('should load and parse JSON config file', async () => {
      // Arrange
      const jsonConfig = JSON.stringify({
        files: { include: ['**/*.md'] },
        output: { format: 'json' }
      });
      fileSystem.setFile('/project/.story-linter.json', jsonConfig);
      
      // Act
      const config = await configLoader.loadConfig('/project');
      
      // Assert
      expect(config.files?.include).toEqual(['**/*.md']);
      expect(config.output?.format).toBe('json');
    });

    it('should search parent directories for config files', async () => {
      // Arrange
      const yamlConfig = 'files:\n  include: ["**/*.txt"]';
      fileSystem.setFile('/parent/.story-linter.yml', yamlConfig);
      
      // Act
      const config = await configLoader.loadConfig('/parent/child/deep');
      
      // Assert
      expect(config.files?.include).toEqual(['**/*.txt']);
    });

    it('should cache loaded configurations', async () => {
      // Arrange
      const yamlConfig = 'files:\n  include: ["**/*.cached"]';
      fileSystem.setFile('/project/.story-linter.yml', yamlConfig);
      
      // Act
      const config1 = await configLoader.loadConfig('/project');
      const config2 = await configLoader.loadConfig('/project');
      
      // Assert
      expect(config1).toBe(config2); // Same object reference = cached
      expect(config1.files?.include).toEqual(['**/*.cached']);
    });

    it('should merge user config with defaults', async () => {
      // Arrange
      const partialConfig = JSON.stringify({
        files: { include: ['**/*.custom'] },
        validation: { stopOnError: true }
        // Note: framework and output not specified
      });
      fileSystem.setFile('/project/.story-linter.json', partialConfig);
      
      // Act
      const config = await configLoader.loadConfig('/project');
      
      // Assert - user settings
      expect(config.files?.include).toEqual(['**/*.custom']);
      expect(config.validation?.stopOnError).toBe(true);
      
      // Assert - defaults preserved
      expect(config.framework?.parallel).toBe(true); // default
      expect(config.output?.format).toBe('text'); // default
    });

    it('should handle invalid YAML gracefully', async () => {
      // Arrange
      const invalidYaml = 'files:\n  include:\n    - [invalid yaml structure';
      fileSystem.setFile('/project/.story-linter.yml', invalidYaml);
      
      // Act & Assert
      await expect(configLoader.loadConfig('/project')).rejects.toThrow();
    });

    it('should handle invalid JSON gracefully', async () => {
      // Arrange
      const invalidJson = '{ "files": { invalid json }';
      fileSystem.setFile('/project/.story-linter.json', invalidJson);
      
      // Act & Assert
      await expect(configLoader.loadConfig('/project')).rejects.toThrow();
    });
  });

  describe('getValidatorConfig', () => {
    it('should return validator-specific configuration', () => {
      // Arrange
      const config: StoryLinterConfig = {
        validators: {
          'character-consistency': { enabled: true, strictMode: true },
          'plot-holes': { enabled: false }
        }
      };
      
      // Act & Assert
      const charConfig = configLoader.getValidatorConfig(config, 'character-consistency');
      expect(charConfig).toEqual({ enabled: true, strictMode: true });
      
      const plotConfig = configLoader.getValidatorConfig(config, 'plot-holes');
      expect(plotConfig).toEqual({ enabled: false });
    });

    it('should return default config for unknown validators', () => {
      // Arrange
      const config: StoryLinterConfig = { validators: {} };
      
      // Act
      const unknownConfig = configLoader.getValidatorConfig(config, 'unknown-validator');
      
      // Assert
      expect(unknownConfig).toEqual({ enabled: true });
    });

    it('should check plugins section as fallback', () => {
      // Arrange
      const config: StoryLinterConfig = {
        validators: {},
        plugins: {
          'timeline-validator': { enabled: true, chronologyCheck: true }
        }
      };
      
      // Act
      const pluginConfig = configLoader.getValidatorConfig(config, 'timeline-validator');
      
      // Assert
      expect(pluginConfig).toEqual({ enabled: true, chronologyCheck: true });
    });
  });

  describe('clearCache', () => {
    it('should clear configuration cache', async () => {
      // Arrange
      const yamlConfig = 'files:\n  include: ["**/*.cached"]';
      fileSystem.setFile('/project/.story-linter.yml', yamlConfig);
      
      const config1 = await configLoader.loadConfig('/project');
      
      // Act
      configLoader.clearCache();
      const config2 = await configLoader.loadConfig('/project');
      
      // Assert
      expect(config1).not.toBe(config2); // Different object reference = not cached
      expect(config2.files?.include).toEqual(['**/*.cached']); // But same content
    });
  });
});
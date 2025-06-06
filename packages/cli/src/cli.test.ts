import { describe, it, expect, beforeEach } from 'vitest';
import { CLI, 
  type ConsolePort, 
  type ProcessPort, 
  type FileSystemPort, 
  type ProgressIndicatorPort, 
  type ProgressIndicator,
  type ValidationFrameworkFactory,
  type ValidatorFactory
} from './cli';
import type { ValidationResult, BaseValidator, ValidationFramework } from '@story-linter/core';

// Test doubles
class TestConsole implements ConsolePort {
  public logs: string[] = [];
  public errors: string[] = [];
  
  log(message: string): void {
    this.logs.push(message);
  }
  
  error(message: string): void {
    this.errors.push(message);
  }
  
  hasLog(pattern: string | RegExp): boolean {
    return this.logs.some(log => 
      typeof pattern === 'string' ? log.includes(pattern) : pattern.test(log)
    );
  }
  
  hasError(pattern: string | RegExp): boolean {
    return this.errors.some(error => 
      typeof pattern === 'string' ? error.includes(pattern) : pattern.test(error)
    );
  }
}

class TestProcess implements ProcessPort {
  public exitCode: number | null = null;
  
  exit(code: number): void {
    this.exitCode = code;
  }
  
  argv: string[] = [];
  env: NodeJS.ProcessEnv = {};
}

class TestFileSystem implements FileSystemPort {
  private files = new Map<string, string>();
  
  readFileSync(path: string, encoding: BufferEncoding): string {
    const content = this.files.get(path);
    if (!content) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return content;
  }
  
  addFile(path: string, content: string): void {
    this.files.set(path, content);
  }
}

class TestProgressIndicator implements ProgressIndicator {
  public started = false;
  public succeeded = false;
  public failed = false;
  public text = '';
  
  start(): void {
    this.started = true;
  }
  
  succeed(text: string): void {
    this.succeeded = true;
    this.text = text;
  }
  
  fail(text: string): void {
    this.failed = true;
    this.text = text;
  }
  
  updateText(text: string): void {
    this.text = text;
  }
}

class TestProgressIndicatorFactory implements ProgressIndicatorPort {
  public indicators: TestProgressIndicator[] = [];
  
  create(text: string): ProgressIndicator {
    const indicator = new TestProgressIndicator();
    indicator.text = text;
    this.indicators.push(indicator);
    return indicator;
  }
  
  getLatest(): TestProgressIndicator | undefined {
    return this.indicators[this.indicators.length - 1];
  }
}

class TestValidationFramework implements ValidationFramework {
  public validators: BaseValidator[] = [];
  public validationResult: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: []
  };
  private eventHandlers = new Map<string, Function[]>();
  
  use(validator: BaseValidator): this {
    this.validators.push(validator);
    return this;
  }
  
  async validate(): Promise<ValidationResult> {
    // Emit events if handlers are registered
    this.emit('validation:start', { fileCount: 3 });
    this.emit('file:processing', { file: 'test1.md', progress: { completed: 1, total: 3 } });
    this.emit('validator:start', 'character-consistency');
    
    return this.validationResult;
  }
  
  on(event: string, handler: Function): this {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
    return this;
  }
  
  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }
  
  async destroy(): Promise<void> {
    // Cleanup
  }
}

class TestValidationFrameworkFactory implements ValidationFrameworkFactory {
  public frameworks: TestValidationFramework[] = [];
  
  create(): ValidationFramework {
    const framework = new TestValidationFramework();
    this.frameworks.push(framework);
    return framework;
  }
  
  getLatest(): TestValidationFramework | undefined {
    return this.frameworks[this.frameworks.length - 1];
  }
}

class TestValidator implements BaseValidator {
  constructor(public name: string, public version: string) {}
  
  async validate(): Promise<ValidationResult> {
    return { valid: true, errors: [], warnings: [], info: [] };
  }
  
  async destroy(): Promise<void> {}
}

class TestValidatorFactory implements ValidatorFactory {
  public characterValidators: TestValidator[] = [];
  public linkValidators: TestValidator[] = [];
  
  createCharacterValidator(): BaseValidator {
    const validator = new TestValidator('character-consistency', '0.1.0');
    this.characterValidators.push(validator);
    return validator;
  }
  
  createLinkValidator(): BaseValidator {
    const validator = new TestValidator('link-validator', '0.1.0');
    this.linkValidators.push(validator);
    return validator;
  }
}

describe('CLI', () => {
  let cli: CLI;
  let console: TestConsole;
  let process: TestProcess;
  let fileSystem: TestFileSystem;
  let progressFactory: TestProgressIndicatorFactory;
  let frameworkFactory: TestValidationFrameworkFactory;
  let validatorFactory: TestValidatorFactory;
  
  beforeEach(() => {
    console = new TestConsole();
    process = new TestProcess();
    fileSystem = new TestFileSystem();
    progressFactory = new TestProgressIndicatorFactory();
    frameworkFactory = new TestValidationFrameworkFactory();
    validatorFactory = new TestValidatorFactory();
    
    // Add package.json for version
    fileSystem.addFile('/package.json', JSON.stringify({
      version: '1.0.0'
    }));
    
    cli = new CLI(
      console,
      process,
      fileSystem,
      progressFactory,
      frameworkFactory,
      validatorFactory
    );
  });
  
  describe('validate command', () => {
    it('validates files and exits with 0 when all checks pass', async () => {
      // Arrange
      process.argv = ['node', 'story-linter', 'validate', 'test.md'];
      
      // Act
      await cli.run(process.argv);
      
      // Assert
      expect(process.exitCode).toBe(0);
      expect(console.hasLog('✓ All validation checks passed!')).toBe(true);
    });
    
    it('exits with 1 when validation finds errors', async () => {
      // Arrange
      process.argv = ['node', 'story-linter', 'validate'];
      const framework = frameworkFactory.create() as TestValidationFramework;
      framework.validationResult = {
        valid: false,
        errors: [{
          code: 'TEST001',
          message: 'Test error',
          severity: 'error'
        }],
        warnings: [],
        info: []
      };
      
      // Act
      await cli.run(process.argv);
      
      // Assert
      expect(process.exitCode).toBe(1);
      expect(console.hasError('TEST001')).toBe(true);
      expect(console.hasLog('✗ Found 1 errors')).toBe(true);
    });
    
    it('outputs JSON when format option is specified', async () => {
      // Arrange
      process.argv = ['node', 'story-linter', 'validate', '--format', 'json'];
      
      // Act
      await cli.run(process.argv);
      
      // Assert
      const jsonOutput = console.logs.find(log => log.includes('"valid"'));
      expect(jsonOutput).toBeDefined();
      const parsed = JSON.parse(jsonOutput!);
      expect(parsed.valid).toBe(true);
    });
    
    it('shows progress indicators when quiet is not set', async () => {
      // Arrange
      process.argv = ['node', 'story-linter', 'validate'];
      
      // Act
      await cli.run(process.argv);
      
      // Assert
      const indicator = progressFactory.getLatest();
      expect(indicator).toBeDefined();
      expect(indicator!.started).toBe(true);
      expect(indicator!.succeeded).toBe(true);
    });
    
    it('does not show progress when quiet option is set', async () => {
      // Arrange
      process.argv = ['node', 'story-linter', 'validate', '--quiet'];
      
      // Act
      await cli.run(process.argv);
      
      // Assert
      expect(progressFactory.indicators.length).toBe(0);
    });
    
    it('registers both character and link validators', async () => {
      // Arrange
      process.argv = ['node', 'story-linter', 'validate'];
      
      // Act
      await cli.run(process.argv);
      
      // Assert
      expect(validatorFactory.characterValidators.length).toBe(1);
      expect(validatorFactory.linkValidators.length).toBe(1);
      const framework = frameworkFactory.getLatest();
      expect(framework?.validators.length).toBe(2);
    });
  });
  
  describe('help command', () => {
    it('shows help when no command is provided', async () => {
      // Arrange
      process.argv = ['node', 'story-linter'];
      
      // Act
      await cli.run(process.argv);
      
      // Assert
      expect(console.hasLog('Usage:')).toBe(true);
    });
    
    it('shows help with --help flag', async () => {
      // Arrange
      process.argv = ['node', 'story-linter', '--help'];
      
      // Act
      await cli.run(process.argv);
      
      // Assert
      expect(console.hasLog('Usage:')).toBe(true);
    });
  });
  
  describe('version command', () => {
    it('shows version with --version flag', async () => {
      // Arrange
      process.argv = ['node', 'story-linter', '--version'];
      
      // Act
      await cli.run(process.argv);
      
      // Assert
      expect(console.hasLog('1.0.0')).toBe(true);
    });
  });
  
  describe('error handling', () => {
    it('handles validation framework errors gracefully', async () => {
      // Arrange
      process.argv = ['node', 'story-linter', 'validate'];
      const framework = frameworkFactory.create() as TestValidationFramework;
      framework.validate = async () => {
        throw new Error('Framework error');
      };
      
      // Act
      await cli.run(process.argv);
      
      // Assert
      expect(console.hasError('Framework error')).toBe(true);
      expect(process.exitCode).toBe(1);
    });
    
    it('handles invalid commands', async () => {
      // Arrange
      process.argv = ['node', 'story-linter', 'invalid-command'];
      
      // Act
      await cli.run(process.argv);
      
      // Assert
      expect(console.hasError('Unknown command')).toBe(true);
      expect(process.exitCode).toBe(1);
    });
    
    it('shows stack trace when DEBUG env is set', async () => {
      // Arrange
      process.argv = ['node', 'story-linter', 'validate'];
      process.env.DEBUG = 'true';
      const framework = frameworkFactory.create() as TestValidationFramework;
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at TestFile.js:123';
      framework.validate = async () => {
        throw error;
      };
      
      // Act
      await cli.run(process.argv);
      
      // Assert
      expect(console.hasError('Test error')).toBe(true);
      expect(console.hasError('at TestFile.js:123')).toBe(true);
    });
  });
  
  describe('output formatting', () => {
    it('displays warnings correctly', async () => {
      // Arrange
      process.argv = ['node', 'story-linter', 'validate'];
      const framework = frameworkFactory.create() as TestValidationFramework;
      framework.validationResult = {
        valid: true,
        errors: [],
        warnings: [{
          code: 'WARN001',
          message: 'Test warning',
          severity: 'warning',
          file: 'test.md',
          line: 10
        }],
        info: []
      };
      
      // Act
      await cli.run(process.argv);
      
      // Assert
      expect(console.hasLog('⚠ 1 warnings')).toBe(true);
      expect(console.hasLog('WARN001')).toBe(true);
      expect(console.hasLog('test.md:10')).toBe(true);
    });
    
    it('displays info messages when no errors or warnings', async () => {
      // Arrange
      process.argv = ['node', 'story-linter', 'validate'];
      const framework = frameworkFactory.create() as TestValidationFramework;
      framework.validationResult = {
        valid: true,
        errors: [],
        warnings: [],
        info: [{
          code: 'INFO001',
          message: 'Test info',
          severity: 'info'
        }]
      };
      
      // Act
      await cli.run(process.argv);
      
      // Assert
      expect(console.hasLog('INFO001')).toBe(true);
      expect(console.hasLog('Test info')).toBe(true);
    });
    
    it('generates HTML output when format is html', async () => {
      // Arrange
      process.argv = ['node', 'story-linter', 'validate', '--format', 'html'];
      
      // Act
      await cli.run(process.argv);
      
      // Assert
      expect(console.hasLog('<!DOCTYPE html>')).toBe(true);
      expect(console.hasLog('Story Linter Validation Report')).toBe(true);
      expect(console.hasLog('✓ All checks passed!')).toBe(true);
    });
  });
});
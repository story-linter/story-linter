import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationOrchestrator } from './validation-orchestrator';
import type { ValidationOptions, ValidationResult, ParsedFile } from '../types';

// Test doubles (written BEFORE implementation!)
interface FileProcessorPort {
  processFiles(patterns: string[], options?: any): Promise<ParsedFile[]>;
}

interface PluginManagerPort {
  getActiveValidators(): ValidatorPort[];
  initializeValidators(context: any): Promise<void>;
  destroyValidators(): Promise<void>;
}

interface ValidatorPort {
  name: string;
  validate(files: ParsedFile[], metadata: Map<string, any>): Promise<ValidatorResult>;
  getMetadataExtractors?(): MetadataExtractor[];
}

interface MetadataExtractorPort {
  extractFromFiles(files: ParsedFile[], extractors: MetadataExtractor[]): Promise<Map<string, any>>;
}

interface ResultAggregatorPort {
  aggregate(results: ValidatorResult[]): ValidationResult;
}

interface EventBusPort {
  emit(event: string, data?: any): void;
}

// Test doubles implementation
class TestFileProcessor implements FileProcessorPort {
  private files: ParsedFile[] = [];
  
  setFiles(files: ParsedFile[]): void {
    this.files = files;
  }
  
  async processFiles(patterns: string[]): Promise<ParsedFile[]> {
    return this.files;
  }
}

class TestPluginManager implements PluginManagerPort {
  private validators: ValidatorPort[] = [];
  public initialized = false;
  public destroyed = false;
  
  setValidators(validators: ValidatorPort[]): void {
    this.validators = validators;
  }
  
  getActiveValidators(): ValidatorPort[] {
    return this.validators;
  }
  
  async initializeValidators(): Promise<void> {
    this.initialized = true;
  }
  
  async destroyValidators(): Promise<void> {
    this.destroyed = true;
  }
}

class TestValidator implements ValidatorPort {
  constructor(
    public name: string,
    private result: ValidatorResult
  ) {}
  
  async validate(files: ParsedFile[], metadata: Map<string, any>): Promise<ValidatorResult> {
    return this.result;
  }
  
  getMetadataExtractors?(): MetadataExtractor[] {
    return [];
  }
}

class TestMetadataExtractor implements MetadataExtractorPort {
  private metadata = new Map<string, any>();
  
  setMetadata(key: string, value: any): void {
    this.metadata.set(key, value);
  }
  
  async extractFromFiles(): Promise<Map<string, any>> {
    return this.metadata;
  }
}

class TestResultAggregator implements ResultAggregatorPort {
  aggregate(results: ValidatorResult[]): ValidationResult {
    const errors = results.flatMap(r => r.errors || []);
    const warnings = results.flatMap(r => r.warnings || []);
    const info = results.flatMap(r => r.info || []);
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info
    };
  }
}

class TestEventBus implements EventBusPort {
  public events: Array<{event: string; data?: any}> = [];
  
  emit(event: string, data?: any): void {
    this.events.push({ event, data });
  }
  
  hasEmitted(event: string): boolean {
    return this.events.some(e => e.event === event);
  }
}

// The actual tests (TDD - these come FIRST!)
describe('ValidationOrchestrator', () => {
  let orchestrator: ValidationOrchestrator;
  let fileProcessor: TestFileProcessor;
  let pluginManager: TestPluginManager;
  let metadataExtractor: TestMetadataExtractor;
  let resultAggregator: TestResultAggregator;
  let eventBus: TestEventBus;
  
  beforeEach(() => {
    fileProcessor = new TestFileProcessor();
    pluginManager = new TestPluginManager();
    metadataExtractor = new TestMetadataExtractor();
    resultAggregator = new TestResultAggregator();
    eventBus = new TestEventBus();
    
    orchestrator = new ValidationOrchestrator(
      fileProcessor,
      pluginManager,
      metadataExtractor,
      resultAggregator,
      eventBus
    );
  });
  
  describe('validate', () => {
    it('should process files based on provided patterns', async () => {
      // Arrange
      const testFiles: ParsedFile[] = [
        { path: 'test1.md', content: 'content1', metadata: {} },
        { path: 'test2.md', content: 'content2', metadata: {} }
      ];
      fileProcessor.setFiles(testFiles);
      
      const options: ValidationOptions = {
        files: ['*.md']
      };
      
      // Act
      await orchestrator.validate(options);
      
      // Assert
      expect(eventBus.hasEmitted('validation:start')).toBe(true);
      expect(eventBus.hasEmitted('validation:complete')).toBe(true);
    });
    
    it('should initialize validators before validation', async () => {
      // Arrange
      fileProcessor.setFiles([]);
      
      // Act
      await orchestrator.validate({});
      
      // Assert
      expect(pluginManager.initialized).toBe(true);
    });
    
    it('should destroy validators after validation', async () => {
      // Arrange
      fileProcessor.setFiles([]);
      
      // Act
      await orchestrator.validate({});
      
      // Assert
      expect(pluginManager.destroyed).toBe(true);
    });
    
    it('should run all active validators on processed files', async () => {
      // Arrange
      const testFiles: ParsedFile[] = [
        { path: 'test.md', content: 'test', metadata: {} }
      ];
      fileProcessor.setFiles(testFiles);
      
      const validator1Result: ValidatorResult = {
        validator: 'test1',
        errors: [{ code: 'TEST001', message: 'Test error', severity: 'error' }],
        warnings: [],
        info: []
      };
      
      const validator2Result: ValidatorResult = {
        validator: 'test2',
        errors: [],
        warnings: [{ code: 'TEST002', message: 'Test warning', severity: 'warning' }],
        info: []
      };
      
      pluginManager.setValidators([
        new TestValidator('test1', validator1Result),
        new TestValidator('test2', validator2Result)
      ]);
      
      // Act
      const result = await orchestrator.validate({});
      
      // Assert
      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.valid).toBe(false);
    });
    
    it('should extract metadata before validation', async () => {
      // Arrange
      const testFiles: ParsedFile[] = [
        { path: 'test.md', content: 'test', metadata: {} }
      ];
      fileProcessor.setFiles(testFiles);
      
      metadataExtractor.setMetadata('characters', { 
        'Bob': { firstSeen: 'test.md' } 
      });
      
      let receivedMetadata: Map<string, any> | null = null;
      
      const validator = new TestValidator('test', {
        validator: 'test',
        errors: [],
        warnings: [],
        info: []
      });
      
      // Override validate to capture metadata
      validator.validate = async (files, metadata) => {
        receivedMetadata = metadata;
        return { validator: 'test', errors: [], warnings: [], info: [] };
      };
      
      pluginManager.setValidators([validator]);
      
      // Act
      await orchestrator.validate({});
      
      // Assert
      expect(receivedMetadata).not.toBeNull();
      expect(receivedMetadata!.get('characters')).toEqual({ 
        'Bob': { firstSeen: 'test.md' } 
      });
    });
    
    it('should emit progress events during validation', async () => {
      // Arrange
      const testFiles: ParsedFile[] = [
        { path: 'test1.md', content: 'content1', metadata: {} },
        { path: 'test2.md', content: 'content2', metadata: {} }
      ];
      fileProcessor.setFiles(testFiles);
      
      pluginManager.setValidators([
        new TestValidator('test', { 
          validator: 'test', 
          errors: [], 
          warnings: [], 
          info: [] 
        })
      ]);
      
      // Act
      await orchestrator.validate({});
      
      // Assert
      const events = eventBus.events.map(e => e.event);
      expect(events).toContain('validation:start');
      expect(events).toContain('files:processed');
      expect(events).toContain('metadata:extracted');
      expect(events).toContain('validator:start');
      expect(events).toContain('validator:complete');
      expect(events).toContain('validation:complete');
    });
    
    it('should handle validation errors gracefully', async () => {
      // Arrange
      fileProcessor.setFiles([{ path: 'test.md', content: 'test', metadata: {} }]);
      
      const errorValidator = new TestValidator('error-validator', {
        validator: 'error',
        errors: [],
        warnings: [],
        info: []
      });
      
      // Make validator throw
      errorValidator.validate = async () => {
        throw new Error('Validator failed');
      };
      
      pluginManager.setValidators([errorValidator]);
      
      // Act & Assert
      await expect(orchestrator.validate({})).rejects.toThrow('Validator failed');
      expect(pluginManager.destroyed).toBe(true); // Cleanup even on error
    });
  });
});
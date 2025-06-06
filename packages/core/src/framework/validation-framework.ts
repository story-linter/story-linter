import { EventEmitter } from 'node:events';
import type { BaseValidator, ValidatorContext, ParsedFile } from '../validators/base-validator';
import type { ValidationResult } from '../types';
import { FileReader, type ExtractedMetadata } from '../utils/file-reader';
import { FileDiscovery } from '../utils/file-discovery';
import { ConfigLoader, type StoryLinterConfig } from '../config/config-loader';

export interface ValidationOptions {
  files?: string[];
  config?: string;
  parallel?: boolean;
}

export interface ValidationProgress {
  total: number;
  completed: number;
  current: string;
}

export class ValidationFramework extends EventEmitter {
  private validators = new Map<string, BaseValidator>();
  private fileReader = new FileReader();
  private fileDiscovery = new FileDiscovery();
  private configLoader = new ConfigLoader();
  private results = new Map<string, ValidationResult>();
  
  /**
   * Register a validator
   */
  use(validator: BaseValidator): void {
    this.validators.set(validator.name, validator);
    this.emit('validator:registered', validator.name);
  }
  
  /**
   * Run validation
   */
  async validate(options: ValidationOptions = {}): Promise<ValidationResult> {
    // Load configuration
    const configPath = options.config || process.cwd();
    const config = await this.configLoader.loadConfig(configPath);
    
    // Discover files
    const files = options.files && options.files.length > 0
      ? options.files
      : await this.fileDiscovery.discoverFiles({
          include: config.files?.include || ['**/*.md'],
          exclude: config.files?.exclude || ['**/node_modules/**'],
        });
    
    this.emit('validation:start', { fileCount: files.length });
    
    // Process files and extract metadata
    const parsedFiles = await this.processFiles(files, config);
    
    // Initialize validators
    await this.initializeValidators(config);
    
    // Run validators
    const results = await this.runValidators(parsedFiles, config);
    
    // Aggregate results
    const aggregated = this.aggregateResults(results);
    
    this.emit('validation:complete', aggregated);
    return aggregated;
  }
  
  /**
   * Process files and extract metadata
   */
  private async processFiles(
    filePaths: string[], 
    config: StoryLinterConfig
  ): Promise<ParsedFile[]> {
    const parsedFiles: ParsedFile[] = [];
    
    // Collect all metadata extractors from validators
    const extractors = new Map<string, (content: string, context: any) => any>();
    for (const [name, validator] of this.validators) {
      const validatorExtractors = validator.getMetadataExtractors();
      for (const [key, extractor] of Object.entries(validatorExtractors)) {
        extractors.set(`${name}:${key}`, extractor);
      }
    }
    
    // Process each file
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      this.emit('file:processing', {
        file: filePath,
        progress: { total: filePaths.length, completed: i, current: filePath },
      });
      
      try {
        const metadata = await this.fileReader.extractMetadata(filePath, extractors);
        const fileData = await this.fileReader.readFile(filePath);
        
        parsedFiles.push({
          path: filePath,
          content: fileData.content, // Only for small files
          metadata,
        });
      } catch (error) {
        this.emit('file:error', { file: filePath, error });
        // Continue processing other files
      }
    }
    
    return parsedFiles;
  }
  
  /**
   * Initialize all validators
   */
  private async initializeValidators(config: StoryLinterConfig): Promise<void> {
    const context = this.createValidatorContext();
    
    for (const [name, validator] of this.validators) {
      const validatorConfig = this.configLoader.getValidatorConfig(config, name);
      
      if (validatorConfig.enabled !== false) {
        await validator.initialize(context, validatorConfig);
        this.emit('validator:initialized', name);
      }
    }
  }
  
  /**
   * Create validator context
   */
  private createValidatorContext(): ValidatorContext {
    return {
      getResults: (validatorName: string) => this.results.get(validatorName),
      logger: {
        debug: (message: string, ...args: any[]) => this.emit('log:debug', { message, args }),
        info: (message: string, ...args: any[]) => this.emit('log:info', { message, args }),
        warn: (message: string, ...args: any[]) => this.emit('log:warn', { message, args }),
        error: (message: string, ...args: any[]) => this.emit('log:error', { message, args }),
      },
      getMetadata: (filePath: string) => {
        // Would need to track this during processing
        return undefined; // TODO: Implement metadata tracking
      },
    };
  }
  
  /**
   * Run all validators
   */
  private async runValidators(
    files: ParsedFile[], 
    config: StoryLinterConfig
  ): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();
    
    // Run validators sequentially for now (parallel in future)
    for (const [name, validator] of this.validators) {
      const validatorConfig = this.configLoader.getValidatorConfig(config, name);
      
      if (validatorConfig.enabled === false) {
        continue;
      }
      
      this.emit('validator:start', name);
      
      try {
        const result = await validator.validate(files);
        results.set(name, result);
        this.results.set(name, result); // Store for context
        
        this.emit('validator:complete', { name, result });
        
        // Stop on error if configured
        if (!result.valid && config.validation?.stopOnError) {
          break;
        }
      } catch (error) {
        this.emit('validator:error', { name, error });
        // Continue with other validators
      }
    }
    
    return results;
  }
  
  /**
   * Aggregate results from all validators
   */
  private aggregateResults(results: Map<string, ValidationResult>): ValidationResult {
    const aggregated: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      info: [],
    };
    
    for (const result of results.values()) {
      if (!result.valid) {
        aggregated.valid = false;
      }
      
      aggregated.errors.push(...result.errors);
      aggregated.warnings.push(...result.warnings);
      aggregated.info.push(...result.info);
    }
    
    return aggregated;
  }
  
  /**
   * Clean up validators
   */
  async destroy(): Promise<void> {
    for (const validator of this.validators.values()) {
      await validator.destroy();
    }
    
    this.validators.clear();
    this.results.clear();
    this.fileReader.clearCache();
    this.configLoader.clearCache();
  }
}
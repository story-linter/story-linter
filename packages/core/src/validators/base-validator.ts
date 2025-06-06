import type { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning, 
  ValidationInfo 
} from '../types';
import type { ExtractedMetadata } from '../utils/file-reader';

export interface ValidatorConfig {
  enabled: boolean;
  [key: string]: any;
}

export interface ValidatorContext {
  // Access to other validator results
  getResults(validatorName: string): ValidationResult | undefined;
  
  // Shared utilities
  logger: Logger;
  
  // File metadata
  getMetadata(filePath: string): ExtractedMetadata | undefined;
}

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export interface ParsedFile {
  path: string;
  content?: string; // Only for small files
  metadata: ExtractedMetadata;
}

export type MetadataExtractor = (
  content: string, 
  context: { filePath: string }
) => any;

export abstract class BaseValidator {
  abstract readonly name: string;
  abstract readonly version: string;
  
  protected config: ValidatorConfig = { enabled: true };
  protected context?: ValidatorContext;
  
  /**
   * Define metadata extractors that run during file streaming
   * These extract validator-specific data from files
   */
  getMetadataExtractors(): Record<string, MetadataExtractor> {
    return {};
  }
  
  /**
   * Initialize the validator with context
   */
  async initialize(context: ValidatorContext, config: ValidatorConfig): Promise<void> {
    this.context = context;
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Main validation method - must be implemented by subclasses
   */
  abstract validate(files: ParsedFile[]): Promise<ValidationResult>;
  
  /**
   * Cleanup method - override if needed
   */
  async destroy(): Promise<void> {
    // Override in subclasses if cleanup needed
  }
  
  /**
   * Helper methods for creating validation issues
   */
  protected createError(
    code: string,
    message: string,
    file?: string,
    line?: number,
    column?: number
  ): ValidationError {
    return {
      code: `${this.name}:${code}`,
      message,
      file,
      line,
      column,
      severity: 'error',
    };
  }
  
  protected createWarning(
    code: string,
    message: string,
    file?: string,
    line?: number,
    column?: number
  ): ValidationWarning {
    return {
      code: `${this.name}:${code}`,
      message,
      file,
      line,
      column,
      severity: 'warning',
    };
  }
  
  protected createInfo(
    code: string,
    message: string,
    file?: string,
    line?: number,
    column?: number
  ): ValidationInfo {
    return {
      code: `${this.name}:${code}`,
      message,
      file,
      line,
      column,
      severity: 'info',
    };
  }
  
  /**
   * Helper to create a validation result
   */
  protected createResult(
    errors: ValidationError[] = [],
    warnings: ValidationWarning[] = [],
    info: ValidationInfo[] = []
  ): ValidationResult {
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info,
    };
  }
}
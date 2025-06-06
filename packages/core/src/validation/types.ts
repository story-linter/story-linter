// Validation types following SOLID principles

export interface ValidationOptions {
  files?: string[];
  config?: string;
  [key: string]: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
}

export interface ValidationError {
  code: string;
  message: string;
  severity: 'error';
  file?: string;
  line?: number;
  column?: number;
}

export interface ValidationWarning {
  code: string;
  message: string;
  severity: 'warning';
  file?: string;
  line?: number;
}

export interface ValidationInfo {
  code: string;
  message: string;
  severity: 'info';
  file?: string;
}

export interface ParsedFile {
  path: string;
  content: string;
  metadata: Record<string, any>;
}

export interface ValidatorResult {
  validator: string;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
}

export interface MetadataExtractor {
  key: string;
  extract(content: string, context: ExtractionContext): any;
  merge(items: Array<{file: string; data: any}>): any;
}

export interface ExtractionContext {
  filePath: string;
  fileFormat: string;
}

// Port interfaces for dependency injection
export interface FileProcessorPort {
  processFiles(patterns: string[], options?: any): Promise<ParsedFile[]>;
}

export interface PluginManagerPort {
  getActiveValidators(): ValidatorPort[];
  initializeValidators(context: any): Promise<void>;
  destroyValidators(): Promise<void>;
}

export interface ValidatorPort {
  name: string;
  validate(files: ParsedFile[], metadata: Map<string, any>): Promise<ValidatorResult>;
  getMetadataExtractors?(): MetadataExtractor[];
}

export interface MetadataExtractorPort {
  extractFromFiles(files: ParsedFile[], extractors: MetadataExtractor[]): Promise<Map<string, any>>;
}

export interface ResultAggregatorPort {
  aggregate(results: ValidatorResult[]): ValidationResult;
}

export interface EventBusPort {
  emit(event: string, data?: any): void;
}
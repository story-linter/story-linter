// @story-linter/core - Main entry point

export const VERSION = '0.1.0';

// Type exports
export * from './types';

// Validator base class - use the refactored version
export { BaseValidator } from './validators/base-validator';
export type { 
  ValidatorConfig, 
  ValidatorContext, 
  ParsedFile,
  Logger 
} from './validators/base-validator';

// File utilities - export the refactored version
export { FileReader } from './utils/file-reader-refactored';
export type { 
  FileMetadata, 
  ExtractedMetadata, 
  MetadataLocation,
  MetadataExtractor,
  FileReaderConfig
} from './utils/file-reader-refactored';

// Factories for easy instantiation
export { FileReaderFactory } from './factories/file-reader-factory';

// File discovery
export { FileDiscovery } from './utils/file-discovery';
export type { FileDiscoveryOptions } from './utils/file-discovery';

// Configuration
export { ConfigLoader } from './config/config-loader';
export type { StoryLinterConfig } from './config/config-loader';

// Main framework
export { ValidationFramework } from './framework/validation-framework';
export type { ValidationOptions, ValidationProgress } from './framework/validation-framework';
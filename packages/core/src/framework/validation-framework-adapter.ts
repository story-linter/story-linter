import { EventEmitter } from 'node:events';
import type { BaseValidator } from '../validators/base-validator';
import type { ValidationResult } from '../types';
import { FileReader } from '../utils/file-reader';
import { FileDiscovery } from '../utils/file-discovery';
import { ConfigLoader } from '../config/config-loader';
import { ValidationOrchestrator } from './validation-orchestrator';
import { PluginManager } from './plugin-manager';
import { ResultAggregator } from './result-aggregator';
import { FileProcessor } from './file-processor';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Adapter implementations for ports
class FileReaderAdapter implements FileProcessorPort {
  constructor(private fileReader: FileReader) {}
  
  async processFiles(
    filePaths: string[],
    extractors: Map<string, (content: string, context: any) => any>
  ) {
    const parsedFiles = [];
    
    for (const filePath of filePaths) {
      try {
        const metadata = await this.fileReader.extractMetadata(filePath, extractors);
        const fileData = await this.fileReader.readFile(filePath);
        
        parsedFiles.push({
          path: filePath,
          content: fileData.content,
          metadata
        });
      } catch (error) {
        // Continue processing other files on error
        continue;
      }
    }
    
    return parsedFiles;
  }
}

class ConfigLoaderAdapter implements ConfigLoaderPort {
  constructor(private configLoader: ConfigLoader) {}
  
  async loadConfig(pathOrDir: string) {
    return this.configLoader.loadConfig(pathOrDir);
  }
  
  getValidatorConfig(config: any, validatorName: string) {
    return this.configLoader.getValidatorConfig(config, validatorName);
  }
}

class FileDiscoveryAdapter implements FileDiscoveryPort {
  constructor(private fileDiscovery: FileDiscovery) {}
  
  async discoverFiles(options: { include: string[]; exclude: string[]; baseDir?: string }) {
    return this.fileDiscovery.discoverFiles(options);
  }
}

class EventEmitterAdapter implements EventEmitterPort {
  constructor(private eventEmitter: EventEmitter) {}
  
  emit(event: string, data?: any): void {
    this.eventEmitter.emit(event, data);
  }
  
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }
}

// Port types
interface FileProcessorPort {
  processFiles(
    filePaths: string[],
    extractors: Map<string, (content: string, context: any) => any>
  ): Promise<any[]>;
}

interface ConfigLoaderPort {
  loadConfig(pathOrDir: string): Promise<any>;
  getValidatorConfig(config: any, validatorName: string): any;
}

interface FileDiscoveryPort {
  discoverFiles(options: { include: string[]; exclude: string[]; baseDir?: string }): Promise<string[]>;
}

interface EventEmitterPort {
  emit(event: string, data?: any): void;
  on(event: string, listener: (...args: any[]) => void): void;
}

export interface ValidationOptions {
  files?: string[];
  config?: string;
  parallel?: boolean;
}

/**
 * Adapter that maintains the original ValidationFramework interface
 * while using the new refactored components internally
 */
export class ValidationFramework extends EventEmitter {
  private orchestrator: ValidationOrchestrator;
  private pluginManager: PluginManager;
  
  constructor() {
    super();
    
    // Initialize new components
    this.pluginManager = new PluginManager();
    
    // Create real implementations with Node.js modules
    const fileReader = new FileReader();
    const fileDiscovery = new FileDiscovery(
      {
        glob: async (pattern: string, options: any) => {
          const { glob } = await import('glob');
          return glob(pattern, options);
        },
        hasMagic: (pattern: string) => {
          const { hasMagic } = require('glob');
          return hasMagic(pattern);
        },
        minimatch: (path: string, pattern: string, options?: any) => {
          const { minimatch } = require('minimatch');
          return minimatch(path, pattern, options);
        }
      },
      {
        stat: async (path: string) => {
          return fs.stat(path);
        }
      },
      {
        resolve: (...paths: string[]) => path.resolve(...paths),
        cwd: () => process.cwd()
      }
    );
    
    const configLoader = new ConfigLoader(
      {
        readFile: async (path: string, encoding?: string) => {
          return fs.readFile(path, { encoding: encoding as BufferEncoding });
        },
        fileExists: async (path: string) => {
          try {
            await fs.access(path);
            return true;
          } catch {
            return false;
          }
        }
      },
      {
        resolve: (...paths: string[]) => path.resolve(...paths),
        dirname: (filePath: string) => path.dirname(filePath)
      }
    );
    
    // Create adapters
    const fileProcessorAdapter = new FileReaderAdapter(fileReader);
    const configLoaderAdapter = new ConfigLoaderAdapter(configLoader);
    const fileDiscoveryAdapter = new FileDiscoveryAdapter(fileDiscovery);
    const eventEmitterAdapter = new EventEmitterAdapter(this);
    
    // Create orchestrator with all dependencies
    this.orchestrator = new ValidationOrchestrator(
      fileProcessorAdapter,
      configLoaderAdapter,
      fileDiscoveryAdapter,
      this.pluginManager,
      new ResultAggregator(),
      eventEmitterAdapter
    );
  }
  
  /**
   * Register a validator (original interface)
   */
  use(validator: BaseValidator): void {
    this.pluginManager.registerValidator(validator);
    this.emit('validator:registered', validator.name);
  }
  
  /**
   * Run validation (original interface)
   */
  async validate(options: ValidationOptions = {}): Promise<ValidationResult> {
    return this.orchestrator.validate(options);
  }
  
  /**
   * Clean up validators (original interface)
   */
  async destroy(): Promise<void> {
    await this.orchestrator.destroy();
    this.pluginManager.clear();
  }
  
  /**
   * Clear cache methods for compatibility
   */
  clearCache(): void {
    // These would be on the individual components now
    // But we maintain the interface for compatibility
  }
}
import { FileReader, type FileReaderConfig } from '../utils/file-reader-refactored';
import { NodeFileSystem, NodeStreamProcessor, GrayMatterParser } from '../adapters/node-file-system';

/**
 * Factory for creating FileReader instances
 * Hides the complexity of dependency injection from consumers
 */
export class FileReaderFactory {
  /**
   * Create a FileReader with real Node.js implementations
   */
  static create(config?: FileReaderConfig): FileReader {
    return new FileReader(
      new NodeFileSystem(),
      new NodeStreamProcessor(),
      new GrayMatterParser(),
      config
    );
  }
  
  /**
   * Create a FileReader with custom dependencies (for testing)
   */
  static createWithDependencies(
    fileSystem: any,
    streamProcessor: any,
    contentParser: any,
    config?: FileReaderConfig
  ): FileReader {
    return new FileReader(
      fileSystem,
      streamProcessor,
      contentParser,
      config
    );
  }
}
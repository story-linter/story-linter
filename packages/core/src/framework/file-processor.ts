import type { ParsedFile } from '../validators/base-validator';

// Port interface for dependency injection
export interface FileReaderPort {
  readFile(path: string): Promise<{ content: string; stats: any }>;
  extractMetadata(
    path: string,
    extractors: Map<string, (content: string, context: any) => any>
  ): Promise<any>;
}

/**
 * Processes files for validation with metadata extraction
 * Following SOLID principles - Single Responsibility
 */
export class FileProcessor {
  constructor(
    private readonly fileReader: FileReaderPort
  ) {}
  
  /**
   * Process files and extract metadata using provided extractors
   */
  async processFiles(
    filePaths: string[],
    extractors: Map<string, (content: string, context: any) => any>
  ): Promise<ParsedFile[]> {
    const parsedFiles: ParsedFile[] = [];
    
    for (const filePath of filePaths) {
      // Extract metadata if extractors provided
      const metadata = extractors.size > 0
        ? await this.fileReader.extractMetadata(filePath, extractors)
        : {};
      
      // Read file content
      const { content } = await this.fileReader.readFile(filePath);
      
      parsedFiles.push({
        path: filePath,
        content,
        metadata
      });
    }
    
    return parsedFiles;
  }
}
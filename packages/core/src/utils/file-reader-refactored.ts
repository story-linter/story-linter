import matter from 'gray-matter';
import type { FileSystemPort } from '../../test/doubles/file-system';

// Interfaces for dependency injection
export interface StreamProcessor {
  processStream(path: string, onChunk: (chunk: string) => void): Promise<void>;
}

export interface ContentParser {
  parseFrontMatter(content: string): { data: any; content: string };
}

export interface MetadataExtractorContext {
  filePath: string;
}

export type MetadataExtractor = (
  content: string,
  context: MetadataExtractorContext
) => any;

export interface FileMetadata {
  path: string;
  size: number;
  lastModified: Date;
  frontMatter: Record<string, any>;
  content?: string;
}

export interface MetadataLocation {
  line: number;
  column: number;
  offset: number;
}

export interface ExtractedMetadata {
  title?: string;
  author?: string;
  date?: Date;
  tags?: string[];
  wordCount: number;
  headings: Array<{
    level: number;
    text: string;
    location: MetadataLocation;
  }>;
  links: Array<{
    text: string;
    target: string;
    location: MetadataLocation;
  }>;
  [key: string]: any;
}

// Configuration for testability
export interface FileReaderConfig {
  smallFileThreshold?: number;
  cacheEnabled?: boolean;
}

/**
 * FileReader with dependency injection for testability
 */
export class FileReader {
  private readonly smallFileThreshold: number;
  private readonly cacheEnabled: boolean;
  private metadataCache = new Map<string, ExtractedMetadata>();
  private smallFileCache = new Map<string, string>();
  
  constructor(
    private readonly fileSystem: FileSystemPort,
    private readonly streamProcessor: StreamProcessor,
    private readonly contentParser: ContentParser,
    config: FileReaderConfig = {}
  ) {
    this.smallFileThreshold = config.smallFileThreshold ?? 100 * 1024;
    this.cacheEnabled = config.cacheEnabled ?? true;
  }
  
  async readFile(filePath: string): Promise<FileMetadata> {
    const stats = await this.fileSystem.stat(filePath);
    
    const metadata: FileMetadata = {
      path: filePath,
      size: stats.size,
      lastModified: stats.mtime,
      frontMatter: {},
    };
    
    if (stats.size <= this.smallFileThreshold) {
      const content = await this.fileSystem.readFile(filePath);
      const parsed = this.contentParser.parseFrontMatter(content);
      
      metadata.frontMatter = parsed.data;
      metadata.content = parsed.content;
      
      if (this.cacheEnabled) {
        this.smallFileCache.set(filePath, parsed.content);
      }
    } else {
      await this.extractFrontMatterFromStream(filePath, metadata);
    }
    
    return metadata;
  }
  
  async extractMetadata(
    filePath: string,
    extractors: Map<string, MetadataExtractor>
  ): Promise<ExtractedMetadata> {
    if (this.cacheEnabled) {
      const cached = this.metadataCache.get(filePath);
      if (cached) return cached;
    }
    
    const fileData = await this.readFile(filePath);
    const metadata = this.createBaseMetadata(fileData);
    
    if (fileData.content) {
      this.extractContentMetadata(fileData.content, metadata);
      await this.runExtractors(fileData.content, filePath, extractors, metadata);
    } else {
      await this.extractMetadataFromStream(filePath, metadata, extractors);
    }
    
    if (this.cacheEnabled) {
      this.metadataCache.set(filePath, metadata);
    }
    
    return metadata;
  }
  
  clearCache(): void {
    this.metadataCache.clear();
    this.smallFileCache.clear();
  }
  
  // Private helper methods
  
  private createBaseMetadata(fileData: FileMetadata): ExtractedMetadata {
    return {
      title: fileData.frontMatter.title,
      author: fileData.frontMatter.author,
      date: fileData.frontMatter.date,
      tags: fileData.frontMatter.tags || [],
      wordCount: 0,
      headings: [],
      links: [],
    };
  }
  
  private extractContentMetadata(content: string, metadata: ExtractedMetadata): void {
    metadata.wordCount = this.countWords(content);
    metadata.headings = this.extractHeadings(content);
    metadata.links = this.extractLinks(content);
  }
  
  private async runExtractors(
    content: string,
    filePath: string,
    extractors: Map<string, MetadataExtractor>,
    metadata: ExtractedMetadata
  ): Promise<void> {
    const context: MetadataExtractorContext = { filePath };
    
    for (const [key, extractor] of extractors) {
      metadata[key] = await Promise.resolve(extractor(content, context));
    }
  }
  
  private async extractFrontMatterFromStream(
    filePath: string,
    metadata: FileMetadata
  ): Promise<void> {
    let buffer = '';
    let frontMatterComplete = false;
    
    await this.streamProcessor.processStream(filePath, (chunk) => {
      if (frontMatterComplete) return;
      
      buffer += chunk;
      const endIndex = buffer.indexOf('---', 4);
      
      if (endIndex > 0) {
        const frontMatterText = buffer.substring(0, endIndex + 3);
        const parsed = this.contentParser.parseFrontMatter(frontMatterText);
        metadata.frontMatter = parsed.data;
        frontMatterComplete = true;
      }
    });
  }
  
  private async extractMetadataFromStream(
    filePath: string,
    metadata: ExtractedMetadata,
    extractors: Map<string, MetadataExtractor>
  ): Promise<void> {
    // This would implement streaming metadata extraction
    // For MVP, we'll throw an error for large files
    throw new Error('Streaming metadata extraction not yet implemented');
  }
  
  private countWords(content: string): number {
    return content.split(/\s+/).filter(word => word.length > 0).length;
  }
  
  private extractHeadings(content: string): ExtractedMetadata['headings'] {
    const headings: ExtractedMetadata['headings'] = [];
    const lines = content.split('\n');
    let offset = 0;
    
    lines.forEach((line, lineIndex) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].trim(),
          location: {
            line: lineIndex + 1,
            column: 1,
            offset,
          },
        });
      }
      offset += line.length + 1;
    });
    
    return headings;
  }
  
  private extractLinks(content: string): ExtractedMetadata['links'] {
    const links: ExtractedMetadata['links'] = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      const location = this.getLocationFromOffset(content, match.index);
      links.push({
        text: match[1],
        target: match[2],
        location,
      });
    }
    
    return links;
  }
  
  private getLocationFromOffset(content: string, offset: number): MetadataLocation {
    const lines = content.substring(0, offset).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
      offset,
    };
  }
}
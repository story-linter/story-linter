import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import matter from 'gray-matter';
import type { GrayMatterFile } from 'gray-matter';

export interface FileMetadata {
  path: string;
  size: number;
  lastModified: Date;
  frontMatter: Record<string, any>;
  content?: string; // Only for small files
  hash?: string;
}

export interface MetadataLocation {
  line: number;
  column: number;
  offset: number; // byte offset for seeking
}

export interface ExtractedMetadata {
  // Base metadata
  title?: string;
  author?: string;
  date?: Date;
  tags?: string[];
  wordCount: number;
  
  // Structural elements with locations
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
  
  // Plugin-specific metadata (added by extractors)
  [key: string]: any;
}

const SMALL_FILE_THRESHOLD = 100 * 1024; // 100KB

export class FileReader {
  private metadataCache = new Map<string, ExtractedMetadata>();
  private smallFileCache = new Map<string, string>();
  
  async readFile(filePath: string): Promise<FileMetadata> {
    const resolvedPath = resolve(filePath);
    const stats = await stat(resolvedPath);
    
    const metadata: FileMetadata = {
      path: resolvedPath,
      size: stats.size,
      lastModified: stats.mtime,
      frontMatter: {},
    };
    
    if (stats.size <= SMALL_FILE_THRESHOLD) {
      // Small file - read entirely
      const parsed = matter.read(resolvedPath);
      metadata.frontMatter = parsed.data;
      metadata.content = parsed.content;
      this.smallFileCache.set(resolvedPath, parsed.content);
    } else {
      // Large file - stream and extract metadata
      await this.streamFile(resolvedPath, metadata);
    }
    
    return metadata;
  }
  
  private async streamFile(filePath: string, metadata: FileMetadata): Promise<void> {
    const stream = createReadStream(filePath, { encoding: 'utf8' });
    let frontMatterComplete = false;
    let buffer = '';
    
    const extractorTransform = new Transform({
      encoding: 'utf8',
      transform(chunk: string, encoding, callback) {
        buffer += chunk;
        
        // Extract front matter from buffer if not done
        if (!frontMatterComplete && buffer.includes('---')) {
          const endIndex = buffer.indexOf('---', 4);
          if (endIndex > 0) {
            const frontMatterText = buffer.substring(0, endIndex + 3);
            const parsed = matter(frontMatterText);
            metadata.frontMatter = parsed.data;
            frontMatterComplete = true;
          }
        }
        
        // Pass through for metadata extraction
        this.push(chunk);
        callback();
      }
    });
    
    await pipeline(stream, extractorTransform);
  }
  
  async extractMetadata(
    filePath: string, 
    extractors: Map<string, (content: string) => any>
  ): Promise<ExtractedMetadata> {
    // Check cache first
    const cached = this.metadataCache.get(filePath);
    if (cached) return cached;
    
    const fileData = await this.readFile(filePath);
    const metadata: ExtractedMetadata = {
      title: fileData.frontMatter.title,
      author: fileData.frontMatter.author,
      date: fileData.frontMatter.date,
      tags: fileData.frontMatter.tags || [],
      wordCount: 0,
      headings: [],
      links: [],
    };
    
    // If we have content (small file), extract metadata
    if (fileData.content) {
      // Extract base metadata
      metadata.wordCount = fileData.content.split(/\s+/).length;
      metadata.headings = this.extractHeadings(fileData.content);
      metadata.links = this.extractLinks(fileData.content);
      
      // Run plugin extractors
      for (const [key, extractor] of extractors) {
        metadata[key] = extractor(fileData.content);
      }
    } else {
      // For large files, we'd stream and extract incrementally
      // TODO: Implement streaming extraction
    }
    
    this.metadataCache.set(filePath, metadata);
    return metadata;
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
      offset += line.length + 1; // +1 for newline
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
  
  clearCache(): void {
    this.metadataCache.clear();
    this.smallFileCache.clear();
  }
}
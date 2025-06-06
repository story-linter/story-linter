import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import type { FileSystemPort } from '../../test/doubles/file-system';
import type { StreamProcessor, ContentParser } from '../utils/file-reader-refactored';
import matter from 'gray-matter';

/**
 * Real Node.js file system implementation
 */
export class NodeFileSystem implements FileSystemPort {
  async readFile(path: string): Promise<string> {
    return readFile(path, 'utf8');
  }
  
  async stat(path: string): Promise<{ size: number; mtime: Date }> {
    const stats = await stat(path);
    return {
      size: stats.size,
      mtime: stats.mtime,
    };
  }
  
  async exists(path: string): Promise<boolean> {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Real Node.js stream processor
 */
export class NodeStreamProcessor implements StreamProcessor {
  async processStream(path: string, onChunk: (chunk: string) => void): Promise<void> {
    const stream = createReadStream(path, { encoding: 'utf8' });
    
    const transform = new Transform({
      encoding: 'utf8',
      transform(chunk: string, encoding, callback) {
        onChunk(chunk);
        callback();
      },
    });
    
    await pipeline(stream, transform);
  }
}

/**
 * Real gray-matter content parser
 */
export class GrayMatterParser implements ContentParser {
  parseFrontMatter(content: string): { data: any; content: string } {
    const result = matter(content);
    return {
      data: result.data,
      content: result.content,
    };
  }
}
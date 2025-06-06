import { describe, it, expect, beforeEach } from 'vitest';
import { FileReader } from './file-reader-refactored';
import { FakeFileSystem } from '../../test/doubles/file-system';
import type { StreamProcessor, ContentParser } from './file-reader-refactored';

// Test doubles
class FakeStreamProcessor implements StreamProcessor {
  async processStream(path: string, onChunk: (chunk: string) => void): Promise<void> {
    // For testing, we'll just read the whole file and send it as one chunk
    // In real implementation, this would stream
    const content = await this.fileSystem.readFile(path);
    onChunk(content);
  }
  
  constructor(private fileSystem: FakeFileSystem) {}
}

class FakeContentParser implements ContentParser {
  parseFrontMatter(content: string): { data: any; content: string } {
    if (!content.startsWith('---')) {
      return { data: {}, content };
    }
    
    const endIndex = content.indexOf('---', 4);
    if (endIndex === -1) {
      return { data: {}, content };
    }
    
    const frontMatter = content.substring(4, endIndex).trim();
    const mainContent = content.substring(endIndex + 3).trim();
    
    // Simple YAML parsing for tests
    const data: any = {};
    frontMatter.split('\n').forEach(line => {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        data[key] = value.replace(/['"]/g, '');
      }
    });
    
    return { data, content: mainContent };
  }
}

describe('FileReader', () => {
  let fileSystem: FakeFileSystem;
  let streamProcessor: FakeStreamProcessor;
  let contentParser: FakeContentParser;
  let fileReader: FileReader;
  
  beforeEach(() => {
    fileSystem = new FakeFileSystem();
    streamProcessor = new FakeStreamProcessor(fileSystem);
    contentParser = new FakeContentParser();
    fileReader = new FileReader(fileSystem, streamProcessor, contentParser);
  });
  
  describe('readFile', () => {
    it('should read small files entirely with front matter', async () => {
      // Arrange
      const content = `---
title: Test Chapter
author: Jane Doe
---
# Chapter 1

This is the chapter content.`;
      fileSystem.addFile('/test/chapter1.md', content);
      
      // Act
      const result = await fileReader.readFile('/test/chapter1.md');
      
      // Assert
      expect(result.path).toBe('/test/chapter1.md');
      expect(result.frontMatter.title).toBe('Test Chapter');
      expect(result.frontMatter.author).toBe('Jane Doe');
      expect(result.content).toBe('# Chapter 1\n\nThis is the chapter content.');
      expect(result.size).toBe(Buffer.byteLength(content, 'utf8'));
    });
    
    it('should handle files without front matter', async () => {
      // Arrange
      const content = '# Chapter 1\n\nNo front matter here.';
      fileSystem.addFile('/test/chapter2.md', content);
      
      // Act
      const result = await fileReader.readFile('/test/chapter2.md');
      
      // Assert
      expect(result.frontMatter).toEqual({});
      expect(result.content).toBe(content);
    });
    
    it('should stream large files without loading content', async () => {
      // Arrange
      const largeContent = '---\ntitle: Large File\n---\n' + 'x'.repeat(200 * 1024);
      fileSystem.addFile('/test/large.md', largeContent);
      
      // Use smaller threshold for testing
      const reader = new FileReader(fileSystem, streamProcessor, contentParser, {
        smallFileThreshold: 1024,
      });
      
      // Act
      const result = await reader.readFile('/test/large.md');
      
      // Assert
      expect(result.frontMatter.title).toBe('Large File');
      expect(result.content).toBeUndefined(); // Content not loaded for large files
    });
  });
  
  describe('extractMetadata', () => {
    it('should extract basic metadata from content', async () => {
      // Arrange
      const content = `---
title: Test Story
tags: ["fiction", "drama"]
---
# Main Title

Some text with a [link](https://example.com).

## Subtitle

More content here.`;
      fileSystem.addFile('/test/story.md', content);
      
      // Act
      const metadata = await fileReader.extractMetadata('/test/story.md', new Map());
      
      // Assert
      expect(metadata.title).toBe('Test Story');
      expect(metadata.tags).toEqual(['fiction', 'drama']);
      expect(metadata.wordCount).toBe(8); // Count words in content
      expect(metadata.headings).toHaveLength(2);
      expect(metadata.headings[0]).toEqual({
        level: 1,
        text: 'Main Title',
        location: { line: 1, column: 1, offset: 0 },
      });
      expect(metadata.links).toHaveLength(1);
      expect(metadata.links[0]).toEqual({
        text: 'link',
        target: 'https://example.com',
        location: { line: 3, column: 20, offset: 33 },
      });
    });
    
    it('should run custom metadata extractors', async () => {
      // Arrange
      const content = `---
title: Test
---
John said "Hello" to Mary.`;
      fileSystem.addFile('/test/dialogue.md', content);
      
      const extractors = new Map([
        ['speakers', (content: string) => {
          const speakers = new Set<string>();
          const regex = /(\w+) said/g;
          let match;
          while ((match = regex.exec(content)) !== null) {
            speakers.add(match[1]);
          }
          return Array.from(speakers);
        }],
      ]);
      
      // Act
      const metadata = await fileReader.extractMetadata('/test/dialogue.md', extractors);
      
      // Assert
      expect(metadata.speakers).toEqual(['John']);
    });
    
    it('should cache metadata for repeated calls', async () => {
      // Arrange
      const content = '# Test';
      fileSystem.addFile('/test/cached.md', content);
      
      // Act
      const metadata1 = await fileReader.extractMetadata('/test/cached.md', new Map());
      const metadata2 = await fileReader.extractMetadata('/test/cached.md', new Map());
      
      // Assert
      expect(metadata1).toBe(metadata2); // Same object reference
    });
    
    it('should respect cache disabled configuration', async () => {
      // Arrange
      const content = '# Test';
      fileSystem.addFile('/test/no-cache.md', content);
      
      const reader = new FileReader(fileSystem, streamProcessor, contentParser, {
        cacheEnabled: false,
      });
      
      // Act
      const metadata1 = await reader.extractMetadata('/test/no-cache.md', new Map());
      const metadata2 = await reader.extractMetadata('/test/no-cache.md', new Map());
      
      // Assert
      expect(metadata1).not.toBe(metadata2); // Different objects
      expect(metadata1).toEqual(metadata2); // But same content
    });
  });
  
  describe('clearCache', () => {
    it('should clear all caches', async () => {
      // Arrange
      const content = '# Test';
      fileSystem.addFile('/test/clear.md', content);
      
      // Pre-populate cache
      await fileReader.extractMetadata('/test/clear.md', new Map());
      
      // Act
      fileReader.clearCache();
      
      // Modify file to verify cache was cleared
      fileSystem.addFile('/test/clear.md', '# Modified');
      const metadata = await fileReader.extractMetadata('/test/clear.md', new Map());
      
      // Assert
      expect(metadata.headings[0].text).toBe('Modified');
    });
  });
});
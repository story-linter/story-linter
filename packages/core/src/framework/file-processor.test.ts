import { describe, it, expect, beforeEach } from 'vitest';
import { FileProcessor } from './file-processor';
import type { ParsedFile } from '../validators/base-validator';

// Port interfaces for dependency injection
interface FileReaderPort {
  readFile(path: string): Promise<{ content: string; stats: any }>;
  extractMetadata(
    path: string,
    extractors: Map<string, (content: string, context: any) => any>
  ): Promise<any>;
}

// Test doubles
class TestFileReader implements FileReaderPort {
  private files = new Map<string, { content: string; stats: any }>();
  
  setFile(path: string, content: string, stats: any = { size: content.length }): void {
    this.files.set(path, { content, stats });
  }
  
  async readFile(path: string): Promise<{ content: string; stats: any }> {
    const file = this.files.get(path);
    if (!file) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return file;
  }
  
  async extractMetadata(
    path: string,
    extractors: Map<string, (content: string, context: any) => any>
  ): Promise<any> {
    const file = this.files.get(path);
    if (!file) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    
    const metadata: any = {};
    
    // Apply extractors
    for (const [key, extractor] of extractors) {
      metadata[key] = extractor(file.content, { path });
    }
    
    return metadata;
  }
}

describe('FileProcessor', () => {
  let fileProcessor: FileProcessor;
  let fileReader: TestFileReader;
  
  beforeEach(() => {
    fileReader = new TestFileReader();
    fileProcessor = new FileProcessor(fileReader);
  });
  
  describe('processFiles', () => {
    it('should process single file without extractors', async () => {
      // Arrange
      const content = '# Test Story\nThis is content.';
      fileReader.setFile('/test/story.md', content);
      
      // Act
      const result = await fileProcessor.processFiles(
        ['/test/story.md'],
        new Map()
      );
      
      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('/test/story.md');
      expect(result[0].content).toBe(content);
      expect(result[0].metadata).toEqual({});
    });
    
    it('should process multiple files', async () => {
      // Arrange
      fileReader.setFile('/test/chapter1.md', '# Chapter 1');
      fileReader.setFile('/test/chapter2.md', '# Chapter 2');
      fileReader.setFile('/test/chapter3.md', '# Chapter 3');
      
      // Act
      const result = await fileProcessor.processFiles(
        ['/test/chapter1.md', '/test/chapter2.md', '/test/chapter3.md'],
        new Map()
      );
      
      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].path).toBe('/test/chapter1.md');
      expect(result[1].path).toBe('/test/chapter2.md');
      expect(result[2].path).toBe('/test/chapter3.md');
    });
    
    it('should apply metadata extractors', async () => {
      // Arrange
      const content = '# My Story\nCharacter: Alice\nCharacter: Bob';
      fileReader.setFile('/test/story.md', content);
      
      const extractors = new Map<string, (content: string, context: any) => any>([
        ['characters', (text: string) => {
          const matches = text.match(/Character: (\w+)/g) || [];
          return matches.map(m => m.replace('Character: ', ''));
        }],
        ['title', (text: string) => {
          const match = text.match(/^# (.+)$/m);
          return match ? match[1] : null;
        }]
      ]);
      
      // Act
      const result = await fileProcessor.processFiles(
        ['/test/story.md'],
        extractors
      );
      
      // Assert
      expect(result[0].metadata).toEqual({
        characters: ['Alice', 'Bob'],
        title: 'My Story'
      });
    });
    
    it('should handle file read errors gracefully', async () => {
      // Arrange - file not set in test reader
      
      // Act & Assert
      await expect(fileProcessor.processFiles(
        ['/test/missing.md'],
        new Map()
      )).rejects.toThrow('ENOENT');
    });
    
    it('should process files with empty content', async () => {
      // Arrange
      fileReader.setFile('/test/empty.md', '');
      
      // Act
      const result = await fileProcessor.processFiles(
        ['/test/empty.md'],
        new Map()
      );
      
      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('');
      expect(result[0].metadata).toEqual({});
    });
    
    it('should handle extractor errors gracefully', async () => {
      // Arrange
      fileReader.setFile('/test/story.md', 'Some content');
      
      const extractors = new Map<string, (content: string, context: any) => any>([
        ['failing', () => {
          throw new Error('Extractor failed');
        }],
        ['working', () => 'success']
      ]);
      
      // Act & Assert - should propagate the error
      await expect(fileProcessor.processFiles(
        ['/test/story.md'],
        extractors
      )).rejects.toThrow('Extractor failed');
    });
    
    it('should preserve file processing order', async () => {
      // Arrange
      const files = ['/z.md', '/a.md', '/m.md'];
      files.forEach(file => fileReader.setFile(file, `Content of ${file}`));
      
      // Act
      const result = await fileProcessor.processFiles(files, new Map());
      
      // Assert
      expect(result.map(f => f.path)).toEqual(files);
    });
    
    it('should include extractor context', async () => {
      // Arrange
      fileReader.setFile('/test/story.md', 'Content');
      
      let capturedContext: any;
      const extractors = new Map<string, (content: string, context: any) => any>([
        ['contextTest', (content: string, context: any) => {
          capturedContext = context;
          return 'value';
        }]
      ]);
      
      // Act
      await fileProcessor.processFiles(['/test/story.md'], extractors);
      
      // Assert
      expect(capturedContext).toBeDefined();
      expect(capturedContext.path).toBe('/test/story.md');
    });
    
    it('should handle large file lists efficiently', async () => {
      // Arrange
      const files: string[] = [];
      for (let i = 0; i < 100; i++) {
        const path = `/test/file${i}.md`;
        files.push(path);
        fileReader.setFile(path, `Content ${i}`);
      }
      
      // Act
      const result = await fileProcessor.processFiles(files, new Map());
      
      // Assert
      expect(result).toHaveLength(100);
      expect(result[0].path).toBe('/test/file0.md');
      expect(result[99].path).toBe('/test/file99.md');
    });
    
    it('should not include file content in metadata by default', async () => {
      // Arrange
      const content = 'File content here';
      fileReader.setFile('/test/story.md', content);
      
      // Act
      const result = await fileProcessor.processFiles(
        ['/test/story.md'],
        new Map()
      );
      
      // Assert
      expect(result[0].content).toBe(content);
      expect(result[0].metadata).not.toHaveProperty('content');
    });
  });
});
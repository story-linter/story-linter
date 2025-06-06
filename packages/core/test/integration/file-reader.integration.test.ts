import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileReaderFactory } from '../../src/factories/file-reader-factory';

describe('FileReader Integration Tests', () => {
  let tempDir: string;
  let fileReader: ReturnType<typeof FileReaderFactory.create>;
  
  beforeAll(async () => {
    // Create temporary directory for test files
    tempDir = await mkdtemp(join(tmpdir(), 'story-linter-test-'));
    fileReader = FileReaderFactory.create();
  });
  
  afterAll(async () => {
    // Clean up
    await rm(tempDir, { recursive: true, force: true });
  });
  
  it('should read real markdown files with front matter', async () => {
    // Arrange
    const filePath = join(tempDir, 'test-story.md');
    const content = `---
title: Integration Test Story
author: Test Author
date: 2024-01-01
tags:
  - test
  - integration
---

# Chapter One

This is a test story for integration testing.

## Section 1.1

Some content with a [link](./chapter-two.md) to another chapter.

### Subsection

More detailed content here.`;
    
    await writeFile(filePath, content, 'utf8');
    
    // Act
    const fileData = await fileReader.readFile(filePath);
    const metadata = await fileReader.extractMetadata(filePath, new Map());
    
    // Assert - File data
    expect(fileData.path).toBe(filePath);
    expect(fileData.frontMatter).toEqual({
      title: 'Integration Test Story',
      author: 'Test Author',
      date: new Date('2024-01-01'),
      tags: ['test', 'integration'],
    });
    expect(fileData.content).toContain('Chapter One');
    
    // Assert - Metadata
    expect(metadata.title).toBe('Integration Test Story');
    expect(metadata.author).toBe('Test Author');
    expect(metadata.tags).toEqual(['test', 'integration']);
    expect(metadata.wordCount).toBeGreaterThan(10);
    
    // Assert - Headings
    expect(metadata.headings).toHaveLength(3);
    expect(metadata.headings[0]).toMatchObject({
      level: 1,
      text: 'Chapter One',
    });
    expect(metadata.headings[1]).toMatchObject({
      level: 2,
      text: 'Section 1.1',
    });
    
    // Assert - Links
    expect(metadata.links).toHaveLength(1);
    expect(metadata.links[0]).toMatchObject({
      text: 'link',
      target: './chapter-two.md',
    });
  });
  
  it('should handle files without front matter', async () => {
    // Arrange
    const filePath = join(tempDir, 'no-frontmatter.md');
    const content = `# Plain Markdown

Just a simple file without front matter.`;
    
    await writeFile(filePath, content, 'utf8');
    
    // Act
    const fileData = await fileReader.readFile(filePath);
    
    // Assert
    expect(fileData.frontMatter).toEqual({});
    expect(fileData.content).toBe(content);
  });
  
  it('should handle empty files', async () => {
    // Arrange
    const filePath = join(tempDir, 'empty.md');
    await writeFile(filePath, '', 'utf8');
    
    // Act
    const fileData = await fileReader.readFile(filePath);
    const metadata = await fileReader.extractMetadata(filePath, new Map());
    
    // Assert
    expect(fileData.content).toBe('');
    expect(metadata.wordCount).toBe(0);
    expect(metadata.headings).toEqual([]);
    expect(metadata.links).toEqual([]);
  });
  
  it('should extract custom metadata using extractors', async () => {
    // Arrange
    const filePath = join(tempDir, 'dialogue.md');
    const content = `---
title: Dialogue Test
---

"Hello," said Alice.

"Hi there," Bob replied.

Alice laughed. "This is fun!"

The narrator explained that Bob was confused.`;
    
    await writeFile(filePath, content, 'utf8');
    
    // Custom extractor to find dialogue
    const extractors = new Map([
      ['dialogue', (content: string) => {
        const dialoguePattern = /"([^"]+)"[^"]*said\s+(\w+)|(\w+)\s+\w+\.\s*"([^"]+)"/g;
        const dialogue = [];
        let match;
        
        while ((match = dialoguePattern.exec(content)) !== null) {
          if (match[1] && match[2]) {
            dialogue.push({ speaker: match[2], text: match[1] });
          } else if (match[3] && match[4]) {
            dialogue.push({ speaker: match[3], text: match[4] });
          }
        }
        
        return dialogue;
      }],
    ]);
    
    // Act
    const metadata = await fileReader.extractMetadata(filePath, extractors);
    
    // Assert
    expect(metadata.dialogue).toEqual([
      { speaker: 'Alice', text: 'Hello,' },
      { speaker: 'Bob', text: 'Hi there,' },
      { speaker: 'Alice', text: 'This is fun!' },
    ]);
  });
  
  it('should handle large files efficiently', async () => {
    // Arrange
    const filePath = join(tempDir, 'large.md');
    const largeContent = `---
title: Large File Test
---

${'Lorem ipsum dolor sit amet. '.repeat(10000)}`;
    
    await writeFile(filePath, largeContent, 'utf8');
    
    // Use lower threshold for testing
    const reader = FileReaderFactory.create({ smallFileThreshold: 1024 });
    
    // Act
    const startTime = Date.now();
    const fileData = await reader.readFile(filePath);
    const duration = Date.now() - startTime;
    
    // Assert
    expect(fileData.frontMatter.title).toBe('Large File Test');
    expect(fileData.content).toBeUndefined(); // Large files don't load content
    expect(duration).toBeLessThan(100); // Should be fast even for large files
  });
});
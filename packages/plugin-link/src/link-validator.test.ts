import { describe, it, expect, beforeEach } from 'vitest';
import { LinkValidator } from './link-validator';
import type { ParsedFile, ValidationResult } from '@story-linter/core';

describe('LinkValidator', () => {
  let validator: LinkValidator;
  
  beforeEach(() => {
    validator = new LinkValidator();
  });
  
  describe('broken link detection', () => {
    it('should detect links to non-existent files', async () => {
      // Arrange
      const files: ParsedFile[] = [
        {
          path: '/project/chapter1.md',
          metadata: {
            wordCount: 100,
            headings: [],
            links: [
              {
                text: 'Chapter 2',
                target: './chapter2.md',
                location: { line: 10, column: 5, offset: 100 }
              }
            ]
          }
        },
        {
          path: '/project/chapter3.md',
          metadata: {
            wordCount: 150,
            headings: [],
            links: []
          }
        }
      ];
      
      // Act
      const result = await validator.validate(files);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        code: 'link-graph:LINK001',
        message: expect.stringContaining('Broken link'),
        file: '/project/chapter1.md',
        line: 10
      });
    });
    
    it('should handle relative paths correctly', async () => {
      // Arrange
      const files: ParsedFile[] = [
        {
          path: '/project/docs/guide.md',
          metadata: {
            wordCount: 100,
            headings: [],
            links: [
              {
                text: 'Introduction',
                target: '../README.md',
                location: { line: 5, column: 1, offset: 50 }
              }
            ]
          }
        },
        {
          path: '/project/README.md',
          metadata: {
            wordCount: 200,
            headings: [],
            links: []
          }
        }
      ];
      
      // Act
      const result = await validator.validate(files);
      
      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should skip external links', async () => {
      // Arrange
      const files: ParsedFile[] = [
        {
          path: '/project/resources.md',
          metadata: {
            wordCount: 100,
            headings: [],
            links: [
              {
                text: 'Documentation',
                target: 'https://example.com/docs',
                location: { line: 10, column: 1, offset: 100 }
              },
              {
                text: 'GitHub',
                target: 'http://github.com/example',
                location: { line: 11, column: 1, offset: 150 }
              }
            ]
          }
        }
      ];
      
      // Act
      const result = await validator.validate(files);
      
      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should skip anchor links', async () => {
      // Arrange
      const files: ParsedFile[] = [
        {
          path: '/project/chapter1.md',
          metadata: {
            wordCount: 100,
            headings: [],
            links: [
              {
                text: 'See section below',
                target: '#section-2',
                location: { line: 5, column: 1, offset: 50 }
              }
            ]
          }
        }
      ];
      
      // Act
      const result = await validator.validate(files);
      
      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
  
  describe('orphaned document detection', () => {
    it('should detect files not reachable from entry points', async () => {
      // Arrange
      const files: ParsedFile[] = [
        {
          path: '/project/README.md',
          metadata: {
            wordCount: 100,
            headings: [],
            links: [
              {
                text: 'Chapter 1',
                target: './chapter1.md',
                location: { line: 10, column: 1, offset: 100 }
              }
            ]
          }
        },
        {
          path: '/project/chapter1.md',
          metadata: {
            wordCount: 200,
            headings: [],
            links: []
          }
        },
        {
          path: '/project/orphaned.md',
          metadata: {
            wordCount: 150,
            headings: [],
            links: []
          }
        }
      ];
      
      await validator.initialize(
        { 
          getResults: () => undefined,
          logger: {
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {}
          },
          getMetadata: () => undefined
        },
        {
          enabled: true,
          checkOrphans: true,
          entryPoints: ['README.md']
        }
      );
      
      // Act
      const result = await validator.validate(files);
      
      // Assert
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatchObject({
        code: 'link-graph:LINK002',
        message: expect.stringContaining('Orphaned document'),
        file: '/project/orphaned.md'
      });
    });
    
    it('should handle multiple entry points', async () => {
      // Arrange
      const files: ParsedFile[] = [
        {
          path: '/project/README.md',
          metadata: {
            wordCount: 100,
            headings: [],
            links: [
              {
                text: 'Part 1',
                target: './part1/index.md',
                location: { line: 5, column: 1, offset: 50 }
              }
            ]
          }
        },
        {
          path: '/project/part1/index.md',
          metadata: {
            wordCount: 100,
            headings: [],
            links: []
          }
        },
        {
          path: '/project/glossary.md',
          metadata: {
            wordCount: 500,
            headings: [],
            links: []
          }
        }
      ];
      
      await validator.initialize(
        { 
          getResults: () => undefined,
          logger: {
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {}
          },
          getMetadata: () => undefined
        },
        {
          enabled: true,
          checkOrphans: true,
          entryPoints: ['README.md', 'glossary.md']
        }
      );
      
      // Act
      const result = await validator.validate(files);
      
      // Assert
      expect(result.warnings).toHaveLength(0); // glossary.md is an entry point
    });
  });
  
  describe('metadata extraction', () => {
    it('should not need metadata extractors (uses framework links)', () => {
      // Arrange & Act
      const extractors = validator.getMetadataExtractors();
      
      // Assert
      expect(Object.keys(extractors)).toHaveLength(0);
    });
  });
  
  describe('graph building', () => {
    it('should build bidirectional link graph', async () => {
      // Arrange
      const files: ParsedFile[] = [
        {
          path: '/project/a.md',
          metadata: {
            wordCount: 100,
            headings: [],
            links: [
              {
                text: 'B',
                target: './b.md',
                location: { line: 1, column: 1, offset: 0 }
              }
            ]
          }
        },
        {
          path: '/project/b.md',
          metadata: {
            wordCount: 100,
            headings: [],
            links: [
              {
                text: 'A',
                target: './a.md',
                location: { line: 1, column: 1, offset: 0 }
              }
            ]
          }
        }
      ];
      
      // Act
      const result = await validator.validate(files);
      
      // Assert
      expect(result.valid).toBe(true);
      expect(result.info).toContainEqual(
        expect.objectContaining({
          code: 'link-graph:LINK003',
          message: expect.stringContaining('bidirectional')
        })
      );
    });
  });
});
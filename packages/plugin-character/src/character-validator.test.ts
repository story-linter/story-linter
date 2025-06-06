import { describe, it, expect, beforeEach } from 'vitest';
import { CharacterValidator } from './character-validator';
import type { ParsedFile, ValidationResult } from '@story-linter/core';

describe('CharacterValidator', () => {
  let validator: CharacterValidator;
  
  beforeEach(() => {
    validator = new CharacterValidator();
  });
  
  describe('character name consistency', () => {
    it('should detect inconsistent character name spelling', async () => {
      // Arrange
      const files: ParsedFile[] = [
        {
          path: 'chapter1.md',
          metadata: {
            wordCount: 100,
            headings: [],
            links: [],
            characters: {
              mentions: [
                { name: 'John', location: { line: 10, column: 1, offset: 100 } }
              ],
              introductions: ['John']
            }
          }
        },
        {
          path: 'chapter2.md',
          metadata: {
            wordCount: 150,
            headings: [],
            links: [],
            characters: {
              mentions: [
                { name: 'Jon', location: { line: 5, column: 1, offset: 50 } }
              ],
              introductions: []
            }
          }
        }
      ];
      
      // Act
      const result = await validator.validate(files);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        code: 'character-consistency:CHAR001',
        message: expect.stringContaining('Inconsistent character name'),
        file: 'chapter2.md',
        line: 5
      });
    });
    
    it('should handle configured aliases without errors', async () => {
      // Arrange
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
          aliases: {
            'Elizabeth': ['Liz', 'Beth', 'Lizzy']
          }
        }
      );
      
      const files: ParsedFile[] = [
        {
          path: 'chapter1.md',
          metadata: {
            wordCount: 100,
            headings: [],
            links: [],
            characters: {
              mentions: [
                { name: 'Elizabeth', location: { line: 10, column: 1, offset: 100 } }
              ],
              introductions: ['Elizabeth']
            }
          }
        },
        {
          path: 'chapter2.md',
          metadata: {
            wordCount: 150,
            headings: [],
            links: [],
            characters: {
              mentions: [
                { name: 'Liz', location: { line: 5, column: 1, offset: 50 } }
              ],
              introductions: []
            }
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
  
  describe('character introduction tracking', () => {
    it('should error when character is mentioned before introduction', async () => {
      // Arrange
      const files: ParsedFile[] = [
        {
          path: 'chapter1.md',
          metadata: {
            wordCount: 100,
            headings: [],
            links: [],
            characters: {
              mentions: [
                { name: 'Sarah', location: { line: 10, column: 1, offset: 100 } }
              ],
              introductions: []
            }
          }
        },
        {
          path: 'chapter2.md',
          metadata: {
            wordCount: 150,
            headings: [],
            links: [],
            characters: {
              mentions: [],
              introductions: ['Sarah']
            }
          }
        }
      ];
      
      // Act
      const result = await validator.validate(files);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        code: 'character-consistency:CHAR002',
        message: expect.stringContaining('not introduced'),
        file: 'chapter1.md',
        line: 10
      });
    });
    
    it('should allow retrospective mentions without introduction', async () => {
      // Arrange
      const files: ParsedFile[] = [
        {
          path: 'chapter1.md',
          metadata: {
            wordCount: 100,
            headings: [],
            links: [],
            characters: {
              mentions: [
                { 
                  name: 'Marcus', 
                  location: { line: 10, column: 1, offset: 100 },
                  context: 'retrospective' // "Remember when Marcus..."
                }
              ],
              introductions: []
            }
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
  
  describe('metadata extraction', () => {
    it('should provide character extraction patterns', () => {
      // Arrange & Act
      const extractors = validator.getMetadataExtractors();
      
      // Assert
      expect(extractors).toHaveProperty('characters');
      expect(typeof extractors.characters).toBe('function');
    });
    
    it('should extract character mentions from content', () => {
      // Arrange
      const extractors = validator.getMetadataExtractors();
      const content = `
John walked into the room. "Hello," he said to Sarah.

"Remember when Marcus saved us?" Sarah replied.

Later, Elizabeth (or Liz as she preferred) joined them.
      `;
      
      // Act
      const result = extractors.characters(content, { filePath: 'test.md' });
      
      // Assert
      expect(result.mentions).toContainEqual(
        expect.objectContaining({ name: 'John' })
      );
      expect(result.mentions).toContainEqual(
        expect.objectContaining({ name: 'Sarah' })
      );
      expect(result.mentions).toContainEqual(
        expect.objectContaining({ 
          name: 'Marcus',
          context: 'retrospective'
        })
      );
      expect(result.introductions).toContain('John');
      expect(result.introductions).toContain('Elizabeth');
    });
  });
  
  describe('extensibility', () => {
    it('should allow subclasses to override validation', async () => {
      // Arrange
      class CustomCharacterValidator extends CharacterValidator {
        async validate(files: ParsedFile[]): Promise<ValidationResult> {
          const baseResult = await super.validate(files);
          
          // Add custom validation
          const customErrors = [];
          // ... custom logic here ...
          
          return {
            ...baseResult,
            errors: [...baseResult.errors, ...customErrors]
          };
        }
      }
      
      const customValidator = new CustomCharacterValidator();
      const files: ParsedFile[] = [];
      
      // Act
      const result = await customValidator.validate(files);
      
      // Assert
      expect(result).toBeDefined();
    });
  });
});
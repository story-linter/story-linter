import { describe, it, expect } from 'vitest';
import { 
  TextOutputFormatter, 
  JsonOutputFormatter, 
  HtmlOutputFormatter 
} from './output-formatter';
import { TestColorPort } from './test-doubles';
import type { ValidationResult } from '@story-linter/core';

describe('TextOutputFormatter', () => {
  it('formats successful validation result', () => {
    // Arrange
    const colors = new TestColorPort();
    const formatter = new TextOutputFormatter(colors);
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      info: []
    };
    
    // Act
    const output = formatter.format(result);
    
    // Assert
    expect(output).toContain('[GREEN]✓ All validation checks passed![/GREEN]');
    expect(output).toContain('Summary:');
    expect(output).toContain('0 errors');
  });
  
  it('formats validation errors with location', () => {
    // Arrange
    const colors = new TestColorPort();
    const formatter = new TextOutputFormatter(colors);
    const result: ValidationResult = {
      valid: false,
      errors: [{
        code: 'TEST001',
        message: 'Test error message',
        severity: 'error',
        file: 'test.md',
        line: 10,
        column: 5
      }],
      warnings: [],
      info: []
    };
    
    // Act
    const output = formatter.format(result);
    
    // Assert
    expect(output).toContain('[RED]✗ Found 1 errors[/RED]');
    expect(output).toContain('[RED]✗ [TEST001] test.md:10:5[/RED]');
    expect(output).toContain('Test error message');
  });
  
  it('includes warnings when present', () => {
    // Arrange
    const colors = new TestColorPort();
    const formatter = new TextOutputFormatter(colors);
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [{
        code: 'WARN001',
        message: 'Test warning',
        severity: 'warning',
        file: 'test.md'
      }],
      info: []
    };
    
    // Act
    const output = formatter.format(result);
    
    // Assert
    expect(output).toContain('[YELLOW]⚠ 1 warnings[/YELLOW]');
    expect(output).toContain('[YELLOW]⚠ [WARN001] test.md[/YELLOW]');
  });
  
  it('only shows info when no errors or warnings', () => {
    // Arrange
    const colors = new TestColorPort();
    const formatter = new TextOutputFormatter(colors);
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      info: [{
        code: 'INFO001',
        message: 'Test info',
        severity: 'info'
      }]
    };
    
    // Act
    const output = formatter.format(result);
    
    // Assert
    expect(output).toContain('[BLUE]ℹ [INFO001][/BLUE]');
    expect(output).toContain('Test info');
  });
});

describe('JsonOutputFormatter', () => {
  it('formats result as JSON', () => {
    // Arrange
    const formatter = new JsonOutputFormatter();
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      info: []
    };
    
    // Act
    const output = formatter.format(result);
    
    // Assert
    const parsed = JSON.parse(output);
    expect(parsed).toEqual(result);
  });
});

describe('HtmlOutputFormatter', () => {
  it('generates HTML report', () => {
    // Arrange
    const formatter = new HtmlOutputFormatter('1.0.0');
    const result: ValidationResult = {
      valid: false,
      errors: [{
        code: 'TEST001',
        message: 'Test error',
        severity: 'error',
        file: 'test.md',
        line: 10
      }],
      warnings: [],
      info: []
    };
    
    // Act
    const output = formatter.format(result);
    
    // Assert
    expect(output).toContain('<!DOCTYPE html>');
    expect(output).toContain('✗ 1 errors found');
    expect(output).toContain('[TEST001]');
    expect(output).toContain('test.md:10');
    expect(output).toContain('Story Linter v1.0.0');
  });
  
  it('escapes HTML in messages', () => {
    // Arrange
    const formatter = new HtmlOutputFormatter();
    const result: ValidationResult = {
      valid: false,
      errors: [{
        code: 'XSS',
        message: '<script>alert("xss")</script>',
        severity: 'error'
      }],
      warnings: [],
      info: []
    };
    
    // Act
    const output = formatter.format(result);
    
    // Assert
    expect(output).not.toContain('<script>');
    expect(output).toContain('&lt;script&gt;');
  });
});
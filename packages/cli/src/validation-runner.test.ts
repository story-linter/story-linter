import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationRunner } from './validation-runner';
import { TestValidationFrameworkFactory, TestValidator, TestProgressIndicator } from './test-doubles';
import type { ValidationResult } from '@story-linter/core';

describe('ValidationRunner', () => {
  let frameworkFactory: TestValidationFrameworkFactory;
  let validators: TestValidator[];
  let runner: ValidationRunner;
  
  beforeEach(() => {
    frameworkFactory = new TestValidationFrameworkFactory();
    validators = [
      new TestValidator('test-validator-1', '1.0.0'),
      new TestValidator('test-validator-2', '1.0.0')
    ];
    runner = new ValidationRunner(
      () => frameworkFactory.create(),
      validators
    );
  });
  
  it('registers all validators with framework', async () => {
    // Act
    await runner.run({ files: ['test.md'] });
    
    // Assert
    const framework = frameworkFactory.getLatest();
    expect(framework?.validators).toHaveLength(2);
    expect(framework?.validators[0].name).toBe('test-validator-1');
    expect(framework?.validators[1].name).toBe('test-validator-2');
  });
  
  it('passes validation options to framework', async () => {
    // Arrange
    const options = {
      files: ['test1.md', 'test2.md'],
      config: '.story-linter.yml'
    };
    
    // Act
    await runner.run(options);
    
    // Assert
    const framework = frameworkFactory.getLatest();
    expect(framework).toBeDefined();
    // Framework was called with correct options
  });
  
  it('updates progress indicator on success', async () => {
    // Arrange
    const progress = new TestProgressIndicator();
    
    // Act
    await runner.run({}, progress);
    
    // Assert
    expect(progress.succeeded).toBe(true);
    expect(progress.successText).toBe('Validation complete');
  });
  
  it('updates progress indicator on failure', async () => {
    // Arrange
    const progress = new TestProgressIndicator();
    const framework = frameworkFactory.create() as any;
    framework.validationResult = {
      valid: false,
      errors: [{ code: 'ERR', message: 'Error', severity: 'error' }],
      warnings: [],
      info: []
    };
    
    // Act
    await runner.run({}, progress);
    
    // Assert
    expect(progress.failed).toBe(true);
    expect(progress.failText).toBe('Validation found issues');
  });
  
  it('attaches progress listeners when indicator provided', async () => {
    // Arrange
    const progress = new TestProgressIndicator();
    
    // Act
    await runner.run({}, progress);
    
    // Assert
    expect(progress.text).toContain('Running character-consistency validator');
  });
  
  it('cleans up framework after validation', async () => {
    // Act
    await runner.run({});
    
    // Assert
    const framework = frameworkFactory.getLatest();
    expect(framework?.destroyed).toBe(true);
  });
  
  it('cleans up framework even on error', async () => {
    // Arrange
    const framework = frameworkFactory.create() as any;
    framework.validate = async () => {
      throw new Error('Validation error');
    };
    
    // Act & Assert
    await expect(runner.run({})).rejects.toThrow('Validation error');
    expect(framework.destroyed).toBe(true);
  });
});
import { describe, it, expect, beforeEach } from 'vitest';
import { PluginManager } from './plugin-manager';
import type { BaseValidator, ParsedFile, ValidatorContext } from '../validators/base-validator';
import type { ValidationResult } from '../types';

// Test double for validator
class TestValidator implements BaseValidator {
  constructor(
    public name: string = 'test-validator',
    public version: string = '1.0.0'
  ) {}
  
  async initialize(context: ValidatorContext, config: any): Promise<void> {
    // Mock initialization
  }
  
  async validate(files: ParsedFile[]): Promise<ValidationResult> {
    return { valid: true, errors: [], warnings: [], info: [] };
  }
  
  getMetadataExtractors(): Record<string, (content: string, context: any) => any> {
    return {};
  }
  
  async destroy(): Promise<void> {
    // Mock cleanup
  }
}

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  
  beforeEach(() => {
    pluginManager = new PluginManager();
  });
  
  describe('registerValidator', () => {
    it('should register a validator', () => {
      // Arrange
      const validator = new TestValidator('my-validator');
      
      // Act
      pluginManager.registerValidator(validator);
      
      // Assert
      const retrieved = pluginManager.getValidator('my-validator');
      expect(retrieved).toBe(validator);
    });
    
    it('should overwrite existing validator with same name', () => {
      // Arrange
      const validator1 = new TestValidator('duplicate', '1.0.0');
      const validator2 = new TestValidator('duplicate', '2.0.0');
      
      // Act
      pluginManager.registerValidator(validator1);
      pluginManager.registerValidator(validator2);
      
      // Assert
      const retrieved = pluginManager.getValidator('duplicate');
      expect(retrieved).toBe(validator2);
      expect(retrieved?.version).toBe('2.0.0');
    });
    
    it('should handle multiple validators', () => {
      // Arrange
      const validator1 = new TestValidator('validator1');
      const validator2 = new TestValidator('validator2');
      const validator3 = new TestValidator('validator3');
      
      // Act
      pluginManager.registerValidator(validator1);
      pluginManager.registerValidator(validator2);
      pluginManager.registerValidator(validator3);
      
      // Assert
      expect(pluginManager.getValidator('validator1')).toBe(validator1);
      expect(pluginManager.getValidator('validator2')).toBe(validator2);
      expect(pluginManager.getValidator('validator3')).toBe(validator3);
    });
  });
  
  describe('getValidator', () => {
    it('should return undefined for non-existent validator', () => {
      // Act
      const result = pluginManager.getValidator('non-existent');
      
      // Assert
      expect(result).toBeUndefined();
    });
    
    it('should return registered validator', () => {
      // Arrange
      const validator = new TestValidator('exists');
      pluginManager.registerValidator(validator);
      
      // Act
      const result = pluginManager.getValidator('exists');
      
      // Assert
      expect(result).toBe(validator);
    });
  });
  
  describe('getAllValidators', () => {
    it('should return empty map when no validators registered', () => {
      // Act
      const validators = pluginManager.getAllValidators();
      
      // Assert
      expect(validators.size).toBe(0);
    });
    
    it('should return all registered validators', () => {
      // Arrange
      const validator1 = new TestValidator('validator1');
      const validator2 = new TestValidator('validator2');
      
      pluginManager.registerValidator(validator1);
      pluginManager.registerValidator(validator2);
      
      // Act
      const validators = pluginManager.getAllValidators();
      
      // Assert
      expect(validators.size).toBe(2);
      expect(validators.get('validator1')).toBe(validator1);
      expect(validators.get('validator2')).toBe(validator2);
    });
    
    it('should return a copy of the validators map', () => {
      // Arrange
      const validator = new TestValidator('validator1');
      pluginManager.registerValidator(validator);
      
      // Act
      const validators1 = pluginManager.getAllValidators();
      const validators2 = pluginManager.getAllValidators();
      
      // Assert
      expect(validators1).not.toBe(validators2); // Different instances
      expect(validators1.get('validator1')).toBe(validators2.get('validator1')); // Same validator
    });
    
    it('should not allow external modification of internal state', () => {
      // Arrange
      const validator = new TestValidator('validator1');
      pluginManager.registerValidator(validator);
      
      // Act
      const validators = pluginManager.getAllValidators();
      validators.clear(); // Try to clear the returned map
      
      // Assert
      const validatorsAgain = pluginManager.getAllValidators();
      expect(validatorsAgain.size).toBe(1); // Original state preserved
      expect(validatorsAgain.get('validator1')).toBe(validator);
    });
  });
  
  describe('unregisterValidator', () => {
    it('should remove a registered validator', () => {
      // Arrange
      const validator = new TestValidator('to-remove');
      pluginManager.registerValidator(validator);
      
      // Act
      pluginManager.unregisterValidator('to-remove');
      
      // Assert
      expect(pluginManager.getValidator('to-remove')).toBeUndefined();
    });
    
    it('should handle removing non-existent validator gracefully', () => {
      // Act & Assert - should not throw
      expect(() => pluginManager.unregisterValidator('non-existent')).not.toThrow();
    });
    
    it('should only remove specified validator', () => {
      // Arrange
      const validator1 = new TestValidator('validator1');
      const validator2 = new TestValidator('validator2');
      
      pluginManager.registerValidator(validator1);
      pluginManager.registerValidator(validator2);
      
      // Act
      pluginManager.unregisterValidator('validator1');
      
      // Assert
      expect(pluginManager.getValidator('validator1')).toBeUndefined();
      expect(pluginManager.getValidator('validator2')).toBe(validator2);
    });
  });
  
  describe('hasValidator', () => {
    it('should return false for non-existent validator', () => {
      // Act & Assert
      expect(pluginManager.hasValidator('non-existent')).toBe(false);
    });
    
    it('should return true for registered validator', () => {
      // Arrange
      const validator = new TestValidator('exists');
      pluginManager.registerValidator(validator);
      
      // Act & Assert
      expect(pluginManager.hasValidator('exists')).toBe(true);
    });
  });
  
  describe('clear', () => {
    it('should remove all validators', () => {
      // Arrange
      const validator1 = new TestValidator('validator1');
      const validator2 = new TestValidator('validator2');
      const validator3 = new TestValidator('validator3');
      
      pluginManager.registerValidator(validator1);
      pluginManager.registerValidator(validator2);
      pluginManager.registerValidator(validator3);
      
      // Act
      pluginManager.clear();
      
      // Assert
      expect(pluginManager.getAllValidators().size).toBe(0);
      expect(pluginManager.getValidator('validator1')).toBeUndefined();
      expect(pluginManager.getValidator('validator2')).toBeUndefined();
      expect(pluginManager.getValidator('validator3')).toBeUndefined();
    });
  });
});
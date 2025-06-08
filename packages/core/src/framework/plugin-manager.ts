import type { BaseValidator } from '../validators/base-validator';

/**
 * Manages validator plugins with proper encapsulation
 * Following SOLID principles - Single Responsibility
 */
export class PluginManager {
  private validators = new Map<string, BaseValidator>();
  
  /**
   * Register a validator plugin
   */
  registerValidator(validator: BaseValidator): void {
    this.validators.set(validator.name, validator);
  }
  
  /**
   * Get a specific validator by name
   */
  getValidator(name: string): BaseValidator | undefined {
    return this.validators.get(name);
  }
  
  /**
   * Get all registered validators
   * Returns a copy to prevent external modification
   */
  getAllValidators(): Map<string, BaseValidator> {
    return new Map(this.validators);
  }
  
  /**
   * Remove a validator by name
   */
  unregisterValidator(name: string): void {
    this.validators.delete(name);
  }
  
  /**
   * Check if a validator is registered
   */
  hasValidator(name: string): boolean {
    return this.validators.has(name);
  }
  
  /**
   * Clear all validators
   */
  clear(): void {
    this.validators.clear();
  }
}
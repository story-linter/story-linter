// Core type definitions for Story Linter

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
}

export interface ValidationError {
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  severity: 'error';
}

export interface ValidationWarning extends Omit<ValidationError, 'severity'> {
  severity: 'warning';
}

export interface ValidationInfo extends Omit<ValidationError, 'severity'> {
  severity: 'info';
}
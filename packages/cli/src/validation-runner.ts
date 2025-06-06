import type { 
  ValidationFramework, 
  ValidationResult, 
  ValidationOptions,
  BaseValidator 
} from '@story-linter/core';
import type { ProgressIndicator } from './cli';

export interface ValidationRunnerOptions {
  files?: string[];
  config?: string;
  quiet?: boolean;
}

export class ValidationRunner {
  constructor(
    private readonly frameworkFactory: () => ValidationFramework,
    private readonly validators: BaseValidator[]
  ) {}
  
  async run(
    options: ValidationRunnerOptions,
    progressIndicator?: ProgressIndicator
  ): Promise<ValidationResult> {
    const framework = this.frameworkFactory();
    
    // Register validators
    for (const validator of this.validators) {
      framework.use(validator);
    }
    
    // Set up progress listeners
    if (progressIndicator) {
      this.attachProgressListeners(framework, progressIndicator);
    }
    
    // Prepare validation options
    const validationOptions: ValidationOptions = {
      files: options.files && options.files.length > 0 ? options.files : undefined,
      config: options.config
    };
    
    try {
      // Run validation
      const result = await framework.validate(validationOptions);
      
      // Update progress indicator
      if (progressIndicator) {
        if (result.valid) {
          progressIndicator.succeed('Validation complete');
        } else {
          progressIndicator.fail('Validation found issues');
        }
      }
      
      return result;
    } finally {
      // Always clean up
      await framework.destroy();
    }
  }
  
  private attachProgressListeners(
    framework: ValidationFramework, 
    indicator: ProgressIndicator
  ): void {
    framework.on('validation:start', ({ fileCount }) => {
      indicator.updateText(`Validating ${fileCount} files...`);
    });
    
    framework.on('file:processing', ({ file, progress }) => {
      indicator.updateText(`Processing ${progress.completed}/${progress.total}: ${file}`);
    });
    
    framework.on('validator:start', (name) => {
      indicator.updateText(`Running ${name} validator...`);
    });
  }
}
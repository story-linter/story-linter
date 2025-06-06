import type { ValidationResult } from '@story-linter/core';
import type { ConsolePort, ProcessPort, ProgressIndicatorPort } from './cli';
import type { OutputFormatter } from './output-formatter';
import type { ValidationRunner, ValidationRunnerOptions } from './validation-runner';

export interface ValidateCommandOptions {
  config?: string;
  format?: string;
  color?: boolean;
  quiet?: boolean;
}

export class CommandHandler {
  constructor(
    private readonly console: ConsolePort,
    private readonly process: ProcessPort,
    private readonly progressFactory: ProgressIndicatorPort,
    private readonly validationRunner: ValidationRunner,
    private readonly formatters: Map<string, OutputFormatter>
  ) {}
  
  async handleValidate(files: string[], options: ValidateCommandOptions): Promise<void> {
    const spinner = options.quiet 
      ? null 
      : this.progressFactory.create('Initializing validation...');
    
    if (spinner) {
      spinner.start();
    }
    
    try {
      // Run validation
      const runnerOptions: ValidationRunnerOptions = {
        files,
        config: options.config,
        quiet: options.quiet
      };
      
      const result = await this.validationRunner.run(runnerOptions, spinner || undefined);
      
      // Format and display results
      this.displayResults(result, options.format || 'text');
      
      // Exit with appropriate code
      this.process.exit(result.valid ? 0 : 1);
      
    } catch (error) {
      if (spinner) {
        spinner.fail('Validation failed');
      }
      this.handleError(error);
    }
  }
  
  private displayResults(result: ValidationResult, format: string): void {
    const formatter = this.formatters.get(format) || this.formatters.get('text')!;
    const output = formatter.format(result);
    
    // Split output and route errors to console.error
    const lines = output.split('\n');
    for (const line of lines) {
      if (this.isErrorLine(line)) {
        this.console.error(line);
      } else {
        this.console.log(line);
      }
    }
  }
  
  private isErrorLine(line: string): boolean {
    // Simple heuristic: lines with error markers go to stderr
    return line.includes('✗ [') || line.includes('Error:');
  }
  
  private handleError(error: any): void {
    this.console.error(`Error: ${error.message || error}`);
    
    if (error.stack && this.process.env.DEBUG) {
      this.console.error(error.stack);
    }
    
    this.process.exit(1);
  }
}
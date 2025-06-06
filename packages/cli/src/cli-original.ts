#!/usr/bin/env node

import { Command } from 'commander';
import { 
  ValidationFramework, 
  type ValidationResult,
  type ValidationOptions,
  type BaseValidator,
  VERSION as CORE_VERSION 
} from '@story-linter/core';
import { CharacterValidator } from '@story-linter/plugin-character';
import { LinkValidator } from '@story-linter/plugin-link';
import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

// Ports/interfaces for dependency injection
export interface ConsolePort {
  log(message: string): void;
  error(message: string): void;
}

export interface ProcessPort {
  exit(code: number): void;
  argv: string[];
  env: NodeJS.ProcessEnv;
}

export interface FileSystemPort {
  readFileSync(path: string, encoding: BufferEncoding): string;
}

export interface ProgressIndicatorPort {
  create(text: string): ProgressIndicator;
}

export interface ProgressIndicator {
  start(): void;
  succeed(text: string): void;
  fail(text: string): void;
  updateText(text: string): void;
}

export interface ValidationFrameworkFactory {
  create(): ValidationFramework;
}

export interface ValidatorFactory {
  createCharacterValidator(): BaseValidator;
  createLinkValidator(): BaseValidator;
}

export class CLI {
  private program: Command;
  private version: string;
  
  constructor(
    private readonly console: ConsolePort,
    private readonly process: ProcessPort,
    private readonly fileSystem: FileSystemPort,
    private readonly progressIndicatorFactory: ProgressIndicatorPort,
    private readonly validationFrameworkFactory: ValidationFrameworkFactory,
    private readonly validatorFactory: ValidatorFactory
  ) {
    // Get version from package.json
    try {
      const packageJson = JSON.parse(
        this.fileSystem.readFileSync(resolve(__dirname, '../package.json'), 'utf8')
      );
      this.version = packageJson.version;
    } catch {
      this.version = '0.1.0'; // Fallback
    }
    
    this.program = this.createProgram();
  }
  
  private createProgram(): Command {
    const program = new Command();
    
    program
      .name('story-linter')
      .description('Modular validation engine for narrative consistency')
      .version(this.version);
    
    // Validate command
    program
      .command('validate [files...]')
      .description('Validate story files for consistency')
      .option('-c, --config <path>', 'Path to configuration file or directory')
      .option('-f, --format <format>', 'Output format (text, json, html)', 'text')
      .option('--no-color', 'Disable colored output')
      .option('-q, --quiet', 'Suppress progress output')
      .action(async (files: string[], options) => {
        await this.handleValidate(files, options);
      });
    
    // Default command (show help)
    program
      .action(() => {
        program.help();
      });
    
    return program;
  }
  
  async run(argv: string[]): Promise<void> {
    try {
      await this.program.parseAsync(argv);
    } catch (error) {
      this.handleError(error);
    }
  }
  
  private async handleValidate(files: string[], options: any): Promise<void> {
    const spinner = options.quiet ? null : this.progressIndicatorFactory.create('Initializing validation...');
    if (spinner) spinner.start();
    
    try {
      // Set up colors
      if (options.color === false) {
        chalk.level = 0;
      }
      
      // Run validation
      const result = await this.runValidation(files, options, spinner);
      
      // Format and display results
      this.displayResults(result, options.format);
      
      // Exit with appropriate code
      this.process.exit(result.valid ? 0 : 1);
      
    } catch (error) {
      if (spinner) spinner.fail('Validation failed');
      this.handleError(error);
    }
  }
  
  private async runValidation(
    files: string[], 
    options: any,
    spinner: ProgressIndicator | null
  ): Promise<ValidationResult> {
    // Create framework
    const framework = this.validationFrameworkFactory.create();
    
    // Register validators
    framework.use(this.validatorFactory.createCharacterValidator());
    framework.use(this.validatorFactory.createLinkValidator());
    
    // Set up event listeners for progress
    if (spinner) {
      framework.on('validation:start', ({ fileCount }) => {
        spinner.updateText(`Validating ${fileCount} files...`);
      });
      
      framework.on('file:processing', ({ file, progress }) => {
        spinner.updateText(`Processing ${progress.completed}/${progress.total}: ${file}`);
      });
      
      framework.on('validator:start', (name) => {
        spinner.updateText(`Running ${name} validator...`);
      });
    }
    
    // Prepare validation options
    const validationOptions: ValidationOptions = {
      files: files.length > 0 ? files : undefined,
      config: options.config
    };
    
    // Run validation
    const result = await framework.validate(validationOptions);
    
    if (spinner) {
      if (result.valid) {
        spinner.succeed('Validation complete');
      } else {
        spinner.fail('Validation found issues');
      }
    }
    
    // Clean up
    await framework.destroy();
    
    return result;
  }
  
  private displayResults(result: ValidationResult, format: string): void {
    switch (format) {
      case 'json':
        this.displayJsonResults(result);
        break;
      
      case 'html':
        this.displayHtmlResults(result);
        break;
      
      default:
        this.displayTextResults(result);
    }
  }
  
  private displayTextResults(result: ValidationResult): void {
    this.console.log('');
    
    // Summary
    if (result.valid) {
      this.console.log(chalk.green('✓ All validation checks passed!'));
    } else {
      this.console.log(chalk.red(`✗ Found ${result.errors.length} errors`));
    }
    
    if (result.warnings.length > 0) {
      this.console.log(chalk.yellow(`⚠ ${result.warnings.length} warnings`));
    }
    
    this.console.log('');
    
    // Errors
    if (result.errors.length > 0) {
      this.console.log(chalk.red.bold('Errors:'));
      result.errors.forEach(error => {
        const location = error.file 
          ? `${error.file}${error.line ? `:${error.line}` : ''}${error.column ? `:${error.column}` : ''}`
          : 'unknown';
        
        this.console.error(
          chalk.red(`  ✗ [${error.code}] ${location}`) + ' ' + chalk.white(error.message)
        );
      });
      this.console.log('');
    }
    
    // Warnings
    if (result.warnings.length > 0) {
      this.console.log(chalk.yellow.bold('Warnings:'));
      result.warnings.forEach(warning => {
        const location = warning.file 
          ? `${warning.file}${warning.line ? `:${warning.line}` : ''}`
          : 'unknown';
        
        this.console.log(
          chalk.yellow(`  ⚠ [${warning.code}] ${location}`) + ' ' + chalk.white(warning.message)
        );
      });
      this.console.log('');
    }
    
    // Info (only in verbose mode or if no errors/warnings)
    if (result.info.length > 0 && (result.errors.length === 0 && result.warnings.length === 0)) {
      this.console.log(chalk.blue.bold('Info:'));
      result.info.forEach(info => {
        this.console.log(
          chalk.blue(`  ℹ [${info.code}]`) + ' ' + chalk.white(info.message)
        );
      });
      this.console.log('');
    }
    
    // Statistics
    this.console.log(chalk.gray('─'.repeat(50)));
    this.console.log(
      chalk.gray('Summary:') + ' ' +
      chalk.red(`${result.errors.length} errors`) + ' ' +
      chalk.yellow(`${result.warnings.length} warnings`) + ' ' +
      chalk.blue(`${result.info.length} info`)
    );
  }
  
  private displayJsonResults(result: ValidationResult): void {
    this.console.log(JSON.stringify(result, null, 2));
  }
  
  private displayHtmlResults(result: ValidationResult): void {
    // Simple HTML output for MVP
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Story Linter Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .error { color: #d32f2f; }
    .warning { color: #f57c00; }
    .info { color: #0288d1; }
    .success { color: #388e3c; }
    .issue { margin: 10px 0; padding: 10px; background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>Story Linter Validation Report</h1>
  
  <div class="${result.valid ? 'success' : 'error'}">
    ${result.valid ? '✓ All checks passed!' : `✗ ${result.errors.length} errors found`}
  </div>
  
  ${result.errors.length > 0 ? `
    <h2 class="error">Errors</h2>
    ${result.errors.map(e => `
      <div class="issue">
        <strong>[${e.code}]</strong> ${e.file || 'unknown'}:${e.line || '?'}<br>
        ${e.message}
      </div>
    `).join('')}
  ` : ''}
  
  ${result.warnings.length > 0 ? `
    <h2 class="warning">Warnings</h2>
    ${result.warnings.map(w => `
      <div class="issue">
        <strong>[${w.code}]</strong> ${w.file || 'unknown'}:${w.line || '?'}<br>
        ${w.message}
      </div>
    `).join('')}
  ` : ''}
  
  <hr>
  <p>Generated by Story Linter v${this.version}</p>
</body>
</html>`;
    
    this.console.log(html);
  }
  
  private handleError(error: any): void {
    this.console.error(chalk.red('Error:') + ' ' + (error.message || error));
    if (error.stack && this.process.env.DEBUG) {
      this.console.error(chalk.gray(error.stack));
    }
    this.process.exit(1);
  }
}

// Run CLI if this is the main module
if (require.main === module) {
  // Import factory only when running as main module
  import('./cli-factory').then(({ CLIFactory }) => {
    const cli = CLIFactory.create();
    cli.run(process.argv).catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
  });
}
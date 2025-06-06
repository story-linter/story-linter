#!/usr/bin/env node

import { Command } from 'commander';
import type { BaseValidator } from '@story-linter/core';
import { CommandHandler } from './command-handler';
import { ValidationRunner } from './validation-runner';
import { 
  TextOutputFormatter, 
  JsonOutputFormatter, 
  HtmlOutputFormatter,
  type OutputFormatter,
  type ColorPort
} from './output-formatter';

// Ports remain the same
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
  create(): import('@story-linter/core').ValidationFramework;
}

// Simplified CLI class - just handles command setup
export class CLI {
  private readonly program: Command;
  private readonly commandHandler: CommandHandler;
  
  constructor(
    console: ConsolePort,
    process: ProcessPort,
    fileSystem: FileSystemPort,
    progressFactory: ProgressIndicatorPort,
    frameworkFactory: ValidationFrameworkFactory,
    validators: BaseValidator[],
    colorPort: ColorPort
  ) {
    // Get version
    const version = this.readVersion(fileSystem);
    
    // Create components
    const validationRunner = new ValidationRunner(
      () => frameworkFactory.create(),
      validators
    );
    
    const formatters = this.createFormatters(colorPort, version);
    
    this.commandHandler = new CommandHandler(
      console,
      process,
      progressFactory,
      validationRunner,
      formatters
    );
    
    this.program = this.createProgram(version);
  }
  
  async run(argv: string[]): Promise<void> {
    try {
      await this.program.parseAsync(argv);
    } catch (error) {
      this.commandHandler['handleError'](error);
    }
  }
  
  private createProgram(version: string): Command {
    const program = new Command();
    
    program
      .name('story-linter')
      .description('Modular validation engine for narrative consistency')
      .version(version);
    
    // Validate command
    program
      .command('validate [files...]')
      .description('Validate story files for consistency')
      .option('-c, --config <path>', 'Path to configuration file or directory')
      .option('-f, --format <format>', 'Output format (text, json, html)', 'text')
      .option('--no-color', 'Disable colored output')
      .option('-q, --quiet', 'Suppress progress output')
      .action(async (files: string[], options) => {
        await this.commandHandler.handleValidate(files, options);
      });
    
    // Default action shows help
    program.action(() => program.help());
    
    return program;
  }
  
  private createFormatters(colorPort: ColorPort, version: string): Map<string, OutputFormatter> {
    return new Map([
      ['text', new TextOutputFormatter(colorPort, version)],
      ['json', new JsonOutputFormatter()],
      ['html', new HtmlOutputFormatter(version)]
    ]);
  }
  
  private readVersion(fileSystem: FileSystemPort): string {
    try {
      const packageJson = JSON.parse(
        fileSystem.readFileSync(__dirname + '/../package.json', 'utf8')
      );
      return packageJson.version;
    } catch {
      return '0.1.0';
    }
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
import type { 
  ConsolePort, 
  ProcessPort, 
  FileSystemPort, 
  ProgressIndicatorPort, 
  ProgressIndicator,
  ValidationFrameworkFactory
} from './cli';
import type { ColorPort } from './output-formatter';
import type { ValidationResult, BaseValidator, ValidationFramework } from '@story-linter/core';

// Test doubles for all ports
export class TestConsole implements ConsolePort {
  public logs: string[] = [];
  public errors: string[] = [];
  
  log(message: string): void {
    this.logs.push(message);
  }
  
  error(message: string): void {
    this.errors.push(message);
  }
  
  getOutput(): string {
    return [...this.logs, ...this.errors].join('\n');
  }
  
  hasLog(pattern: string | RegExp): boolean {
    return this.logs.some(log => 
      typeof pattern === 'string' ? log.includes(pattern) : pattern.test(log)
    );
  }
  
  hasError(pattern: string | RegExp): boolean {
    return this.errors.some(error => 
      typeof pattern === 'string' ? error.includes(pattern) : pattern.test(error)
    );
  }
}

export class TestProcess implements ProcessPort {
  public exitCode: number | null = null;
  
  exit(code: number): void {
    this.exitCode = code;
  }
  
  argv: string[] = [];
  env: NodeJS.ProcessEnv = {};
}

export class TestFileSystem implements FileSystemPort {
  private files = new Map<string, string>();
  
  readFileSync(path: string, encoding: BufferEncoding): string {
    const content = this.files.get(path);
    if (!content) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return content;
  }
  
  addFile(path: string, content: string): void {
    this.files.set(path, content);
  }
}

export class TestProgressIndicator implements ProgressIndicator {
  public started = false;
  public succeeded = false;
  public failed = false;
  public text = '';
  public successText = '';
  public failText = '';
  
  start(): void {
    this.started = true;
  }
  
  succeed(text: string): void {
    this.succeeded = true;
    this.successText = text;
  }
  
  fail(text: string): void {
    this.failed = true;
    this.failText = text;
  }
  
  updateText(text: string): void {
    this.text = text;
  }
}

export class TestProgressIndicatorFactory implements ProgressIndicatorPort {
  public indicators: TestProgressIndicator[] = [];
  
  create(text: string): ProgressIndicator {
    const indicator = new TestProgressIndicator();
    indicator.text = text;
    this.indicators.push(indicator);
    return indicator;
  }
  
  getLatest(): TestProgressIndicator | undefined {
    return this.indicators[this.indicators.length - 1];
  }
}

export class TestValidationFramework implements ValidationFramework {
  public validators: BaseValidator[] = [];
  public validationResult: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: []
  };
  public destroyed = false;
  private eventHandlers = new Map<string, Function[]>();
  
  use(validator: BaseValidator): this {
    this.validators.push(validator);
    return this;
  }
  
  async validate(): Promise<ValidationResult> {
    // Emit events if handlers are registered
    this.emit('validation:start', { fileCount: 3 });
    this.emit('file:processing', { file: 'test1.md', progress: { completed: 1, total: 3 } });
    this.emit('validator:start', 'character-consistency');
    
    return this.validationResult;
  }
  
  on(event: string, handler: Function): this {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
    return this;
  }
  
  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }
  
  async destroy(): Promise<void> {
    this.destroyed = true;
  }
}

export class TestValidationFrameworkFactory implements ValidationFrameworkFactory {
  public frameworks: TestValidationFramework[] = [];
  
  create(): ValidationFramework {
    const framework = new TestValidationFramework();
    this.frameworks.push(framework);
    return framework;
  }
  
  getLatest(): TestValidationFramework | undefined {
    return this.frameworks[this.frameworks.length - 1];
  }
}

export class TestColorPort implements ColorPort {
  red(text: string): string { return `[RED]${text}[/RED]`; }
  green(text: string): string { return `[GREEN]${text}[/GREEN]`; }
  yellow(text: string): string { return `[YELLOW]${text}[/YELLOW]`; }
  blue(text: string): string { return `[BLUE]${text}[/BLUE]`; }
  gray(text: string): string { return `[GRAY]${text}[/GRAY]`; }
  bold(text: string): string { return `[BOLD]${text}[/BOLD]`; }
}

export class TestValidator implements BaseValidator {
  constructor(public name: string, public version: string) {}
  
  async validate(): Promise<ValidationResult> {
    return { valid: true, errors: [], warnings: [], info: [] };
  }
  
  async destroy(): Promise<void> {}
}
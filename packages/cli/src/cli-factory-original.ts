import { CLI, 
  type ConsolePort, 
  type ProcessPort, 
  type FileSystemPort, 
  type ProgressIndicatorPort, 
  type ProgressIndicator,
  type ValidationFrameworkFactory,
  type ValidatorFactory
} from './cli';
import { ValidationFramework, type BaseValidator } from '@story-linter/core';
import { CharacterValidator } from '@story-linter/plugin-character';
import { LinkValidator } from '@story-linter/plugin-link';
import ora from 'ora';
import { readFileSync } from 'node:fs';

// Real implementations
class RealConsole implements ConsolePort {
  log(message: string): void {
    console.log(message);
  }
  
  error(message: string): void {
    console.error(message);
  }
}

class RealProcess implements ProcessPort {
  exit(code: number): void {
    process.exit(code);
  }
  
  get argv(): string[] {
    return process.argv;
  }
  
  get env(): NodeJS.ProcessEnv {
    return process.env;
  }
}

class RealFileSystem implements FileSystemPort {
  readFileSync(path: string, encoding: BufferEncoding): string {
    return readFileSync(path, encoding);
  }
}

class OraProgressIndicator implements ProgressIndicator {
  private spinner: ora.Ora;
  
  constructor(text: string) {
    this.spinner = ora(text);
  }
  
  start(): void {
    this.spinner.start();
  }
  
  succeed(text: string): void {
    this.spinner.succeed(text);
  }
  
  fail(text: string): void {
    this.spinner.fail(text);
  }
  
  updateText(text: string): void {
    this.spinner.text = text;
  }
}

class RealProgressIndicatorFactory implements ProgressIndicatorPort {
  create(text: string): ProgressIndicator {
    return new OraProgressIndicator(text);
  }
}

class RealValidationFrameworkFactory implements ValidationFrameworkFactory {
  create(): ValidationFramework {
    return new ValidationFramework();
  }
}

class RealValidatorFactory implements ValidatorFactory {
  createCharacterValidator(): BaseValidator {
    return new CharacterValidator();
  }
  
  createLinkValidator(): BaseValidator {
    return new LinkValidator();
  }
}

// Factory to create CLI with real dependencies
export class CLIFactory {
  static create(): CLI {
    return new CLI(
      new RealConsole(),
      new RealProcess(),
      new RealFileSystem(),
      new RealProgressIndicatorFactory(),
      new RealValidationFrameworkFactory(),
      new RealValidatorFactory()
    );
  }
}
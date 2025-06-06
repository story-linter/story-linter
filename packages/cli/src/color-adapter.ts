import chalk from 'chalk';
import type { ColorPort } from './output-formatter';

export class ChalkColorAdapter implements ColorPort {
  constructor(private enabled: boolean = true) {
    chalk.level = enabled ? chalk.level : 0;
  }
  
  red(text: string): string {
    return chalk.red(text);
  }
  
  green(text: string): string {
    return chalk.green(text);
  }
  
  yellow(text: string): string {
    return chalk.yellow(text);
  }
  
  blue(text: string): string {
    return chalk.blue(text);
  }
  
  gray(text: string): string {
    return chalk.gray(text);
  }
  
  bold(text: string): string {
    return chalk.bold(text);
  }
}

// Test double for colors
export class NoColorAdapter implements ColorPort {
  red(text: string): string { return text; }
  green(text: string): string { return text; }
  yellow(text: string): string { return text; }
  blue(text: string): string { return text; }
  gray(text: string): string { return text; }
  bold(text: string): string { return text; }
}
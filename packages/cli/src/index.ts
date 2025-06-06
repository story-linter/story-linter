export { CLI } from './cli';
export { CLIFactory } from './cli-factory';
export { CommandHandler } from './command-handler';
export { ValidationRunner } from './validation-runner';
export { 
  TextOutputFormatter, 
  JsonOutputFormatter, 
  HtmlOutputFormatter 
} from './output-formatter';
export { ChalkColorAdapter, NoColorAdapter } from './color-adapter';

export type { 
  ConsolePort, 
  ProcessPort, 
  FileSystemPort, 
  ProgressIndicatorPort, 
  ProgressIndicator,
  ValidationFrameworkFactory
} from './cli';

export type { OutputFormatter, ColorPort } from './output-formatter';
export type { ValidationRunnerOptions } from './validation-runner';
export type { ValidateCommandOptions } from './command-handler';
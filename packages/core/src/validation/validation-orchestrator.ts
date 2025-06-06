import type {
  FileProcessorPort,
  PluginManagerPort,
  MetadataExtractorPort,
  ResultAggregatorPort,
  EventBusPort,
  ValidationOptions,
  ValidationResult,
  ParsedFile,
  ValidatorResult
} from './types';

/**
 * ValidationOrchestrator - Coordinates the validation flow
 * 
 * Single Responsibility: Orchestrate the validation process
 * - Process files
 * - Extract metadata
 * - Run validators
 * - Aggregate results
 * 
 * All actual work is delegated to injected dependencies
 */
export class ValidationOrchestrator {
  constructor(
    private readonly fileProcessor: FileProcessorPort,
    private readonly pluginManager: PluginManagerPort,
    private readonly metadataExtractor: MetadataExtractorPort,
    private readonly resultAggregator: ResultAggregatorPort,
    private readonly eventBus: EventBusPort
  ) {}

  async validate(options: ValidationOptions): Promise<ValidationResult> {
    // Emit validation start event
    this.eventBus.emit('validation:start', { options });

    try {
      // Initialize validators
      await this.pluginManager.initializeValidators(options);

      // Process files according to patterns
      const parsedFiles = await this.fileProcessor.processFiles(options.patterns);
      this.eventBus.emit('files:processed', { count: parsedFiles.length });

      // Get active validators and collect their metadata extractors
      const validators = this.pluginManager.getActiveValidators();
      const extractors = validators.flatMap(v => v.getMetadataExtractors?.() || []);
      
      // Extract metadata for all files
      const metadata = await this.metadataExtractor.extractFromFiles(parsedFiles, extractors);
      this.eventBus.emit('metadata:extracted', { metadata });

      // Run validation on all files
      const validationResults: ValidatorResult[] = [];
      
      for (const validator of validators) {
        this.eventBus.emit('validator:start', { validator: validator.name });
        
        try {
          const result = await validator.validate(parsedFiles, metadata);
          validationResults.push(result);
          this.eventBus.emit('validator:complete', { validator: validator.name });
        } catch (error) {
          // Handle validator errors
          if (error instanceof Error && error.message.includes('Validator failed')) {
            throw error;
          }
          // Re-throw unexpected errors
          throw error;
        }
      }

      // Aggregate results
      const finalResult = this.resultAggregator.aggregate(validationResults);

      // Cleanup validators
      await this.pluginManager.destroyValidators();

      // Emit completion event
      this.eventBus.emit('validation:complete', { result: finalResult });

      return finalResult;

    } catch (error) {
      // Emit error event
      this.eventBus.emit('validation:error', { error });
      
      // Ensure cleanup happens even on error
      try {
        await this.pluginManager.destroyValidators();
      } catch (cleanupError) {
        // Log cleanup error but don't override original error
      }

      throw error;
    }
  }
}
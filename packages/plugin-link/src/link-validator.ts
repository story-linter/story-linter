import { 
  BaseValidator, 
  type ParsedFile, 
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type ValidationInfo,
  type ValidatorConfig
} from '@story-linter/core';
import { resolve, dirname, relative, basename } from 'node:path';

interface LinkNode {
  filepath: string;
  title?: string;
  outgoingLinks: LinkValidation[];
  incomingLinks: LinkValidation[];
}

interface LinkValidation {
  source: string;
  target: string;
  linkText: string;
  line: number;
  column: number;
  valid: boolean;
  error?: string;
}

interface LinkValidatorConfig extends ValidatorConfig {
  checkOrphans?: boolean;
  entryPoints?: string[];
  skipExternal?: boolean;
  skipAnchors?: boolean;
}

export class LinkValidator extends BaseValidator {
  readonly name = 'link-graph';
  readonly version = '0.1.0';
  
  private graph = new Map<string, LinkNode>();
  private config: LinkValidatorConfig = {
    enabled: true,
    checkOrphans: true,
    entryPoints: ['README.md', 'index.md'],
    skipExternal: true,
    skipAnchors: true
  };
  
  /**
   * No metadata extractors needed - we use the links from FileReader
   */
  getMetadataExtractors(): Record<string, any> {
    return {};
  }
  
  /**
   * Initialize with configuration
   */
  async initialize(context: any, config: LinkValidatorConfig): Promise<void> {
    await super.initialize(context, config);
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Validate link consistency across all files
   */
  async validate(files: ParsedFile[]): Promise<ValidationResult> {
    // Phase 1: Build graph nodes
    this.buildGraphNodes(files);
    
    // Phase 2: Process links and validate
    const linkErrors = this.processLinks(files);
    
    // Phase 3: Detect orphaned documents
    const orphanWarnings = this.config.checkOrphans 
      ? this.detectOrphans() 
      : [];
    
    // Phase 4: Detect bidirectional links (info)
    const bidirectionalInfo = this.detectBidirectionalLinks();
    
    return this.createResult(linkErrors, orphanWarnings, bidirectionalInfo);
  }
  
  /**
   * Build graph nodes for all files
   */
  private buildGraphNodes(files: ParsedFile[]): void {
    this.graph.clear();
    
    for (const file of files) {
      const node: LinkNode = {
        filepath: file.path,
        title: this.extractTitle(file),
        outgoingLinks: [],
        incomingLinks: []
      };
      
      this.graph.set(file.path, node);
    }
  }
  
  /**
   * Process all links and validate them
   */
  private processLinks(files: ParsedFile[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    for (const file of files) {
      const node = this.graph.get(file.path)!;
      
      for (const link of file.metadata.links || []) {
        // Skip external links if configured
        if (this.config.skipExternal && this.isExternalLink(link.target)) {
          continue;
        }
        
        // Skip anchor links if configured
        if (this.config.skipAnchors && link.target.startsWith('#')) {
          continue;
        }
        
        // Resolve the target path
        const resolvedTarget = this.resolveLink(file.path, link.target);
        
        // Create link validation object
        const linkValidation: LinkValidation = {
          source: file.path,
          target: resolvedTarget,
          linkText: link.text,
          line: link.location.line,
          column: link.location.column,
          valid: false
        };
        
        // Check if target exists
        const targetNode = this.graph.get(resolvedTarget);
        if (targetNode) {
          linkValidation.valid = true;
          targetNode.incomingLinks.push(linkValidation);
        } else {
          linkValidation.error = `Target file not found: ${link.target}`;
          errors.push(this.createError(
            'LINK001',
            `Broken link to "${link.target}"`,
            file.path,
            link.location.line,
            link.location.column
          ));
        }
        
        node.outgoingLinks.push(linkValidation);
      }
    }
    
    return errors;
  }
  
  /**
   * Detect orphaned documents using BFS from entry points
   */
  private detectOrphans(): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const reachable = new Set<string>();
    const queue: string[] = [];
    
    // Find entry points
    for (const [filepath, node] of this.graph) {
      const filename = basename(filepath);
      if (this.config.entryPoints?.some(entry => filename === entry)) {
        queue.push(filepath);
        reachable.add(filepath);
      }
    }
    
    // BFS to find all reachable documents
    while (queue.length > 0) {
      const current = queue.shift()!;
      const node = this.graph.get(current)!;
      
      for (const link of node.outgoingLinks) {
        if (link.valid && !reachable.has(link.target)) {
          reachable.add(link.target);
          queue.push(link.target);
        }
      }
    }
    
    // Find orphans
    for (const [filepath, node] of this.graph) {
      if (!reachable.has(filepath)) {
        // Don't warn about entry points themselves
        const filename = basename(filepath);
        if (!this.config.entryPoints?.some(entry => filename === entry)) {
          warnings.push(this.createWarning(
            'LINK002',
            `Orphaned document - not reachable from any entry point`,
            filepath
          ));
        }
      }
    }
    
    return warnings;
  }
  
  /**
   * Detect bidirectional links (A -> B and B -> A)
   */
  private detectBidirectionalLinks(): ValidationInfo[] {
    const info: ValidationInfo[] = [];
    const processed = new Set<string>();
    
    for (const [filepath, node] of this.graph) {
      if (processed.has(filepath)) continue;
      
      for (const outgoing of node.outgoingLinks) {
        if (!outgoing.valid) continue;
        
        const targetNode = this.graph.get(outgoing.target)!;
        const hasReturn = targetNode.outgoingLinks.some(
          link => link.valid && link.target === filepath
        );
        
        if (hasReturn && !processed.has(outgoing.target)) {
          info.push(this.createInfo(
            'LINK003',
            `Bidirectional link detected between "${basename(filepath)}" and "${basename(outgoing.target)}"`,
            filepath,
            outgoing.line
          ));
          processed.add(filepath);
          processed.add(outgoing.target);
        }
      }
    }
    
    return info;
  }
  
  /**
   * Extract title from file metadata
   */
  private extractTitle(file: ParsedFile): string | undefined {
    // Try frontmatter title first
    if (file.metadata.title) {
      return file.metadata.title as string;
    }
    
    // Try first heading
    if (file.metadata.headings && file.metadata.headings.length > 0) {
      return file.metadata.headings[0].text;
    }
    
    // Default to filename
    return basename(file.path, '.md');
  }
  
  /**
   * Resolve a link relative to the source file
   */
  private resolveLink(sourceFile: string, link: string): string {
    // Handle absolute paths
    if (link.startsWith('/')) {
      return link;
    }
    
    // Handle relative paths
    const sourceDir = dirname(sourceFile);
    return resolve(sourceDir, link);
  }
  
  /**
   * Check if a link is external
   */
  private isExternalLink(link: string): boolean {
    return link.startsWith('http://') || 
           link.startsWith('https://') ||
           link.startsWith('//');
  }
}
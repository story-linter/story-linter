# Porting Example: Link Graph Validator

## Overview

This document provides a concrete example of porting the GitScrolls link-graph validator to Story Linter, showing the actual code transformations needed.

## Current Implementation Analysis

### Original GitScrolls Code

```typescript
// src/validators/link-graph-validator.ts
import { MarkdownFile, MarkdownParser } from '../utils/markdown-parser';
import { getScrollFiles } from '../utils/file-utils';

interface LinkValidationResult {
  orphanedPages: string[];
  brokenLinks: Array<{
    source: string;
    target: string;
    line: number;
  }>;
  graph: Map<string, Set<string>>;
}

export class LinkGraphValidator {
  private parser = new MarkdownParser();
  
  async validate(directory: string): Promise<LinkValidationResult> {
    const files = await getScrollFiles(directory);
    const graph = new Map<string, Set<string>>();
    const allFiles = new Set<string>();
    const brokenLinks: Array<{source: string; target: string; line: number}> = [];
    
    // Build link graph
    for (const file of files) {
      allFiles.add(file);
      const content = await this.parser.parseFile(file);
      const links = this.extractLinks(content);
      
      graph.set(file, new Set(links.map(l => l.target)));
      
      // Check for broken links
      for (const link of links) {
        if (!files.includes(link.target)) {
          brokenLinks.push({
            source: file,
            target: link.target,
            line: link.line
          });
        }
      }
    }
    
    // Find orphaned pages
    const orphanedPages = this.findOrphanedPages(graph, allFiles);
    
    return { orphanedPages, brokenLinks, graph };
  }
  
  private extractLinks(file: MarkdownFile): Array<{target: string; line: number}> {
    const links: Array<{target: string; line: number}> = [];
    
    file.sections.forEach(section => {
      section.content.split('\n').forEach((line, index) => {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        while ((match = linkRegex.exec(line)) !== null) {
          const target = match[2];
          if (target.endsWith('.md') && !target.startsWith('http')) {
            links.push({
              target: this.normalizeLink(target),
              line: section.startLine + index
            });
          }
        }
      });
    });
    
    return links;
  }
  
  private normalizeLink(link: string): string {
    // Remove leading ./ and trailing anchors
    return link.replace(/^\.\//, '').replace(/#.*$/, '');
  }
  
  private findOrphanedPages(
    graph: Map<string, Set<string>>, 
    allFiles: Set<string>
  ): string[] {
    const referenced = new Set<string>();
    
    // Collect all referenced files
    for (const links of graph.values()) {
      links.forEach(link => referenced.add(link));
    }
    
    // Find files not referenced anywhere
    return Array.from(allFiles).filter(file => 
      !referenced.has(file) && !file.includes('README')
    );
  }
}
```

## Story Linter Implementation

### Step 1: Create Plugin Structure

```bash
# Create plugin directory
mkdir -p packages/plugin-link-graph/src
cd packages/plugin-link-graph

# Initialize package
npm init -y
```

### Step 2: Package Configuration

```json
{
  "name": "@story-linter/plugin-link-graph",
  "version": "0.1.0",
  "description": "Validates internal links and detects orphaned pages",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "peerDependencies": {
    "@story-linter/core": "^0.1.0"
  },
  "devDependencies": {
    "@story-linter/core": "^0.1.0",
    "typescript": "^5.0.0",
    "vitest": "^0.34.0"
  }
}
```

### Step 3: Port the Validator

```typescript
// packages/plugin-link-graph/src/link-graph-validator.ts
import { 
  BaseValidator,
  ValidationContext,
  ValidationIssue,
  ParsedMarkdown,
  FileState,
  Severity
} from '@story-linter/core';

interface LinkInfo {
  target: string;
  line: number;
  column: number;
  text: string;
}

interface LinkGraphState {
  graph: Map<string, Set<string>>;
  fileSet: Set<string>;
  links: Map<string, LinkInfo[]>;
}

export class LinkGraphValidator extends BaseValidator {
  name = 'link-graph';
  version = '0.1.0';
  description = 'Validates internal links and detects orphaned pages';
  
  private state: LinkGraphState = {
    graph: new Map(),
    fileSet: new Set(),
    links: new Map()
  };
  
  // Specify validator capabilities
  supports = {
    fileTypes: ['.md'],
    incremental: true,
    parallel: false, // Needs global state
    caching: true
  };
  
  async initialize(context: ValidationContext): Promise<void> {
    // Reset state for new validation run
    this.state = {
      graph: new Map(),
      fileSet: new Set(),
      links: new Map()
    };
    
    // Get all project files for orphan detection
    const files = await context.fileSystem.glob('**/*.md');
    files.forEach(file => this.state.fileSet.add(file));
  }
  
  async validate(
    file: string,
    content: string,
    context: ValidationContext
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    
    // Parse markdown content
    const parsed = context.parser.parse(content);
    
    // Extract links from this file
    const links = this.extractLinks(parsed, file);
    this.state.links.set(file, links);
    
    // Update graph
    const targets = new Set(links.map(l => l.target));
    this.state.graph.set(file, targets);
    
    // Check for broken links immediately
    for (const link of links) {
      if (!this.isValidLink(link.target, context)) {
        issues.push(this.createBrokenLinkIssue(file, link));
      }
    }
    
    return issues;
  }
  
  async afterValidation(context: ValidationContext): Promise<ValidationIssue[]> {
    // Now we can check for orphaned pages
    const orphanedPages = this.findOrphanedPages();
    
    return orphanedPages.map(page => ({
      severity: 'warning' as Severity,
      code: 'LINK002',
      message: `Page "${page}" is not linked from any other page`,
      file: page,
      line: 1,
      column: 1,
      validator: this.name
    }));
  }
  
  private extractLinks(parsed: ParsedMarkdown, file: string): LinkInfo[] {
    const links: LinkInfo[] = [];
    
    // Use AST traversal instead of regex
    parsed.traverse({
      link: (node) => {
        if (this.isInternalLink(node.url)) {
          links.push({
            target: this.normalizeLink(node.url, file),
            line: node.position.start.line,
            column: node.position.start.column,
            text: node.text
          });
        }
      }
    });
    
    return links;
  }
  
  private isInternalLink(url: string): boolean {
    return url.endsWith('.md') && 
           !url.startsWith('http://') && 
           !url.startsWith('https://');
  }
  
  private normalizeLink(link: string, fromFile: string): string {
    // Remove anchors
    let normalized = link.replace(/#.*$/, '');
    
    // Handle relative paths
    if (normalized.startsWith('./')) {
      normalized = normalized.substring(2);
    }
    
    // Resolve relative to current file
    if (normalized.startsWith('../')) {
      const context = fromFile.substring(0, fromFile.lastIndexOf('/'));
      normalized = this.resolvePath(context, normalized);
    }
    
    return normalized;
  }
  
  private resolvePath(base: string, relative: string): string {
    const baseParts = base.split('/');
    const relativeParts = relative.split('/');
    
    for (const part of relativeParts) {
      if (part === '..') {
        baseParts.pop();
      } else if (part !== '.') {
        baseParts.push(part);
      }
    }
    
    return baseParts.join('/');
  }
  
  private isValidLink(target: string, context: ValidationContext): boolean {
    // Check if file exists in our file set
    return this.state.fileSet.has(target);
  }
  
  private createBrokenLinkIssue(file: string, link: LinkInfo): ValidationIssue {
    return {
      severity: 'error',
      code: 'LINK001',
      message: `Broken link to "${link.target}"`,
      file,
      line: link.line,
      column: link.column,
      validator: this.name,
      fix: {
        description: 'Remove or fix the broken link',
        changes: [{
          file,
          line: link.line,
          column: link.column,
          length: link.text.length,
          replacement: '' // Or suggest valid files
        }]
      }
    };
  }
  
  private findOrphanedPages(): string[] {
    const referenced = new Set<string>();
    
    // Collect all referenced files
    for (const targets of this.state.graph.values()) {
      targets.forEach(target => referenced.add(target));
    }
    
    // Find unreferenced files (excluding README files)
    return Array.from(this.state.fileSet).filter(file => 
      !referenced.has(file) && 
      !file.toLowerCase().includes('readme') &&
      !file.toLowerCase().includes('index')
    );
  }
}
```

### Step 4: Create Plugin Configuration

```typescript
// packages/plugin-link-graph/src/config.ts
import { z } from 'zod';

export const configSchema = z.object({
  enabled: z.boolean().default(true),
  
  validation: z.object({
    checkBrokenLinks: z.boolean().default(true),
    checkOrphanedPages: z.boolean().default(true),
    ignorePatterns: z.array(z.string()).default([
      'README.md',
      'index.md',
      '**/drafts/**'
    ])
  }).default({}),
  
  orphanDetection: z.object({
    severity: z.enum(['error', 'warning', 'info']).default('warning'),
    excludePatterns: z.array(z.string()).default([])
  }).default({}),
  
  linkResolution: z.object({
    followSymlinks: z.boolean().default(true),
    caseSensitive: z.boolean().default(false)
  }).default({})
});

export type LinkGraphConfig = z.infer<typeof configSchema>;
```

### Step 5: Create Plugin Export

```typescript
// packages/plugin-link-graph/src/index.ts
import { StoryLinterPlugin } from '@story-linter/core';
import { LinkGraphValidator } from './link-graph-validator';
import { configSchema } from './config';

const plugin: StoryLinterPlugin = {
  name: '@story-linter/plugin-link-graph',
  version: '0.1.0',
  description: 'Validates internal links and detects orphaned pages',
  author: 'Story Linter Team',
  
  validators: [LinkGraphValidator],
  
  configSchema,
  
  // Optional: Hook into schema extraction
  patterns: [{
    name: 'link-structure',
    description: 'Extracts document link structure',
    extract: async (content, metadata) => {
      // Could extract link patterns for learning
      return [];
    }
  }],
  
  // Optional: Provide visualizations
  visualizations: [{
    name: 'link-graph',
    description: 'Visualize document link structure',
    generate: async (data) => {
      // Could generate D3 graph data
      return { nodes: [], edges: [] };
    }
  }]
};

export default plugin;
export { LinkGraphValidator, LinkGraphConfig };
```

### Step 6: Write Tests

```typescript
// packages/plugin-link-graph/src/__tests__/link-graph-validator.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { LinkGraphValidator } from '../link-graph-validator';
import { createTestContext, createTestFile } from '@story-linter/test-utils';

describe('LinkGraphValidator', () => {
  let validator: LinkGraphValidator;
  let context: ValidationContext;
  
  beforeEach(() => {
    validator = new LinkGraphValidator();
    context = createTestContext({
      files: [
        'index.md',
        'chapter-1.md',
        'chapter-2.md',
        'appendix.md'
      ]
    });
  });
  
  describe('broken link detection', () => {
    it('should detect broken internal links', async () => {
      const content = `
# Chapter 1

See [Chapter 2](chapter-2.md) for more.
But [Chapter 3](chapter-3.md) doesn't exist.
      `;
      
      await validator.initialize(context);
      const issues = await validator.validate('chapter-1.md', content, context);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe('LINK001');
      expect(issues[0].message).toContain('chapter-3.md');
    });
    
    it('should handle relative paths', async () => {
      const content = `
[Up one level](../index.md)
[Same level](./chapter-2.md)
[Subfolder](chapters/intro.md)
      `;
      
      const issues = await validator.validate(
        'docs/chapter-1.md', 
        content, 
        context
      );
      
      // Should resolve paths correctly
      expect(issues).toHaveLength(1); // Only chapters/intro.md is broken
    });
  });
  
  describe('orphaned page detection', () => {
    it('should detect unreferenced pages', async () => {
      const files = {
        'index.md': '[Chapter 1](chapter-1.md)',
        'chapter-1.md': '[Chapter 2](chapter-2.md)',
        'chapter-2.md': 'The end',
        'appendix.md': 'Orphaned content'
      };
      
      await validator.initialize(context);
      
      // Validate all files
      for (const [file, content] of Object.entries(files)) {
        await validator.validate(file, content, context);
      }
      
      // Check for orphans
      const orphanIssues = await validator.afterValidation(context);
      
      expect(orphanIssues).toHaveLength(1);
      expect(orphanIssues[0].file).toBe('appendix.md');
      expect(orphanIssues[0].code).toBe('LINK002');
    });
  });
});
```

## Key Differences in Ported Code

### 1. **Lifecycle Management**
- **Before**: Single `validate()` method processes all files
- **After**: Separate `initialize()`, `validate()` per file, and `afterValidation()`

### 2. **File Access**
- **Before**: Direct file system access with `fs.readFile()`
- **After**: Content provided by framework, file list from context

### 3. **State Management**
- **Before**: Build complete state, then validate
- **After**: Build state incrementally, validate during and after

### 4. **Error Reporting**
- **Before**: Return custom result object
- **After**: Return standardized `ValidationIssue[]`

### 5. **Configuration**
- **Before**: Hard-coded behavior
- **After**: Configurable via schema

### 6. **Testing**
- **Before**: Test entire validator flow
- **After**: Test individual methods with mock context

## Migration Checklist

- [x] Analyze original validator behavior
- [x] Create plugin package structure
- [x] Implement BaseValidator interface
- [x] Port core validation logic
- [x] Add lifecycle hooks for cross-file validation
- [x] Convert to standardized issue format
- [x] Add configuration schema
- [x] Write comprehensive tests
- [x] Add fix suggestions
- [ ] Performance optimization
- [ ] Add visualization support
- [ ] Document breaking changes

## Performance Considerations

The ported validator maintains performance through:

1. **Incremental validation** - Only revalidate changed files
2. **Caching** - Store link graph between runs
3. **Early detection** - Report broken links immediately
4. **Deferred orphan detection** - Only check after all files processed

## Next Steps

1. **Integration test** with actual GitScrolls content
2. **Performance benchmark** against original
3. **Add advanced features**:
   - Bidirectional link validation
   - External link checking (optional)
   - Link graph visualization
   - Suggested fixes for broken links
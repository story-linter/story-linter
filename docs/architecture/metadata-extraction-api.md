# Metadata Extraction API

## Overview

A plugin-based metadata extraction system that allows validators to define what data they need and how to merge it when extracted from multiple files in parallel.

## Core Interfaces

### MetadataExtractor

```typescript
interface MetadataExtractor<T = any> {
  // Unique identifier for this metadata type
  readonly key: string;
  
  // Extract metadata from a single file
  extract(content: string, context: ExtractionContext): T;
  
  // Merge metadata from multiple files (for parallel processing)
  merge(items: Array<{file: string; data: T}>): T;
  
  // Optional: validate extracted metadata
  validate?(data: T): ValidationResult;
}

interface ExtractionContext {
  filePath: string;
  fileFormat: string;
  getLineNumber(offset: number): number;
  getLocation(offset: number): Location;
}
```

### Example Implementations

```typescript
// Character extractor with built-in merge logic
class CharacterMetadataExtractor implements MetadataExtractor<CharacterData> {
  readonly key = 'characters';
  
  extract(content: string, context: ExtractionContext): CharacterData {
    const characters = new Map<string, CharacterInfo>();
    
    // Find character introductions
    const introPattern = /^#{1,3}\s+(.+?)(?:\s*\((.+?)\))?$/gm;
    let match;
    
    while ((match = introPattern.exec(content)) !== null) {
      const name = match[1];
      const aliases = match[2]?.split(',').map(a => a.trim()) || [];
      const location = context.getLocation(match.index);
      
      characters.set(name, {
        name,
        aliases,
        firstSeen: {
          file: context.filePath,
          line: location.line,
          column: location.column
        }
      });
    }
    
    return { characters };
  }
  
  merge(items: Array<{file: string; data: CharacterData}>): CharacterData {
    const merged = new Map<string, CharacterInfo>();
    
    // Merge strategy: earliest introduction wins
    const allCharacters = items
      .flatMap(item => Array.from(item.data.characters.entries()))
      .sort((a, b) => {
        // Sort by file path, then line number
        const fileCompare = a[1].firstSeen.file.localeCompare(b[1].firstSeen.file);
        if (fileCompare !== 0) return fileCompare;
        return a[1].firstSeen.line - b[1].firstSeen.line;
      });
    
    // Keep first occurrence of each character
    for (const [name, info] of allCharacters) {
      if (!merged.has(name)) {
        merged.set(name, info);
      } else {
        // Merge aliases
        const existing = merged.get(name)!;
        existing.aliases = [...new Set([...existing.aliases, ...info.aliases])];
      }
    }
    
    return { characters: merged };
  }
}

// Link extractor with its own merge logic
class LinkMetadataExtractor implements MetadataExtractor<LinkData> {
  readonly key = 'links';
  
  extract(content: string, context: ExtractionContext): LinkData {
    const links: Link[] = [];
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = linkPattern.exec(content)) !== null) {
      links.push({
        text: match[1],
        target: match[2],
        source: context.filePath,
        location: context.getLocation(match.index)
      });
    }
    
    return { links };
  }
  
  merge(items: Array<{file: string; data: LinkData}>): LinkData {
    // Simple concatenation for links
    const allLinks = items.flatMap(item => item.data.links);
    return { links: allLinks };
  }
}

// Generic key-value metadata with conflict resolution
class KeyValueMetadataExtractor implements MetadataExtractor<Record<string, any>> {
  readonly key = 'metadata';
  
  constructor(
    private mergeStrategy: 'first' | 'last' | 'merge' | CustomMergeFunction = 'merge'
  ) {}
  
  extract(content: string, context: ExtractionContext): Record<string, any> {
    // Extract frontmatter or other key-value pairs
    return parseFrontmatter(content);
  }
  
  merge(items: Array<{file: string; data: Record<string, any>}>): Record<string, any> {
    switch (this.mergeStrategy) {
      case 'first':
        return items[0]?.data || {};
      
      case 'last':
        return items[items.length - 1]?.data || {};
      
      case 'merge':
        return items.reduce((acc, item) => ({...acc, ...item.data}), {});
      
      default:
        return this.mergeStrategy(items);
    }
  }
}
```

## Integration with Validators

```typescript
abstract class BaseValidator {
  // Validators declare what metadata they need
  abstract getMetadataExtractors(): MetadataExtractor[];
  
  // Framework provides merged metadata
  async validate(
    files: ParsedFile[], 
    metadata: ExtractedMetadata
  ): Promise<ValidationResult> {
    // Metadata is already merged and ready to use
    const characters = metadata.get('characters');
    const links = metadata.get('links');
    
    // Perform validation...
  }
}

class CharacterValidator extends BaseValidator {
  getMetadataExtractors(): MetadataExtractor[] {
    return [
      new CharacterMetadataExtractor(),
      new KeyValueMetadataExtractor('first') // For story metadata
    ];
  }
}
```

## Framework Integration

```typescript
class MetadataExtractionOrchestrator {
  async extractMetadata(
    files: string[],
    extractors: MetadataExtractor[]
  ): Promise<Map<string, any>> {
    // Phase 1: Parallel extraction
    const fileResults = await Promise.all(
      files.map(async file => {
        const content = await this.readFile(file);
        const context = this.createContext(file);
        
        // Run all extractors on this file
        const metadata = new Map<string, any>();
        for (const extractor of extractors) {
          const data = extractor.extract(content, context);
          metadata.set(extractor.key, data);
        }
        
        return { file, metadata };
      })
    );
    
    // Phase 2: Merge by extractor type
    const merged = new Map<string, any>();
    
    for (const extractor of extractors) {
      // Group results by extractor
      const items = fileResults.map(r => ({
        file: r.file,
        data: r.metadata.get(extractor.key)
      }));
      
      // Use extractor's merge logic
      const mergedData = extractor.merge(items);
      merged.set(extractor.key, mergedData);
    }
    
    return merged;
  }
}
```

## Benefits

1. **Extensible**: Community can add new metadata types with custom merge logic
2. **Parallel-Safe**: Extract in isolation, merge after
3. **Conflict Resolution**: Each extractor defines its own merge strategy
4. **Type-Safe**: Generic types preserve type safety
5. **Reusable**: Multiple validators can share extractors

## Usage Example

```typescript
// Community plugin for emotion tracking
class EmotionMetadataExtractor implements MetadataExtractor<EmotionData> {
  readonly key = 'emotions';
  
  extract(content: string, context: ExtractionContext): EmotionData {
    // Extract emotion indicators from text
    return analyzeEmotions(content);
  }
  
  merge(items: Array<{file: string; data: EmotionData}>): EmotionData {
    // Aggregate emotion arcs across files
    return mergeEmotionArcs(items);
  }
}

// Validator uses the extracted metadata
class EmotionConsistencyValidator extends BaseValidator {
  getMetadataExtractors() {
    return [new EmotionMetadataExtractor()];
  }
  
  async validate(files: ParsedFile[], metadata: ExtractedMetadata) {
    const emotions = metadata.get('emotions');
    // Validate emotional consistency...
  }
}
```
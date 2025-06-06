# Metadata Extraction API (SOLID Version)

## Overview

A plugin-based metadata extraction system following SOLID principles with proper dependency injection.

## Core Interfaces

### Port Interfaces (Dependencies)

```typescript
// All dependencies are injected via interfaces
interface PatternMatcher {
  findMatches(pattern: RegExp, content: string): Match[];
}

interface LocationService {
  getLocation(content: string, offset: number): Location;
}

interface FrontmatterParser {
  parse(content: string): Record<string, any>;
}
```

### MetadataExtractor with DI

```typescript
interface MetadataExtractor<T = any> {
  readonly key: string;
  extract(content: string, context: ExtractionContext): T;
  merge(items: Array<{file: string; data: T}>): T;
}

interface ExtractionContext {
  filePath: string;
  fileFormat: string;
  locationService: LocationService;
}
```

### Single Responsibility Classes

```typescript
// ❌ WRONG - Too many responsibilities
class CharacterMetadataExtractor {
  extract(content: string) {
    // Finding patterns
    // Parsing names
    // Building data structure
    // All in one method!
  }
}

// ✅ CORRECT - Separated responsibilities
class CharacterPatternMatcher implements PatternMatcher {
  constructor(
    private readonly pattern: RegExp = /^#{1,3}\s+(.+?)(?:\s*\((.+?)\))?$/gm
  ) {}
  
  findMatches(pattern: RegExp, content: string): Match[] {
    const matches: Match[] = [];
    let match;
    while ((match = pattern.exec(content)) !== null) {
      matches.push({
        text: match[0],
        groups: match.slice(1),
        index: match.index
      });
    }
    return matches;
  }
}

class CharacterParser {
  parse(match: Match): CharacterInfo {
    const [name, aliasString] = match.groups;
    const aliases = aliasString 
      ? aliasString.split(',').map(a => a.trim())
      : [];
    
    return { name, aliases };
  }
}

class CharacterMergeStrategy {
  merge(items: Array<{file: string; data: CharacterData}>): CharacterData {
    const sorter = new CharacterOccurrenceSorter();
    const sorted = sorter.sort(items);
    
    const merger = new CharacterDataMerger();
    return merger.merge(sorted);
  }
}

// Main extractor uses injected dependencies
class CharacterMetadataExtractor implements MetadataExtractor<CharacterData> {
  readonly key = 'characters';
  
  constructor(
    private readonly matcher: PatternMatcher,
    private readonly parser: CharacterParser,
    private readonly mergeStrategy: CharacterMergeStrategy
  ) {}
  
  extract(content: string, context: ExtractionContext): CharacterData {
    const matches = this.matcher.findMatches(this.pattern, content);
    const characters = new Map<string, CharacterInfo>();
    
    for (const match of matches) {
      const character = this.parser.parse(match);
      const location = context.locationService.getLocation(content, match.index);
      
      characters.set(character.name, {
        ...character,
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
    return this.mergeStrategy.merge(items);
  }
}
```

### Factory Pattern for Construction

```typescript
class MetadataExtractorFactory {
  constructor(
    private readonly patternMatcher: PatternMatcher,
    private readonly locationService: LocationService,
    private readonly frontmatterParser: FrontmatterParser
  ) {}
  
  createCharacterExtractor(): MetadataExtractor<CharacterData> {
    return new CharacterMetadataExtractor(
      this.patternMatcher,
      new CharacterParser(),
      new CharacterMergeStrategy()
    );
  }
  
  createLinkExtractor(): MetadataExtractor<LinkData> {
    return new LinkMetadataExtractor(
      this.patternMatcher,
      new LinkParser(),
      new LinkMergeStrategy()
    );
  }
  
  createKeyValueExtractor(
    strategy: MergeStrategy = 'merge'
  ): MetadataExtractor<Record<string, any>> {
    return new KeyValueMetadataExtractor(
      this.frontmatterParser,
      this.createMergeStrategy(strategy)
    );
  }
  
  private createMergeStrategy(strategy: string): MergeStrategy {
    switch (strategy) {
      case 'first': return new FirstWinsMergeStrategy();
      case 'last': return new LastWinsMergeStrategy();
      case 'merge': return new DeepMergeMergeStrategy();
      default: throw new Error(`Unknown merge strategy: ${strategy}`);
    }
  }
}
```

### Proper Validator Integration

```typescript
abstract class BaseValidator {
  constructor(
    protected readonly extractorFactory: MetadataExtractorFactory
  ) {}
  
  // Validators declare what metadata they need
  abstract getMetadataExtractors(): MetadataExtractor[];
}

class CharacterValidator extends BaseValidator {
  private extractors?: MetadataExtractor[];
  
  getMetadataExtractors(): MetadataExtractor[] {
    // Lazy initialization
    if (!this.extractors) {
      this.extractors = [
        this.extractorFactory.createCharacterExtractor(),
        this.extractorFactory.createKeyValueExtractor('first')
      ];
    }
    return this.extractors;
  }
  
  async validate(
    files: ParsedFile[], 
    metadata: ExtractedMetadata
  ): Promise<ValidationResult> {
    const validator = new CharacterConsistencyValidator(
      metadata.get('characters'),
      metadata.get('metadata')
    );
    
    return validator.validate(files);
  }
}
```

### Test Doubles

```typescript
// Test doubles for all dependencies
class TestPatternMatcher implements PatternMatcher {
  private results: Match[] = [];
  
  setResults(results: Match[]): void {
    this.results = results;
  }
  
  findMatches(pattern: RegExp, content: string): Match[] {
    return this.results;
  }
}

class TestLocationService implements LocationService {
  getLocation(content: string, offset: number): Location {
    return { line: 1, column: offset + 1, offset };
  }
}

// Tests with proper DI
describe('CharacterMetadataExtractor', () => {
  let extractor: CharacterMetadataExtractor;
  let matcher: TestPatternMatcher;
  let parser: CharacterParser;
  let mergeStrategy: CharacterMergeStrategy;
  
  beforeEach(() => {
    matcher = new TestPatternMatcher();
    parser = new CharacterParser();
    mergeStrategy = new CharacterMergeStrategy();
    
    extractor = new CharacterMetadataExtractor(
      matcher,
      parser,
      mergeStrategy
    );
  });
  
  it('should extract character from introduction', () => {
    // Arrange
    matcher.setResults([{
      text: '# Tuxicles (Tux, The Great)',
      groups: ['Tuxicles', 'Tux, The Great'],
      index: 0
    }]);
    
    const context: ExtractionContext = {
      filePath: 'test.md',
      fileFormat: 'markdown',
      locationService: new TestLocationService()
    };
    
    // Act
    const result = extractor.extract('# Tuxicles (Tux, The Great)', context);
    
    // Assert
    expect(result.characters.get('Tuxicles')).toEqual({
      name: 'Tuxicles',
      aliases: ['Tux', 'The Great'],
      firstSeen: { file: 'test.md', line: 1, column: 1 }
    });
  });
});
```

## Key Improvements

1. **Single Responsibility**:
   - `PatternMatcher` - finds patterns
   - `CharacterParser` - parses matches
   - `LocationService` - calculates positions
   - `MergeStrategy` - handles merging

2. **Dependency Injection**:
   - All dependencies injected via constructor
   - No direct file system access
   - No hardcoded patterns

3. **Interface Segregation**:
   - Small, focused interfaces
   - Each interface has one purpose

4. **Open/Closed**:
   - New extractors via factory
   - New merge strategies without modifying existing code

5. **Testability**:
   - Test doubles for all dependencies
   - No spies needed
   - Behavior testing only
# Incremental Validation Architecture

## Overview

Only re-validate files that have changed, dramatically improving performance for large projects. Supports forcing re-validation when needed.

## Design

### Cache Structure

```typescript
interface ValidationCache {
  version: string;  // Cache format version
  entries: Map<string, CacheEntry>;
}

interface CacheEntry {
  filePath: string;
  contentHash: string;
  lastModified: number;
  metadata: ExtractedMetadata;
  validationResults: {
    [validatorName: string]: {
      version: string;  // Validator version
      result: ValidationOutput;
      dependencies: string[];  // Other files this validation depends on
    }
  }
}
```

### IncrementalValidator Implementation

```typescript
class IncrementalValidator {
  private cache: ValidationCache;
  private forceFiles = new Set<string>();
  
  constructor(
    private cacheFile: string = '.story-linter-cache/validation.json'
  ) {
    this.loadCache();
  }
  
  // Force re-validation of specific files
  force(patterns: string[]): void {
    const files = glob(patterns);
    files.forEach(f => this.forceFiles.add(f));
  }
  
  async validate(files: string[]): Promise<ValidationResult> {
    const toValidate: string[] = [];
    const cached: ValidationResult[] = [];
    
    // Phase 1: Determine what needs validation
    for (const file of files) {
      if (this.needsValidation(file)) {
        toValidate.push(file);
      } else {
        cached.push(this.getCachedResult(file));
      }
    }
    
    // Phase 2: Validate only changed files
    const fresh = await this.runValidation(toValidate);
    
    // Phase 3: Merge results
    return this.mergeResults([...cached, fresh]);
  }
  
  private needsValidation(file: string): boolean {
    // Force flag overrides everything
    if (this.forceFiles.has(file)) {
      return true;
    }
    
    const cached = this.cache.entries.get(file);
    if (!cached) {
      return true;  // Never validated
    }
    
    // Check if file changed
    const currentHash = await this.hashFile(file);
    if (currentHash !== cached.contentHash) {
      return true;
    }
    
    // Check if dependencies changed
    if (this.dependenciesChanged(cached)) {
      return true;
    }
    
    // Check if validator version changed
    if (this.validatorVersionChanged(cached)) {
      return true;
    }
    
    return false;
  }
  
  private dependenciesChanged(entry: CacheEntry): boolean {
    // For character validator: check if any character introduction files changed
    // For link validator: check if link targets changed
    for (const dep of entry.validationResults.character?.dependencies || []) {
      if (this.needsValidation(dep)) {
        return true;
      }
    }
    return false;
  }
}
```

### Dependency Tracking

Different validators have different dependencies:

```typescript
class CharacterValidator {
  getDependencies(file: string, allFiles: string[]): string[] {
    // This file depends on all files that introduce characters
    return allFiles.filter(f => this.introducesCharacters(f));
  }
}

class LinkValidator {
  getDependencies(file: string, allFiles: string[]): string[] {
    // Depends on files this links to and files that link here
    const outgoing = this.getOutgoingLinks(file);
    const incoming = this.getIncomingLinks(file);
    return [...outgoing, ...incoming];
  }
}
```

### CLI Integration

```bash
# Normal incremental validation
story-linter validate

# Force specific files
story-linter validate --force "chapters/chapter-1.md"

# Force all files
story-linter validate --force-all

# Force files matching pattern
story-linter validate --force "chapters/*"

# Clear cache and validate fresh
story-linter validate --clear-cache
```

### Cache Invalidation Rules

Cache is invalidated when:

1. **File content changes** (hash mismatch)
2. **Dependencies change** (linked files, character introductions)
3. **Validator version changes** (new validation logic)
4. **Configuration changes** (different rules)
5. **Force flag is used** (manual override)

### Configuration

```yaml
# .story-linter.yml
cache:
  enabled: true
  location: ".story-linter-cache"
  maxSize: "100MB"
  ttl: "30d"  # Expire entries after 30 days
  
  # Dependency tracking
  trackDependencies: true
  
  # What invalidates cache
  invalidateOn:
    - configChange
    - validatorUpdate
    - dependencyChange
```

## Benefits

1. **Speed**: 100x faster for unchanged files
2. **Development Flow**: Instant feedback on changes
3. **CI/CD**: Faster builds by caching between runs
4. **Control**: Force re-validation when needed

## Implementation Priority

This should be HIGH priority because:

1. **Developer Experience**: Fast feedback loop is critical
2. **Large Projects**: GitScrolls has hundreds of files
3. **Watch Mode**: Incremental is essential for watch
4. **CI/CD**: Saves build time and resources

## Example: GitScrolls Workflow

```bash
# First run: validates all 500 files (30 seconds)
$ story-linter validate
✓ Validated 500 files in 30s

# Second run: nothing changed (0.5 seconds)
$ story-linter validate
✓ Validated 500 files in 0.5s (all cached)

# Edit one file
$ vim scrolls/tux-origins.md

# Third run: only validates changed file + dependents (2 seconds)
$ story-linter validate
✓ Validated 15 files in 2s (485 cached)

# Force re-validation of specific files
$ story-linter validate --force "scrolls/tux-*.md"
✓ Validated 50 files in 3s (450 cached)
```
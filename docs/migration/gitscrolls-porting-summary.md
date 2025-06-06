# GitScrolls Validator Porting Summary

## Overview

This document summarizes the findings from exploring the GitScrolls codebase and outlines what needs to be ported to Story Linter.

## GitScrolls Architecture

### Current Structure
```
gitscrolls/
├── src/
│   ├── validators/
│   │   ├── character-consistency-validator.ts
│   │   ├── character-consistency-validator-v2.ts
│   │   ├── link-graph-validator.ts
│   │   └── simple-character-validator.ts
│   ├── extractors/
│   │   └── narrative-schema-extractor.ts
│   ├── utils/
│   │   ├── file-utils.ts
│   │   └── markdown-parser.ts
│   └── core/
│       └── base-validator.ts
```

### Dependencies
- **gray-matter**: Front matter parsing
- **unified/remark**: Markdown AST parsing
- **unist-util-visit**: AST traversal

## Character Consistency Validator

### Current Implementation Details

1. **Character Tracking**
   - Maps character names to their appearances
   - Tracks character evolution (Tuxicles → Tuxrates → Tuxilles)
   - Validates character introduction order
   - Monitors scar acquisition timeline

2. **Key Features**
   - Character name pattern matching with regex
   - Evolution timeline validation
   - Introduction validation for major characters
   - Name consistency checking (e.g., @TempleSentinel)
   - Scar timeline validation

3. **Configuration**
   - Supports `.narrative-validation-rules.json` for learned patterns
   - Can classify lines as retrospective, preview, or metaphorical
   - Exception patterns for special cases

4. **Validation Rules Enforced**
   ```typescript
   // Character evolution timeline
   PROTAGONIST_EVOLUTION = [
     { name: 'Tuxicles', scrolls: ['01', '02'] },
     { name: 'Tuxrates', scrolls: ['03', '04'] },
     { name: 'Tuxilles', scrolls: ['05', '06', '07', '08', '09', '10'] }
   ];
   
   // Scar acquisition timeline
   SCAR_TIMELINE = [
     { scar: 'beak chip', scroll: '05' },
     { scar: 'eye flickers', scroll: '06' },
     { scar: 'chest crack', scroll: '07' },
     { scar: 'flipper tingle', scroll: '07' },
     { scar: 'constellation', scroll: '08' }
   ];
   ```

5. **Error Types**
   - `character-evolution`: Wrong character name for scroll
   - `character-introduction`: Character referenced before introduction
   - `name-consistency`: Inconsistent character naming
   - `scar-timeline`: Scar appearing before its designated scroll

## Link Graph Validator

### Current Implementation Details

1. **Link Validation**
   - Extracts all markdown links from files
   - Validates link targets exist
   - Detects orphaned documents (not linked from anywhere)
   - Checks title consistency between link text and target

2. **Key Features**
   - Builds complete link graph
   - BFS traversal from README files to find orphans
   - Relative path resolution
   - Ignores external links and anchors

3. **Error Types**
   - `broken_link`: Target file doesn't exist
   - `orphaned_document`: Document not reachable from README
   - `title_mismatch`: Link text doesn't match target title

4. **Graph Building Process**
   - First pass: Create nodes for all files
   - Second pass: Process links and build edges
   - Validation: Check link validity and detect orphans

## Narrative Schema Extractor

### Purpose
Learns patterns from the narrative to improve validation accuracy.

### Features
1. **Pattern Detection**
   - Retrospective patterns (past tense, memories)
   - Preview patterns (end-of-chapter teasers)
   - Metaphorical references

2. **Character Evolution Tracking**
   - Detects transformation patterns
   - Records character aliases
   - Maps first appearances

3. **Interactive Mode**
   - Can ask authors about ambiguous cases
   - Saves learned patterns for future runs

## Test Coverage

### Character Consistency Tests
- ✅ Premature character evolution detection
- ✅ Correct evolution validation
- ✅ Character introduction order
- ✅ Name consistency checking
- ✅ Scar timeline validation
- ✅ Summary statistics

### Link Graph Tests
- ✅ Broken link detection
- ✅ Valid link validation
- ✅ Orphaned document detection
- ✅ Nested directory handling
- ✅ Title mismatch warnings
- ✅ External/anchor link ignoring

## Porting Requirements

### 1. Core Functionality to Port

#### Character Consistency Validator
- [ ] Character name pattern matching
- [ ] Evolution timeline validation
- [ ] Introduction order checking
- [ ] Name consistency validation
- [ ] Scar timeline tracking
- [ ] Schema learning capabilities
- [ ] Exception pattern support

#### Link Graph Validator
- [ ] Link extraction from markdown
- [ ] Broken link detection
- [ ] Orphan page detection
- [ ] Title consistency checking
- [ ] Relative path resolution
- [ ] Graph visualization support

### 2. Architecture Adaptations

#### From GitScrolls to Story Linter
1. **File Processing**
   - GitScrolls: Batch processing all files
   - Story Linter: Per-file validation with lifecycle hooks

2. **State Management**
   - GitScrolls: In-memory global state
   - Story Linter: Distributed state with `initialize()` and `afterValidation()`

3. **Configuration**
   - GitScrolls: JSON file with learned patterns
   - Story Linter: Zod schema with plugin configuration

4. **Error Reporting**
   - GitScrolls: Custom result objects
   - Story Linter: Standardized ValidationIssue format

### 3. Enhanced Features for Story Linter

1. **Fix Suggestions**
   - Auto-fix for name inconsistencies
   - Suggest valid link targets
   - Character name corrections

2. **Incremental Validation**
   - Cache character appearances
   - Incremental link graph updates
   - Smart revalidation

3. **Schema Integration**
   - Use Story Linter's schema extraction
   - Cross-plugin character consistency
   - Shared narrative knowledge

4. **Visualization**
   - Character relationship graphs
   - Link structure diagrams
   - Evolution timelines

### 4. Configuration Options

```typescript
// Character Consistency Plugin
{
  enabled: boolean,
  evolution: {
    track: boolean,
    requireExplicit: boolean,
    customTimelines: Array<CharacterEvolution>
  },
  scarTracking: {
    enabled: boolean,
    timeline: Array<ScarEvent>
  },
  schemaLearning: {
    enabled: boolean,
    interactive: boolean
  }
}

// Link Graph Plugin
{
  enabled: boolean,
  validation: {
    checkBrokenLinks: boolean,
    checkOrphanedPages: boolean,
    checkTitleConsistency: boolean
  },
  orphanDetection: {
    severity: 'error' | 'warning' | 'info',
    excludePatterns: string[]
  }
}
```

## Migration Strategy

### Phase 1: Direct Port (Week 1)
1. Create plugin packages
2. Port core validation logic
3. Maintain feature parity
4. Ensure all tests pass

### Phase 2: Integration (Week 2)
1. Adapt to Story Linter lifecycle
2. Implement configuration schemas
3. Add standardized error reporting
4. Test with GitScrolls content

### Phase 3: Enhancement (Week 3)
1. Add fix suggestions
2. Implement caching
3. Add visualization support
4. Schema learning integration

## Edge Cases to Handle

1. **Character Evolution**
   - Transition chapters (e.g., Scroll 4-5)
   - Retrospective mentions
   - Preview/teaser sections
   - Metaphorical references

2. **Link Validation**
   - Circular references
   - Self-links
   - Case sensitivity
   - Special characters in filenames

3. **Performance**
   - Large narratives (100+ files)
   - Deep directory structures
   - Complex link graphs
   - Real-time validation

## Success Criteria

1. **Feature Parity**
   - All GitScrolls tests pass
   - Same errors detected
   - Performance maintained

2. **Enhanced Capabilities**
   - Fix suggestions work
   - Incremental validation efficient
   - Configuration flexible

3. **User Experience**
   - Clear error messages
   - Helpful suggestions
   - Fast validation
   - Easy configuration
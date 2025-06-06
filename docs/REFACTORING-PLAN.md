# Story Linter Refactoring Plan

## Overview

The MVP features are complete but several core components violate our SOLID principles. This document outlines the refactoring plan to bring all code up to our standards before release.

## Principles We Must Follow

1. **Test-Driven Development (TDD)**
   - Write the test FIRST
   - Red → Green → Refactor
   - No implementation without a failing test

2. **SOLID Principles**
   - Single Responsibility per class
   - Dependency Injection for all dependencies
   - No direct file system or library usage

3. **Test Doubles**
   - NO SPIES or mocks
   - Use proper test doubles (stubs, fakes)
   - Test behavior, not implementation

## Phase 1: Core Architecture Refactoring (Days 1-2)

### 1.1 ValidationFramework Refactoring

**Current Problems:**
- God class with 8+ responsibilities
- Creates own dependencies (no DI)
- No unit tests
- Handles file discovery, plugin management, validation orchestration, result aggregation

**Refactoring Plan:**

```typescript
// Extract these classes (TDD - write tests first!)
ValidationOrchestrator - Coordinates validation flow
PluginManager - Manages validator lifecycle  
FileProcessor - Handles file operations
ResultAggregator - Combines validator results
EventBus - Handles progress events
MetadataCache - Caches extracted metadata
```

**Test-First Approach:**
```typescript
// 1. Start with ValidationOrchestrator test
describe('ValidationOrchestrator', () => {
  it('should coordinate validation across all files', async () => {
    // Write this test BEFORE creating ValidationOrchestrator!
  });
});
```

### 1.2 ConfigLoader Refactoring

**Current Problems:**
- Direct fs.promises usage
- No tests
- No dependency injection

**Solution:**
- Add FileSystemPort
- Write tests first
- Simple refactoring

### 1.3 FileDiscovery Refactoring

**Current Problems:**
- Direct glob usage
- No tests
- No dependency injection

**Solution:**
- Add GlobPort or FileSystemPort
- Write tests first
- Extract pattern matching logic

## Phase 2: Performance Features (Day 3)

### 2.1 Incremental Validation

**Key Features:**
- File content hashing
- Cache validation results
- Dependency tracking
- Force re-validation flag

**Implementation:**
```typescript
class IncrementalValidationCache {
  // Store: filePath → { hash, result, dependencies, timestamp }
  // Invalidate when: content changes, deps change, validator updates
}
```

### 2.2 Parallel File Processing

**Simple Approach:**
```typescript
class ParallelFileProcessor {
  async processFiles(files: string[], concurrency = 10) {
    // Use Promise.all with batching
    // No worker threads for MVP
  }
}
```

## Phase 3: Integration Testing (Day 4)

### 3.1 GitScrolls Test Subset

Create `test/fixtures/gitscrolls-subset/` with:
- Character consistency errors (typos, missing intros)
- Link errors (broken links, orphans)
- Timeline issues (if applicable)

### 3.2 Integration Test Suite

```typescript
describe('GitScrolls Integration', () => {
  it('detects character name typos');
  it('finds broken internal links');
  it('identifies orphaned documents');
  it('completes in reasonable time');
});
```

## Phase 4: Release Preparation (Day 5)

### 4.1 Documentation
- Real-world examples in README
- API documentation
- Migration guide from GitScrolls

### 4.2 Package Preparation
- Verify package.json metadata
- Add LICENSE files
- Test npm publish flow (dry run)

### 4.3 Final Validation
- Run against full GitScrolls
- Performance benchmarks
- Cross-platform testing

## Success Criteria

1. **All tests pass** - 100% of tests green
2. **SOLID compliance** - Every class follows principles
3. **Performance** - <5s for 100 files with cache
4. **GitScrolls validation** - Catches known issues
5. **Documentation** - Clear usage examples

## Implementation Order

1. **ValidationFramework** - Biggest violation, blocks everything
2. **ConfigLoader** - Needed by ValidationFramework
3. **FileDiscovery** - Needed by ValidationFramework
4. **Incremental Validation** - Biggest UX improvement
5. **Parallel Processing** - Performance boost
6. **Integration Tests** - Verify everything works
7. **Documentation** - Final polish

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Regression during refactoring | High | Write tests first, refactor in small steps |
| Performance degradation | Medium | Benchmark before/after each change |
| API changes break validators | Medium | Keep public API stable, only change internals |
| Missing edge cases | Low | Integration tests with real data |

## Daily Checkpoints

**Day 1 End:** ValidationFramework split into clean classes with tests
**Day 2 End:** ConfigLoader and FileDiscovery refactored with DI
**Day 3 End:** Incremental validation and parallel processing working
**Day 4 End:** Integration tests passing with GitScrolls subset
**Day 5 End:** Ready for npm publish

## Notes

- If we get stuck, we can defer features (like parallel processing) to post-MVP
- Incremental validation is the most important performance feature
- Keep the public API stable to avoid breaking changes
- Document decisions as we go
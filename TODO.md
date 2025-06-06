# Story Linter Development TODO

## Project Status Overview 🎯

### Documentation Structure
- [x] Reorganize features by milestones
- [x] Create milestone-specific TODO files
- [x] Update navigation structure

### Current Milestone: [MVP (v0.1.0)](docs/features/milestones/mvp/)
**Status**: Week 6 of 8 - MVP Feature Complete! 🎉

#### Completed ✅
- [x] Monorepo structure with Lerna
- [x] TypeScript configuration
- [x] Docker development environment
- [x] ESLint & Prettier setup
- [x] Documentation reorganization
- [x] Core package implementation
- [x] File processing utilities (with streaming support)
- [x] Base validator framework with plugin architecture
- [x] Configuration system (.story-linter.yml loader)
- [x] Testing framework setup (Vitest)
- [x] SOLID principles refactoring
- [x] Dependency injection implementation
- [x] Test doubles (no spies!)
- [x] Unit and integration tests for core
- [x] Character consistency validator (extensible design)
- [x] Link graph validator (with orphan detection)
- [x] CLI package with SOLID architecture
- [x] Output formatters (text, JSON, HTML)
- [x] Progress indicators and colored output
- [x] Exit codes for CI/CD integration

#### Refactoring Plan (4 Phases)

##### Phase 1: Fix Core Architecture (Days 1-2) 🔧
- [ ] Refactor ValidationFramework using TDD
  - [ ] Write tests FIRST for ValidationOrchestrator
  - [ ] Extract PluginManager with DI
  - [ ] Extract ResultAggregator with DI
  - [ ] Inject all dependencies (FileProcessor, ConfigLoader)
- [ ] Fix ConfigLoader
  - [ ] Write tests FIRST
  - [ ] Add FileSystemPort
  - [ ] Implement with DI
- [ ] Fix FileDiscovery  
  - [ ] Write tests FIRST
  - [ ] Add FileSystemPort
  - [ ] Implement with DI

##### Phase 2: Performance Features (Day 3) 🚀
- [ ] Implement Incremental Validation
  - [ ] Design cache structure
  - [ ] Add file hashing
  - [ ] Implement dependency tracking
  - [ ] Add --force flag support
- [ ] Add Parallel File Processing
  - [ ] Simple Promise.all batching
  - [ ] Configurable concurrency
  - [ ] Progress event updates

##### Phase 3: Integration Testing (Day 4) 🧪
- [ ] Create GitScrolls test subset
  - [ ] Copy representative files
  - [ ] Add intentional errors (typos, broken links, orphans)
  - [ ] Document test cases
- [ ] Write integration tests
  - [ ] Character consistency detection
  - [ ] Link validation
  - [ ] Performance benchmarks

##### Phase 4: Ship It! (Day 5) 🚢
- [ ] Polish documentation
  - [ ] Update main README with real examples
  - [ ] Add API documentation
  - [ ] Create migration guide from GitScrolls
- [ ] Prepare npm packages
  - [ ] Update package.json files
  - [ ] Add LICENSE to each package
  - [ ] Test publishing flow
- [ ] Final testing
  - [ ] Full end-to-end validation
  - [ ] Performance verification
  - [ ] Cross-platform testing

For detailed MVP tasks, see: [MVP TODO](docs/features/milestones/mvp/TODO.md)

## Post-MVP Features 🚀
- [ ] Schema Extraction (v0.2.0)
  - [ ] AI-powered pattern learning
  - [ ] Schema generation from existing stories
- [ ] Real-time Features (v0.3.0)
  - [ ] Watch mode
  - [ ] File change detection
- [ ] IDE Integration (v0.4.0)
  - [ ] VS Code extension
  - [ ] Language server protocol
- [ ] Interactive Mode (v0.5.0)
  - [ ] Guided fixing
  - [ ] Schema building wizard
- [ ] Additional Validators
  - [ ] Timeline validator
  - [ ] Plot thread tracker
  - [ ] World building validator
  - [ ] Dialogue pattern validator

## Documentation ✅
- [x] Architecture documentation (complete)
- [x] Feature specifications (complete)
- [x] Plugin documentation (complete)
- [x] Roadmap and milestones (complete)
- [x] README with logo
- [x] CLAUDE.md for AI assistance
- [ ] API documentation (post-MVP)
- [ ] Getting started guides (post-MVP)

## Testing 🧪
- [x] Set up testing framework (Vitest)
- [x] Write unit tests for core
- [x] Write integration tests for file operations
- [x] Establish testing standards (TDD, SOLID, DI)
- [ ] Write E2E tests for complete validation flow
- [ ] Write tests for validators
- [ ] Write integration tests
- [ ] Create test fixtures
- [ ] Set up CI/CD

## Release 🚀
- [ ] Publish v0.1.0-alpha
- [ ] Create npm organization (@story-linter)
- [ ] Set up automated releases
- [ ] Write announcement blog post
- [ ] Create demo video

## Community 🌍
- [ ] Create GitHub issues templates
- [ ] Write contributing guide
- [ ] Set up Discord/Discussions
- [ ] Reach out to writing communities
- [ ] Find early adopters

## Implementation Priority Order

### Phase 1: Foundation (Critical Path)
1. File Utils (1 week)
2. Configuration System (2-3 weeks)
3. Validation Framework (4-5 weeks)

### Phase 2: Core Features
4. Schema Extraction (6-8 weeks) - Can start partially with #3
5. CLI Interface (2-3 weeks) - Can start with #3

### Phase 3: Enhanced UX
6. Interactive Mode (3 weeks)
7. Watch Mode (2 weeks)

### Phase 4: Validators
8. Character Validator (2 weeks)
9. Timeline Validator (2 weeks)
10. Plot Thread Tracker (3 weeks)

### Phase 5: IDE & Advanced
11. VS Code Extension (4 weeks)
12. Story Visualization (6 weeks)
13. AI Integration (8-10 weeks)

## Resource Needs

- **Minimum Team**: 1 developer (35-40 weeks)
- **Recommended Team**: 2-3 developers (15-18 weeks)
- **Infrastructure**: npm organization, GitHub org, CI/CD
- **Community**: Discord server, documentation site

## Success Criteria

- [ ] GitScrolls validates successfully
- [ ] < 10s validation for 1000 files
- [ ] 90%+ pattern detection accuracy
- [ ] 50+ GitHub stars in first month
- [ ] 3+ external contributors
- [ ] Featured in writing community
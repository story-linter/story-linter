# Story Linter Features

This directory contains all feature documentation for Story Linter, organized by release milestones.

## Directory Structure

```
features/
├── milestones/           # Features organized by release
│   ├── mvp/             # v0.1.0 - Minimum Viable Product
│   ├── v0.2.0-schema-extraction/
│   ├── v0.3.0-real-time/
│   ├── v0.4.0-ide-integration/
│   ├── v0.5.0-interactive-mode/
│   └── v1.0.0-production/
├── all-features/        # Complete feature specifications
└── README.md           # This file
```

## Navigation

### By Milestone

- **[MVP (v0.1.0)](./milestones/mvp/)** - Core framework and GitScrolls parity
- **[v0.2.0](./milestones/v0.2.0-schema-extraction/)** - AI-powered schema extraction
- **[v0.3.0](./milestones/v0.3.0-real-time/)** - Watch mode and real-time validation
- **[v0.4.0](./milestones/v0.4.0-ide-integration/)** - VS Code extension
- **[v0.5.0](./milestones/v0.5.0-interactive-mode/)** - Interactive fixing
- **[v1.0.0](./milestones/v1.0.0-production/)** - Production ready

### By Feature

See [all-features/](./all-features/) for complete specifications of all planned features, regardless of release milestone.

## Understanding the Documentation

### Milestone Directories

Each milestone directory contains:
- `README.md` - Overview, scope, timeline, and success criteria
- `TODO.md` - Detailed implementation checklist
- Feature-specific documentation for that release

### All Features Directory

Contains the complete vision for each feature, including:
- Full specifications
- Technical details
- Future enhancements
- Integration points

## Current Status

🎯 **Currently Working On**: [MVP (v0.1.0)](./milestones/mvp/)

The MVP focuses on replacing GitScrolls validators with an extensible framework, providing:
- Core validation framework
- Character consistency validator
- Link graph validator
- Basic CLI interface
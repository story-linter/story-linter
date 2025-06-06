# 🧠 Story Linter – Technical Documentation

Welcome to the official documentation repo for **Story Linter**:  
A modular validation engine for narrative consistency and canon integrity—TypeScript for stories.

This repo contains specifications, architecture plans, feature roadmaps, and design notes.

---

## 🗺️ Key Documents

### 📐 Architecture & Design

**Core Components**
- [`Configuration Manager`](./architecture/core-components/configuration-manager.md) – Central configuration handling
- [`Event Manager`](./architecture/core-components/event-manager.md) – Event-driven architecture patterns
- [`Plugin Manager`](./architecture/core-components/plugin-manager.md) – Plugin lifecycle and loading
- [`Schema Engine`](./architecture/core-components/schema-engine.md) – Schema processing core
- [`Validation Framework`](./architecture/core-components/validation-framework.md) – Validation engine design

**Plugin System**
- [`Plugin Interface`](./architecture/plugin-architecture/plugin-interface.md) – Plugin API contracts
- [`Plugin Loading`](./architecture/plugin-architecture/plugin-loading.md) – Dynamic plugin discovery

**Data Flow**
- [`Schema Extraction Flow`](./architecture/data-flow/schema-extraction-flow.md) – Learning from existing content
- [`Validation Flow`](./architecture/data-flow/validation-flow.md) – Validation pipeline

### 🚀 Features

**Core Features**
- [`CLI Interface`](./features/cli-interface.md) – Command-line tool design
- [`Configuration System`](./features/configuration-system.md) – Configuration specifications
- [`Schema Extraction`](./features/schema-extraction.md) – Pattern learning from narratives
- [`Validation Framework`](./features/validation-framework.md) – Core validation features
- [`Interactive Mode`](./features/interactive-mode.md) – Interactive schema building
- [`Watch Mode`](./features/watch-mode.md) – Real-time validation

**IDE Integration**
- [`VSCode Extension`](./features/vscode-extension.md) – Editor integration plans
- [`AI Story Intelligence`](./features/ai-story-intelligence.md) – AI-powered features

### 🔌 Plugins

**Built-in Validators**
- [`Character Consistency`](./plugins/built-in/character-consistency.md) – Character tracking
- [`Timeline Validator`](./plugins/built-in/timeline-validator.md) – Temporal consistency
- [`Dialogue`](./plugins/built-in/dialogue.md) – Dialogue patterns and voice
- [`Plot Consistency`](./plugins/built-in/plot-consistency.md) – Plot thread tracking
- [`World Building`](./plugins/built-in/world-building.md) – Setting consistency
- [`Style Guide`](./plugins/built-in/style-guide.md) – Writing style enforcement
- [`Metadata`](./plugins/built-in/metadata.md) – Story metadata validation

**Plugin Development**
- [`Getting Started`](./plugins/development/getting-started.md) – Plugin development guide
- [`Plugin Structure`](./plugins/development/plugin-structure.md) – Anatomy of a plugin
- [`Best Practices`](./plugins/development/best-practices.md) – Development guidelines
- [`Testing Plugins`](./plugins/development/testing-plugins.md) – Plugin testing strategies
- [`Distribution`](./plugins/development/distribution.md) – Publishing plugins

### 🛤️ Roadmap

- [`Roadmap Overview`](./roadmap/README.md) – Development timeline
- [`MVP`](./roadmap/milestones/mvp.md) – Minimum viable product spec
- [`v0.2.0`](./roadmap/milestones/v0.2.0-schema-extraction.md) – Schema extraction
- [`v0.3.0`](./roadmap/milestones/v0.3.0-real-time.md) – Real-time validation
- [`v0.4.0`](./roadmap/milestones/v0.4.0-ide-integration.md) – IDE integration
- [`v1.0.0`](./roadmap/milestones/v1.0.0-production.md) – Production release

### 🔄 Migration Guides

- [`GitScrolls Migration`](./migration/porting-gitscrolls-validators.md) – Porting from GitScrolls
- [`Quick Reference`](./migration/porting-quick-reference.md) – Migration cheat sheet
- [`Link Graph Example`](./migration/port-link-graph-example.md) – Complex migration example

---

## 💡 What is Story Linter?

Story Linter is a framework for validating longform fiction, helping creators:
- Detect plot inconsistencies
- Maintain character and timeline continuity
- Collaborate across teams and AI agents
- Scale story logic across books, games, and screenplays

---

## 📍 Status

This repository contains design documents and specifications for Story Linter, which is under active development.

Want to get involved early? Open an issue or contribute to the documentation.

---

## 🧾 License

MIT
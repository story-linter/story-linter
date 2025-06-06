# Story Linter Plugins

## Overview

Story Linter's plugin system enables extensible narrative validation. Plugins can provide validators, schema patterns, output formatters, and more. The plugin architecture allows the community to extend Story Linter's capabilities for specific genres, workflows, and validation needs.

## Plugin Categories

### Built-in Plugins

Core plugins that ship with Story Linter:

- [Character Consistency](./built-in/character-consistency.md) - Character name and reference validation
- [Timeline Validator](./built-in/timeline-validator.md) - Chronological consistency checking
- [Plot Consistency](./built-in/plot-consistency.md) - Plot thread tracking and resolution
- [World Building](./built-in/world-building.md) - Fictional world consistency
- [Dialogue](./built-in/dialogue.md) - Dialogue formatting and consistency
- [Style Guide](./built-in/style-guide.md) - Narrative style enforcement
- [Metadata](./built-in/metadata.md) - Story metadata management

### Community Plugins

#### Genre-Specific
- [Fantasy Plugin](./community/genre-specific/fantasy.md) - Magic systems and fantasy elements
- [Mystery Plugin](./community/genre-specific/mystery.md) - Clue tracking and fair play
- [Romance Plugin](./community/genre-specific/romance.md) - Relationship progression
- [Sci-Fi Plugin](./community/genre-specific/sci-fi.md) - Technology and timeline consistency

#### Specialized Use Cases
- [Screenplay Plugin](./community/specialized/screenplay.md) - Script formatting
- [Series Plugin](./community/specialized/series.md) - Multi-book consistency
- [Translation Plugin](./community/specialized/translation.md) - Translation validation
- [Accessibility Plugin](./community/specialized/accessibility.md) - Reader accessibility

#### Integration Plugins
- [Git Plugin](./community/integration/git.md) - Version control integration
- [Publishing Plugin](./community/integration/publishing.md) - Publishing workflows
- [Analytics Plugin](./community/integration/analytics.md) - Story analytics

## Plugin Development

Learn how to create your own Story Linter plugins:

- [Getting Started](./development/getting-started.md) - Quick start guide
- [Plugin Structure](./development/plugin-structure.md) - Architecture and APIs
- [Testing Plugins](./development/testing-plugins.md) - Testing strategies
- [Best Practices](./development/best-practices.md) - Development guidelines
- [Distribution](./development/distribution.md) - Publishing and sharing

## Quick Start

### Installing a Plugin

```bash
npm install @story-linter/plugin-character-consistency
```

### Configuring a Plugin

```yaml
# .story-linter.yml
plugins:
  character-consistency:
    enabled: true
    evolution:
      track: true
```

### Creating a Plugin

```typescript
import { StoryLinterPlugin } from '@story-linter/core';

export default {
  name: 'my-plugin',
  version: '1.0.0',
  validators: [MyValidator],
  patterns: [MyPattern]
} satisfies StoryLinterPlugin;
```

## Plugin Ecosystem

The Story Linter plugin ecosystem is designed to:

1. **Enable Innovation** - Anyone can extend Story Linter's capabilities
2. **Support Specialization** - Genre and domain-specific validation
3. **Encourage Sharing** - Community-driven plugin development
4. **Maintain Quality** - Consistent APIs and testing standards
5. **Foster Integration** - Connect with existing tools and workflows

## Contributing

We welcome plugin contributions! See our [development guide](./development/getting-started.md) to get started.

### Plugin Ideas

Looking for plugin ideas? Check our [ideas backlog](https://github.com/story-linter/plugins/issues?q=is%3Aissue+is%3Aopen+label%3Aidea) or suggest your own!

## Resources

- [Plugin API Reference](https://docs.story-linter.com/api/plugins)
- [Example Plugins](https://github.com/story-linter/example-plugins)
- [Plugin Registry](https://plugins.story-linter.com)
- [Community Forum](https://community.story-linter.com)

## License

Story Linter plugins follow the same MIT license as the core project unless otherwise specified.
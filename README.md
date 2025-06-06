<p align="center">
  <img src="./assets/logo.jpg" alt="Story Linter Logo" width="100%" />
</p>

# Story Linter

> Modular validation engine for narrative consistency in longform fiction. TypeScript for stories.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

## Overview

Story Linter helps fiction writers maintain consistency across complex narratives by automatically validating:

- **Character Consistency** - Names, traits, and evolution
- **Timeline Validation** - Chronological accuracy
- **Plot Threads** - Tracking story arcs
- **World Building** - Location and setting consistency
- **Dialogue Patterns** - Character voice consistency

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/story-linter/story-linter.git
cd story-linter

# Install dependencies
make install

# Run validation on your stories
LINT_DIR=/path/to/your/stories make lint
```

### Using Node.js

```bash
# Install globally
npm install -g @story-linter/cli

# Run validation
story-linter validate /path/to/your/stories
```

## Features

- 📦 **Plugin Architecture** - Extensible validation system
- 🎯 **Smart Defaults** - Works out of the box
- 🔧 **Configurable** - Customize rules via `.story-linter.yml`
- 📊 **Multiple Output Formats** - Text, JSON, HTML
- 🚀 **Fast** - Validates hundreds of files in seconds
- 🐳 **Docker Support** - No local dependencies needed

## Project Structure

This is a monorepo containing:

- `@story-linter/core` - Core validation framework
- `@story-linter/cli` - Command-line interface
- `@story-linter/plugin-*` - Validation plugins

## Development

```bash
# Start development mode
make dev

# Run tests
make test

# Open shell in container
make shell
```

## Configuration

Create a `.story-linter.yml` in your project:

```yaml
validators:
  character:
    enabled: true
    checkEvolution: true
  timeline:
    enabled: true
    strictMode: false
```

## Roadmap

- [x] MVP - Basic validation framework
- [ ] Schema extraction from existing stories
- [ ] Real-time validation with watch mode
- [ ] VS Code extension
- [ ] AI-powered pattern learning

See [docs/roadmap](docs/roadmap/) for detailed plans.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © Story Linter Team

## Acknowledgments

Built to replace GitScrolls validators with a more robust, extensible framework.
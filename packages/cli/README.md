# @story-linter/cli

Command-line interface for Story Linter - validate narrative consistency from your terminal.

## Overview

The CLI package provides a powerful command-line interface for Story Linter, enabling writers and developers to:
- Validate narrative files from the command line
- Watch files for real-time validation
- Generate validation reports in multiple formats
- Integrate with CI/CD pipelines

## Installation

```bash
# Global installation
npm install -g @story-linter/cli

# Or as a dev dependency
npm install --save-dev @story-linter/cli
```

## Usage

### Basic Validation

```bash
# Validate a single file
story-lint validate chapter1.md

# Validate a directory
story-lint validate ./chapters

# Validate with specific config
story-lint validate --config .story-linter.yml ./stories
```

### Watch Mode

```bash
# Watch for changes and validate automatically
story-lint watch ./chapters

# Watch with specific validators
story-lint watch --validators character,timeline ./stories
```

### Output Formats

```bash
# Default text output
story-lint validate ./stories

# JSON output for tooling
story-lint validate --format json ./stories

# HTML report
story-lint validate --format html --output report.html ./stories
```

## Command Reference

### `validate`
Validates narrative files for consistency issues.

Options:
- `--config, -c`: Path to configuration file (default: `.story-linter.yml`)
- `--format, -f`: Output format: text, json, html (default: text)
- `--output, -o`: Output file path (default: stdout)
- `--validators`: Comma-separated list of validators to run
- `--quiet, -q`: Only output errors, no warnings

### `watch`
Watches files for changes and validates automatically.

Options:
- Same as `validate` command
- `--debounce`: Debounce delay in milliseconds (default: 500)

### `init`
Initialize a new Story Linter configuration.

```bash
story-lint init
```

## Architecture

The CLI package is built with:
- **Commander.js** for command parsing
- **Chalk** for colored output (through ColorAdapter)
- **Modular design** with separate command handlers
- **Multiple output formatters** (text, JSON, HTML)

### Key Components

- **CLI Factory**: Creates and configures the CLI instance
- **Command Handler**: Processes commands and coordinates execution
- **Validation Runner**: Executes validation using core framework
- **Output Formatter**: Formats results for different output types
- **Color Adapter**: Abstraction for terminal colors

## Configuration

The CLI respects `.story-linter.yml` configuration files:

```yaml
# .story-linter.yml
validators:
  character: true
  timeline: true
  plot-consistency: false

rules:
  character:
    trackAliases: true
    caseSensitive: false

output:
  format: text
  showWarnings: true
```

## Integration

### NPM Scripts

```json
{
  "scripts": {
    "lint:stories": "story-lint validate ./stories",
    "lint:stories:watch": "story-lint watch ./stories"
  }
}
```

### CI/CD Integration

```yaml
# GitHub Actions
- name: Validate Stories
  run: npx story-lint validate --format json ./stories
```

## Development

The CLI package follows the same development standards as core:
- Test-Driven Development (TDD)
- Dependency injection for all components
- Comprehensive test coverage

## Error Codes

The CLI uses standard exit codes:
- `0`: Success, no validation errors
- `1`: Validation errors found
- `2`: Configuration or runtime error

## License

MIT
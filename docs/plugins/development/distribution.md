# Plugin Distribution

## Overview

This guide covers how to package, publish, and distribute your Story Linter plugin to users, including npm publishing, version management, and marketing strategies.

## Preparing for Distribution

### Package Structure

Ensure your package is properly structured:

```
my-plugin/
├── dist/                 # Compiled JavaScript (git-ignored)
├── src/                  # TypeScript source
├── package.json         # Package metadata
├── README.md           # User documentation
├── LICENSE             # License file
├── CHANGELOG.md       # Version history
├── .npmignore         # Files to exclude from npm
└── .gitignore         # Files to exclude from git
```

### Package.json Configuration

Complete package.json setup:

```json
{
  "name": "@story-linter/plugin-my-feature",
  "version": "1.0.0",
  "description": "A Story Linter plugin for validating X",
  "keywords": [
    "story-linter",
    "story-linter-plugin",
    "validation",
    "writing",
    "narrative"
  ],
  "homepage": "https://github.com/username/my-plugin#readme",
  "bugs": {
    "url": "https://github.com/username/my-plugin/issues"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/username/my-plugin.git"
  },
  "license": "MIT",
  "author": {
    "name": "Your Name",
    "email": "you@example.com",
    "url": "https://yourwebsite.com"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "prepublishOnly": "npm run test && npm run build",
    "prepare": "npm run build"
  },
  "peerDependencies": {
    "@story-linter/plugin-api": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "jest": "^29.0.0"
  },
  "engines": {
    "node": ">=14.0.0"
  },
  "story-linter": {
    "type": "plugin",
    "displayName": "My Feature Plugin",
    "category": "validation"
  }
}
```

### Build Process

Set up reliable build process:

```bash
# Clean build script
#!/bin/bash
rm -rf dist
npm run lint
npm run test
npm run build
npm pack --dry-run  # Check what will be published
```

## Publishing to NPM

### Initial Setup

1. Create npm account:
```bash
npm adduser
```

2. Configure npm scope (if using):
```bash
npm config set @story-linter:registry https://registry.npmjs.org/
```

3. Enable 2FA for security:
```bash
npm profile enable-2fa auth-and-writes
```

### Publishing Process

```bash
# 1. Update version
npm version patch  # or minor/major

# 2. Review changes
git diff HEAD~1

# 3. Publish to npm
npm publish --access public

# 4. Push tags to GitHub
git push origin main --tags
```

### Automated Publishing

GitHub Actions workflow:

```yaml
# .github/workflows/publish.yml
name: Publish to NPM
on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          registry-url: 'https://registry.npmjs.org'
      
      - run: npm ci
      - run: npm test
      - run: npm run build
      
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Version Management

### Semantic Versioning

Follow semantic versioning strictly:

```bash
# Bug fixes (1.0.0 → 1.0.1)
npm version patch

# New features (1.0.0 → 1.1.0)
npm version minor

# Breaking changes (1.0.0 → 2.0.0)
npm version major

# Pre-releases
npm version prerelease --preid=beta
# Results in: 1.0.0-beta.0
```

### Changelog Management

Maintain detailed changelog:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2024-01-15
### Added
- New validation rule for checking X
- Configuration option for Y
- Support for Story Linter v2.0

### Changed
- Improved performance of rule Z by 50%
- Updated error messages for clarity

### Fixed
- Memory leak when processing large files
- Incorrect line numbers in error reports

### Security
- Updated dependencies to patch vulnerabilities

## [1.1.0] - 2024-01-01
### Added
- Initial feature set
```

### Automated Changelog

Use conventional commits:

```bash
# Install standard-version
npm install --save-dev standard-version

# Add to package.json
{
  "scripts": {
    "release": "standard-version"
  }
}

# Commit messages
feat: add new validation rule
fix: correct line number calculation
docs: update configuration examples
chore: update dependencies
BREAKING CHANGE: change API signature
```

## Distribution Channels

### NPM Registry

Primary distribution method:

```bash
# Publish to NPM
npm publish

# View package info
npm info @story-linter/plugin-my-feature

# Check downloads
npm-stat @story-linter/plugin-my-feature
```

### GitHub Releases

Create GitHub releases:

```bash
# Create release with GitHub CLI
gh release create v1.2.0 \
  --title "v1.2.0 - Performance Improvements" \
  --notes "See CHANGELOG.md for details" \
  --target main
```

### Plugin Registry

Register with Story Linter:

```json
// Submit to story-linter-plugins.json
{
  "name": "@story-linter/plugin-my-feature",
  "description": "Validates X in narratives",
  "category": "validation",
  "author": "Your Name",
  "stars": 45,
  "downloads": 1200,
  "verified": true
}
```

## Marketing and Promotion

### Documentation Site

Create comprehensive docs:

```markdown
# Documentation Structure
docs/
├── getting-started.md
├── configuration.md
├── rules/
│   ├── RULE001.md
│   └── RULE002.md
├── examples/
│   ├── basic.md
│   └── advanced.md
└── api-reference.md
```

### README Template

Compelling README structure:

```markdown
# 🚀 Story Linter Plugin: My Feature

> One-line description that explains the value

[![npm version](https://badge.fury.io/js/@story-linter%2Fplugin-my-feature.svg)](https://www.npmjs.com/package/@story-linter/plugin-my-feature)
[![CI](https://github.com/username/my-plugin/workflows/CI/badge.svg)](https://github.com/username/my-plugin/actions)
[![Coverage](https://codecov.io/gh/username/my-plugin/branch/main/graph/badge.svg)](https://codecov.io/gh/username/my-plugin)

## ✨ Features

- 🎯 **Feature 1**: Brief description
- 🔍 **Feature 2**: Brief description
- ⚡ **Feature 3**: Brief description

## 📦 Installation

\```bash
npm install --save-dev @story-linter/plugin-my-feature
\```

## 🔧 Configuration

\```yaml
plugins:
  my-feature:
    enabled: true
    option: value
\```

## 📚 Examples

[Show compelling examples]

## 🤝 Contributing

[Contributing guidelines]

## 📄 License

MIT © [Your Name]
```

### Community Engagement

Build awareness:

1. **Blog Posts** - Write about your plugin
2. **Social Media** - Share on Twitter/Reddit
3. **Forums** - Post in writing communities
4. **Discord** - Share in Story Linter Discord
5. **Examples** - Create example repositories

## Maintenance

### Dependency Updates

Keep dependencies current:

```json
// package.json
{
  "scripts": {
    "update-deps": "npm-check-updates -u",
    "audit": "npm audit fix"
  }
}
```

### Security Monitoring

Set up security alerts:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 10
```

### User Support

Establish support channels:

1. **Issue Templates** - Bug reports, feature requests
2. **Discussions** - GitHub Discussions for Q&A
3. **Discord Channel** - Real-time support
4. **Email List** - Updates and announcements

## Metrics and Analytics

### Tracking Usage

Monitor plugin adoption:

```javascript
// Optional telemetry (with user consent)
class AnalyticsPlugin {
  async initialize(context: PluginContext): Promise<void> {
    if (context.telemetryEnabled) {
      await this.trackUsage({
        version: this.version,
        rules: this.enabledRules.length
      });
    }
  }
}
```

### NPM Statistics

Track download metrics:

```bash
# Check weekly downloads
npm-stat @story-linter/plugin-my-feature

# View package analytics
npm view @story-linter/plugin-my-feature
```

## License Considerations

### Choosing a License

Common open source licenses:

1. **MIT** - Permissive, simple
2. **Apache 2.0** - Patent protection
3. **GPL v3** - Copyleft
4. **ISC** - Simplified MIT

### License File

Include clear license:

```
MIT License

Copyright (c) 2024 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

## Deprecation Strategy

### Graceful Deprecation

When deprecating features:

```typescript
/**
 * @deprecated Use `newMethod` instead. Will be removed in v3.0.0
 */
export function oldMethod(): void {
  console.warn('oldMethod is deprecated. Use newMethod instead.');
  return newMethod();
}
```

### Migration Guides

Provide clear migration paths:

```markdown
# Migrating from v1.x to v2.0

## Breaking Changes

### Rule IDs Changed
- `OLD001` → `NEW001`
- `OLD002` → `NEW002`

### Configuration Format
```yaml
# Old (v1.x)
rules:
  - OLD001

# New (v2.0)
plugins:
  my-feature:
    rules:
      NEW001: true
```

## Update Steps
1. Update plugin version
2. Update configuration
3. Run with `--migrate` flag
```

## Next Steps

- Set up [CI/CD pipeline](https://docs.story-linter.com/ci-cd)
- Join [Plugin Authors group](https://discord.gg/story-linter-authors)
- List plugin in [Official Registry](https://plugins.story-linter.com)
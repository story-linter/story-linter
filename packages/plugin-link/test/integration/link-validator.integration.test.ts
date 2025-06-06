import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ValidationFramework } from '@story-linter/core';
import { LinkValidator } from '../../src/link-validator';

describe('LinkValidator Integration Tests', () => {
  let tempDir: string;
  let framework: ValidationFramework;
  
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'link-validator-test-'));
    framework = new ValidationFramework();
    framework.use(new LinkValidator());
  });
  
  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
    await framework.destroy();
  });
  
  it('should validate a well-connected documentation structure', async () => {
    // Arrange - Create interconnected docs
    await writeFile(join(tempDir, 'README.md'), `---
title: Story Linter Documentation
---

# Story Linter

Welcome to the Story Linter documentation!

## Contents

- [Getting Started](./docs/getting-started.md)
- [Configuration](./docs/configuration.md)
- [API Reference](./docs/api/index.md)

## External Resources

- [GitHub Repository](https://github.com/story-linter/story-linter)
- [NPM Package](https://npmjs.com/package/@story-linter/core)
`);
    
    await mkdir(join(tempDir, 'docs'), { recursive: true });
    await mkdir(join(tempDir, 'docs', 'api'), { recursive: true });
    
    await writeFile(join(tempDir, 'docs', 'getting-started.md'), `---
title: Getting Started
---

# Getting Started

Welcome! Let's get you started with Story Linter.

First, check out the [configuration guide](./configuration.md).

[Back to home](../README.md)
`);
    
    await writeFile(join(tempDir, 'docs', 'configuration.md'), `---
title: Configuration Guide
---

# Configuration

Story Linter is highly configurable.

See also:
- [Getting Started](./getting-started.md)
- [API Documentation](./api/index.md)
- [Home](../README.md)
`);
    
    await writeFile(join(tempDir, 'docs', 'api', 'index.md'), `---
title: API Reference
---

# API Reference

Full API documentation for Story Linter.

[Back to docs](../configuration.md)
[Back to home](../../README.md)
`);
    
    // Create config
    await writeFile(join(tempDir, '.story-linter.yml'), `
validators:
  link-graph:
    enabled: true
    checkOrphans: true
    entryPoints: ["README.md"]
`);
    
    // Act
    const result = await framework.validate({
      config: tempDir
    });
    
    // Assert
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    
    // Should detect bidirectional links as info
    const bidirectionalInfo = result.info.filter(i => i.code.includes('LINK003'));
    expect(bidirectionalInfo.length).toBeGreaterThan(0);
  });
  
  it('should detect broken links and orphaned documents', async () => {
    // Arrange
    await writeFile(join(tempDir, 'index.md'), `---
title: Main Index
---

# Documentation

- [Chapter 1](./chapter1.md)
- [Missing Chapter](./chapter99.md)
- [External Link](https://example.com)
`);
    
    await writeFile(join(tempDir, 'chapter1.md'), `---
title: Chapter 1
---

# Chapter 1

This chapter links to [Chapter 2](./chapter2.md).
`);
    
    await writeFile(join(tempDir, 'chapter2.md'), `---
title: Chapter 2  
---

# Chapter 2

Back to [Chapter 1](./chapter1.md).
`);
    
    await writeFile(join(tempDir, 'orphaned.md'), `---
title: Orphaned Page
---

# This Page is Orphaned

No other pages link here.
`);
    
    // Act
    const result = await framework.validate({
      files: [
        join(tempDir, 'index.md'),
        join(tempDir, 'chapter1.md'),
        join(tempDir, 'chapter2.md'),
        join(tempDir, 'orphaned.md')
      ],
      config: tempDir
    });
    
    // Assert
    expect(result.valid).toBe(false);
    
    // Should have 1 broken link error (chapter99.md)
    const brokenLinks = result.errors.filter(e => e.code.includes('LINK001'));
    expect(brokenLinks).toHaveLength(1);
    expect(brokenLinks[0].message).toContain('chapter99.md');
    
    // Should have 1 orphan warning (orphaned.md)
    const orphans = result.warnings.filter(w => w.code.includes('LINK002'));
    expect(orphans).toHaveLength(1);
    expect(orphans[0].file).toContain('orphaned.md');
  });
  
  it('should handle complex relative paths', async () => {
    // Arrange - Create nested structure
    await mkdir(join(tempDir, 'book'), { recursive: true });
    await mkdir(join(tempDir, 'book', 'part1'), { recursive: true });
    await mkdir(join(tempDir, 'book', 'part2'), { recursive: true });
    
    await writeFile(join(tempDir, 'book', 'README.md'), `
# Book

- [Part 1](./part1/index.md)
- [Part 2](./part2/index.md)
`);
    
    await writeFile(join(tempDir, 'book', 'part1', 'index.md'), `
# Part 1

- [Chapter 1](./chapter1.md)
- [Part 2 Chapter 1](../part2/chapter1.md)
- [Back to Book](../README.md)
`);
    
    await writeFile(join(tempDir, 'book', 'part1', 'chapter1.md'), `
# Chapter 1

Content here. [Back to Part 1](./)
`);
    
    await writeFile(join(tempDir, 'book', 'part2', 'index.md'), `
# Part 2

- [Chapter 1](./chapter1.md)
- [Part 1 Chapter 1](../part1/chapter1.md)
`);
    
    await writeFile(join(tempDir, 'book', 'part2', 'chapter1.md'), `
# Part 2, Chapter 1

Cross-reference to [Part 1](../part1/).
`);
    
    // Act
    const result = await framework.validate({
      config: join(tempDir, 'book')
    });
    
    // Assert
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
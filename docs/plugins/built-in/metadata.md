# Metadata Plugin

**Package**: `@story-linter/plugin-metadata`

## Overview

The Metadata Plugin manages and validates story metadata including front matter, tags, categories, word counts, reading time estimates, and structural information. It ensures consistent metadata across your narrative project.

## Features

### Core Features
- **Front matter validation** - Checks YAML/TOML front matter
- **Word count tracking** - Monitors chapter and total lengths
- **Reading time estimation** - Calculates read times
- **Tag consistency** - Validates and enforces tag taxonomy
- **Chapter numbering** - Ensures proper sequence
- **Version tracking** - Manages revision information
- **Publishing metadata** - Tracks publication-ready information

## Configuration

```yaml
plugins:
  metadata:
    enabled: true
    frontMatter:
      required: true
      format: "yaml"  # yaml, toml, json
      schema: "strict"
    wordCount:
      track: true
      targets:
        chapter: [2000, 5000]
        total: [80000, 120000]
    structure:
      enforceNumbering: true
      requireTitles: true
      validateHierarchy: true
    tags:
      taxonomy: "hierarchical"
      required: ["genre", "status"]
      maxPerFile: 10
    publishing:
      trackDrafts: true
      requireSummary: true
      validateISBN: true
```

### Configuration Options

#### `frontMatter`
- `required` (boolean): Require front matter in files
- `format` (string): Expected format type
- `schema` (string): Validation strictness

#### `wordCount`
- `track` (boolean): Monitor word counts
- `targets` (object): Min/max ranges for chapters/total

#### `structure`
- `enforceNumbering` (boolean): Require consistent numbering
- `requireTitles` (boolean): Mandate chapter titles
- `validateHierarchy` (boolean): Check nesting levels

#### `tags`
- `taxonomy` (string): flat/hierarchical tag structure
- `required` (array): Mandatory tag categories
- `maxPerFile` (number): Tag limit per file

#### `publishing`
- `trackDrafts` (boolean): Monitor draft status
- `requireSummary` (boolean): Mandate summaries
- `validateISBN` (boolean): Check ISBN format

## Validation Rules

### Missing Required Metadata (META001)
Identifies missing mandatory front matter fields.

**Example Issue:**
```markdown
---
title: Chapter One
---
// Error: Missing required 'author' and 'date' fields
```

### Invalid Front Matter (META002)
Detects malformed metadata syntax.

**Example Issue:**
```yaml
---
title: Chapter One
tags: [fiction, incomplete tag
---
// Error: Invalid YAML syntax
```

### Word Count Violation (META003)
Flags chapters outside target length.

**Example Issue:**
```markdown
Chapter word count: 500
// Warning: Below minimum target of 2000 words
```

### Inconsistent Numbering (META004)
Detects sequence breaks in chapters.

**Example Issue:**
```
chapter-01.md
chapter-02.md
chapter-04.md  // Error: Missing chapter-03
```

### Tag Taxonomy Violation (META005)
Ensures tags follow defined hierarchy.

**Example Issue:**
```yaml
tags:
  - fiction/fantasy/urban  # Valid
  - mystery/cozy/cats      # Error: 'cats' not in taxonomy
```

## Schema Integration

The plugin builds a comprehensive metadata index:

```json
{
  "metadata": {
    "project": {
      "title": "The Last Chronicle",
      "author": "Jane Smith",
      "created": "2023-01-15",
      "modified": "2023-12-01",
      "version": "2.1.0",
      "wordCount": 95000
    },
    "chapters": {
      "chapter-01": {
        "title": "The Beginning",
        "wordCount": 3500,
        "readingTime": "14 minutes",
        "tags": ["introduction", "worldbuilding"],
        "status": "final"
      }
    },
    "taxonomy": {
      "genre": ["fantasy", "mystery"],
      "themes": ["redemption", "sacrifice"],
      "status": ["draft", "review", "final"]
    }
  }
}
```

## Advanced Features

### Custom Metadata Fields

Define project-specific metadata:

```yaml
customFields:
  - name: "soundtrack"
    type: "url"
    required: false
  - name: "illustrator"
    type: "string"
    required: true
  - name: "sensitivity"
    type: "array"
    values: ["violence", "language"]
```

### Reading Statistics

Track detailed statistics:

```yaml
statistics:
  track: true
  metrics:
    - readingTime
    - complexity
    - dialogueRatio
    - sentenceVariety
  export: "json"
```

### Version Control Integration

Link with version control:

```yaml
versionControl:
  track: true
  linkCommits: true
  tagReleases: true
  changelogGeneration: true
```

## Best Practices

1. **Define metadata schema** early in project
2. **Use consistent tag taxonomy** across files
3. **Track word counts** for pacing
4. **Version your work** systematically
5. **Include publishing metadata** from start

## Common Issues and Solutions

### Issue: Legacy files without metadata
**Solution**: Batch add metadata
```yaml
migration:
  addDefaults: true
  inferFromFilename: true
  promptMissing: true
```

### Issue: Multi-format projects
**Solution**: Format-specific schemas
```yaml
formats:
  markdown:
    frontMatter: "yaml"
  notebook:
    frontMatter: "json"
  screenplay:
    frontMatter: "custom"
```

### Issue: Series metadata
**Solution**: Hierarchical metadata
```yaml
series:
  enableSeriesMetadata: true
  inheritance: true
  overrides: ["wordCount", "tags"]
```

## Performance Considerations

- **Metadata caching**: Caches parsed metadata
- **Incremental updates**: Only reprocesses changes
- **Lazy validation**: Validates on demand

## Future Enhancements

1. **Automatic metadata extraction**
2. **Publishing platform integration**
3. **Reading analytics dashboard**
4. **Metadata inheritance system**
5. **Smart tagging suggestions**
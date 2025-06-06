# @story-linter/plugin-link

Link reference validator for Story Linter - maintain consistent cross-references and relationships in your narrative.

## Overview

The link validator plugin ensures the integrity of references and relationships within your narrative:
- Validates internal story links and cross-references
- Tracks relationships between story elements
- Detects broken or orphaned references
- Maintains link graph consistency
- Supports multiple link types (characters, locations, events, etc.)

## Installation

```bash
npm install @story-linter/plugin-link
```

## Features

### Reference Validation
- Validates all internal links point to existing content
- Detects broken references to characters, locations, or events
- Identifies orphaned content with no incoming links
- Supports Markdown link syntax and custom reference formats

### Link Graph Analysis
- Builds a comprehensive graph of story connections
- Analyzes relationship patterns
- Detects circular dependencies
- Identifies isolated story elements

### Multi-format Support
- Markdown links: `[Chapter 2](chapter2.md)`
- Reference tags: `@character:John` or `@location:Paris`
- Custom patterns via configuration

## Configuration

Add to your `.story-linter.yml`:

```yaml
validators:
  link: true

rules:
  link:
    # Validate Markdown links
    validateMarkdownLinks: true
    
    # Check custom reference patterns
    validateReferences: true
    
    # Reference patterns to track
    referencePatterns:
      - pattern: "@character:([A-Za-z]+)"
        type: "character"
      - pattern: "@location:([A-Za-z]+)"
        type: "location"
      - pattern: "@event:([A-Za-z]+)"
        type: "event"
    
    # Report orphaned content
    reportOrphans: true
    
    # Minimum link depth for warnings
    minLinkDepth: 1
```

## Usage

### With CLI

```bash
# Run link validation
story-lint validate --validators link ./stories

# Export link graph
story-lint validate --validators link --export-graph links.json ./stories
```

### Programmatic Usage

```typescript
import { LinkValidator } from '@story-linter/plugin-link';
import { ValidationContext } from '@story-linter/core';

const validator = new LinkValidator({
  validateMarkdownLinks: true,
  validateReferences: true
});

const result = await validator.validate(context);
```

## Validation Rules

### Markdown Links
```markdown
<!-- ❌ Broken link -->
See [Chapter 5](chapter5.md) for more details.
<!-- Error: chapter5.md does not exist -->

<!-- ✅ Valid link -->
See [Chapter 2](chapter2.md) for more details.
<!-- chapter2.md exists -->
```

### Reference Tags
```markdown
<!-- ❌ Invalid reference -->
@character:JohnDoe appeared at @location:Atlantis.
<!-- Error: Character "JohnDoe" not found -->

<!-- ✅ Valid references -->
@character:John appeared at @location:Paris.
<!-- Both references exist in the story -->
```

### Cross-file References
```markdown
<!-- file: chapter1.md -->
The artifact found in @location:Cave would prove important later.

<!-- file: chapter3.md -->
<!-- ✅ Valid back-reference -->
Returning to @location:Cave, they remembered the artifact.
```

## Output Examples

### Text Output
```
Link Validation Results:
  
  ❌ Broken link found:
     - File: chapter3.md, Line: 45
     - Link: [Chapter 5](chapter5.md)
     - Error: Target file not found
  
  ⚠️  Orphaned content detected:
     - File: appendix.md
     - No incoming links from other files
  
  ℹ️  Link Statistics:
     - Total links: 127
     - Valid links: 124
     - Broken links: 3
     - Orphaned files: 2
```

### JSON Output
```json
{
  "validator": "link",
  "results": {
    "errors": [{
      "type": "broken-link",
      "source": {
        "file": "chapter3.md",
        "line": 45
      },
      "target": "chapter5.md",
      "linkText": "Chapter 5",
      "reason": "File not found"
    }],
    "warnings": [{
      "type": "orphaned-content",
      "file": "appendix.md",
      "incomingLinks": 0
    }],
    "statistics": {
      "totalLinks": 127,
      "validLinks": 124,
      "brokenLinks": 3
    }
  }
}
```

## Advanced Features

### Link Graph Export
Generate a complete graph of story connections:

```bash
story-lint validate --validators link --export-graph story-graph.json
```

Output format:
```json
{
  "nodes": [
    { "id": "chapter1.md", "type": "file", "title": "Chapter 1" },
    { "id": "John", "type": "character" }
  ],
  "edges": [
    { "source": "chapter1.md", "target": "John", "type": "reference" }
  ]
}
```

### Custom Link Types
Define custom link types for your narrative:

```yaml
rules:
  link:
    customLinkTypes:
      - name: "foreshadowing"
        pattern: "\\[foreshadow:(.+?)\\]"
      - name: "callback"
        pattern: "\\[callback:(.+?)\\]"
```

### Circular Dependency Detection
Identifies circular references that might indicate plot issues:

```
⚠️  Circular dependency detected:
   chapter1.md → chapter3.md → chapter5.md → chapter1.md
```

## Integration with Other Validators

The link validator enhances other Story Linter validators:
- **Character Validator**: Ensures character references are valid
- **Timeline Validator**: Validates temporal references
- **Plot Validator**: Checks plot point connections

## Performance

- Builds link graph incrementally
- Caches validated links for faster subsequent runs
- Efficient graph traversal algorithms

## Visualization

Link validation results can be visualized using compatible tools:
- Export to GraphViz format
- Compatible with D3.js visualization
- Integrates with VS Code's graph preview

## License

MIT
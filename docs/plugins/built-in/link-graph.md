# Link Graph Validator

**Package**: `@story-linter/plugin-link`

## Overview

The Link Graph Validator ensures all internal links in your narrative are valid and detects orphaned documents that aren't reachable from any entry point. It builds a complete graph of your document structure for comprehensive validation.

## Features

- **Broken link detection** - Finds links pointing to non-existent files
- **Relative path resolution** - Correctly handles `./`, `../`, and nested paths
- **Orphan detection** - Identifies unreachable documents
- **Bidirectional link tracking** - Notes when documents link to each other
- **External link filtering** - Skips http(s) links
- **Anchor link handling** - Ignores in-page anchors

## Configuration

```yaml
plugins:
  link-graph:
    enabled: true
    checkOrphans: true
    entryPoints: 
      - "README.md"
      - "index.md"
      - "SUMMARY.md"
    skipExternal: true
    skipAnchors: true
```

### Configuration Options

- `checkOrphans` (boolean): Enable orphaned document detection
- `entryPoints` (string[]): Files to use as roots for orphan detection
- `skipExternal` (boolean): Skip validation of external URLs
- `skipAnchors` (boolean): Skip validation of anchor links (#section)

## Validation Rules

### Broken Link Detection (LINK001)

**Severity**: Error

Detects when a markdown link points to a file that doesn't exist.

**Example**:
```markdown
See [Chapter 2](./chapter2.md) for more details.
<!-- Error if chapter2.md doesn't exist -->
```

**Fix**: Either create the missing file or correct the link path.

### Orphaned Document (LINK002)

**Severity**: Warning

Identifies files that can't be reached by following links from any entry point.

**Example**:
```
project/
├── README.md (links to chapter1.md)
├── chapter1.md (links to chapter2.md)
├── chapter2.md
└── orphaned.md  <!-- Warning: not linked from anywhere -->
```

**Fix**: Add a link to the orphaned document from a reachable file.

### Bidirectional Links (LINK003)

**Severity**: Info

Notes when two documents link to each other, which often indicates good navigation.

**Example**:
```markdown
<!-- In chapter1.md -->
Next: [Chapter 2](./chapter2.md)

<!-- In chapter2.md -->
Previous: [Chapter 1](./chapter1.md)
```

## How It Works

### Three-Phase Validation

1. **Graph Building**: Creates nodes for all markdown files
2. **Link Processing**: Validates each link and builds edges
3. **Orphan Detection**: Uses BFS from entry points to find unreachable files

### Path Resolution

The validator correctly resolves relative paths from the source file's directory:

```
/project/docs/guide.md
  Link: ../README.md
  Resolves to: /project/README.md
```

### Entry Points

By default, these files are considered entry points:
- README.md
- index.md
- SUMMARY.md (common in mdBook projects)

You can customize this list in configuration.

## Best Practices

1. **Maintain a clear hierarchy** - Link from index/README files
2. **Use relative paths** - More portable than absolute paths
3. **Create bidirectional navigation** - Previous/Next links
4. **Regular validation** - Run in CI to catch broken links early

## Examples

### Book/Documentation Structure
```yaml
plugins:
  link-graph:
    entryPoints: ["SUMMARY.md"]  # mdBook style
```

### Story/Novel Structure
```yaml
plugins:
  link-graph:
    entryPoints: 
      - "index.md"
      - "characters/index.md"  # Character reference
      - "world/index.md"       # World building docs
```

### Disable Orphan Checking
```yaml
plugins:
  link-graph:
    checkOrphans: false  # Only check for broken links
```

## Performance

- **Efficient graph building** - O(n) for nodes, O(m) for edges
- **Smart path caching** - Resolved paths are cached
- **Incremental validation** - Only changed files are reprocessed

## Limitations

- Only validates markdown links, not HTML
- Doesn't check if anchors exist in target files
- External URLs aren't verified (by design)
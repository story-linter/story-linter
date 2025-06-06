# @story-linter/plugin-character

Character consistency validator for Story Linter - ensure your characters remain consistent throughout your narrative.

## Overview

The character validator plugin helps maintain character consistency by:
- Tracking character names and aliases across your narrative
- Detecting inconsistent character descriptions
- Identifying character name variations and potential typos
- Monitoring character attribute changes
- Validating character relationships

## Installation

```bash
npm install @story-linter/plugin-character
```

## Features

### Name Consistency
- Detects variations in character names (e.g., "John", "Jon", "Johnny")
- Tracks nicknames and aliases
- Identifies potential typos in character names
- Supports case-sensitive and case-insensitive matching

### Description Tracking
- Monitors physical descriptions for inconsistencies
- Tracks character attributes (age, occupation, etc.)
- Detects conflicting character information

### Relationship Validation
- Validates character relationships remain consistent
- Tracks family connections and social relationships
- Identifies relationship conflicts

## Configuration

Add to your `.story-linter.yml`:

```yaml
validators:
  character: true

rules:
  character:
    # Track character aliases and nicknames
    trackAliases: true
    
    # Case sensitivity for name matching
    caseSensitive: false
    
    # Minimum similarity score for typo detection (0-1)
    typoThreshold: 0.8
    
    # Track character descriptions
    trackDescriptions: true
    
    # Validate relationships
    validateRelationships: true
```

## Usage

### With CLI

```bash
# Run character validation
story-lint validate --validators character ./stories

# Watch mode with character validation
story-lint watch --validators character ./stories
```

### Programmatic Usage

```typescript
import { CharacterValidator } from '@story-linter/plugin-character';
import { ValidationContext } from '@story-linter/core';

const validator = new CharacterValidator({
  trackAliases: true,
  caseSensitive: false
});

const result = await validator.validate(context);
```

## Validation Rules

### Character Name Consistency
```markdown
<!-- ❌ Inconsistent -->
Chapter 1: Sarah walked into the room.
Chapter 2: Sara looked out the window.

<!-- ✅ Consistent -->
Chapter 1: Sarah walked into the room.
Chapter 2: Sarah looked out the window.
```

### Character Descriptions
```markdown
<!-- ❌ Conflicting descriptions -->
Chapter 1: John's blue eyes sparkled.
Chapter 3: John's brown eyes narrowed.

<!-- ✅ Consistent descriptions -->
Chapter 1: John's blue eyes sparkled.
Chapter 3: John's blue eyes narrowed.
```

### Character Aliases
```markdown
<!-- ✅ Properly tracked aliases -->
Chapter 1: Elizabeth, or Liz as her friends called her...
Chapter 2: Liz opened the door. <!-- Recognized as Elizabeth -->
```

## Output Examples

### Text Output
```
Character Validation Results:
  
  ❌ Character name inconsistency:
     - "Sarah" (chapters 1, 3, 5)
     - "Sara" (chapter 2)
     Consider using consistent spelling.
  
  ⚠️  Possible character description conflict:
     - Chapter 1: "blue eyes"
     - Chapter 7: "green eyes"
     Character: John Smith
```

### JSON Output
```json
{
  "validator": "character",
  "results": {
    "errors": [{
      "type": "name-inconsistency",
      "character": "Sarah",
      "variations": ["Sarah", "Sara"],
      "locations": [
        { "file": "chapter1.md", "line": 45 },
        { "file": "chapter2.md", "line": 12 }
      ]
    }]
  }
}
```

## Advanced Features

### Character Database Export
Export detected characters for reference:

```bash
story-lint validate --validators character --export-characters characters.json
```

### Custom Name Patterns
Support for culture-specific naming patterns and titles:

```yaml
rules:
  character:
    patterns:
      - type: "title"
        regex: "(Mr\.|Mrs\.|Dr\.|Prof\.)"
      - type: "suffix"
        regex: "(Jr\.|Sr\.|III|IV)"
```

## Integration with Other Validators

The character validator works seamlessly with other Story Linter validators:
- **Timeline Validator**: Ensures character ages progress correctly
- **Plot Validator**: Validates character actions align with their established traits
- **Link Validator**: Verifies character references are valid

## Performance

- Incremental validation support for large narratives
- Caches character data for faster subsequent runs
- Minimal memory footprint

## License

MIT
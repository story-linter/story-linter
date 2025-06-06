# Character Consistency Plugin

**Package**: `@story-linter/plugin-character-consistency`

## Overview

The Character Consistency Plugin validates character names, evolution, references, and relationships throughout a narrative. It ensures that characters remain consistent while allowing for deliberate character development and growth.

## Features

### Core Features
- **Character name consistency** - Validates consistent use of character names
- **Evolution tracking** - Monitors deliberate name changes over time
- **Reference validation** - Ensures all character references are valid
- **Relationship consistency** - Tracks and validates character relationships
- **Character introduction checking** - Verifies characters are properly introduced
- **Pronoun consistency** - Maintains consistent pronoun usage for characters
- **Character voice patterns** - Experimental feature for dialogue consistency

## Configuration

```yaml
plugins:
  character-consistency:
    enabled: true
    evolution:
      track: true
      requireExplicit: false
    references:
      checkPronouns: true
      checkNicknames: true
    voice:
      enabled: false  # Experimental
```

### Configuration Options

#### `evolution`
- `track` (boolean): Enable tracking of character name evolution
- `requireExplicit` (boolean): Require explicit markers for name changes

#### `references`
- `checkPronouns` (boolean): Validate pronoun consistency
- `checkNicknames` (boolean): Track and validate character nicknames

#### `voice`
- `enabled` (boolean): Enable experimental voice pattern checking

## Validation Rules

### Character Name Consistency (CHAR001)
Ensures character names are used consistently throughout the narrative.

**Example Issue:**
```markdown
Chapter 1: John Smith walked into the room.
Chapter 3: Jon Smith opened the door. // Error: Inconsistent spelling
```

### Character Introduction (CHAR002)
Verifies that characters are introduced before being referenced.

**Example Issue:**
```markdown
Sarah waved at Marcus. // Error: Marcus not introduced
```

### Pronoun Agreement (CHAR003)
Maintains consistent pronoun usage for each character.

**Example Issue:**
```markdown
Alex picked up her book. // Previously used "he/him" for Alex
```

### Evolution Tracking (CHAR004)
Tracks deliberate character name changes with proper context.

**Valid Evolution:**
```markdown
"From now on," she said, "call me Phoenix, not Sarah."
```

### Relationship Consistency (CHAR005)
Ensures character relationships remain consistent.

**Example Issue:**
```markdown
Chapter 1: John, Sarah's brother...
Chapter 5: John, Sarah's cousin... // Error: Relationship changed
```

## Schema Integration

The plugin can learn from your narrative patterns:

```json
{
  "characters": {
    "John Smith": {
      "aliases": ["John", "Johnny", "Mr. Smith"],
      "pronouns": "he/him",
      "relationships": {
        "Sarah Smith": "sister",
        "Marcus Chen": "friend"
      },
      "introduced": "chapter-1.md:45"
    }
  }
}
```

## Advanced Features

### Character Voice Patterns (Experimental)

When enabled, tracks speech patterns for consistency:

```yaml
voice:
  enabled: true
  patterns:
    vocabulary: true
    sentenceStructure: true
    dialectMarkers: true
```

### Nickname Management

Configure how nicknames are handled:

```yaml
references:
  checkNicknames: true
  nicknameIntroduction: "explicit" # or "implicit"
  allowedVariations: 2
```

## Best Practices

1. **Introduce characters clearly** before first reference
2. **Use consistent spelling** for character names
3. **Track name evolutions** with explicit narrative markers
4. **Document relationships** in character introductions
5. **Maintain pronoun consistency** throughout

## Common Issues and Solutions

### Issue: False positives for nicknames
**Solution**: Configure known aliases in schema
```json
{
  "characters": {
    "Elizabeth": {
      "aliases": ["Liz", "Beth", "Lizzy"]
    }
  }
}
```

### Issue: Cultural name variations
**Solution**: Use evolution tracking for context
```yaml
evolution:
  track: true
  culturalVariations: true
```

### Issue: Pronoun changes in character development
**Solution**: Mark explicit pronoun transitions
```markdown
[Character: Alex, pronouns: they/them]
```

## Performance Considerations

- **Incremental validation**: Only checks changed files
- **Caching**: Caches character database between runs
- **Smart detection**: Uses context to reduce false positives

## Future Enhancements

1. **AI-powered voice analysis** for deeper consistency
2. **Character arc tracking** beyond just names
3. **Emotional state consistency** checking
4. **Cross-file relationship mapping** visualization
5. **Character interaction frequency** analysis
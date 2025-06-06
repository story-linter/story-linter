# Character Consistency Plugin

**Package**: `@story-linter/plugin-character-consistency`

## Overview

The Character Consistency Plugin validates character names, references, and relationships throughout a narrative. It provides essential character tracking while being extensible for story-specific needs.

## Architecture

This plugin follows an extensible design:
- **Base validator** handles common scenarios (90% of use cases)
- **Extensible** for story-specific needs (e.g., character evolution/transformation)
- **Three-phase validation** for cross-file consistency

## Features

### Core Features (Base Validator)
- **Character name consistency** - Validates consistent spelling and usage
- **Introduction tracking** - Ensures characters are introduced before referenced
- **Alias management** - Handles nicknames and alternative names
- **Timeline tracking** - Records when characters first appear
- **Context awareness** - Distinguishes current vs retrospective mentions

### Extensible Features (Via Subclassing)
- **Evolution tracking** - For stories with character transformations
- **Death tracking** - Validate post-death appearances
- **Relationship graphs** - Complex relationship tracking
- **Custom validations** - Story-specific rules

## Configuration

### Base Configuration

```yaml
plugins:
  character-consistency:
    enabled: true
    # Core features (always available)
    nameConsistency: true
    introductionTracking: true
    aliasManagement: true
    contextAwareness: true
    
    # Optional features
    aliases:
      caseSensitive: false
      allowedVariations: ["nickname", "formal", "informal"]
    
    # For custom validators that extend this one
    extensionPoint: "@story-linter/plugin-character-consistency"
```

### Extended Configuration Example (GitScrolls)

```yaml
plugins:
  gitscrolls-character:
    extends: "@story-linter/plugin-character-consistency"
    enabled: true
    # Inherited features plus:
    evolution:
      track: true
      stages: ["Tuxicles", "Tuxrates", "Tuxilles"]
      timeline:
        Tuxicles: "scrolls/1-*.md"
        Tuxrates: "scrolls/2-*.md"
        Tuxilles: "scrolls/3-*.md"
```

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

### Context-Aware Validation (CHAR004)
Distinguishes between current and retrospective mentions.

**Valid Retrospective:**
```markdown
"Remember when Marcus saved us?" // OK even if Marcus not yet introduced
```

### Alias Consistency (CHAR005)
Tracks and validates character aliases and nicknames.

**Example Issue:**
```markdown
Chapter 1: Elizabeth walked in.
Chapter 2: Liz opened the door. // Warning: Possible alias, needs confirmation
```

## Three-Phase Validation Process

The validator uses a three-phase approach to handle cross-file dependencies:

### Phase 1: Metadata Extraction (During Streaming)
```typescript
// Extracts character data as files are streamed
{
  "chapter1.md": {
    mentions: ["John", "Sarah"],
    introductions: ["John"],
    dialogue: [{ speaker: "John", line: 42 }]
  }
}
```

### Phase 2: State Building (After All Files)
```typescript
// Builds complete character state
{
  "John": {
    aliases: ["Johnny"],
    firstAppearance: "chapter1.md:10",
    mentions: ["chapter1.md:10", "chapter2.md:5"]
  }
}
```

### Phase 3: Validation (Using Complete State)
```typescript
// Validates each file with full context
// Can now detect forward references, aliases, etc.
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
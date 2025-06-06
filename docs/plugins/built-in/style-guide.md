# Style Guide Plugin

**Package**: `@story-linter/plugin-style-guide`

## Overview

The Style Guide Plugin enforces consistent writing style, grammar rules, and narrative conventions throughout your work. It supports standard style guides (Chicago, AP, MLA) and custom rules while adapting to fiction-specific needs.

## Features

### Core Features
- **Grammar and punctuation** - Enforces language rules
- **POV consistency** - Maintains narrative perspective
- **Tense consistency** - Tracks verb tense usage
- **Style guide compliance** - Follows chosen standards
- **Word choice preferences** - Enforces vocabulary rules
- **Sentence structure** - Monitors complexity and variety
- **Narrative distance** - Maintains consistent narrator proximity

## Configuration

```yaml
plugins:
  style-guide:
    enabled: true
    base: "Chicago"  # Chicago, AP, MLA, custom
    grammar:
      oxfordComma: true
      splitInfinitives: "allow"
      endingPrepositions: "allow"
    pov:
      type: "third-limited"  # first, third-limited, third-omniscient
      allowShifts: false
      multiPOV: true
    tense:
      primary: "past"
      allowFlashbacks: true
    prose:
      sentenceVariety: true
      maxSentenceLength: 50
      paragraphLength: "medium"
    vocabulary:
      readingLevel: "adult"
      avoidList: ["very", "really", "just"]
      technicalTerms: "explain"
```

### Configuration Options

#### `grammar`
- `oxfordComma` (boolean): Use serial comma
- `splitInfinitives` (string): allow/warn/forbid
- `endingPrepositions` (string): allow/warn/forbid

#### `pov`
- `type` (string): Narrative perspective
- `allowShifts` (boolean): Permit POV changes
- `multiPOV` (boolean): Multiple POV characters allowed

#### `tense`
- `primary` (string): Main narrative tense
- `allowFlashbacks` (boolean): Permit tense shifts

#### `prose`
- `sentenceVariety` (boolean): Require varied structure
- `maxSentenceLength` (number): Word limit per sentence
- `paragraphLength` (string): short/medium/long

#### `vocabulary`
- `readingLevel` (string): Target audience level
- `avoidList` (array): Words to flag
- `technicalTerms` (string): explain/allow/forbid

## Validation Rules

### POV Violation (STYLE001)
Detects perspective breaks or inconsistencies.

**Example Issue:**
```markdown
Third-limited POV (Sarah):
John thought she looked tired. // Error: Can't access John's thoughts
```

### Tense Inconsistency (STYLE002)
Identifies unwanted tense shifts.

**Example Issue:**
```markdown
She walked to the door and opens it. // Error: Past to present shift
```

### Passive Voice Overuse (STYLE003)
Flags excessive passive construction.

**Example Issue:**
```markdown
The ball was thrown by John. // Warning: Consider active voice
```

### Sentence Monotony (STYLE004)
Detects repetitive sentence structures.

**Example Issue:**
```markdown
She walked to the store. She bought some milk. She returned home.
// Warning: Repetitive structure
```

### Word Overuse (STYLE005)
Tracks repetition of words/phrases.

**Example Issue:**
```markdown
She really loved the very beautiful garden.
// Warning: Overuse of intensifiers
```

## Schema Integration

The plugin maintains style preferences:

```json
{
  "styleProfile": {
    "povCharacters": ["Sarah", "Marcus"],
    "chapterPOV": {
      "chapter-1": "Sarah",
      "chapter-2": "Marcus"
    },
    "customRules": [
      {
        "rule": "avoid-said-bookisms",
        "severity": "warning"
      }
    ],
    "exceptions": {
      "dialogue": {
        "grammarRelaxed": true,
        "allowFragments": true
      }
    }
  }
}
```

## Advanced Features

### Multiple POV Management

Handle complex narratives:

```yaml
multiPOV:
  characters: ["Sarah", "Marcus", "Alex"]
  chapterBased: true
  requireLabels: true
  transitionRules:
    minScenes: 3
    requireBreak: true
```

### Genre-Specific Styles

Adapt to genre conventions:

```yaml
genre:
  type: "thriller"
  adaptations:
    sentenceLength: "short"
    paragraphs: "punchy"
    pacing: "fast"
```

### Custom Style Rules

Define your own preferences:

```yaml
customRules:
  - pattern: "suddenly"
    message: "Consider showing surprise instead"
    severity: "warning"
  - pattern: "in order to"
    replacement: "to"
    severity: "error"
```

## Best Practices

1. **Choose POV early** and stick to it
2. **Document style exceptions** for clarity
3. **Use active voice** for stronger prose
4. **Vary sentence structure** for rhythm
5. **Read work aloud** to catch issues

## Common Issues and Solutions

### Issue: Character thoughts in wrong POV
**Solution**: Use POV-appropriate techniques
```yaml
pov:
  thoughtPresentation:
    first: "direct"
    third-limited: "indirect"
    third-omniscient: "narrative"
```

### Issue: Dialogue grammar rules
**Solution**: Relax rules in dialogue
```yaml
exceptions:
  dialogue:
    fragments: true
    grammar: "relaxed"
    slang: true
```

### Issue: Genre style conflicts
**Solution**: Create genre profiles
```yaml
profiles:
  literary:
    sentenceComplexity: "high"
    metaphors: "frequent"
  commercial:
    sentenceComplexity: "medium"
    clarity: "priority"
```

## Performance Considerations

- **Rule caching**: Stores compiled rule patterns
- **Incremental checking**: Only validates changes
- **Context-aware**: Considers surrounding text

## Future Enhancements

1. **AI-powered style suggestions**
2. **Readability scoring**
3. **Style consistency metrics**
4. **Author voice learning**
5. **Multi-language support**
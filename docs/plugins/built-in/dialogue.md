# Dialogue Plugin

**Package**: `@story-linter/plugin-dialogue`

## Overview

The Dialogue Plugin validates conversation quality, formatting, attribution, and character voice consistency. It ensures dialogue follows best practices while maintaining each character's unique speaking patterns and the chosen style guide.

## Features

### Core Features
- **Attribution checking** - Validates speaker identification
- **Formatting validation** - Ensures consistent dialogue format
- **Voice consistency** - Tracks character speech patterns
- **Dialogue tag variety** - Monitors overuse of tags
- **Accent/dialect tracking** - Maintains speech variations
- **Conversation flow** - Validates natural exchanges
- **Quote mark consistency** - Enforces punctuation rules

## Configuration

```yaml
plugins:
  dialogue:
    enabled: true
    formatting:
      style: "US"  # US, UK, custom
      quotes: "double"  # single, double
      dashDialogue: false  # European style
    attribution:
      requireSpeaker: true
      maxUnattributed: 3
      tagPosition: "flexible"  # before, after, flexible
    quality:
      checkSaidBookisms: true
      maxConsecutiveTags: 2
      trackAdverbs: true
    voice:
      trackPatterns: true
      enforceConsistency: true
      allowEvolution: true
```

### Configuration Options

#### `formatting`
- `style` (string): Dialogue formatting style
- `quotes` (string): Quote mark preference
- `dashDialogue` (boolean): Use dash-based dialogue

#### `attribution`
- `requireSpeaker` (boolean): Require clear attribution
- `maxUnattributed` (number): Max lines without attribution
- `tagPosition` (string): Preferred tag placement

#### `quality`
- `checkSaidBookisms` (boolean): Flag overuse of said-alternatives
- `maxConsecutiveTags` (number): Limit repeated tags
- `trackAdverbs` (boolean): Monitor adverb usage

#### `voice`
- `trackPatterns` (boolean): Monitor speech patterns
- `enforceConsistency` (boolean): Require consistent voice
- `allowEvolution` (boolean): Permit voice development

## Validation Rules

### Attribution Clarity (DIAL001)
Ensures speakers are clearly identified.

**Example Issue:**
```markdown
"I disagree."
"So do I."
"Well, you're both wrong."
"Says who?" // Error: Unclear speaker after 4 lines
```

### Formatting Consistency (DIAL002)
Validates dialogue punctuation and format.

**Example Issue:**
```markdown
"Hello", she said.  // Error: Should be "Hello," she said.
```

### Said-Bookism Overuse (DIAL003)
Flags excessive use of dialogue tag variations.

**Example Issue:**
```markdown
"Yes," he exclaimed.
"No," she expostulated.
"Maybe," he ejaculated. // Error: Overuse of said-alternatives
```

### Voice Inconsistency (DIAL004)
Detects when characters speak out of character.

**Example Issue:**
```markdown
Farmer Joe: "The quantum mechanics are fascinating."
// Error: Inconsistent with established voice
```

### Adverb Overuse (DIAL005)
Monitors excessive adverb usage in tags.

**Example Issue:**
```markdown
"Stop," she said angrily.
"Never," he replied furiously.
"Why?" she asked desperately. // Warning: Too many adverbs
```

## Schema Integration

The plugin learns character voice patterns:

```json
{
  "characterVoices": {
    "Sarah": {
      "vocabulary": ["technical", "formal"],
      "contractions": false,
      "catchphrases": ["hypothetically speaking"],
      "dialect": "standard",
      "education": "PhD",
      "patterns": {
        "sentenceLength": "long",
        "questions": "frequent"
      }
    },
    "Joe": {
      "vocabulary": ["simple", "rural"],
      "contractions": true,
      "catchphrases": ["I reckon"],
      "dialect": "southern",
      "education": "high school"
    }
  }
}
```

## Advanced Features

### Dialect Management

Handle character accents and dialects:

```yaml
dialects:
  scottish:
    markers: ["och", "wee", "ken"]
    contractions: ["shouldnae", "couldnae"]
    consistent: true
  consistency:
    allowVariation: 10%  # Natural speech variation
```

### Subtext Detection

Experimental feature for deeper analysis:

```yaml
subtext:
  enabled: false  # Experimental
  detectSarcasm: true
  trackTension: true
  emotionalBeats: true
```

### Multi-Language Support

Handle multilingual dialogue:

```yaml
languages:
  primary: "english"
  secondary: ["spanish", "french"]
  formatting:
    italicizeForeign: true
    provideTranslation: true
```

## Best Practices

1. **Use "said" primarily** - It's invisible to readers
2. **Attribute clearly** in group conversations
3. **Match voice to character** background/education
4. **Vary sentence structure** within character voice
5. **Read dialogue aloud** to test flow

## Common Issues and Solutions

### Issue: Group conversations
**Solution**: Use action beats for attribution
```markdown
John leaned forward. "I disagree."
Sarah shook her head. "You would."
```

### Issue: Dialect representation
**Solution**: Use light touch approach
```yaml
dialect:
  representation: "light"  # Don't overdo phonetic spelling
  keyMarkers: ["word choice", "grammar"]
```

### Issue: Internal dialogue
**Solution**: Configure thought formatting
```yaml
thoughts:
  format: "italics"
  tags: false  # No "he thought" needed
  quotes: false
```

## Performance Considerations

- **Pattern caching**: Stores character voice profiles
- **Context awareness**: Considers scene emotion
- **Batch processing**: Analyzes conversations as units

## Future Enhancements

1. **AI-powered voice analysis**
2. **Emotion tracking in dialogue**
3. **Conversation rhythm analysis**
4. **Subtext and tension detection**
5. **Cultural speech pattern validation**
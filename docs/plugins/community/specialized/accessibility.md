# Accessibility Plugin

**Package**: `@story-linter/plugin-accessibility`
**Author**: Community
**Category**: Specialized

## Overview

The Accessibility Plugin ensures narratives are accessible to readers with various disabilities, validating screen reader compatibility, checking for problematic formatting, managing content warnings, and promoting inclusive storytelling practices.

## Features

### Core Features
- **Screen reader optimization** - Ensures compatibility
- **Visual description validation** - Checks image alt text
- **Font and formatting checks** - Validates readability
- **Content warning management** - Tracks trigger warnings
- **Cognitive load assessment** - Monitors complexity
- **Sensory description balance** - Ensures multi-sensory writing
- **Navigation structure** - Validates document structure

## Configuration

```yaml
plugins:
  accessibility:
    enabled: true
    screenReader:
      compatibility: true
      altTextRequired: true
      structuralMarkup: true
    readability:
      fontSizeMin: 12
      contrastCheck: true
      lineSpacing: 1.5
      dyslexiaFriendly: true
    cognitive:
      complexityLevel: "moderate"
      chunkContent: true
      clearLanguage: true
    contentWarnings:
      required: true
      placement: "beginning"
      detailed: true
    sensory:
      describeVisuals: true
      avoidColorOnly: true
      soundDescriptions: true
```

### Configuration Options

#### `screenReader`
- `compatibility` (boolean): Ensure screen reader support
- `altTextRequired` (boolean): Require image descriptions
- `structuralMarkup` (boolean): Use semantic structure

#### `readability`
- `fontSizeMin` (number): Minimum font size
- `contrastCheck` (boolean): Validate color contrast
- `lineSpacing` (number): Line height multiplier
- `dyslexiaFriendly` (boolean): Dyslexia-friendly formatting

#### `cognitive`
- `complexityLevel` (string): Target complexity
- `chunkContent` (boolean): Break into sections
- `clearLanguage` (boolean): Use plain language

#### `contentWarnings`
- `required` (boolean): Mandate content warnings
- `placement` (string): Warning location
- `detailed` (boolean): Specific vs general warnings

## Validation Rules

### Missing Alt Text (ACC001)
Identifies images without descriptions.

**Example Issue:**
```markdown
![](image.jpg)  // Error: No alt text provided
```

### Color-Only Information (ACC002)
Detects information conveyed only by color.

**Example Issue:**
```markdown
The red items are dangerous, green are safe.
// Error: Color-only distinction
```

### Complex Sentence Structure (ACC003)
Flags overly complex sentences.

**Example Issue:**
```markdown
The man, who had been walking for hours through the forest 
that his grandfather had planted sixty years ago when the 
land was still fertile, finally found the stream.
// Warning: Sentence complexity high
```

### Missing Content Warning (ACC004)
Identifies potentially triggering content.

**Example Issue:**
```markdown
[Graphic violence scene without warning]
// Error: Content warning required
```

### Poor Heading Structure (ACC005)
Detects improper document hierarchy.

**Example Issue:**
```markdown
# Title
### Subsection  // Error: Skipped heading level 2
```

## Accessibility-Specific Features

### Screen Reader Optimization

Ensure compatibility:

```yaml
screenReader:
  elements:
    decorativeText: "aria-hidden"
    emphasis: "semantic-tags"
    tables: "proper-headers"
  testing:
    nvda: true
    jaws: true
    voiceover: true
```

### Cognitive Accessibility

Support various reading levels:

```yaml
cognitive:
  features:
    summaries: "chapter-start"
    glossary: "integrated"
    conceptMaps: "available"
  simplification:
    sentenceLength: 20
    syllablesPerWord: 2
    passiveVoice: "minimal"
```

### Multi-Sensory Descriptions

Balance sensory information:

```yaml
sensory:
  balance:
    visual: 40%
    auditory: 25%
    tactile: 20%
    olfactory: 10%
    gustatory: 5%
  alternatives:
    visualScenes: "describe-fully"
    soundscapes: "convey-mood"
```

## Best Practices

1. **Use semantic markup** for structure
2. **Provide text alternatives** for visuals
3. **Write clear summaries** for chapters
4. **Include content warnings** prominently
5. **Test with screen readers** regularly

## Common Issues and Solutions

### Issue: ASCII art and emoticons
**Solution**: Provide text alternatives
```yaml
asciiArt:
  detection: true
  requireDescription: true
  screenReaderSkip: true
```

### Issue: Complex fantasy names
**Solution**: Pronunciation guides
```yaml
names:
  pronunciation: "inline"  # inline, glossary, both
  phonetic: "on-first-use"
  audioGuide: "available"
```

## Format Support

### EPUB Accessibility
```yaml
epub:
  navigation: "comprehensive"
  pageList: "included"
  mediaOverlays: "supported"
  metadata: "complete"
```

### Web Publishing
```yaml
web:
  aria: "full-support"
  keyboardNav: "complete"
  skipLinks: "provided"
  landmarks: "defined"
```

### Audio Format
```yaml
audio:
  narration: "professional"
  soundEffects: "optional"
  chapters: "navigable"
  speed: "adjustable"
```

## Integration with Other Plugins

- Metadata (accessibility metadata)
- Style Guide (readability rules)
- Dialogue (clear attribution)

## Future Enhancements

1. **Automated audio description**
2. **Sign language video markers**
3. **Braille format optimization**
4. **Reading difficulty analyzer**
5. **Personalization profiles**
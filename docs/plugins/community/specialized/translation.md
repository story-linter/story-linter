# Translation Plugin

**Package**: `@story-linter/plugin-translation`
**Author**: Community
**Category**: Specialized

## Overview

The Translation Plugin assists with maintaining narrative quality across translations, tracking cultural adaptations, managing multilingual versions, and ensuring consistency in translated works. It helps both translators and authors working in multiple languages.

## Features

### Core Features
- **Translation memory** - Maintains consistency across versions
- **Cultural adaptation tracking** - Manages localization changes
- **Term consistency** - Ensures uniform terminology
- **Style preservation** - Maintains author voice
- **Reference validation** - Checks cultural references
- **Idiom management** - Handles non-literal translations
- **Version synchronization** - Tracks changes across languages

## Configuration

```yaml
plugins:
  translation:
    enabled: true
    languages:
      source: "en-US"
      targets: ["es-ES", "fr-FR", "de-DE"]
      rtlSupport: true
    consistency:
      termDatabase: true
      characterNames: "consistent"
      placeNames: "localized"
      culturalAdaptation: "moderate"
    quality:
      preserveVoice: true
      idiomHandling: "equivalent"
      registerMatching: true
    tracking:
      changes: true
      notes: true
      approval: required
```

### Configuration Options

#### `languages`
- `source` (string): Original language/locale
- `targets` (array): Translation target languages
- `rtlSupport` (boolean): Right-to-left language support

#### `consistency`
- `termDatabase` (boolean): Use terminology database
- `characterNames` (string): consistent/localized/hybrid
- `placeNames` (string): consistent/localized
- `culturalAdaptation` (string): none/light/moderate/heavy

#### `quality`
- `preserveVoice` (boolean): Maintain author's style
- `idiomHandling` (string): literal/equivalent/explained
- `registerMatching` (boolean): Match formality levels

#### `tracking`
- `changes` (boolean): Track translation decisions
- `notes` (boolean): Allow translator notes
- `approval` (string): required/optional

## Validation Rules

### Term Inconsistency (TRANS001)
Detects inconsistent terminology translation.

**Example Issue:**
```markdown
Chapter 1: "wizard" → "mago"
Chapter 5: "wizard" → "hechicero" // Error: Inconsistent
```

### Cultural Reference Error (TRANS002)
Flags problematic cultural references.

**Example Issue:**
```markdown
Original: "It was a real Hail Mary pass"
Translation: "Era un pase Ave María" // Error: Idiom lost
```

### Register Mismatch (TRANS003)
Identifies formality level changes.

**Example Issue:**
```markdown
Original: "Hey, what's up?" (informal)
Translation: "¿Cómo está usted?" (formal) // Warning: Register shift
```

### Name Inconsistency (TRANS004)
Tracks character name variations.

**Example Issue:**
```markdown
Chapter 1: John → Juan
Chapter 3: John → John // Error: Name handling inconsistent
```

### Lost Wordplay (TRANS005)
Identifies untranslatable elements.

**Example Issue:**
```markdown
Original: Pun based on "knight/night"
Translation: Direct translation loses wordplay // Warning
```

## Translation-Specific Features

### Terminology Database

Maintain consistent translations:

```yaml
terminology:
  database:
    format: "TMX"  # TMX, CSV, JSON
    categories:
      characters: "names, titles, epithets"
      locations: "places, regions, landmarks"
      concepts: "magic, technology, culture"
  validation:
    enforceConsistency: true
    allowVariants: contextual
```

### Cultural Adaptation Tracking

Manage localization decisions:

```yaml
culturalAdaptation:
  elements:
    food: "localize"
    measurements: "convert"
    holidays: "equivalent"
    idioms: "find-equivalent"
  documentation:
    required: true
    rationale: true
```

### Multi-Version Management

Synchronize across languages:

```yaml
versionControl:
  trackChanges: true
  propagateUpdates: true
  conflictResolution: "manual"
  approval:
    requireNative: true
    stages: ["draft", "review", "final"]
```

## Best Practices

1. **Build terminology database** early
2. **Document cultural decisions** thoroughly
3. **Maintain character voice** across languages
4. **Use native reviewers** for each language
5. **Track idiom replacements** systematically

## Common Issues and Solutions

### Issue: Fantasy term translation
**Solution**: Consistent approach
```yaml
fantasyTerms:
  approach: "transliterate"  # translate, transliterate, hybrid
  consistency: "strict"
  glossary: "required"
```

### Issue: Dialogue naturalness
**Solution**: Localized speech patterns
```yaml
dialogue:
  adaptation: "natural"
  dialectConsideration: true
  ageAppropriateness: true
```

## Language Pair Support

### Romance Languages
```yaml
romanceLanguages:
  genderTracking: true
  formalityLevels: ["tu/vous", "tu/lei"]
  subjectPronouns: "often-dropped"
```

### Asian Languages
```yaml
asianLanguages:
  honorifics: "preserve"
  nameOrder: "adapt"
  countingWords: "required"
```

### RTL Languages
```yaml
rtlLanguages:
  textDirection: "right-to-left"
  punctuation: "mirrored"
  numbers: "left-to-right"
```

## Integration with Other Plugins

- Character Consistency (name tracking)
- Dialogue (register matching)
- Metadata (multi-language metadata)

## Future Enhancements

1. **AI-assisted translation consistency**
2. **Cultural consultant integration**
3. **Reader feedback incorporation**
4. **Translation memory sharing**
5. **Automated back-translation checking**
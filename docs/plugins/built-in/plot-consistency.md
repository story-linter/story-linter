# Plot Consistency Plugin

**Package**: `@story-linter/plugin-plot-consistency`

## Overview

The Plot Consistency Plugin validates story logic, plot threads, cause-and-effect relationships, and narrative promises. It ensures that plot elements introduced are properly resolved and that story events follow logical progression.

## Features

### Core Features
- **Plot thread tracking** - Monitors introduced plot elements
- **Resolution validation** - Ensures plot threads are resolved
- **Chekhov's gun principle** - Tracks mentioned items/concepts
- **Cause and effect chain** - Validates logical story progression
- **Foreshadowing tracking** - Monitors setup and payoff
- **Plot hole detection** - Identifies logical inconsistencies
- **Story promise fulfillment** - Tracks narrative commitments

## Configuration

```yaml
plugins:
  plot-consistency:
    enabled: true
    threads:
      trackAll: true
      requireResolution: true
      allowOpenEndings: false
    foreshadowing:
      track: true
      requirePayoff: true
      maxDistance: 10  # chapters
    items:
      trackSignificant: true
      chekhovsGun: true
    logic:
      validateCausality: true
      checkContradictions: true
```

### Configuration Options

#### `threads`
- `trackAll` (boolean): Track all introduced plot threads
- `requireResolution` (boolean): Ensure all threads resolve
- `allowOpenEndings` (boolean): Permit intentionally open threads

#### `foreshadowing`
- `track` (boolean): Monitor foreshadowing elements
- `requirePayoff` (boolean): Ensure foreshadowing has payoff
- `maxDistance` (number): Maximum chapters between setup/payoff

#### `items`
- `trackSignificant` (boolean): Track important items/weapons
- `chekhovsGun` (boolean): Apply Chekhov's gun principle

#### `logic`
- `validateCausality` (boolean): Check cause-effect relationships
- `checkContradictions` (boolean): Detect plot contradictions

## Validation Rules

### Unresolved Plot Thread (PLOT001)
Identifies plot threads introduced but never resolved.

**Example Issue:**
```markdown
Chapter 2: The mysterious letter arrived...
// Never mentioned again - Error: Unresolved plot thread
```

### Chekhov's Gun Violation (PLOT002)
Tracks significant items that should be used if introduced.

**Example Issue:**
```markdown
Chapter 1: A loaded pistol hung on the wall.
// Never fired or used - Error: Chekhov's gun violation
```

### Causality Break (PLOT003)
Detects illogical cause-and-effect sequences.

**Example Issue:**
```markdown
The door was locked from inside.
John entered through the door. // Error: Logical inconsistency
```

### Contradictory Events (PLOT004)
Identifies mutually exclusive plot points.

**Example Issue:**
```markdown
Chapter 3: The bridge was destroyed in the flood.
Chapter 5: They crossed the old bridge. // Error: Contradiction
```

### Unfulfilled Foreshadowing (PLOT005)
Tracks foreshadowing without payoff.

**Example Issue:**
```markdown
"This decision will haunt you," she warned.
// No consequences shown - Error: Unfulfilled foreshadowing
```

## Schema Integration

The plugin maintains a plot element database:

```json
{
  "plotThreads": {
    "mysteriousLetter": {
      "introduced": "chapter-2.md:34",
      "type": "mystery",
      "status": "unresolved",
      "mentions": ["chapter-2.md:34", "chapter-3.md:12"]
    }
  },
  "significantItems": {
    "antiqueWatch": {
      "introduced": "chapter-1.md:89",
      "description": "grandfather's gold watch",
      "used": false,
      "significance": "high"
    }
  },
  "foreshadowing": {
    "stormWarning": {
      "setup": "chapter-4.md:56",
      "payoff": "chapter-7.md:23",
      "type": "environmental"
    }
  }
}
```

## Advanced Features

### Multi-Thread Dependencies

Track complex plot interconnections:

```yaml
dependencies:
  enabled: true
  mapping:
    "revenge-plot": ["character-death", "betrayal-reveal"]
    "treasure-hunt": ["map-discovery", "key-finding"]
```

### Red Herring Management

Handle intentional misdirection:

```yaml
redHerrings:
  allow: true
  requireMarking: true
  markers: ["[RED HERRING]", "[MISDIRECTION]"]
```

### Subplot Validation

Configure subplot handling:

```yaml
subplots:
  track: true
  allowUnresolved: 2  # max unresolved subplots
  minDevelopment: 3   # minimum scenes per subplot
```

## Best Practices

1. **Document plot threads** as you introduce them
2. **Track significant objects** mentioned in narrative
3. **Mark red herrings** explicitly in planning
4. **Resolve threads** before story conclusion
5. **Balance foreshadowing** with timely payoff

## Common Issues and Solutions

### Issue: Intentionally open endings
**Solution**: Mark threads as intentionally unresolved
```yaml
threads:
  allowOpenEndings: true
  openEndingMarkers: ["[INTENTIONALLY UNRESOLVED]"]
```

### Issue: Long-form series plotting
**Solution**: Configure per-book resolution
```yaml
series:
  mode: true
  allowCrossBookThreads: true
  requireBookResolution: ["main-plot"]
```

### Issue: Multiple valid interpretations
**Solution**: Use ambiguity markers
```yaml
ambiguity:
  allow: true
  requireIntent: true
  markers: ["[AMBIGUOUS]", "[MULTIPLE INTERPRETATIONS]"]
```

## Performance Considerations

- **Incremental analysis**: Only revalidates changed sections
- **Thread caching**: Maintains plot thread database
- **Smart detection**: Uses NLP for plot element identification

## Future Enhancements

1. **AI-powered plot hole detection**
2. **Automatic subplot extraction**
3. **Story arc visualization**
4. **Theme consistency checking**
5. **Reader promise tracking**
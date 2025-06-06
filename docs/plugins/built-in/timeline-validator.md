# Timeline Validator Plugin

**Package**: `@story-linter/plugin-timeline-validator`

## Overview

The Timeline Validator Plugin ensures temporal consistency throughout your narrative. It tracks dates, chronological sequences, time references, and prevents temporal paradoxes while maintaining logical flow across chapters and scenes.

## Features

### Core Features
- **Chronological sequence validation** - Ensures events occur in logical order
- **Date consistency checking** - Validates specific dates and durations
- **Age progression tracking** - Monitors character ages over time
- **Time reference validation** - Checks relative time markers
- **Flashback/flashforward management** - Handles non-linear narratives
- **Temporal paradox detection** - Identifies impossible timelines
- **Season and weather consistency** - Validates environmental time markers

## Configuration

```yaml
plugins:
  timeline-validator:
    enabled: true
    strictMode: false
    chronology:
      allowFlashbacks: true
      requireMarkers: true
    dates:
      format: "auto"  # auto, US, UK, ISO
      validateDayOfWeek: true
    progression:
      trackAges: true
      trackPregnancies: true
      trackSeasons: true
```

### Configuration Options

#### `strictMode`
- When true, requires explicit time markers for all scenes

#### `chronology`
- `allowFlashbacks` (boolean): Permit non-linear narrative
- `requireMarkers` (boolean): Require explicit markers for time shifts

#### `dates`
- `format` (string): Expected date format
- `validateDayOfWeek` (boolean): Check if dates match days of week

#### `progression`
- `trackAges` (boolean): Monitor character age consistency
- `trackPregnancies` (boolean): Validate pregnancy durations
- `trackSeasons` (boolean): Check seasonal consistency

## Validation Rules

### Chronological Order (TIME001)
Ensures events happen in logical sequence unless marked as flashback.

**Example Issue:**
```markdown
Monday: Sarah graduated from college.
Sunday: Sarah attended her final exam. // Error: Out of sequence
```

### Date Consistency (TIME002)
Validates that specific dates are possible and consistent.

**Example Issue:**
```markdown
February 30th, 2023 // Error: Invalid date
```

### Age Progression (TIME003)
Tracks character ages throughout the narrative.

**Example Issue:**
```markdown
Chapter 1: Tom, 25 years old...
Chapter 5 (one year later): Tom, 23 years old... // Error: Age regression
```

### Duration Validation (TIME004)
Ensures time durations are realistic and consistent.

**Example Issue:**
```markdown
She completed the cross-country drive in two hours. // Error: Impossible duration
```

### Seasonal Consistency (TIME005)
Validates seasonal and weather descriptions match the timeline.

**Example Issue:**
```markdown
December in New York: The cherry blossoms bloomed... // Error: Wrong season
```

## Schema Integration

The plugin learns from your narrative's temporal patterns:

```json
{
  "timeline": {
    "storyStart": "2023-03-15",
    "currentPoint": "2023-09-22",
    "events": [
      {
        "id": "graduation",
        "date": "2023-05-20",
        "characters": ["Sarah"],
        "chapter": "chapter-3.md"
      }
    ],
    "characterAges": {
      "Sarah": {
        "birthdate": "2001-03-10",
        "currentAge": 22
      }
    }
  }
}
```

## Advanced Features

### Non-Linear Narrative Support

Handle complex timelines with proper markers:

```yaml
chronology:
  allowFlashbacks: true
  allowFlashforwards: true
  markers:
    - "[FLASHBACK]"
    - "[YEARS EARLIER]"
    - "[FLASH FORWARD]"
```

### Multiple Timeline Tracking

For stories with parallel timelines:

```yaml
timelines:
  main: true
  alternateReality: true
  dreamSequences: true
  syncPoints: ["chapter-5", "chapter-10"]
```

### Historical Accuracy

Validate historical events and technology:

```yaml
historical:
  enabled: true
  period: "1920s"
  checkTechnology: true
  checkEvents: true
```

## Best Practices

1. **Use clear time markers** at scene/chapter beginnings
2. **Track character ages** in a reference document
3. **Mark flashbacks explicitly** with consistent markers
4. **Validate historical dates** for period pieces
5. **Document time skips** clearly

## Common Issues and Solutions

### Issue: Complex flashback sequences
**Solution**: Use nested markers
```markdown
[FLASHBACK - 5 years ago]
  [FLASHBACK WITHIN FLASHBACK - 10 years ago]
  [END INNER FLASHBACK]
[END FLASHBACK]
```

### Issue: Parallel storylines
**Solution**: Label timeline branches
```markdown
[Timeline A - Present Day]
[Timeline B - 1885]
```

### Issue: Ambiguous time references
**Solution**: Configure relative time handling
```yaml
relativeTime:
  assumeLinear: true
  defaultUnit: "days"
```

## Performance Considerations

- **Smart caching**: Caches timeline data between runs
- **Incremental updates**: Only recalculates affected portions
- **Parallel processing**: Validates multiple timelines concurrently

## Future Enhancements

1. **Visual timeline generation** for complex narratives
2. **Automatic timeline extraction** from text
3. **Cross-reference validation** with real-world events
4. **Time travel paradox** detection algorithms
5. **Cultural calendar support** (lunar, fiscal, academic)
# Romance Genre Plugin

**Package**: `@story-linter/plugin-romance`
**Author**: Community
**Category**: Genre-Specific

## Overview

The Romance Genre Plugin provides specialized validation for romance narratives, tracking relationship development, emotional beats, conflict resolution, and genre expectations. It ensures satisfying romantic arcs while respecting subgenre conventions.

## Features

### Core Features
- **Relationship arc tracking** - Monitors romantic progression
- **Emotional beat validation** - Ensures key moments
- **Chemistry indicators** - Tracks romantic tension
- **Conflict management** - Validates relationship obstacles
- **Heat level consistency** - Maintains appropriate content
- **Trope tracking** - Identifies and validates tropes
- **HEA/HFN validation** - Ensures satisfying endings

## Configuration

```yaml
plugins:
  romance:
    enabled: true
    arc:
      structure: "traditional"  # traditional, slow-burn, insta-love
      requireMeet: true
      trackBeats: true
      validatePacing: true
    chemistry:
      trackTension: true
      requireBuildup: true
      physicalProgression: true
    conflict:
      internal: required
      external: required
      blackMoment: true
    ending:
      type: "HEA"  # HEA, HFN, tragic, open
      validate: true
    heatLevel:
      rating: "3"  # 1-5 scale
      consistent: true
    tropes:
      track: true
      maxCount: 5
      avoidProblematic: true
```

### Configuration Options

#### `arc`
- `structure` (string): Romance arc type
- `requireMeet` (boolean): Enforce meet-cute/meeting
- `trackBeats` (boolean): Monitor emotional moments
- `validatePacing` (boolean): Check relationship pace

#### `chemistry`
- `trackTension` (boolean): Monitor romantic tension
- `requireBuildup` (boolean): Gradual development
- `physicalProgression` (boolean): Track intimacy progression

#### `conflict`
- `internal` (string): Character's internal conflict
- `external` (string): External obstacles
- `blackMoment` (boolean): Require crisis moment

#### `heatLevel`
- `rating` (string): Content heat level (1-5)
- `consistent` (boolean): Maintain throughout

## Validation Rules

### Missing Romantic Beat (ROM001)
Identifies missing key moments.

**Example Issue:**
```markdown
Story progression: Meet → Conflict → Resolution
// Error: Missing first kiss/admission of feelings
```

### Chemistry Imbalance (ROM002)
Detects one-sided attraction.

**Example Issue:**
```markdown
Sarah: Constantly thinking about John
John: Never shows romantic interest // Error: Unbalanced
```

### Rushed Relationship (ROM003)
Flags unrealistic progression.

**Example Issue:**
```markdown
Day 1: They meet
Day 2: "I love you" // Warning: Too fast for structure type
```

### Unresolved Conflict (ROM004)
Tracks relationship obstacles.

**Example Issue:**
```markdown
Major trust issue introduced in Ch 5
// Never addressed before HEA - Error
```

### Heat Level Inconsistency (ROM005)
Monitors content rating.

**Example Issue:**
```markdown
Established: Sweet romance (Level 1)
Chapter 10: Explicit scene // Error: Exceeds heat level
```

## Romance-Specific Features

### Relationship Timeline

Track romantic progression:

```yaml
timeline:
  beats:
    - meet: "required"
    - attraction: "within-3-chapters"
    - firstKiss: "middle-third"
    - conflict: "before-80%"
    - resolution: "final-20%"
  customBeats:
    - name: "confession"
      required: true
```

### Chemistry Metrics

Monitor romantic tension:

```yaml
chemistry:
  indicators:
    - physical awareness
    - emotional connection
    - banter quality
    - tension scenes
  scoring:
    method: "weighted"
    threshold: 70  # minimum score
```

### Trope Management

Handle common romance tropes:

```yaml
tropes:
  catalog:
    - enemies-to-lovers
    - fake-relationship
    - second-chance
    - forbidden-love
  validation:
    properExecution: true
    avoidStereotypes: true
```

## Best Practices

1. **Build chemistry** before physical intimacy
2. **Balance internal/external** conflicts
3. **Track emotional beats** systematically
4. **Respect heat level** throughout
5. **Deliver promised ending** (HEA/HFN)

## Common Issues and Solutions

### Issue: Insta-love stories
**Solution**: Adjust validation rules
```yaml
arc:
  structure: "insta-love"
  requireJustification: true
  trackDevelopment: true
```

### Issue: Love triangles
**Solution**: Multi-relationship tracking
```yaml
relationships:
  allowMultiple: true
  trackAll: true
  requireResolution: all
```

## Subgenre Support

### Contemporary Romance
```yaml
contemporary:
  setting: modern
  issues: current
  technology: present
  language: contemporary
```

### Historical Romance
```yaml
historical:
  period: "Regency"
  accuracy: high
  language: period-appropriate
  customs: validate
```

### Paranormal Romance
```yaml
paranormal:
  worldBuilding: required
  mateBlocks: allowed
  immortalIssues: track
```

## Integration with Other Plugins

- Character Consistency (relationship tracking)
- Timeline Validator (relationship pacing)
- Dialogue (chemistry in conversation)

## Future Enhancements

1. **Chemistry scoring algorithm**
2. **Romantic tension visualization**
3. **Trope combination analysis**
4. **Reader satisfaction prediction**
5. **Series romance continuity**
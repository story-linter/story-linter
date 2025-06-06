# Series Plugin

**Package**: `@story-linter/plugin-series`
**Author**: Community
**Category**: Specialized

## Overview

The Series Plugin provides specialized validation for multi-book series, managing continuity across volumes, character development arcs, world evolution, and overarching plot threads. It helps maintain consistency while allowing for planned growth and change.

## Features

### Core Features
- **Cross-book continuity** - Validates consistency between books
- **Character arc tracking** - Monitors long-term development
- **World evolution** - Manages changing settings
- **Series plot threads** - Tracks multi-book storylines
- **Timeline management** - Maintains chronology across books
- **Recurring element tracking** - Monitors series touchstones
- **Reader onboarding** - Validates recap/catch-up info

## Configuration

```yaml
plugins:
  series:
    enabled: true
    structure:
      type: "sequential"  # sequential, standalone, hybrid
      bookCount: 5
      currentBook: 3
      overarchingPlot: true
    continuity:
      strict: true
      trackAllElements: true
      allowRetcons: false
      versionControl: true
    characterGrowth:
      trackArcs: true
      preventRegression: true
      allowDeath: true
    worldBuilding:
      allowEvolution: true
      trackChanges: true
      consistencyLevel: "high"
    readerExperience:
      standalonePlots: true
      recapRequired: true
      spoilerPrevention: true
```

### Configuration Options

#### `structure`
- `type` (string): Series structure type
- `bookCount` (number): Planned number of books
- `currentBook` (number): Current book in series
- `overarchingPlot` (boolean): Multi-book storyline

#### `continuity`
- `strict` (boolean): Enforce strict consistency
- `trackAllElements` (boolean): Monitor everything
- `allowRetcons` (boolean): Permit retroactive changes
- `versionControl` (boolean): Track series bible versions

#### `characterGrowth`
- `trackArcs` (boolean): Monitor character development
- `preventRegression` (boolean): Avoid backwards development
- `allowDeath` (boolean): Permit permanent changes

#### `readerExperience`
- `standalonePlots` (boolean): Each book self-contained
- `recapRequired` (boolean): Need catch-up info
- `spoilerPrevention` (boolean): Check for spoilers

## Validation Rules

### Continuity Violation (SER001)
Detects inconsistencies between books.

**Example Issue:**
```markdown
Book 1: Sarah has brown eyes
Book 3: Sarah's blue eyes sparkled // Error: Continuity break
```

### Character Regression (SER002)
Identifies backwards character development.

**Example Issue:**
```markdown
Book 2: John overcomes fear of heights
Book 3: John afraid of heights again // Error: Regression
```

### World Inconsistency (SER003)
Flags world-building contradictions.

**Example Issue:**
```markdown
Book 1: Magic is rare and feared
Book 2: Magic shops on every corner // Error: World change
```

### Unresolved Series Thread (SER004)
Tracks multi-book plot elements.

**Example Issue:**
```markdown
Book 1: Introduces mysterious artifact
Book 5: Series ends, artifact never explained // Error
```

### Missing Recap Information (SER005)
Ensures new readers can follow.

**Example Issue:**
```markdown
Book 3: "As John knew from the incident..."
// Error: Incident not recapped for new readers
```

## Series-Specific Features

### Series Bible Management

Maintain comprehensive series information:

```yaml
seriesBible:
  elements:
    characters:
      versioning: true
      deathTracking: true
      relationshipMatrix: true
    world:
      mapEvolution: true
      politicalChanges: true
      technologyProgress: true
    timeline:
      masterChronology: true
      bookSpans: defined
      historicalEvents: tracked
```

### Cross-Book Validation

Check consistency across volumes:

```yaml
crossValidation:
  references:
    validatePastEvents: true
    checkCharacterMemory: true
    timelineConsistency: true
  evolution:
    plannedChanges: documented
    gradualProgression: required
```

### Reader Experience Tools

Manage new reader onboarding:

```yaml
newReaders:
  book1Standalone: required
  laterBooks:
    recapStyle: "organic"  # organic, prologue, appendix
    spoilerCheck: true
    contextClues: sufficient
```

## Best Practices

1. **Maintain a series bible** from book one
2. **Plan character arcs** across books
3. **Document world changes** and reasons
4. **Balance standalone/series** plots
5. **Consider reading order** flexibility

## Common Issues and Solutions

### Issue: Expanding cast management
**Solution**: Character tracking limits
```yaml
characters:
  maxNewPerBook: 5
  retirementStrategy: true
  focusRotation: planned
```

### Issue: Power creep
**Solution**: Progression limits
```yaml
powerLevels:
  maxGrowthPerBook: 20%
  ceilingDefined: true
  costsIncrease: true
```

## Series Types Support

### Epic Fantasy Series
```yaml
epicFantasy:
  worldExpansion: gradual
  questProgression: tracked
  prophecyFulfillment: planned
```

### Mystery Series
```yaml
mysterySeries:
  detectiveGrowth: true
  caseStandalone: required
  overarchingNemesis: optional
```

### Romance Series
```yaml
romanceSeries:
  couplePerBook: different
  worldConnections: true
  happilyEverAfters: guaranteed
```

## Integration with Other Plugins

- Character Consistency (long-term tracking)
- World Building (evolution management)
- Timeline Validator (series chronology)

## Future Enhancements

1. **Series arc visualizer**
2. **Character journey mapper**
3. **Reading order optimizer**
4. **Continuity error auto-detection**
5. **Series bible generator**
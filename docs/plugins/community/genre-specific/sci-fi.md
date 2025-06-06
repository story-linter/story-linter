# Science Fiction Genre Plugin

**Package**: `@story-linter/plugin-sci-fi`
**Author**: Community
**Category**: Genre-Specific

## Overview

The Science Fiction Genre Plugin provides specialized validation for sci-fi narratives, including technology consistency, scientific plausibility, future world-building, and speculative element tracking. It helps maintain internal logic while allowing creative speculation.

## Features

### Core Features
- **Technology consistency** - Validates tech rules and limits
- **Scientific plausibility** - Checks against known science
- **Timeline coherence** - Manages future history
- **Space travel logic** - Validates FTL and physics
- **Alien species tracking** - Monitors non-human characters
- **Speculative element catalog** - Tracks novums
- **Tech level progression** - Prevents anachronisms

## Configuration

```yaml
plugins:
  sci-fi:
    enabled: true
    hardness:
      level: "medium"  # soft, medium, hard
      explainTech: true
      respectPhysics: true
      allowHandwavium: limited
    technology:
      trackInventions: true
      requireConsistency: true
      limitPower: true
    aliens:
      requireBiology: true
      trackCultures: true
      validateCommunication: true
    timeTravel:
      enabled: false
      paradoxPrevention: true
      rulesRequired: true
    space:
      ftlMethod: "hyperdrive"
      requireExplanation: true
      respectLightspeed: false
```

### Configuration Options

#### `hardness`
- `level` (string): Scientific rigor level
- `explainTech` (boolean): Require explanations
- `respectPhysics` (boolean): Follow known laws
- `allowHandwavium` (string): Permit unexplained tech

#### `technology`
- `trackInventions` (boolean): Monitor new tech
- `requireConsistency` (boolean): Enforce tech rules
- `limitPower` (boolean): Prevent god-like tech

#### `aliens`
- `requireBiology` (boolean): Need biological basis
- `trackCultures` (boolean): Monitor alien societies
- `validateCommunication` (boolean): Check first contact

#### `space`
- `ftlMethod` (string): Faster-than-light approach
- `requireExplanation` (boolean): Explain FTL
- `respectLightspeed` (boolean): Enforce light barrier

## Validation Rules

### Technology Inconsistency (SCIFI001)
Detects contradictory tech usage.

**Example Issue:**
```markdown
Chapter 1: FTL communication impossible
Chapter 5: Instant galaxy-wide message // Error: Contradiction
```

### Physics Violation (SCIFI002)
Flags impossible physics (based on hardness).

**Example Issue:**
```markdown
The ship accelerated past light speed
// Error: Violates physics without FTL explanation
```

### Alien Biology Flaw (SCIFI003)
Identifies implausible alien life.

**Example Issue:**
```markdown
Silicon-based life thriving in water
// Warning: Chemistry inconsistency
```

### Timeline Paradox (SCIFI004)
Catches temporal inconsistencies.

**Example Issue:**
```markdown
2050: Mars colony established
2045: First Mars mission // Error: Timeline conflict
```

### Tech Level Mismatch (SCIFI005)
Monitors technology progression.

**Example Issue:**
```markdown
Stone age society with quantum computers
// Error: Tech level inconsistency
```

## Sci-Fi Specific Features

### Technology Database

Track all speculative technology:

```yaml
technology:
  catalog:
    ftlDrive:
      type: "alcubierre"
      limitations: ["energy-requirements", "navigation"]
      introduced: "chapter-1"
    neuralInterface:
      type: "quantum-entanglement"
      risks: ["personality-drift"]
  consistency:
    crossReference: true
    preventContradiction: true
```

### Alien Species Registry

Manage non-human characters:

```yaml
species:
  humans:
    baseline: true
    modifications: ["genetic", "cybernetic"]
  zephyrians:
    biology: "silicon-based"
    atmosphere: "methane"
    communication: "chromatic"
  validation:
    checkEnvironment: true
    consistentBiology: true
```

### Future History Timeline

Maintain coherent future:

```yaml
timeline:
  nearFuture:
    2030-2050: "climate-adaptation"
    2050-2100: "space-expansion"
  farFuture:
    flexible: true
    majorEvents: ["first-contact", "singularity"]
```

## Best Practices

1. **Define technology rules** early
2. **Choose hardness level** and stick to it
3. **Document speculative elements** thoroughly
4. **Create tech limitations** to add tension
5. **Build coherent future history**

## Common Issues and Solutions

### Issue: FTL communication paradoxes
**Solution**: Define clear rules
```yaml
ftl:
  communication:
    method: "ansible"
    delay: "1-hour-per-lightyear"
    limitations: ["bandwidth", "power"]
```

### Issue: Mary Sue technology
**Solution**: Enforce limitations
```yaml
technology:
  limitations:
    required: true
    types: ["power", "range", "side-effects"]
```

## Subgenre Support

### Space Opera
```yaml
spaceOpera:
  scale: "galactic"
  aliens: "numerous"
  tech: "handwaved"
  focus: "adventure"
```

### Cyberpunk
```yaml
cyberpunk:
  setting: "near-future"
  tech: ["AI", "cybernetics", "VR"]
  themes: ["corporate", "dystopian"]
  validation: "atmosphere"
```

### Hard SF
```yaml
hardSF:
  physics: "strict"
  explanations: "detailed"
  speculation: "minimal"
  research: "required"
```

## Integration with Other Plugins

- World Building (enhanced tech tracking)
- Timeline Validator (future history)
- Character Consistency (alien characters)

## Future Enhancements

1. **Physics equation checker**
2. **Tech tree visualization**
3. **Alien language validator**
4. **Future timeline generator**
5. **Scientific accuracy API**
# Fantasy Genre Plugin

**Package**: `@story-linter/plugin-fantasy`
**Author**: Community
**Category**: Genre-Specific

## Overview

The Fantasy Genre Plugin provides specialized validation for fantasy narratives, including magic systems, mythical creatures, prophecies, and fantasy world-building elements. It extends the base world-building plugin with fantasy-specific rules.

## Features

### Core Features
- **Magic system consistency** - Validates spells and magical rules
- **Creature catalog** - Tracks mythical beings and their properties
- **Prophecy tracking** - Monitors prophecies and fulfillment
- **Fantasy naming conventions** - Validates character/place names
- **Quest structure** - Tracks hero's journey elements
- **Artifact management** - Monitors magical items
- **Power scaling** - Prevents power creep

## Configuration

```yaml
plugins:
  fantasy:
    enabled: true
    magic:
      system: "hard"  # hard, soft, hybrid
      requireCost: true
      trackSpells: true
      limitPower: true
    creatures:
      validateBiology: false
      requireLore: true
      trackAbilities: true
    prophecies:
      track: true
      requireFulfillment: true
      allowMultipleInterpretations: true
    quests:
      trackStructure: true
      validateStakes: true
      monitorProgress: true
    artifacts:
      trackPower: true
      requireOrigin: true
      limitCount: 5
```

### Configuration Options

#### `magic`
- `system` (string): Type of magic system
- `requireCost` (boolean): Magic must have consequences
- `trackSpells` (boolean): Maintain spell consistency
- `limitPower` (boolean): Prevent unlimited power

#### `creatures`
- `validateBiology` (boolean): Check creature plausibility
- `requireLore` (boolean): Demand creature backstory
- `trackAbilities` (boolean): Monitor creature powers

#### `prophecies`
- `track` (boolean): Monitor prophecies
- `requireFulfillment` (boolean): Ensure completion
- `allowMultipleInterpretations` (boolean): Permit ambiguity

#### `quests`
- `trackStructure` (boolean): Validate quest elements
- `validateStakes` (boolean): Ensure meaningful stakes
- `monitorProgress` (boolean): Track quest advancement

## Validation Rules

### Magic System Violation (FAN001)
Detects inconsistent magic use.

**Example Issue:**
```markdown
Established: Magic requires verbal incantation
Later: She cast the spell with a thought. // Error: Rule violation
```

### Undefined Creature (FAN002)
Flags creatures without established lore.

**Example Issue:**
```markdown
A Grindylow attacked the boat. // Error: Creature not defined
```

### Unfulfilled Prophecy (FAN003)
Tracks prophecies without resolution.

**Example Issue:**
```markdown
"The chosen one shall defeat the darkness"
// Story ends without fulfillment - Error
```

### Power Creep (FAN004)
Detects escalating power without limits.

**Example Issue:**
```markdown
Chapter 1: Struggles to light a candle
Chapter 3: Destroys mountains with ease // Warning: Power scaling
```

### Quest Structure Break (FAN005)
Identifies missing quest elements.

**Example Issue:**
```markdown
Quest started: Find the Sacred Gem
// No obstacles or challenges shown - Error
```

## Fantasy-Specific Features

### Spell Tracking

Maintain spell consistency:

```yaml
spells:
  catalog: true
  components:
    verbal: required
    somatic: optional
    material: tracked
  powerLevels: [cantrip, minor, major, legendary]
```

### Creature Database

Define mythical beings:

```yaml
creatures:
  dragons:
    types: [fire, ice, shadow]
    abilities: [flight, breath-weapon, magic]
    weaknesses: required
  customCreatures:
    requireDetailedLore: true
    minimumDescription: 100  # words
```

### Name Generator Rules

Validate fantasy naming:

```yaml
naming:
  patterns:
    elven: ["'", "-iel", "-wen"]
    dwarven: ["-in", "-rim", "consonant-heavy"]
    orcish: ["guttural", "apostrophes"]
  consistency: strict
```

## Best Practices

1. **Define magic rules** before writing
2. **Document creature lore** in world bible
3. **Track prophecies** from introduction
4. **Balance power progression** carefully
5. **Map quest structure** to avoid meandering

## Common Issues and Solutions

### Issue: Soft magic systems
**Solution**: Configure flexible validation
```yaml
magic:
  system: "soft"
  requireCost: false
  trackGeneralPrinciples: true
```

### Issue: Subverting tropes
**Solution**: Mark intentional subversions
```yaml
tropes:
  allowSubversion: true
  markers: ["[SUBVERSION]", "[TROPE-TWIST]"]
```

## Integration with Other Plugins

Works seamlessly with:
- World Building Plugin (enhanced features)
- Character Consistency (tracks magical abilities)
- Plot Consistency (prophecy fulfillment)

## Future Enhancements

1. **Fantasy map validation**
2. **Magical language consistency**
3. **Epic battle choreography**
4. **Divine intervention tracking**
5. **Multi-realm timeline sync**
# World Building Plugin

**Package**: `@story-linter/plugin-world-building`

## Overview

The World Building Plugin validates consistency in fictional worlds, including geography, technology, magic systems, cultures, languages, and physical laws. It ensures that the rules established for your world remain consistent throughout the narrative.

## Features

### Core Features
- **Geography consistency** - Validates locations and distances
- **Technology level tracking** - Ensures tech consistency
- **Magic system rules** - Validates supernatural elements
- **Cultural consistency** - Tracks customs and societies
- **Language validation** - Checks constructed languages
- **Physical law adherence** - Monitors world physics
- **Economic system tracking** - Validates currency and trade

## Configuration

```yaml
plugins:
  world-building:
    enabled: true
    geography:
      trackLocations: true
      validateDistances: true
      requireMaps: false
    technology:
      level: "medieval"  # modern, futuristic, custom
      allowAnachronisms: false
      trackInventions: true
    magic:
      enabled: true
      requireRules: true
      trackLimitations: true
    culture:
      trackCustoms: true
      validateLanguages: true
      checkNaming: true
    physics:
      earthLike: true
      customGravity: false
      trackExceptions: true
```

### Configuration Options

#### `geography`
- `trackLocations` (boolean): Monitor location consistency
- `validateDistances` (boolean): Check travel times/distances
- `requireMaps` (boolean): Require location documentation

#### `technology`
- `level` (string): Technology era or level
- `allowAnachronisms` (boolean): Permit tech inconsistencies
- `trackInventions` (boolean): Monitor new technology

#### `magic`
- `enabled` (boolean): Track magic system rules
- `requireRules` (boolean): Enforce documented magic laws
- `trackLimitations` (boolean): Monitor magic constraints

#### `culture`
- `trackCustoms` (boolean): Validate cultural practices
- `validateLanguages` (boolean): Check language consistency
- `checkNaming` (boolean): Validate naming conventions

#### `physics`
- `earthLike` (boolean): Use Earth physics as baseline
- `customGravity` (boolean): Track gravity differences
- `trackExceptions` (boolean): Monitor physics violations

## Validation Rules

### Location Consistency (WORLD001)
Ensures locations maintain consistent properties.

**Example Issue:**
```markdown
Chapter 1: The desert city of Khalara...
Chapter 5: Khalara's famous harbor... // Error: Desert city with harbor
```

### Technology Anachronism (WORLD002)
Detects technology inappropriate for the setting.

**Example Issue:**
```markdown
Medieval setting: He pulled out his smartphone. // Error: Anachronism
```

### Magic Rule Violation (WORLD003)
Validates adherence to established magic rules.

**Example Issue:**
```markdown
Rule: Magic requires spoken words.
Scene: She cast the spell silently. // Error: Rule violation
```

### Cultural Inconsistency (WORLD004)
Tracks cultural customs and practices.

**Example Issue:**
```markdown
Established: Elvarians never eat meat.
Later: The Elvarian feast featured roasted lamb. // Error: Cultural violation
```

### Physical Law Violation (WORLD005)
Monitors adherence to world's physical laws.

**Example Issue:**
```markdown
Low gravity world: He struggled to lift the feather. // Error: Physics inconsistency
```

## Schema Integration

The plugin builds a comprehensive world database:

```json
{
  "world": {
    "geography": {
      "locations": {
        "Khalara": {
          "type": "city",
          "climate": "desert",
          "population": 50000,
          "features": ["oasis", "market"]
        }
      },
      "distances": {
        "Khalara-Mordath": "3 days by horse"
      }
    },
    "magic": {
      "rules": [
        "Requires verbal component",
        "Limited by caster's energy",
        "Cannot create matter"
      ],
      "practitioners": {
        "wizards": ["study-based", "staff-required"],
        "sorcerers": ["innate", "no-tools"]
      }
    },
    "technology": {
      "level": "medieval",
      "exceptions": ["ancient artifacts"],
      "inventions": []
    }
  }
}
```

## Advanced Features

### Multi-World Support

Handle multiple realms or planets:

```yaml
worlds:
  earth:
    physics: "standard"
    magic: false
  feywild:
    physics: "fluid"
    magic: true
  crossoverRules: true
```

### Language Construction

Validate constructed languages:

```yaml
languages:
  elvish:
    phonetics: ["no-harsh-consonants"]
    grammar: "verb-subject-object"
    namePatterns: ["'", "-sylvan", "-iel"]
```

### Economic Systems

Track currency and trade:

```yaml
economy:
  currencies:
    - name: "gold crown"
      value: 1.0
    - name: "silver mark"
      value: 0.1
  trackPrices: true
  validateTrade: true
```

## Best Practices

1. **Document world rules** before writing
2. **Create reference sheets** for quick lookup
3. **Map key locations** and relationships
4. **Establish magic/tech limits** early
5. **Track cultural details** systematically

## Common Issues and Solutions

### Issue: Evolving world rules
**Solution**: Version your world building
```yaml
worldVersions:
  v1: "chapters 1-5"
  v2: "chapters 6-10"  # After the cataclysm
```

### Issue: Unreliable narrators
**Solution**: Mark perspective-dependent facts
```yaml
perspectives:
  objective: true
  characterBelief: ["[BELIEF]", "[MYTH]"]
```

### Issue: Soft magic systems
**Solution**: Configure flexible rules
```yaml
magic:
  system: "soft"
  requireExactRules: false
  trackGeneralPrinciples: true
```

## Performance Considerations

- **Lazy loading**: Loads world data as needed
- **Regional validation**: Checks only relevant regions
- **Smart caching**: Maintains world state between runs

## Future Enhancements

1. **Interactive world map generation**
2. **Automatic culture clash detection**
3. **Language consistency checker**
4. **Economic simulation validation**
5. **Climate and weather tracking**
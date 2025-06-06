# Mystery Genre Plugin

**Package**: `@story-linter/plugin-mystery`
**Author**: Community
**Category**: Genre-Specific

## Overview

The Mystery Genre Plugin provides specialized validation for mystery and detective fiction, ensuring fair play with clues, maintaining suspect viability, tracking red herrings, and validating the revelation sequence. It helps writers craft satisfying whodunits.

## Features

### Core Features
- **Clue fairness checking** - Ensures readers have all information
- **Suspect tracking** - Monitors alibis and motives
- **Red herring management** - Balances misdirection
- **Timeline validation** - Verifies crime chronology
- **Evidence chain** - Tracks physical evidence
- **Solution validation** - Ensures logical resolution
- **Fair play rules** - Enforces mystery conventions

## Configuration

```yaml
plugins:
  mystery:
    enabled: true
    fairPlay:
      enforce: true
      cluesBeforeReveal: true
      noHiddenTwins: true
      logicalSolution: true
    suspects:
      minCount: 3
      requireMotive: true
      requireOpportunity: true
      trackAlibis: true
    clues:
      plantBeforeUse: true
      maxRedHerrings: 40  # percentage
      requirePhysical: true
    revelation:
      validateLogic: true
      requireRecap: true
      allowMultipleSolutions: false
    subgenre:
      type: "cozy"  # cozy, hardboiled, police, amateur
```

### Configuration Options

#### `fairPlay`
- `enforce` (boolean): Apply fair play rules
- `cluesBeforeReveal` (boolean): All clues shown before solution
- `noHiddenTwins` (boolean): Prevent cheap reveals
- `logicalSolution` (boolean): Require logical deduction

#### `suspects`
- `minCount` (number): Minimum viable suspects
- `requireMotive` (boolean): All suspects need motive
- `requireOpportunity` (boolean): Check suspect access
- `trackAlibis` (boolean): Monitor alibi consistency

#### `clues`
- `plantBeforeUse` (boolean): Clues must be established
- `maxRedHerrings` (number): Percentage of false clues
- `requirePhysical` (boolean): Need tangible evidence

#### `revelation`
- `validateLogic` (boolean): Check solution logic
- `requireRecap` (boolean): Summarize clues in reveal
- `allowMultipleSolutions` (boolean): Permit ambiguity

## Validation Rules

### Hidden Clue Violation (MYS001)
Detects clues not shown to reader.

**Example Issue:**
```markdown
"The killer's left-handedness gave them away."
// Error: Left-handedness never mentioned before
```

### Impossible Alibi (MYS002)
Flags timeline impossibilities.

**Example Issue:**
```markdown
Murder: 10 PM in London
Suspect alibi: 10 PM in New York // Error: Impossible
```

### Unmotivated Crime (MYS003)
Identifies missing or weak motives.

**Example Issue:**
```markdown
Reveal: The butler did it.
// Error: No motive established for butler
```

### Evidence Chain Break (MYS004)
Tracks physical evidence handling.

**Example Issue:**
```markdown
The poison bottle appeared in evidence.
// Error: Never shown being collected
```

### Red Herring Overload (MYS005)
Warns about excessive misdirection.

**Example Issue:**
```markdown
15 false clues, 2 real clues
// Warning: 88% red herrings exceeds 40% limit
```

## Mystery-Specific Features

### Suspect Database

Track all suspects systematically:

```yaml
suspects:
  tracking:
    introduction: required
    motiveStrength: [weak, moderate, strong]
    opportunity: [none, possible, confirmed]
    means: [no-access, possible-access, confirmed-access]
  elimination:
    requireExplicit: true
    trackOrder: true
```

### Clue Management

Organize evidence and clues:

```yaml
clues:
  categories:
    physical: [weapon, fingerprints, DNA]
    testimonial: [witness, alibi, confession]
    circumstantial: [motive, opportunity]
  weighting:
    definitive: 10
    strong: 7
    moderate: 5
    weak: 2
```

### Timeline Verification

Ensure chronological consistency:

```yaml
timeline:
  trackMovements: true
  validateTravel: true
  weatherConsistency: true
  alibisVsEvidence: cross-check
```

## Best Practices

1. **Plant all clues** before the revelation
2. **Give every suspect** motive and opportunity
3. **Balance red herrings** with real clues
4. **Track the timeline** meticulously
5. **Test reader fairness** - could they solve it?

## Common Issues and Solutions

### Issue: Locked room mysteries
**Solution**: Special validation rules
```yaml
lockedRoom:
  validateMethod: true
  requireFeasibility: true
  noSupernaturalSolutions: true
```

### Issue: Series detectives
**Solution**: Character knowledge tracking
```yaml
seriesDetective:
  trackKnowledge: true
  preventOmniscience: true
  consistentMethods: true
```

## Subgenre Support

### Cozy Mystery
```yaml
cozy:
  violence: off-page
  language: clean
  setting: small-community
  detective: amateur
```

### Police Procedural
```yaml
procedural:
  protocol: strict
  evidence: chain-of-custody
  jurisdiction: validate
  forensics: accurate
```

## Integration with Other Plugins

- Timeline Validator (alibi checking)
- Character Consistency (suspect tracking)
- Plot Consistency (revelation logic)

## Future Enhancements

1. **Interactive clue tracker**
2. **Reader solvability scoring**
3. **Suspect relationship mapping**
4. **Evidence timeline visualization**
5. **Mystery structure templates**
# Screenplay Plugin

**Package**: `@story-linter/plugin-screenplay`
**Author**: Community
**Category**: Specialized

## Overview

The Screenplay Plugin provides specialized validation for screenplays and teleplays, enforcing industry-standard formatting, page count estimates, dialogue-to-action ratios, and production considerations. It supports various screenplay formats and competition requirements.

## Features

### Core Features
- **Format validation** - Enforces screenplay formatting rules
- **Page count estimation** - Calculates runtime estimates
- **Scene heading validation** - Checks sluglines
- **Action line checking** - Monitors description density
- **Dialogue formatting** - Validates character cues
- **Transition validation** - Checks cuts and fades
- **Production elements** - Tracks props and locations

## Configuration

```yaml
plugins:
  screenplay:
    enabled: true
    format:
      style: "standard"  # standard, shooting, competition
      software: "custom"  # final-draft, celtx, custom
      pageCount: true
    elements:
      sceneHeadings: strict
      actionLines: concise
      dialogue: standard
      parentheticals: minimal
      transitions: sparingful
    production:
      trackLocations: true
      trackCharacters: true
      trackProps: true
      budgetConsideration: true
    validation:
      maxActionBlock: 4  # lines
      maxDialogueBlock: 5  # lines
      minSceneLength: 0.125  # pages
```

### Configuration Options

#### `format`
- `style` (string): Screenplay format type
- `software` (string): Expected output format
- `pageCount` (boolean): Calculate page estimates

#### `elements`
- `sceneHeadings` (string): Slugline strictness
- `actionLines` (string): Description style
- `dialogue` (string): Speech formatting
- `parentheticals` (string): Usage level
- `transitions` (string): Transition frequency

#### `production`
- `trackLocations` (boolean): Monitor location count
- `trackCharacters` (boolean): Track speaking roles
- `trackProps` (boolean): Note important props
- `budgetConsideration` (boolean): Flag expensive elements

## Validation Rules

### Format Violation (SCRN001)
Detects improper screenplay formatting.

**Example Issue:**
```
Int. Kitchen - Day  // Error: Should be INT. KITCHEN - DAY
```

### Overwritten Action (SCRN002)
Flags dense action descriptions.

**Example Issue:**
```
Sarah walks into the room, her red dress flowing behind her 
as she navigates through the crowded party, scanning faces 
while trying to appear casual, her heart racing as she 
searches for the man who killed her father.
// Error: Action block too long (4+ lines)
```

### Missing Scene Heading (SCRN003)
Identifies scenes without sluglines.

**Example Issue:**
```
FADE IN:

John enters the office.  // Error: Missing scene heading
```

### Dialogue Format Error (SCRN004)
Checks character cue formatting.

**Example Issue:**
```
john (whispering)  // Error: Should be JOHN (whispering)
  Help me!
```

### Camera Direction Overuse (SCRN005)
Monitors director-specific instructions.

**Example Issue:**
```
CLOSE UP on Sarah's eyes.
PAN TO the window.
ZOOM IN on the letter. // Warning: Excessive camera directions
```

## Screenplay-Specific Features

### Page Count Calculation

Accurate runtime estimation:

```yaml
pageCount:
  formula: "1-page-per-minute"
  adjustments:
    actionHeavy: +10%
    dialogueHeavy: -5%
  targets:
    feature: [90, 120]
    tvHour: [50, 60]
    tvHalf: [22, 25]
```

### Scene Analysis

Track scene elements:

```yaml
scenes:
  analysis:
    dayNightRatio: true
    intExtRatio: true
    averageLength: true
    locationReuse: true
  complexity:
    simple: "INT. single location"
    moderate: "EXT. multiple actors"
    complex: "EXT. NIGHT action sequence"
```

### Character Tracking

Monitor speaking roles:

```yaml
characters:
  speaking:
    count: true
    lines: true
    scenes: true
  nonspeaking:
    significant: true
    background: estimate
```

## Best Practices

1. **Use proper sluglines** for every scene
2. **Keep action concise** and visual
3. **Show don't tell** in descriptions
4. **Minimize parentheticals** in dialogue
5. **Avoid camera directions** unless directing

## Common Issues and Solutions

### Issue: Novel-style descriptions
**Solution**: Configure concise action
```yaml
actionLines:
  maxAdjectives: 2
  noInternalThoughts: true
  presentTense: required
```

### Issue: Stage play dialogue
**Solution**: Enforce visual storytelling
```yaml
dialogue:
  maxMonologue: 5  # lines
  requireVisualBreaks: true
```

## Format Variations

### Competition Format
```yaml
competition:
  anonymous: true
  noContactInfo: true
  strictPageCount: true
  titlePage: required
```

### Shooting Script
```yaml
shooting:
  sceneNumbers: true
  revisionColors: true
  productionNotes: allowed
```

### Television Format
```yaml
television:
  actBreaks: required
  teaserTag: true
  commercialBreaks: 4
```

## Integration with Other Plugins

- Dialogue Plugin (enhanced for screenplay)
- Metadata Plugin (production information)
- Character Consistency (cast tracking)

## Future Enhancements

1. **Industry-standard PDF export**
2. **Production board generation**
3. **Budget estimation tools**
4. **Table read simulator**
5. **Coverage report generator**
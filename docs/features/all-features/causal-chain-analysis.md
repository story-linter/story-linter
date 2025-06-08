# Causal Chain Analysis

## Overview

Causal Chain Analysis tracks and validates cause-and-effect relationships throughout a narrative, ensuring logical consistency in how events influence each other. This feature maps the complex web of causality in stories, detecting broken chains, circular dependencies, and impossible causal relationships.

## Key Capabilities

### 1. Cause-Effect Mapping
- Automatically identifies causal relationships in narrative
- Builds comprehensive causality graphs
- Tracks direct and indirect consequences
- Maps ripple effects through story events

### 2. Chain Validation
- Ensures all effects have valid causes
- Validates temporal ordering of cause and effect
- Detects missing links in causal chains
- Identifies over-determined events (too many causes)

### 3. Consequence Tracking
- Follows consequences through multiple story beats
- Validates that established consequences occur
- Tracks abandoned plot threads
- Ensures Chekhov's gun principle compliance

### 4. Motivation Analysis
- Links character actions to their motivations
- Validates that motivations lead to expected actions
- Detects unmotivated character behaviors
- Tracks motivation evolution through events

## Use Cases

### Plot Consistency
- Ensures plot events follow logically
- Validates that setups have payoffs
- Detects plot holes in causal logic
- Tracks foreshadowing fulfillment

### Character Development
- Validates character growth through events
- Ensures traumatic events have consequences
- Links character decisions to their experiences
- Tracks personality changes to their causes

### Mystery/Crime Fiction
- Validates crime scene evidence chains
- Ensures clues lead to logical conclusions
- Tracks red herrings and their resolution
- Validates alibi logic and timeline consistency

### World-Building Consistency
- Ensures world rules have consistent effects
- Validates magical/technological consequences
- Tracks societal cause-and-effect relationships
- Monitors environmental chain reactions

## Technical Implementation

### Data Model
```typescript
interface CausalEvent {
  id: string;
  type: 'action' | 'event' | 'decision' | 'consequence';
  description: string;
  position: NarrativePosition;
  actors: string[];  // Characters involved
  confidence: number;  // How certain the causal link is
}

interface CausalLink {
  cause: string;  // Event ID
  effect: string;  // Event ID
  type: CausalType;
  strength: 'weak' | 'moderate' | 'strong' | 'necessary';
  delay: TemporalDuration;
  intermediateSteps: string[];
}

enum CausalType {
  DIRECT = 'direct',           // A directly causes B
  ENABLING = 'enabling',       // A makes B possible
  PREVENTIVE = 'preventive',   // A prevents B
  PROBABILISTIC = 'probabilistic', // A makes B likely
  MOTIVATIONAL = 'motivational'    // A motivates character to do B
}

interface CausalChain {
  id: string;
  events: CausalEvent[];
  links: CausalLink[];
  validation: ChainValidation;
}
```

### Analysis Algorithms

#### Causal Graph Construction
1. Extract events and actions from narrative
2. Identify causal language markers
3. Build directed graph of relationships
4. Weight edges by causal strength
5. Detect cycles and validate ordering

#### Chain Validation
1. Topological sort of causal graph
2. Verify temporal consistency
3. Check for orphaned effects
4. Validate chain completeness
5. Assess overall causal coherence

## Dependencies

### Required Components
- **Story vs Narrative Time Tracking**: For temporal ordering
- **Event Detection**: To identify causal events
- **Natural Language Processing**: For causal marker detection
- **Character Tracking**: For motivation analysis

### Integration Points
- Feeds into Plot Consistency validation
- Critical for Paradox Detection
- Provides data for Timeline Visualization
- Works with Information Revelation for knowledge-based causation

## Output Formats

### Causality Report
```json
{
  "causalChains": [
    {
      "id": "revenge-plot",
      "startEvent": "Brother's death in Chapter 2",
      "endEvent": "Villain's defeat in Chapter 20",
      "linkCount": 15,
      "strength": "strong",
      "validation": "complete"
    }
  ],
  "brokenChains": [
    {
      "effect": "Character knows secret location",
      "missingCause": "No explanation how character learned this",
      "position": "Chapter 8, Page 145",
      "severity": "major"
    }
  ],
  "circularDependencies": [
    {
      "events": ["A causes B", "B causes C", "C causes A"],
      "type": "temporal-paradox"
    }
  ],
  "unmotivatedActions": [
    {
      "character": "John",
      "action": "Betrays lifelong friend",
      "position": "Chapter 12",
      "issue": "No established motivation"
    }
  ]
}
```

### Visual Causality Graph
- Interactive node graph of events
- Color-coded causal strength
- Highlighted broken chains
- Temporal flow visualization
- Filterable by character or plot thread

## Configuration

```yaml
causal-chain-analysis:
  enabled: true
  sensitivity: medium  # low, medium, high
  causal-markers:
    - "because"
    - "therefore"
    - "as a result"
    - "led to"
    - "caused"
    - "triggered"
  validation:
    require-explicit-causes: false
    allow-probabilistic: true
    minimum-chain-strength: weak
  tracking:
    track-motivations: true
    track-consequences: true
    track-world-effects: true
  reporting:
    include-suggestions: true
    visualize-graphs: true
```

## Validation Examples

### Valid Causal Chain
```
Chapter 1: Storm damages the bridge
Chapter 2: Characters must take dangerous mountain path
Chapter 3: Mountain path leads to discovering hidden cave
✓ Clear cause-and-effect progression
```

### Broken Causal Chain
```
Chapter 4: Character vows revenge for sister's death
Chapter 10: Character forgives the killer
✗ Missing: What caused the change of heart?
```

### Circular Causality
```
Chapter 5: A sees future where B betrays him
Chapter 6: A attacks B preemptively  
Chapter 7: B betrays A because of the attack
⚠️ Predestination paradox detected
```

## Performance Considerations

- Incremental graph updates on text changes
- Lazy evaluation of complex chains
- Caching of validated subgraphs
- Parallel analysis of independent chains
- Pruning of weak causal links for efficiency

## Future Enhancements

- Machine learning for implicit causation detection
- Emotion-based causality tracking
- Probabilistic causal reasoning
- Cultural context awareness
- Integration with character psychology models

## Related Features

- [Story vs Narrative Time Tracking](./story-vs-narrative-time-tracking.md)
- [Paradox Detection](./paradox-detection.md)
- [Plot Consistency](../built-in/plot-consistency.md)
- [Character Consistency](../built-in/character-consistency.md)
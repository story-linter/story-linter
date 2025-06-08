# Information Revelation Tracking

## Overview

Information Revelation Tracking monitors the flow of information throughout a narrative, ensuring that characters and readers only have access to information that has been properly revealed. This feature prevents logical inconsistencies where characters act on knowledge they shouldn't possess or where the narrative references information not yet available to the reader.

## Key Capabilities

### 1. Knowledge State Management
- Tracks what each character knows at every point in the story
- Maintains a reader knowledge state throughout the narrative
- Monitors information transfer between characters
- Validates that actions are based on available knowledge

### 2. Information Flow Analysis
- Maps how information spreads through the narrative
- Identifies information sources and recipients
- Tracks information revelation methods (dialogue, narration, discovery)
- Detects information leaks and premature revelations

### 3. Character Knowledge Validation
- Ensures characters only know what they've learned
- Validates character decisions against their knowledge state
- Detects impossible knowledge (knowing private thoughts, unseen events)
- Tracks character misconceptions and false beliefs

### 4. Reader Knowledge Tracking
- Monitors what has been revealed to the reader
- Distinguishes between reader and character knowledge
- Validates narrative coherence from reader perspective
- Ensures proper mystery and suspense maintenance

## Use Cases

### Mystery Writing
- Ensures clues are revealed before deductions
- Validates fair play mystery rules
- Tracks red herrings and misdirection
- Prevents detectives from impossible knowledge

### Thriller/Suspense
- Manages dramatic irony (reader knows, character doesn't)
- Validates surprise reveals and plot twists
- Ensures backstory is revealed appropriately
- Tracks what antagonists know about protagonists

### Fantasy/Sci-Fi World-Building
- Monitors gradual world revelation
- Ensures magic/tech rules are explained before use
- Validates that characters understand their world appropriately
- Tracks learning curves for transported/new characters

### Multi-POV Narratives
- Tracks separate knowledge states per viewpoint
- Validates information consistency across POVs
- Manages information asymmetry between characters
- Ensures POV-appropriate knowledge limitations

## Technical Implementation

### Data Model
```typescript
interface InformationUnit {
  id: string;
  content: string;
  type: 'fact' | 'event' | 'secret' | 'rule' | 'backstory';
  source: InformationSource;
  revealedAt: NarrativePosition;
  visibility: 'reader' | 'character' | 'both';
}

interface KnowledgeState {
  position: NarrativePosition;
  characterId?: string;
  knownInformation: Set<string>;
  beliefs: Map<string, Belief>;  // Including false beliefs
  assumptions: Set<string>;
}

interface InformationTransfer {
  from: string;  // Character or 'narrator'
  to: string[];  // Characters or 'reader'
  information: string[];
  method: 'dialogue' | 'action' | 'narration' | 'deduction';
  position: NarrativePosition;
}
```

### Validation Rules
1. Characters cannot act on unknown information
2. Information must have a valid revelation source
3. Private information requires appropriate access
4. Deductions must be based on available clues
5. False beliefs must be explicitly established

## Dependencies

### Required Components
- **Story vs Narrative Time Tracking**: For temporal information flow
- **Character Consistency Validator**: For character identification
- **Natural Language Processing**: For information extraction
- **Dialogue Validator**: For conversation-based revelation

### Integration Points
- Works with Multi-Timeline Analysis for timeline-specific knowledge
- Feeds into Plot Consistency validation
- Provides data for Mystery/Thriller genre validators
- Integrates with Interactive Mode for knowledge debugging

## Output Formats

### Knowledge State Report
```json
{
  "readerKnowledge": {
    "chapter5": {
      "facts": ["murderer identity unknown", "weapon was candlestick"],
      "clues": ["fingerprints found", "alibi contradiction"],
      "redHerrings": ["suspicious gardener behavior"]
    }
  },
  "characterKnowledge": {
    "detective": {
      "knows": ["weapon type", "time of death"],
      "doesNotKnow": ["murderer identity", "motive"],
      "suspects": ["butler", "gardener"]
    }
  },
  "violations": [
    {
      "type": "impossible-knowledge",
      "character": "Watson",
      "position": "Chapter 3, Page 67",
      "description": "References crime scene details before visiting"
    }
  ]
}
```

### Information Flow Diagram
- Visual flowchart of information propagation
- Character knowledge timelines
- Information revelation heatmap
- Knowledge gap identification

## Configuration

```yaml
information-revelation:
  enabled: true
  track-reader-knowledge: true
  track-character-knowledge: true
  validation-mode: strict
  knowledge-types:
    - facts
    - events
    - secrets
    - world-rules
    - character-backstory
  revelation-methods:
    - dialogue
    - narration
    - character-action
    - environmental-clue
    - deduction
  special-cases:
    omniscient-narrator: false
    telepathic-characters: []
    shared-knowledge-groups: []
```

## Performance Considerations

- Incremental knowledge state updates
- Efficient state storage with deltas
- Lazy validation on demand
- Parallel character knowledge tracking
- Smart caching of revelation points

## Validation Examples

### Valid Information Flow
```
Chapter 1: Butler discovers body
Chapter 2: Butler tells Detective about discovery
Chapter 3: Detective investigates based on Butler's information ✓
```

### Invalid Information Flow
```
Chapter 1: Murder occurs in locked room
Chapter 2: Watson describes murder weapon details ✗
(Watson wasn't present and hasn't been told yet)
```

## Future Enhancements

- Machine learning for implicit information inference
- Automatic knowledge graph generation
- Integration with dialogue attribution
- Cultural/contextual knowledge assumptions
- Unreliable narrator detection

## Related Features

- [Story vs Narrative Time Tracking](./story-vs-narrative-time-tracking.md)
- [Character Consistency](../built-in/character-consistency.md)
- [Dialogue Validator](../built-in/dialogue.md)
- [Plot Consistency](../built-in/plot-consistency.md)
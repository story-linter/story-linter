# Story vs Narrative Time Tracking

## Overview

Story vs Narrative Time Tracking is a core temporal analysis feature that distinguishes between two critical timelines in any narrative:

- **Story Time**: The chronological order of events as they occur in the fictional universe
- **Narrative Time**: The order in which events are revealed to the reader

This feature detects temporal inconsistencies, tracks information flow, and ensures narrative coherence without requiring interactive resolution.

## Key Capabilities

### 1. Dual Timeline Construction
- Automatically constructs both story and narrative timelines from text
- Maps relationships between the two timelines
- Identifies temporal shifts (flashbacks, flashforwards, parallel narratives)

### 2. Reading Order Analysis
- Tracks the exact sequence of information revelation
- Builds a reader knowledge state at each point in the narrative
- Validates that narrative uses only previously revealed information

### 3. Temporal Shift Detection
- Identifies and categorizes all time shifts in the narrative
- Distinguishes between flashbacks, flashforwards, and parallel time
- Measures temporal distance of each shift

### 4. Information Flow Validation
- Ensures characters only know information available at their point in story time
- Detects when narrative references future events inappropriately
- Tracks what the reader knows vs what characters know

## Use Cases

### Mystery/Thriller Writing
- Ensures clues are revealed before solutions
- Validates that red herrings don't rely on unknown information
- Tracks when key information becomes available to reader vs detective

### Non-Linear Narratives
- Maps complex timeline structures
- Validates consistency across time jumps
- Ensures each timeline thread maintains internal consistency

### Series/Sequel Management
- Tracks information revealed across multiple books
- Validates that later books don't assume knowledge from future installments
- Maintains series-wide timeline coherence

## Technical Implementation

### Data Model
```typescript
interface TemporalEvent {
  id: string;
  storyTime: Timestamp;      // When it happened
  narrativeTime: Position;   // When it's revealed
  content: string;
  type: 'event' | 'information' | 'character-knowledge';
  references: string[];      // Other events this depends on
}

interface Timeline {
  events: TemporalEvent[];
  shifts: TemporalShift[];
  readerKnowledgeStates: Map<Position, KnowledgeState>;
}
```

### Validation Rules
1. Information cannot be used before it's revealed
2. Character knowledge must respect story time constraints
3. Temporal shifts must be clearly signaled or inferrable
4. Causal chains must respect chronological order

## Dependencies

### Required Components
- **Schema Extraction Engine**: To identify temporal patterns and markers
- **Natural Language Processing**: To extract temporal information from text
- **Event Detection**: To identify discrete events in the narrative

### Integration Points
- Works alongside Timeline Validator for basic chronology
- Feeds into Information Revelation Tracking for detailed analysis
- Provides data for Timeline Visualization

## Output Formats

### Validation Report
```json
{
  "storyTimeline": [...],
  "narrativeTimeline": [...],
  "temporalShifts": [
    {
      "type": "flashback",
      "narrativePosition": "Chapter 3, Page 45",
      "storyTimeJump": "-10 years",
      "clarity": "explicit"
    }
  ],
  "violations": [
    {
      "type": "premature-information",
      "location": "Chapter 2, Page 23",
      "description": "Character references event not yet revealed to reader"
    }
  ]
}
```

### Visual Timeline
- Dual-track timeline showing both story and narrative progression
- Highlighted connections between related events
- Color-coded temporal shifts

## Configuration

```yaml
story-narrative-tracking:
  enabled: true
  detect-flashbacks: true
  detect-flashforwards: true
  track-information-flow: true
  validation-strictness: medium
  temporal-markers:
    - "years ago"
    - "in the future"
    - "meanwhile"
    - "earlier that day"
```

## Performance Considerations

- Incremental analysis on file changes
- Caches timeline construction for unchanged sections
- Parallel processing for large narratives
- Memory-efficient event storage

## Future Enhancements

- Machine learning for implicit temporal shift detection
- Genre-specific temporal pattern recognition
- Integration with Interactive Mode for guided resolution
- Real-time timeline updates during writing

## Related Features

- [Information Revelation Tracking](./information-revelation-tracking.md)
- [Timeline Validator](../built-in/timeline-validator.md)
- [Multi-Timeline Analysis](./multi-timeline-analysis.md)
- [Temporal Pattern Learning](./temporal-pattern-learning.md)
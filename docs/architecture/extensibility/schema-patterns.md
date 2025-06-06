# Schema Patterns

## Overview

Schema patterns define reusable templates and structures for narrative elements, enabling consistent schema extraction and validation across different story formats and genres. This document outlines the pattern system architecture and implementation.

## Pattern Architecture

### Core Pattern Interface

```typescript
interface SchemaPattern<T = any> {
  // Metadata
  id: string
  name: string
  description: string
  category: PatternCategory
  version: string
  
  // Pattern definition
  pattern: PatternDefinition
  
  // Extraction
  extract(content: ParsedContent): T[]
  
  // Validation
  validate?(instance: T): ValidationResult
  
  // Transformation
  transform?(instance: T): NormalizedInstance
  
  // Examples
  examples?: PatternExample[]
}

interface PatternDefinition {
  type: PatternType
  structure: StructureDefinition
  constraints?: PatternConstraint[]
  variations?: PatternVariation[]
}

enum PatternType {
  STRUCTURAL = 'structural',
  SEMANTIC = 'semantic',
  HYBRID = 'hybrid',
  COMPOSITE = 'composite'
}
```

### Pattern Registry

```typescript
class SchemaPatternRegistry {
  private patterns = new Map<string, SchemaPattern>()
  private categories = new Map<PatternCategory, Set<string>>()
  
  register(pattern: SchemaPattern): void {
    // Validate pattern
    this.validatePattern(pattern)
    
    // Check for conflicts
    if (this.patterns.has(pattern.id)) {
      throw new Error(`Pattern ${pattern.id} already registered`)
    }
    
    // Register pattern
    this.patterns.set(pattern.id, pattern)
    
    // Update category index
    const categorySet = this.categories.get(pattern.category) || new Set()
    categorySet.add(pattern.id)
    this.categories.set(pattern.category, categorySet)
    
    // Emit event
    this.events.emit('pattern:registered', {
      id: pattern.id,
      category: pattern.category
    })
  }
  
  getPattern(id: string): SchemaPattern | undefined {
    return this.patterns.get(id)
  }
  
  getPatternsByCategory(category: PatternCategory): SchemaPattern[] {
    const ids = this.categories.get(category) || new Set()
    return Array.from(ids)
      .map(id => this.patterns.get(id))
      .filter(p => p !== undefined) as SchemaPattern[]
  }
}
```

## Character Patterns

### Basic Character Pattern

```typescript
class CharacterIntroductionPattern implements SchemaPattern<Character> {
  id = 'character-introduction'
  name = 'Character Introduction Pattern'
  description = 'Detects character introductions in narrative text'
  category = PatternCategory.CHARACTER
  version = '1.0.0'
  
  pattern: PatternDefinition = {
    type: PatternType.HYBRID,
    structure: {
      markers: [
        'introduced',
        'meet',
        'enters',
        'appears',
        'name is',
        'called'
      ],
      patterns: [
        /(?:introduced|meet|enters) (\w+(?:\s+\w+)?)/i,
        /(\w+(?:\s+\w+)?), a (?:\w+\s+)*(?:man|woman|person|character)/i,
        /(?:name is|called) (\w+(?:\s+\w+)?)/i
      ],
      contextWindow: 50 // words before/after
    }
  }
  
  extract(content: ParsedContent): Character[] {
    const characters: Character[] = []
    
    for (const paragraph of content.paragraphs) {
      const matches = this.findMatches(paragraph.text)
      
      for (const match of matches) {
        const character = this.extractCharacter(match, paragraph)
        
        if (character && this.isValidIntroduction(character, paragraph)) {
          characters.push(character)
        }
      }
    }
    
    return this.deduplicateCharacters(characters)
  }
  
  private extractCharacter(
    match: PatternMatch,
    context: Paragraph
  ): Character | null {
    const name = this.extractName(match)
    if (!name) return null
    
    return {
      id: this.generateId(name),
      name,
      firstMention: {
        file: context.file,
        line: context.line,
        text: match.text
      },
      attributes: this.extractAttributes(match, context),
      confidence: this.calculateConfidence(match)
    }
  }
  
  validate(character: Character): ValidationResult {
    const errors: ValidationError[] = []
    
    // Validate name
    if (!character.name || character.name.length < 2) {
      errors.push({
        field: 'name',
        message: 'Character name too short'
      })
    }
    
    // Check for common false positives
    if (this.isCommonWord(character.name)) {
      errors.push({
        field: 'name',
        message: 'Name appears to be a common word'
      })
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}
```

### Complex Character Pattern

```typescript
class CharacterDevelopmentPattern implements SchemaPattern<CharacterDevelopment> {
  id = 'character-development'
  name = 'Character Development Pattern'
  description = 'Tracks character growth and changes'
  category = PatternCategory.CHARACTER
  version = '2.0.0'
  
  pattern: PatternDefinition = {
    type: PatternType.SEMANTIC,
    structure: {
      stages: [
        'initial-state',
        'catalyst',
        'struggle',
        'revelation',
        'transformation'
      ],
      indicators: {
        growth: [
          'realized', 'understood', 'learned',
          'changed', 'grew', 'developed'
        ],
        regression: [
          'reverted', 'forgot', 'lost',
          'abandoned', 'gave up'
        ]
      }
    },
    constraints: [
      {
        type: 'temporal',
        rule: 'stages must occur in sequence'
      },
      {
        type: 'consistency',
        rule: 'character traits must evolve logically'
      }
    ]
  }
  
  extract(content: ParsedContent): CharacterDevelopment[] {
    const developments: CharacterDevelopment[] = []
    const characters = this.identifyCharacters(content)
    
    for (const character of characters) {
      const timeline = this.buildCharacterTimeline(character, content)
      const stages = this.identifyDevelopmentStages(timeline)
      
      if (stages.length >= 2) {
        developments.push({
          character: character.id,
          stages,
          arc: this.classifyArc(stages),
          confidence: this.calculateArcConfidence(stages)
        })
      }
    }
    
    return developments
  }
  
  private identifyDevelopmentStages(
    timeline: CharacterEvent[]
  ): DevelopmentStage[] {
    const stages: DevelopmentStage[] = []
    
    for (let i = 0; i < timeline.length; i++) {
      const event = timeline[i]
      const context = this.getEventContext(timeline, i)
      
      const stageType = this.classifyStage(event, context)
      if (stageType) {
        stages.push({
          type: stageType,
          event,
          traits: this.extractTraits(event),
          emotions: this.extractEmotions(event),
          beliefs: this.extractBeliefs(event)
        })
      }
    }
    
    return this.consolidateStages(stages)
  }
}
```

## Relationship Patterns

### Basic Relationship Pattern

```typescript
class RelationshipPattern implements SchemaPattern<Relationship> {
  id = 'basic-relationship'
  name = 'Basic Relationship Pattern'
  description = 'Detects relationships between characters'
  category = PatternCategory.RELATIONSHIP
  version = '1.0.0'
  
  pattern: PatternDefinition = {
    type: PatternType.STRUCTURAL,
    structure: {
      templates: [
        '{character1} and {character2}',
        '{character1} with {character2}',
        '{character1} to {character2}',
        "{character1}'s {relationship} {character2}"
      ],
      relationshipTypes: {
        family: ['brother', 'sister', 'mother', 'father', 'parent', 'child'],
        romantic: ['loves', 'married', 'dating', 'engaged'],
        friendship: ['friend', 'companion', 'ally'],
        antagonistic: ['enemy', 'rival', 'opposes']
      }
    }
  }
  
  extract(content: ParsedContent): Relationship[] {
    const relationships: Relationship[] = []
    
    // Extract using templates
    const templateMatches = this.matchTemplates(content)
    relationships.push(...templateMatches)
    
    // Extract using proximity analysis
    const proximityRelations = this.analyzeProximity(content)
    relationships.push(...proximityRelations)
    
    // Extract using dialogue patterns
    const dialogueRelations = this.analyzeDialogue(content)
    relationships.push(...dialogueRelations)
    
    return this.consolidateRelationships(relationships)
  }
  
  private matchTemplates(content: ParsedContent): Relationship[] {
    const relationships: Relationship[] = []
    
    for (const template of this.pattern.structure.templates) {
      const regex = this.templateToRegex(template)
      
      for (const paragraph of content.paragraphs) {
        const matches = paragraph.text.matchAll(regex)
        
        for (const match of matches) {
          const relationship = this.extractFromMatch(match, template)
          if (relationship) {
            relationships.push(relationship)
          }
        }
      }
    }
    
    return relationships
  }
}
```

### Dynamic Relationship Pattern

```typescript
class EvolvingRelationshipPattern implements SchemaPattern<EvolvingRelationship> {
  id = 'evolving-relationship'
  name = 'Evolving Relationship Pattern'
  description = 'Tracks how relationships change over time'
  category = PatternCategory.RELATIONSHIP
  version = '1.0.0'
  
  pattern: PatternDefinition = {
    type: PatternType.SEMANTIC,
    structure: {
      phases: [
        'initial-contact',
        'development',
        'conflict',
        'resolution',
        'new-equilibrium'
      ],
      transitions: {
        positive: ['grew closer', 'bonded', 'reconciled'],
        negative: ['drifted apart', 'betrayed', 'abandoned'],
        neutral: ['changed', 'evolved', 'shifted']
      }
    }
  }
  
  extract(content: ParsedContent): EvolvingRelationship[] {
    const relationships: EvolvingRelationship[] = []
    const staticRelationships = this.getStaticRelationships(content)
    
    for (const rel of staticRelationships) {
      const evolution = this.trackEvolution(rel, content)
      
      if (evolution.phases.length > 1) {
        relationships.push({
          ...rel,
          evolution,
          trajectory: this.calculateTrajectory(evolution),
          stability: this.calculateStability(evolution)
        })
      }
    }
    
    return relationships
  }
}
```

## Timeline Patterns

### Event Sequence Pattern

```typescript
class EventSequencePattern implements SchemaPattern<EventSequence> {
  id = 'event-sequence'
  name = 'Event Sequence Pattern'
  description = 'Identifies sequences of related events'
  category = PatternCategory.TIMELINE
  version = '1.0.0'
  
  pattern: PatternDefinition = {
    type: PatternType.STRUCTURAL,
    structure: {
      sequenceMarkers: [
        'first', 'then', 'next', 'after',
        'before', 'finally', 'subsequently'
      ],
      temporalMarkers: [
        /(\d+) (days?|weeks?|months?|years?) (later|earlier|ago)/,
        /(morning|afternoon|evening|night) of/,
        /at (\d{1,2}):(\d{2})/
      ],
      causalMarkers: [
        'because', 'therefore', 'consequently',
        'as a result', 'leading to'
      ]
    }
  }
  
  extract(content: ParsedContent): EventSequence[] {
    const sequences: EventSequence[] = []
    const events = this.extractEvents(content)
    
    // Build sequences from explicit markers
    const markerSequences = this.buildFromMarkers(events)
    sequences.push(...markerSequences)
    
    // Build sequences from proximity
    const proximitySequences = this.buildFromProximity(events)
    sequences.push(...proximitySequences)
    
    // Build sequences from causality
    const causalSequences = this.buildFromCausality(events)
    sequences.push(...causalSequences)
    
    return this.mergeSequences(sequences)
  }
  
  private buildFromMarkers(events: Event[]): EventSequence[] {
    const sequences: EventSequence[] = []
    let currentSequence: Event[] = []
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i]
      const marker = this.findSequenceMarker(event)
      
      if (marker) {
        currentSequence.push(event)
        
        // Check if sequence is complete
        if (marker === 'finally' || i === events.length - 1) {
          if (currentSequence.length >= 2) {
            sequences.push({
              events: [...currentSequence],
              type: 'explicit',
              confidence: 0.9
            })
          }
          currentSequence = []
        }
      }
    }
    
    return sequences
  }
}
```

## Location Patterns

### Location Description Pattern

```typescript
class LocationPattern implements SchemaPattern<Location> {
  id = 'location-description'
  name = 'Location Description Pattern'
  description = 'Extracts location descriptions and attributes'
  category = PatternCategory.LOCATION
  version = '1.0.0'
  
  pattern: PatternDefinition = {
    type: PatternType.HYBRID,
    structure: {
      indicators: [
        'arrived at', 'entered', 'stood in',
        'found themselves in', 'the room',
        'the place', 'the city', 'the building'
      ],
      descriptors: {
        size: ['vast', 'tiny', 'sprawling', 'cramped'],
        atmosphere: ['dark', 'bright', 'gloomy', 'cheerful'],
        condition: ['ancient', 'modern', 'ruined', 'pristine']
      }
    }
  }
  
  extract(content: ParsedContent): Location[] {
    const locations: Location[] = []
    
    for (const section of content.sections) {
      const candidates = this.findLocationCandidates(section)
      
      for (const candidate of candidates) {
        const location = this.extractLocation(candidate, section)
        
        if (location && this.isValidLocation(location)) {
          locations.push(location)
        }
      }
    }
    
    return this.consolidateLocations(locations)
  }
  
  private extractLocation(
    candidate: LocationCandidate,
    context: Section
  ): Location | null {
    return {
      id: this.generateLocationId(candidate.name),
      name: candidate.name,
      type: this.classifyLocationType(candidate),
      attributes: this.extractAttributes(candidate, context),
      firstMention: {
        file: context.file,
        line: candidate.line,
        description: candidate.text
      },
      connections: this.findConnections(candidate, context)
    }
  }
}
```

## Theme Patterns

### Thematic Element Pattern

```typescript
class ThemePattern implements SchemaPattern<Theme> {
  id = 'thematic-element'
  name = 'Thematic Element Pattern'
  description = 'Identifies recurring themes and motifs'
  category = PatternCategory.THEME
  version = '1.0.0'
  
  pattern: PatternDefinition = {
    type: PatternType.SEMANTIC,
    structure: {
      categories: {
        moral: ['justice', 'truth', 'honor', 'corruption'],
        emotional: ['love', 'loss', 'hope', 'despair'],
        philosophical: ['identity', 'freedom', 'destiny', 'choice'],
        social: ['power', 'inequality', 'community', 'isolation']
      },
      indicators: {
        explicit: ['theme of', 'represents', 'symbolizes'],
        implicit: ['recurring', 'pattern', 'throughout']
      }
    }
  }
  
  extract(content: ParsedContent): Theme[] {
    const themes: Theme[] = []
    
    // Extract explicit themes
    const explicit = this.extractExplicitThemes(content)
    themes.push(...explicit)
    
    // Analyze recurring elements
    const recurring = this.analyzeRecurringElements(content)
    themes.push(...recurring)
    
    // Analyze symbolic patterns
    const symbolic = this.analyzeSymbolicPatterns(content)
    themes.push(...symbolic)
    
    return this.rankThemes(themes)
  }
  
  private analyzeRecurringElements(
    content: ParsedContent
  ): Theme[] {
    const elements = this.identifyElements(content)
    const frequencies = this.calculateFrequencies(elements)
    
    return frequencies
      .filter(f => f.count >= 3) // Minimum occurrences
      .map(f => ({
        id: this.generateThemeId(f.element),
        name: f.element,
        type: 'recurring',
        occurrences: f.locations,
        strength: this.calculateStrength(f),
        category: this.categorizeTheme(f.element)
      }))
  }
}
```

## Composite Patterns

### Story Arc Pattern

```typescript
class StoryArcPattern implements SchemaPattern<StoryArc> {
  id = 'story-arc'
  name = 'Story Arc Pattern'
  description = 'Identifies complete story arcs'
  category = PatternCategory.COMPOSITE
  version = '1.0.0'
  
  pattern: PatternDefinition = {
    type: PatternType.COMPOSITE,
    structure: {
      components: [
        'exposition',
        'rising-action',
        'climax',
        'falling-action',
        'resolution'
      ],
      subpatterns: [
        'character-introduction',
        'conflict-introduction',
        'tension-escalation',
        'climactic-event',
        'conflict-resolution'
      ]
    }
  }
  
  extract(content: ParsedContent): StoryArc[] {
    const arcs: StoryArc[] = []
    
    // Extract component patterns
    const components = this.extractComponents(content)
    
    // Assemble into arcs
    const assembled = this.assembleArcs(components)
    
    // Validate completeness
    const complete = assembled.filter(arc => 
      this.isCompleteArc(arc)
    )
    
    return complete
  }
  
  private assembleArcs(
    components: ArcComponent[]
  ): StoryArc[] {
    const arcs: StoryArc[] = []
    const timeline = this.buildTimeline(components)
    
    // Use dynamic programming to find optimal arc assemblies
    const dp = this.findOptimalArcs(timeline)
    
    for (const assembly of dp) {
      arcs.push({
        id: this.generateArcId(assembly),
        components: assembly,
        completeness: this.calculateCompleteness(assembly),
        coherence: this.calculateCoherence(assembly),
        span: {
          start: assembly[0].position,
          end: assembly[assembly.length - 1].position
        }
      })
    }
    
    return arcs
  }
}
```

## Pattern Matching Engine

### Pattern Matcher

```typescript
class PatternMatcher {
  private patterns: Map<string, CompiledPattern>
  
  async match(
    content: ParsedContent,
    patternIds: string[]
  ): Promise<MatchResult[]> {
    const results: MatchResult[] = []
    
    // Compile patterns if needed
    await this.compilePatterns(patternIds)
    
    // Execute matching
    for (const id of patternIds) {
      const pattern = this.patterns.get(id)
      if (!pattern) continue
      
      const matches = await this.executePattern(pattern, content)
      results.push({
        patternId: id,
        matches,
        coverage: this.calculateCoverage(matches, content)
      })
    }
    
    return results
  }
  
  private async executePattern(
    pattern: CompiledPattern,
    content: ParsedContent
  ): Promise<PatternMatch[]> {
    switch (pattern.type) {
      case PatternType.STRUCTURAL:
        return this.matchStructural(pattern, content)
        
      case PatternType.SEMANTIC:
        return this.matchSemantic(pattern, content)
        
      case PatternType.HYBRID:
        return this.matchHybrid(pattern, content)
        
      case PatternType.COMPOSITE:
        return this.matchComposite(pattern, content)
    }
  }
}
```

### Pattern Optimization

```typescript
class PatternOptimizer {
  optimize(pattern: SchemaPattern): OptimizedPattern {
    const analysis = this.analyzePattern(pattern)
    
    return {
      ...pattern,
      compiled: this.compilePattern(pattern),
      index: this.buildIndex(pattern),
      cache: new PatternCache(analysis.cacheStrategy),
      performance: {
        complexity: analysis.complexity,
        estimatedTime: analysis.estimatedTime,
        memoryUsage: analysis.memoryUsage
      }
    }
  }
  
  private compilePattern(pattern: SchemaPattern): CompiledPattern {
    // Convert patterns to efficient representations
    const compiled: CompiledPattern = {
      id: pattern.id,
      matchers: []
    }
    
    // Compile regex patterns
    if (pattern.pattern.structure.patterns) {
      compiled.matchers.push(
        ...pattern.pattern.structure.patterns.map(p => ({
          type: 'regex',
          value: new RegExp(p, 'gmi'),
          flags: this.optimizeRegexFlags(p)
        }))
      )
    }
    
    // Compile string matchers
    if (pattern.pattern.structure.markers) {
      compiled.matchers.push({
        type: 'string-set',
        value: new Set(pattern.pattern.structure.markers),
        algorithm: 'aho-corasick'
      })
    }
    
    return compiled
  }
}
```

## Pattern Composition

### Pattern Combinations

```typescript
class PatternComposer {
  compose(
    patterns: SchemaPattern[],
    operation: CompositionOperation
  ): SchemaPattern {
    switch (operation) {
      case 'sequence':
        return this.composeSequence(patterns)
        
      case 'parallel':
        return this.composeParallel(patterns)
        
      case 'conditional':
        return this.composeConditional(patterns)
        
      case 'hierarchical':
        return this.composeHierarchical(patterns)
    }
  }
  
  private composeSequence(patterns: SchemaPattern[]): SchemaPattern {
    return {
      id: `sequence-${patterns.map(p => p.id).join('-')}`,
      name: `Sequence of ${patterns.map(p => p.name).join(', ')}`,
      description: 'Sequential pattern composition',
      category: PatternCategory.COMPOSITE,
      version: '1.0.0',
      
      pattern: {
        type: PatternType.COMPOSITE,
        structure: {
          sequence: patterns.map(p => p.pattern)
        }
      },
      
      extract: (content) => {
        const results: any[] = []
        let currentContent = content
        
        for (const pattern of patterns) {
          const extracted = pattern.extract(currentContent)
          if (extracted.length === 0) break
          
          results.push(...extracted)
          currentContent = this.filterContent(currentContent, extracted)
        }
        
        return results
      }
    }
  }
}
```

## Pattern Learning

### Adaptive Patterns

```typescript
class AdaptivePattern implements SchemaPattern {
  private learner: PatternLearner
  private examples: PatternExample[] = []
  
  async learn(examples: PatternExample[]): Promise<void> {
    this.examples.push(...examples)
    
    // Extract features from examples
    const features = await this.learner.extractFeatures(examples)
    
    // Update pattern definition
    this.pattern = await this.learner.generatePattern(features)
    
    // Validate against examples
    const validation = await this.validateAgainstExamples()
    
    if (validation.accuracy < 0.8) {
      // Refine pattern
      await this.refinePattern(validation.errors)
    }
  }
  
  async refinePattern(errors: ValidationError[]): Promise<void> {
    // Analyze errors
    const analysis = this.analyzeErrors(errors)
    
    // Adjust pattern based on analysis
    if (analysis.overMatching) {
      this.tightenConstraints()
    } else if (analysis.underMatching) {
      this.relaxConstraints()
    }
    
    // Add edge cases
    this.addEdgeCases(analysis.edgeCases)
  }
}
```

## Best Practices

### Pattern Design Guidelines

1. **Clarity and Specificity**
   ```typescript
   // Good: Clear, specific pattern
   const dialoguePattern = {
     id: 'dialogue-attribution',
     structure: {
       patterns: [
         /"([^"]+)" said (\w+)/,
         /(\w+) said, "([^"]+)"/
       ]
     }
   }
   
   // Bad: Overly broad pattern
   const vaguePattern = {
     patterns: [/.*/] // Matches everything
   }
   ```

2. **Performance Optimization**
   ```typescript
   // Good: Efficient pattern
   class OptimizedPattern {
     private compiled: RegExp[]
     
     initialize() {
       // Pre-compile patterns
       this.compiled = this.patterns.map(p => new RegExp(p))
     }
   }
   ```

3. **Composability**
   ```typescript
   // Good: Composable patterns
   const characterPattern = new CharacterPattern()
   const dialoguePattern = new DialoguePattern()
   
   const conversationPattern = compose([
     characterPattern,
     dialoguePattern
   ])
   ```

## Future Enhancements

1. **Machine Learning Integration**
   - Neural pattern recognition
   - Automatic pattern generation
   - Pattern effectiveness scoring

2. **Visual Pattern Editor**
   - Drag-and-drop pattern building
   - Live pattern testing
   - Visual debugging tools

3. **Pattern Analytics**
   - Usage statistics
   - Performance metrics
   - Effectiveness tracking

4. **Community Patterns**
   - Pattern sharing platform
   - Collaborative pattern development
   - Pattern versioning and evolution
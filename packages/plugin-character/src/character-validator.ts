import { 
  BaseValidator, 
  type ParsedFile, 
  type ValidationResult,
  type MetadataExtractor,
  type ValidationError,
  type ValidatorConfig
} from '@story-linter/core';

interface CharacterMention {
  name: string;
  location: {
    line: number;
    column: number;
    offset: number;
  };
  context?: 'current' | 'retrospective' | 'dialogue';
}

interface CharacterMetadata {
  mentions: CharacterMention[];
  introductions: string[];
}

interface CharacterInfo {
  name: string;
  aliases: Set<string>;
  firstAppearance?: {
    file: string;
    line: number;
  };
  mentions: Array<{
    file: string;
    line: number;
    context?: string;
  }>;
}

interface CharacterValidatorConfig extends ValidatorConfig {
  nameConsistency?: boolean;
  introductionTracking?: boolean;
  aliasManagement?: boolean;
  contextAwareness?: boolean;
  aliases?: Record<string, string[]>;
}

export class CharacterValidator extends BaseValidator {
  readonly name = 'character-consistency';
  readonly version = '0.1.0';
  
  private characterState = new Map<string, CharacterInfo>();
  private aliasMap = new Map<string, string>(); // alias -> canonical name
  
  /**
   * Define metadata extractors for character information
   */
  getMetadataExtractors(): Record<string, MetadataExtractor> {
    return {
      characters: (content: string, { filePath }) => {
        return this.extractCharacterData(content, filePath);
      }
    };
  }
  
  /**
   * Initialize with configuration
   */
  async initialize(context: any, config: CharacterValidatorConfig): Promise<void> {
    await super.initialize(context, config);
    
    // Set up configured aliases
    if (config.aliases) {
      for (const [canonical, aliases] of Object.entries(config.aliases)) {
        for (const alias of aliases) {
          this.aliasMap.set(alias.toLowerCase(), canonical);
        }
      }
    }
  }
  
  /**
   * Validate character consistency across all files
   */
  async validate(files: ParsedFile[]): Promise<ValidationResult> {
    // Phase 1: Build character state from all files
    this.buildCharacterState(files);
    
    // Phase 2: Validate each file using complete state
    const errors: ValidationError[] = [];
    
    for (const file of files) {
      const fileErrors = this.validateFile(file);
      errors.push(...fileErrors);
    }
    
    return this.createResult(errors);
  }
  
  /**
   * Extract character data from content
   */
  private extractCharacterData(content: string, filePath: string): CharacterMetadata {
    const mentions: CharacterMention[] = [];
    const introductions = new Set<string>();
    
    // Split into lines for line number tracking
    const lines = content.split('\n');
    let offset = 0;
    
    lines.forEach((line, lineIndex) => {
      // Pattern 1: Character introductions (new character appears)
      // "John walked into the room" at start of paragraph
      const introPattern = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:walked|entered|appeared|stood)/;
      const introMatch = line.match(introPattern);
      if (introMatch) {
        const name = introMatch[1];
        introductions.add(name);
        mentions.push({
          name,
          location: {
            line: lineIndex + 1,
            column: 1,
            offset: offset + introMatch.index!
          },
          context: 'current'
        });
      }
      
      // Pattern 2: Retrospective mentions
      // "Remember when Marcus..." or "thinking about Sarah"
      const retroPattern = /(?:remember|thinking about|recalled|thought of)\s+(?:when\s+)?([A-Z][a-z]+)/gi;
      let retroMatch;
      while ((retroMatch = retroPattern.exec(line)) !== null) {
        mentions.push({
          name: retroMatch[1],
          location: {
            line: lineIndex + 1,
            column: retroMatch.index + 1,
            offset: offset + retroMatch.index
          },
          context: 'retrospective'
        });
      }
      
      // Pattern 3: General character mentions
      // Any capitalized name not already caught
      const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
      let nameMatch;
      while ((nameMatch = namePattern.exec(line)) !== null) {
        const name = nameMatch[1];
        // Skip if already processed or is a common word
        if (!this.isCommonWord(name) && 
            !mentions.some(m => m.location.offset === offset + nameMatch.index)) {
          mentions.push({
            name,
            location: {
              line: lineIndex + 1,
              column: nameMatch.index + 1,
              offset: offset + nameMatch.index
            },
            context: 'current'
          });
        }
      }
      
      offset += line.length + 1; // +1 for newline
    });
    
    return {
      mentions,
      introductions: Array.from(introductions)
    };
  }
  
  /**
   * Build complete character state from all files
   */
  private buildCharacterState(files: ParsedFile[]): void {
    this.characterState.clear();
    
    for (const file of files) {
      const metadata = file.metadata as any;
      if (!metadata.characters) continue;
      
      const { mentions, introductions } = metadata.characters as CharacterMetadata;
      
      // Process introductions
      for (const name of introductions) {
        const canonical = this.getCanonicalName(name);
        if (!this.characterState.has(canonical)) {
          this.characterState.set(canonical, {
            name: canonical,
            aliases: new Set([name]),
            firstAppearance: {
              file: file.path,
              line: mentions.find(m => m.name === name)?.location.line || 1
            },
            mentions: []
          });
        }
      }
      
      // Process mentions
      for (const mention of mentions) {
        const canonical = this.getCanonicalName(mention.name);
        let character = this.characterState.get(canonical);
        
        if (!character) {
          character = {
            name: canonical,
            aliases: new Set([mention.name]),
            mentions: []
          };
          this.characterState.set(canonical, character);
        }
        
        character.mentions.push({
          file: file.path,
          line: mention.location.line,
          context: mention.context
        });
        
        // Track potential aliases
        if (mention.name !== canonical) {
          character.aliases.add(mention.name);
        }
      }
    }
  }
  
  /**
   * Validate a single file using complete character state
   */
  private validateFile(file: ParsedFile): ValidationError[] {
    const errors: ValidationError[] = [];
    const metadata = file.metadata as any;
    
    if (!metadata.characters) return errors;
    
    const { mentions } = metadata.characters as CharacterMetadata;
    
    for (const mention of mentions) {
      // Skip retrospective mentions
      if (mention.context === 'retrospective') continue;
      
      const canonical = this.getCanonicalName(mention.name);
      const character = this.characterState.get(canonical);
      
      if (!character) {
        // Unknown character - potential typo
        const similar = this.findSimilarCharacter(mention.name);
        if (similar) {
          errors.push(this.createError(
            'CHAR001',
            `Inconsistent character name: "${mention.name}" might be "${similar}"`,
            file.path,
            mention.location.line,
            mention.location.column
          ));
        }
      } else if (!character.firstAppearance) {
        // Character mentioned but never introduced
        errors.push(this.createError(
          'CHAR002',
          `Character "${mention.name}" mentioned but not introduced`,
          file.path,
          mention.location.line,
          mention.location.column
        ));
      } else if (this.isFileAfter(character.firstAppearance.file, file.path)) {
        // Character mentioned before introduction
        errors.push(this.createError(
          'CHAR002',
          `Character "${mention.name}" mentioned before introduction in ${character.firstAppearance.file}`,
          file.path,
          mention.location.line,
          mention.location.column
        ));
      }
    }
    
    return errors;
  }
  
  /**
   * Get canonical name for a character (handling aliases)
   */
  private getCanonicalName(name: string): string {
    const lower = name.toLowerCase();
    return this.aliasMap.get(lower) || name;
  }
  
  /**
   * Find similar character names (for typo detection)
   */
  private findSimilarCharacter(name: string): string | null {
    const lower = name.toLowerCase();
    
    for (const [canonical, character] of this.characterState) {
      // Check canonical name
      if (this.isSimilar(lower, canonical.toLowerCase())) {
        return canonical;
      }
      
      // Check aliases
      for (const alias of character.aliases) {
        if (this.isSimilar(lower, alias.toLowerCase())) {
          return canonical;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Simple similarity check (could be enhanced with Levenshtein distance)
   */
  private isSimilar(a: string, b: string): boolean {
    // Very simple: check if one is substring of other or differs by 1 char
    if (a.includes(b) || b.includes(a)) return true;
    if (Math.abs(a.length - b.length) > 1) return false;
    
    // Check for single character difference
    let differences = 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) differences++;
    }
    
    return differences <= 1;
  }
  
  /**
   * Check if one file comes after another (simplified)
   */
  private isFileAfter(file1: string, file2: string): boolean {
    // Simple implementation - could be enhanced with actual file ordering
    return file1.localeCompare(file2) > 0;
  }
  
  /**
   * Filter out common words that might be mistaken for names
   */
  private isCommonWord(word: string): boolean {
    const common = new Set([
      'The', 'This', 'That', 'These', 'Those',
      'Chapter', 'Section', 'Part',
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ]);
    
    return common.has(word);
  }
}
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ValidationFramework, FileReaderFactory } from '@story-linter/core';
import { CharacterValidator } from '../../src/character-validator';

describe('CharacterValidator Integration Tests', () => {
  let tempDir: string;
  let framework: ValidationFramework;
  
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'character-validator-test-'));
    framework = new ValidationFramework();
    framework.use(new CharacterValidator());
  });
  
  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
    await framework.destroy();
  });
  
  it('should validate character consistency in a multi-file story', async () => {
    // Arrange - Create test story files
    await writeFile(join(tempDir, 'chapter1.md'), `---
title: Chapter 1
---

# The Beginning

Elizabeth walked into the grand ballroom. The chandeliers sparkled above as she searched for her friend.

"Have you seen Sarah?" she asked a passing waiter.

"No, Miss Liz," he replied. "But I heard she was in the garden."

Elizabeth thanked him and headed outside.`);
    
    await writeFile(join(tempDir, 'chapter2.md'), `---
title: Chapter 2
---

# The Garden

In the garden, Liz found Sarah sitting by the fountain. 

"There you are!" Elizabeth exclaimed. "I've been looking everywhere."

"Sorry, Beth," Sarah said. "I needed some air. Remember when Marcus used to bring us here?"

Jon appeared from behind the hedges. "Did someone mention Marcus?"`);
    
    await writeFile(join(tempDir, 'chapter3.md'), `---
title: Chapter 3  
---

# Revelations

"John, you startled me!" Sarah gasped.

"My apologies," John said. "I couldn't help but overhear about Marcus."

Elizabeth studied him carefully. She had known John since childhood, but something seemed different tonight.`);
    
    // Create config file
    await writeFile(join(tempDir, '.story-linter.yml'), `
validators:
  character-consistency:
    enabled: true
    aliases:
      Elizabeth: ["Liz", "Beth"]
      John: ["Jon"]
`);
    
    // Act
    const result = await framework.validate({
      files: [
        join(tempDir, 'chapter1.md'),
        join(tempDir, 'chapter2.md'),
        join(tempDir, 'chapter3.md')
      ],
      config: tempDir
    });
    
    // Assert
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    // The validator should have:
    // - Recognized Elizabeth/Liz/Beth as the same person
    // - Recognized John/Jon as the same person  
    // - Allowed the retrospective mention of Marcus
    // - Tracked that Elizabeth and Sarah were properly introduced
  });
  
  it('should detect character mentioned before introduction', async () => {
    // Arrange
    await writeFile(join(tempDir, 'story1.md'), `---
title: Part 1
---

David ran through the forest, desperate to find Emma before it was too late.`);
    
    await writeFile(join(tempDir, 'story2.md'), `---
title: Part 2
---

Emma had been hiding in the cave for three days when David finally appeared.`);
    
    // Act
    const result = await framework.validate({
      files: [
        join(tempDir, 'story1.md'),
        join(tempDir, 'story2.md')
      ]
    });
    
    // Assert
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      code: expect.stringContaining('CHAR002'),
      message: expect.stringContaining('Emma'),
      file: join(tempDir, 'story1.md')
    });
  });
  
  it('should detect inconsistent character names', async () => {
    // Arrange
    await writeFile(join(tempDir, 'test1.md'), `
Katherine opened the ancient tome carefully.
    `);
    
    await writeFile(join(tempDir, 'test2.md'), `
"What does it say?" asked Catherine, peering over her shoulder.
    `);
    
    // Act
    const result = await framework.validate({
      files: [
        join(tempDir, 'test1.md'),
        join(tempDir, 'test2.md')
      ]
    });
    
    // Assert
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      code: expect.stringContaining('CHAR001'),
      message: expect.stringContaining('Catherine'),
      message: expect.stringContaining('Katherine')
    });
  });
});
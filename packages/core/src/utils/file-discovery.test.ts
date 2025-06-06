import { describe, it, expect, beforeEach } from 'vitest';
import { FileDiscovery, FileDiscoveryOptions } from './file-discovery';

// TDD - Port interfaces for dependency injection
interface GlobPort {
  glob(pattern: string, options: any): Promise<string[]>;
  hasMagic(pattern: string): boolean;
  minimatch(path: string, pattern: string, options?: any): boolean;
}

interface FileSystemPort {
  stat(path: string): Promise<{ mtime: Date }>;
}

interface PathResolverPort {
  resolve(...paths: string[]): string;
  cwd(): string;
}

// Test doubles implementation
class TestGlob implements GlobPort {
  private matchMap = new Map<string, string[]>();
  
  setMatches(pattern: string, files: string[]): void {
    this.matchMap.set(pattern, files);
  }
  
  async glob(pattern: string, options: any): Promise<string[]> {
    const matches = this.matchMap.get(pattern) || [];
    
    // Apply exclude patterns
    if (options.ignore && options.ignore.length > 0) {
      return matches.filter(file => 
        !options.ignore.some((exclude: string) => {
          // Simple exclusion logic for testing
          if (exclude.includes('node_modules')) return file.includes('node_modules');
          if (exclude.includes('.*')) return file.includes('/.');
          return file.includes(exclude);
        })
      );
    }
    
    return matches;
  }
  
  hasMagic(pattern: string): boolean {
    return pattern.includes('*') || pattern.includes('?') || pattern.includes('[');
  }
  
  minimatch(path: string, pattern: string, options?: any): boolean {
    // Simple implementation for testing
    if (pattern.includes('**/*.md')) {
      return path.endsWith('.md');
    }
    if (pattern.includes('*.txt')) {
      return path.endsWith('.txt');
    }
    return path.includes(pattern.replace(/\*/g, ''));
  }
}

class TestFileSystem implements FileSystemPort {
  private stats = new Map<string, { mtime: Date }>();
  
  setStat(path: string, mtime: Date): void {
    this.stats.set(path, { mtime });
  }
  
  async stat(path: string): Promise<{ mtime: Date }> {
    const stat = this.stats.get(path);
    if (!stat) {
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    }
    return stat;
  }
}

class TestPathResolver implements PathResolverPort {
  private mockCwd = '/test/project';
  
  setCwd(cwd: string): void {
    this.mockCwd = cwd;
  }
  
  resolve(...paths: string[]): string {
    return paths.join('/').replace(/\/+/g, '/');
  }
  
  cwd(): string {
    return this.mockCwd;
  }
}

// The actual tests (TDD - these come FIRST!)
describe('FileDiscovery', () => {
  let fileDiscovery: FileDiscovery;
  let globPort: TestGlob;
  let fileSystem: TestFileSystem;
  let pathResolver: TestPathResolver;

  beforeEach(() => {
    globPort = new TestGlob();
    fileSystem = new TestFileSystem();
    pathResolver = new TestPathResolver();
    // FileDiscovery will be refactored to accept these dependencies
    fileDiscovery = new FileDiscovery(globPort, fileSystem, pathResolver);
  });

  describe('discoverFiles', () => {
    it('should discover files matching include patterns', async () => {
      // Arrange
      const options: FileDiscoveryOptions = {
        include: ['**/*.md'],
        exclude: []
      };
      
      const expectedFiles = [
        '/test/project/story1.md',
        '/test/project/chapters/chapter1.md'
      ];
      
      globPort.setMatches('**/*.md', expectedFiles);
      
      // Set modification times (newest first expected)
      fileSystem.setStat('/test/project/story1.md', new Date('2024-01-02'));
      fileSystem.setStat('/test/project/chapters/chapter1.md', new Date('2024-01-01'));
      
      // Act
      const files = await fileDiscovery.discoverFiles(options);
      
      // Assert
      expect(files).toEqual([
        '/test/project/story1.md',      // newer first
        '/test/project/chapters/chapter1.md'
      ]);
    });

    it('should process multiple include patterns', async () => {
      // Arrange
      const options: FileDiscoveryOptions = {
        include: ['**/*.md', '**/*.txt'],
        exclude: []
      };
      
      globPort.setMatches('**/*.md', ['/test/story.md']);
      globPort.setMatches('**/*.txt', ['/test/notes.txt']);
      
      fileSystem.setStat('/test/story.md', new Date('2024-01-01'));
      fileSystem.setStat('/test/notes.txt', new Date('2024-01-02'));
      
      // Act
      const files = await fileDiscovery.discoverFiles(options);
      
      // Assert
      expect(files).toContain('/test/story.md');
      expect(files).toContain('/test/notes.txt');
      expect(files).toHaveLength(2);
    });

    it('should exclude files matching exclude patterns', async () => {
      // Arrange
      const options: FileDiscoveryOptions = {
        include: ['**/*.md'],
        exclude: ['**/node_modules/**', '**/.*']
      };
      
      const allFiles = [
        '/test/story.md',
        '/test/node_modules/package.md',
        '/test/.hidden.md'
      ];
      
      globPort.setMatches('**/*.md', allFiles);
      fileSystem.setStat('/test/story.md', new Date('2024-01-01'));
      
      // Act
      const files = await fileDiscovery.discoverFiles(options);
      
      // Assert
      expect(files).toEqual(['/test/story.md']);
      expect(files).not.toContain('/test/node_modules/package.md');
      expect(files).not.toContain('/test/.hidden.md');
    });

    it('should use custom base directory', async () => {
      // Arrange
      const options: FileDiscoveryOptions = {
        include: ['*.md'],
        exclude: [],
        baseDir: '/custom/project'
      };
      
      globPort.setMatches('*.md', ['/custom/project/readme.md']);
      fileSystem.setStat('/custom/project/readme.md', new Date('2024-01-01'));
      
      // Act
      const files = await fileDiscovery.discoverFiles(options);
      
      // Assert
      expect(files).toEqual(['/custom/project/readme.md']);
    });

    it('should sort files by modification time (newest first)', async () => {
      // Arrange
      const options: FileDiscoveryOptions = {
        include: ['**/*.md'],
        exclude: []
      };
      
      const files = ['/test/old.md', '/test/new.md', '/test/middle.md'];
      globPort.setMatches('**/*.md', files);
      
      // Set different modification times
      fileSystem.setStat('/test/old.md', new Date('2024-01-01'));
      fileSystem.setStat('/test/new.md', new Date('2024-01-03'));  // newest
      fileSystem.setStat('/test/middle.md', new Date('2024-01-02'));
      
      // Act
      const sortedFiles = await fileDiscovery.discoverFiles(options);
      
      // Assert
      expect(sortedFiles).toEqual([
        '/test/new.md',    // newest first
        '/test/middle.md',
        '/test/old.md'
      ]);
    });

    it('should handle empty include patterns', async () => {
      // Arrange
      const options: FileDiscoveryOptions = {
        include: [],
        exclude: []
      };
      
      // Act
      const files = await fileDiscovery.discoverFiles(options);
      
      // Assert
      expect(files).toEqual([]);
    });

    it('should remove duplicate files from multiple patterns', async () => {
      // Arrange
      const options: FileDiscoveryOptions = {
        include: ['**/*.md', '**/story*'],
        exclude: []
      };
      
      const duplicateFile = '/test/story.md';
      globPort.setMatches('**/*.md', [duplicateFile]);
      globPort.setMatches('**/story*', [duplicateFile]);
      
      fileSystem.setStat(duplicateFile, new Date('2024-01-01'));
      
      // Act
      const files = await fileDiscovery.discoverFiles(options);
      
      // Assert
      expect(files).toEqual([duplicateFile]);
      expect(files).toHaveLength(1); // No duplicates
    });
  });

  describe('matchesPatterns', () => {
    it('should match files against simple patterns', () => {
      // Arrange
      const filePath = '/test/story.md';
      const patterns = ['**/*.md', '*.txt'];
      
      // Act
      const matches = fileDiscovery.matchesPatterns(filePath, patterns);
      
      // Assert
      expect(matches).toBe(true);
    });

    it('should not match files that do not match patterns', () => {
      // Arrange
      const filePath = '/test/image.jpg';
      const patterns = ['**/*.md', '*.txt'];
      
      // Act
      const matches = fileDiscovery.matchesPatterns(filePath, patterns);
      
      // Assert
      expect(matches).toBe(false);
    });

    it('should handle non-glob patterns', () => {
      // Arrange
      const filePath = '/test/story-chapter1.md';
      const patterns = ['story-chapter'];
      
      // Act
      const matches = fileDiscovery.matchesPatterns(filePath, patterns);
      
      // Assert
      expect(matches).toBe(true);
    });

    it('should return false for empty patterns', () => {
      // Arrange
      const filePath = '/test/story.md';
      const patterns: string[] = [];
      
      // Act
      const matches = fileDiscovery.matchesPatterns(filePath, patterns);
      
      // Assert
      expect(matches).toBe(false);
    });
  });
});
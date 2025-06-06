// Port interfaces for dependency injection (SOLID principle)
export interface GlobPort {
  glob(pattern: string, options: any): Promise<string[]>;
  hasMagic(pattern: string): boolean;
  minimatch(path: string, pattern: string, options?: any): boolean;
}

export interface FileSystemPort {
  stat(path: string): Promise<{ mtime: Date }>;
}

export interface PathResolverPort {
  resolve(...paths: string[]): string;
  cwd(): string;
}

export interface FileDiscoveryOptions {
  include: string[];
  exclude: string[];
  baseDir?: string;
  followSymlinks?: boolean;
}

export class FileDiscovery {
  constructor(
    private readonly globPort: GlobPort,
    private readonly fileSystem: FileSystemPort,
    private readonly pathResolver: PathResolverPort
  ) {}
  /**
   * Discover files matching the given patterns
   */
  async discoverFiles(options: FileDiscoveryOptions): Promise<string[]> {
    const { include, exclude, baseDir = this.pathResolver.cwd(), followSymlinks = false } = options;
    
    const allFiles = new Set<string>();
    
    // Process each include pattern
    for (const pattern of include) {
      const matches = await this.globPort.glob(pattern, {
        cwd: baseDir,
        absolute: true,
        ignore: exclude,
        follow: followSymlinks,
        nodir: true, // Only files, not directories
      });
      
      matches.forEach(file => allFiles.add(file));
    }
    
    // Filter and sort
    const files = Array.from(allFiles);
    return this.sortFilesByModificationTime(files);
  }
  
  /**
   * Sort files by modification time (newest first)
   * This helps with incremental validation later
   */
  private async sortFilesByModificationTime(files: string[]): Promise<string[]> {
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const stats = await this.fileSystem.stat(file);
        return { file, mtime: stats.mtime.getTime() };
      })
    );
    
    return fileStats
      .sort((a, b) => b.mtime - a.mtime)
      .map(({ file }) => file);
  }
  
  /**
   * Check if a file matches any of the patterns
   */
  matchesPatterns(filePath: string, patterns: string[]): boolean {
    const absolutePath = this.pathResolver.resolve(filePath);
    
    for (const pattern of patterns) {
      // Use glob's minimatch under the hood
      const matches = this.globPort.hasMagic(pattern) 
        ? this.globPort.minimatch(absolutePath, pattern, { matchBase: true })
        : absolutePath.includes(pattern);
        
      if (matches) return true;
    }
    
    return false;
  }
}
import { glob } from 'glob';
import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';

export interface FileDiscoveryOptions {
  include: string[];
  exclude: string[];
  baseDir?: string;
  followSymlinks?: boolean;
}

export class FileDiscovery {
  /**
   * Discover files matching the given patterns
   */
  async discoverFiles(options: FileDiscoveryOptions): Promise<string[]> {
    const { include, exclude, baseDir = process.cwd(), followSymlinks = false } = options;
    
    const allFiles = new Set<string>();
    
    // Process each include pattern
    for (const pattern of include) {
      const matches = await glob(pattern, {
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
        const stats = await stat(file);
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
    const absolutePath = resolve(filePath);
    
    for (const pattern of patterns) {
      // Use glob's minimatch under the hood
      const matches = glob.hasMagic(pattern) 
        ? glob.minimatch(absolutePath, pattern, { matchBase: true })
        : absolutePath.includes(pattern);
        
      if (matches) return true;
    }
    
    return false;
  }
}
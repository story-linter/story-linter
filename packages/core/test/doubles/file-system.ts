/**
 * Test doubles for file system operations
 * Following the Test Double pattern - no spies!
 */

export interface FileSystemPort {
  readFile(path: string): Promise<string>;
  stat(path: string): Promise<{ size: number; mtime: Date }>;
  exists(path: string): Promise<boolean>;
}

/**
 * Fake implementation with in-memory storage
 */
export class FakeFileSystem implements FileSystemPort {
  private files = new Map<string, { content: string; mtime: Date; size: number }>();
  
  addFile(path: string, content: string, mtime = new Date()): void {
    this.files.set(path, {
      content,
      mtime,
      size: Buffer.byteLength(content, 'utf8'),
    });
  }
  
  async readFile(path: string): Promise<string> {
    const file = this.files.get(path);
    if (!file) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return file.content;
  }
  
  async stat(path: string): Promise<{ size: number; mtime: Date }> {
    const file = this.files.get(path);
    if (!file) {
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    }
    return { size: file.size, mtime: file.mtime };
  }
  
  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }
  
  clear(): void {
    this.files.clear();
  }
}

/**
 * Stub that always returns predefined content
 */
export class StubFileSystem implements FileSystemPort {
  constructor(
    private defaultContent = 'stub content',
    private defaultSize = 100,
    private defaultMtime = new Date('2024-01-01')
  ) {}
  
  async readFile(path: string): Promise<string> {
    return this.defaultContent;
  }
  
  async stat(path: string): Promise<{ size: number; mtime: Date }> {
    return { size: this.defaultSize, mtime: this.defaultMtime };
  }
  
  async exists(path: string): Promise<boolean> {
    return true;
  }
}
# File Format Plugin Architecture

## Overview

File format support in Story Linter should be plugin-based, allowing the community to add support for any format while keeping the core focused on Markdown.

## Design Principles

1. **Plugin-based**: Each file format is a separate plugin
2. **Core focuses on Markdown**: The only built-in format
3. **Community extensible**: Anyone can add new formats
4. **Consistent API**: All formats produce the same parsed structure

## Architecture

### FileFormatPlugin Interface

```typescript
interface FileFormatPlugin {
  name: string;
  version: string;
  
  // File extensions this plugin handles
  extensions: string[];
  
  // MIME types (optional, for better detection)
  mimeTypes?: string[];
  
  // Can this plugin handle this file?
  canHandle(filePath: string, content?: Buffer): Promise<boolean>;
  
  // Parse file into common structure
  parse(content: string | Buffer): Promise<ParsedContent>;
  
  // Extract metadata during streaming (optional)
  getMetadataExtractors?(): Record<string, MetadataExtractor>;
}

interface ParsedContent {
  // Common structure all formats must produce
  format: string;
  content: string;           // Plain text content
  metadata: Metadata;        // Frontmatter, properties, etc.
  structure: DocumentStructure;
  
  // Format-specific data
  raw?: any;
}

interface DocumentStructure {
  headings: Heading[];
  paragraphs: Paragraph[];
  links: Link[];
  emphasis: Emphasis[];
  // ... other common elements
}
```

### Built-in Format: Markdown

```typescript
class MarkdownFormatPlugin implements FileFormatPlugin {
  name = 'markdown';
  extensions = ['.md', '.markdown', '.mdx'];
  
  async parse(content: string): Promise<ParsedContent> {
    const ast = remark.parse(content);
    // Convert AST to common structure
    return {
      format: 'markdown',
      content: extractPlainText(ast),
      metadata: extractFrontmatter(ast),
      structure: extractStructure(ast)
    };
  }
}
```

### Example Community Plugins

#### Google Docs Plugin
```typescript
class GoogleDocsPlugin implements FileFormatPlugin {
  name = 'google-docs';
  extensions = ['.gdoc'];
  
  async parse(content: string): Promise<ParsedContent> {
    // Use Google Docs API to fetch and convert
    const doc = await googleAPI.getDocument(content);
    return convertGoogleDoc(doc);
  }
}
```

#### Word Document Plugin
```typescript
class WordPlugin implements FileFormatPlugin {
  name = 'word';
  extensions = ['.docx', '.doc'];
  
  async parse(content: Buffer): Promise<ParsedContent> {
    // Use mammoth or similar to extract
    const result = await mammoth.extractRawText({buffer: content});
    return {
      format: 'word',
      content: result.value,
      metadata: extractWordMetadata(content),
      structure: parseWordStructure(result)
    };
  }
}
```

#### Plain Text Plugin
```typescript
class PlainTextPlugin implements FileFormatPlugin {
  name = 'plaintext';
  extensions = ['.txt'];
  
  async parse(content: string): Promise<ParsedContent> {
    return {
      format: 'plaintext',
      content: content,
      metadata: {},
      structure: inferStructure(content) // Basic paragraph detection
    };
  }
}
```

## Integration with Core

### FileProcessor Enhancement

```typescript
class FileProcessor {
  private formatPlugins = new Map<string, FileFormatPlugin>();
  
  registerFormat(plugin: FileFormatPlugin): void {
    plugin.extensions.forEach(ext => {
      this.formatPlugins.set(ext, plugin);
    });
  }
  
  async processFile(filePath: string): Promise<ParsedFile> {
    const ext = path.extname(filePath);
    const plugin = this.formatPlugins.get(ext);
    
    if (!plugin) {
      throw new Error(`No format plugin for ${ext}`);
    }
    
    const content = await this.fileSystem.readFile(filePath);
    const parsed = await plugin.parse(content);
    
    return {
      path: filePath,
      ...parsed
    };
  }
}
```

## Benefits

1. **Separation of Concerns**: Core doesn't need to know about Word, Google Docs, etc.
2. **Community Growth**: Authors using Scrivener, Ulysses, etc. can contribute plugins
3. **Focused Development**: We can perfect Markdown support without distraction
4. **Future Proof**: New formats can be added without touching core
5. **Performance**: Only load plugins for formats actually used

## MVP Scope

For MVP, we should:
1. Define the FileFormatPlugin interface
2. Implement only MarkdownFormatPlugin
3. Set up the plugin loading mechanism
4. Document how to create format plugins

Post-MVP:
- Plain text plugin (simple)
- Community can add: Word, Google Docs, Scrivener, LaTeX, etc.

## Configuration

```yaml
# .story-linter.yml
formats:
  # Built-in
  markdown:
    enabled: true
    extensions: ['.md', '.markdown']
  
  # Community plugins (post-MVP)
  '@story-linter/plugin-format-word':
    enabled: true
    config:
      extractComments: true
      
  '@community/scrivener-format':
    enabled: true
    config:
      projectFile: 'MyNovel.scriv'
```

## Technical Considerations

1. **Streaming**: Large Word docs might need streaming support
2. **Binary Formats**: Some formats require Buffer instead of string
3. **External Dependencies**: Word plugin needs `mammoth`, Google needs API keys
4. **Performance**: Cache parsed content, especially for slow formats
5. **Error Handling**: Gracefully handle corrupted/unsupported files
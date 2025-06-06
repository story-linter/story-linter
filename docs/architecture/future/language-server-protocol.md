# Language Server Protocol

## Overview

This document outlines the implementation of a Language Server Protocol (LSP) server for the Story Linter, providing IDE-agnostic support for real-time validation, code completion, hover information, and other language features in story writing environments.

## LSP Architecture

### Server Implementation

```typescript
// lsp/server.ts
import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  CompletionItem,
  CompletionItemKind,
  DiagnosticSeverity,
  Diagnostic,
  Range,
  Position,
  Hover,
  CodeAction,
  CodeActionKind,
  TextDocumentPositionParams,
  DefinitionParams,
  Location,
  DocumentSymbol,
  SymbolKind,
  SemanticTokensBuilder,
  SignatureHelp,
  SignatureInformation,
  ParameterInformation
} from 'vscode-languageserver/node'

import { TextDocument } from 'vscode-languageserver-textdocument'
import { StoryLinter, ValidationEngine, SchemaExtractor } from '@story-linter/core'

export class StoryLinterLanguageServer {
  private connection = createConnection(ProposedFeatures.all)
  private documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)
  private linter: StoryLinter
  private schemaCache = new Map<string, StorySchema>()
  private validationCache = new Map<string, ValidationResult>()
  
  constructor() {
    this.setupHandlers()
    this.documents.listen(this.connection)
    this.connection.listen()
  }
  
  private setupHandlers(): void {
    // Initialize
    this.connection.onInitialize((params: InitializeParams): InitializeResult => {
      return {
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Incremental,
          completionProvider: {
            resolveProvider: true,
            triggerCharacters: ['[', '#', '@', '!']
          },
          hoverProvider: true,
          definitionProvider: true,
          referencesProvider: true,
          documentSymbolProvider: true,
          workspaceSymbolProvider: true,
          codeActionProvider: {
            codeActionKinds: [
              CodeActionKind.QuickFix,
              CodeActionKind.Refactor,
              CodeActionKind.RefactorExtract
            ]
          },
          semanticTokensProvider: {
            legend: {
              tokenTypes: [
                'character', 'location', 'item', 'event',
                'chapter', 'scene', 'dialogue', 'narrative'
              ],
              tokenModifiers: [
                'declaration', 'reference', 'modification',
                'deprecated', 'readonly'
              ]
            },
            full: true,
            range: true
          },
          signatureHelpProvider: {
            triggerCharacters: ['(', ',']
          },
          renameProvider: {
            prepareProvider: true
          },
          foldingRangeProvider: true,
          executeCommandProvider: {
            commands: [
              'story-linter.extractCharacter',
              'story-linter.generateSummary',
              'story-linter.checkConsistency',
              'story-linter.visualizeRelationships'
            ]
          }
        }
      }
    })
    
    // Document change handling
    this.documents.onDidChangeContent(async (change) => {
      await this.validateDocument(change.document)
    })
    
    // Completion
    this.connection.onCompletion(
      (params: TextDocumentPositionParams): CompletionItem[] => {
        return this.provideCompletions(params)
      }
    )
    
    // Hover
    this.connection.onHover(
      (params: TextDocumentPositionParams): Hover | null => {
        return this.provideHover(params)
      }
    )
    
    // Code Actions
    this.connection.onCodeAction((params) => {
      return this.provideCodeActions(params)
    })
    
    // Go to Definition
    this.connection.onDefinition(
      (params: DefinitionParams): Location | Location[] | null => {
        return this.provideDefinition(params)
      }
    )
    
    // Document Symbols
    this.connection.onDocumentSymbol((params) => {
      return this.provideDocumentSymbols(params)
    })
  }
  
  private async validateDocument(document: TextDocument): Promise<void> {
    const uri = document.uri
    const content = document.getText()
    
    try {
      // Extract schema
      const schema = await this.extractSchema(content)
      this.schemaCache.set(uri, schema)
      
      // Run validation
      const result = await this.linter.validate(content, {
        schema,
        enabledValidators: this.getEnabledValidators()
      })
      
      this.validationCache.set(uri, result)
      
      // Convert to diagnostics
      const diagnostics: Diagnostic[] = result.issues.map(issue => ({
        severity: this.getSeverity(issue.severity),
        range: {
          start: document.positionAt(issue.start),
          end: document.positionAt(issue.end)
        },
        message: issue.message,
        source: 'story-linter',
        code: issue.code,
        relatedInformation: issue.related?.map(r => ({
          location: {
            uri: r.file,
            range: {
              start: document.positionAt(r.start),
              end: document.positionAt(r.end)
            }
          },
          message: r.message
        }))
      }))
      
      this.connection.sendDiagnostics({ uri, diagnostics })
    } catch (error) {
      this.connection.console.error(`Validation error: ${error}`)
    }
  }
  
  private provideCompletions(
    params: TextDocumentPositionParams
  ): CompletionItem[] {
    const document = this.documents.get(params.textDocument.uri)
    if (!document) return []
    
    const schema = this.schemaCache.get(params.textDocument.uri)
    if (!schema) return []
    
    const line = document.getText({
      start: { line: params.position.line, character: 0 },
      end: params.position
    })
    
    // Character completions
    if (line.match(/\[@?$/)) {
      return Array.from(schema.characters.values()).map(char => ({
        label: char.name,
        kind: CompletionItemKind.Value,
        detail: char.description,
        documentation: this.formatCharacterInfo(char),
        insertText: char.name + ']'
      }))
    }
    
    // Location completions
    if (line.match(/\[#$/)) {
      return Array.from(schema.locations.values()).map(loc => ({
        label: loc.name,
        kind: CompletionItemKind.Value,
        detail: loc.description,
        insertText: loc.name + ']'
      }))
    }
    
    // Event completions
    if (line.match(/\[!$/)) {
      return Array.from(schema.events.values()).map(event => ({
        label: event.name,
        kind: CompletionItemKind.Event,
        detail: event.description,
        insertText: event.name + ']'
      }))
    }
    
    // Chapter/Scene completions
    if (line.match(/^#+ /)) {
      return this.suggestChapterTitles(document, params.position)
    }
    
    return []
  }
  
  private provideHover(params: TextDocumentPositionParams): Hover | null {
    const document = this.documents.get(params.textDocument.uri)
    if (!document) return null
    
    const schema = this.schemaCache.get(params.textDocument.uri)
    if (!schema) return null
    
    const word = this.getWordAtPosition(document, params.position)
    
    // Check if it's a character
    const character = schema.characters.get(word)
    if (character) {
      return {
        contents: {
          kind: 'markdown',
          value: this.formatCharacterHover(character)
        }
      }
    }
    
    // Check if it's a location
    const location = schema.locations.get(word)
    if (location) {
      return {
        contents: {
          kind: 'markdown',
          value: this.formatLocationHover(location)
        }
      }
    }
    
    // Check validation issues
    const validation = this.validationCache.get(params.textDocument.uri)
    if (validation) {
      const issue = validation.issues.find(i => 
        this.isPositionInRange(params.position, i.range)
      )
      
      if (issue) {
        return {
          contents: {
            kind: 'markdown',
            value: this.formatIssueHover(issue)
          }
        }
      }
    }
    
    return null
  }
  
  private provideCodeActions(params: any): CodeAction[] {
    const document = this.documents.get(params.textDocument.uri)
    if (!document) return []
    
    const validation = this.validationCache.get(params.textDocument.uri)
    if (!validation) return []
    
    const actions: CodeAction[] = []
    
    // Quick fixes for validation issues
    for (const issue of validation.issues) {
      if (this.rangesOverlap(params.range, issue.range)) {
        if (issue.fixes) {
          for (const fix of issue.fixes) {
            actions.push({
              title: fix.title,
              kind: CodeActionKind.QuickFix,
              diagnostics: [this.issueToDiagnostic(issue)],
              edit: {
                changes: {
                  [params.textDocument.uri]: fix.edits
                }
              }
            })
          }
        }
      }
    }
    
    // Refactoring actions
    const word = this.getWordAtPosition(document, params.range.start)
    const schema = this.schemaCache.get(params.textDocument.uri)
    
    if (schema?.characters.has(word)) {
      actions.push({
        title: `Extract character profile: ${word}`,
        kind: CodeActionKind.RefactorExtract,
        command: {
          command: 'story-linter.extractCharacter',
          arguments: [word, params.textDocument.uri]
        }
      })
    }
    
    return actions
  }
}
```

### Client Capabilities

```typescript
// lsp/client-capabilities.ts
export interface StoryLinterClientCapabilities {
  // Extended capabilities
  storyLinter?: {
    // Schema visualization
    schemaVisualization?: {
      supportedFormats: ('mermaid' | 'graphviz' | 'json')[]
    }
    
    // Interactive features
    interactiveValidation?: {
      enabled: boolean
      debounceMs?: number
    }
    
    // AI assistance
    aiAssistance?: {
      enabled: boolean
      features: ('suggestions' | 'completion' | 'analysis')[]
    }
    
    // Custom views
    customViews?: {
      timeline?: boolean
      characterGraph?: boolean
      plotStructure?: boolean
    }
  }
}
```

## Feature Implementations

### Semantic Highlighting

```typescript
// lsp/semantic-tokens.ts
export class SemanticTokensProvider {
  private tokenTypes = [
    'character', 'location', 'item', 'event',
    'chapter', 'scene', 'dialogue', 'narrative'
  ]
  
  private tokenModifiers = [
    'declaration', 'reference', 'modification',
    'deprecated', 'readonly'
  ]
  
  async provideSemanticTokens(
    document: TextDocument,
    schema: StorySchema
  ): Promise<SemanticTokens> {
    const builder = new SemanticTokensBuilder()
    const text = document.getText()
    
    // Tokenize characters
    for (const [name, character] of schema.characters) {
      const regex = new RegExp(`\\b${name}\\b`, 'g')
      let match
      
      while ((match = regex.exec(text)) !== null) {
        const pos = document.positionAt(match.index)
        const isDeclaration = this.isCharacterDeclaration(document, pos)
        
        builder.push(
          pos.line,
          pos.character,
          name.length,
          this.tokenTypes.indexOf('character'),
          isDeclaration ? 
            1 << this.tokenModifiers.indexOf('declaration') : 
            1 << this.tokenModifiers.indexOf('reference')
        )
      }
    }
    
    // Tokenize dialogue
    const dialogueRegex = /"([^"]+)"/g
    let match
    
    while ((match = dialogueRegex.exec(text)) !== null) {
      const pos = document.positionAt(match.index)
      builder.push(
        pos.line,
        pos.character,
        match[0].length,
        this.tokenTypes.indexOf('dialogue'),
        0
      )
    }
    
    // Tokenize chapter headers
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^#+\s+/)) {
        const level = lines[i].match(/^#+/)[0].length
        const tokenType = level === 1 ? 'chapter' : 'scene'
        
        builder.push(
          i,
          0,
          lines[i].length,
          this.tokenTypes.indexOf(tokenType),
          1 << this.tokenModifiers.indexOf('declaration')
        )
      }
    }
    
    return builder.build()
  }
}
```

### Intelligent Code Completion

```typescript
// lsp/intelligent-completion.ts
export class IntelligentCompletionProvider {
  private ai: AICompletionEngine
  private contextAnalyzer: ContextAnalyzer
  
  async provideIntelligentCompletions(
    document: TextDocument,
    position: Position,
    schema: StorySchema
  ): Promise<CompletionItem[]> {
    const context = this.contextAnalyzer.analyze(document, position, schema)
    
    switch (context.type) {
      case 'character-action':
        return this.suggestCharacterActions(context)
        
      case 'scene-transition':
        return this.suggestSceneTransitions(context)
        
      case 'dialogue':
        return this.suggestDialogue(context)
        
      case 'plot-development':
        return this.suggestPlotDevelopments(context)
        
      default:
        return this.suggestGeneral(context)
    }
  }
  
  private async suggestCharacterActions(
    context: CompletionContext
  ): Promise<CompletionItem[]> {
    const character = context.character
    const recentActions = context.getRecentActions(character)
    
    // Generate contextual suggestions
    const suggestions = await this.ai.generateActions({
      character,
      recentActions,
      scene: context.currentScene,
      mood: context.detectMood()
    })
    
    return suggestions.map((suggestion, index) => ({
      label: suggestion.brief,
      kind: CompletionItemKind.Snippet,
      detail: `Action for ${character.name}`,
      documentation: {
        kind: 'markdown',
        value: this.formatActionSuggestion(suggestion)
      },
      insertText: suggestion.text,
      sortText: String(index).padStart(3, '0'),
      additionalTextEdits: suggestion.relatedEdits
    }))
  }
  
  private async suggestDialogue(
    context: CompletionContext
  ): Promise<CompletionItem[]> {
    const speaker = context.currentSpeaker
    const conversation = context.getConversationHistory()
    
    const suggestions = await this.ai.generateDialogue({
      speaker,
      conversation,
      tone: context.detectTone(),
      relationship: context.getRelationship(speaker, context.otherParticipants)
    })
    
    return suggestions.map(suggestion => ({
      label: `"${suggestion.preview}..."`,
      kind: CompletionItemKind.Text,
      detail: `${speaker.name} dialogue`,
      documentation: suggestion.rationale,
      insertText: `"${suggestion.fullText}"`
    }))
  }
}
```

### Refactoring Support

```typescript
// lsp/refactoring.ts
export class RefactoringProvider {
  async provideRefactorings(
    document: TextDocument,
    range: Range,
    schema: StorySchema
  ): Promise<CodeAction[]> {
    const actions: CodeAction[] = []
    const selectedText = document.getText(range)
    
    // Extract character profile
    if (this.isCharacterMention(selectedText, schema)) {
      actions.push({
        title: 'Extract Character Profile',
        kind: CodeActionKind.RefactorExtract,
        command: {
          command: 'story-linter.refactor.extractCharacterProfile',
          arguments: [document.uri, selectedText]
        }
      })
    }
    
    // Extract scene
    if (this.isSceneCandidate(document, range)) {
      actions.push({
        title: 'Extract as Separate Scene',
        kind: CodeActionKind.RefactorExtract,
        command: {
          command: 'story-linter.refactor.extractScene',
          arguments: [document.uri, range]
        }
      })
    }
    
    // Rename character
    if (this.isCharacterName(selectedText, schema)) {
      actions.push({
        title: 'Rename Character',
        kind: CodeActionKind.Refactor,
        command: {
          command: 'story-linter.refactor.renameCharacter',
          arguments: [document.uri, selectedText]
        }
      })
    }
    
    // Convert dialogue style
    if (this.isDialogue(document, range)) {
      actions.push({
        title: 'Convert Dialogue Style',
        kind: CodeActionKind.RefactorRewrite,
        edit: this.createDialogueStyleEdit(document, range)
      })
    }
    
    return actions
  }
  
  async executeRefactoring(
    command: string,
    args: any[]
  ): Promise<WorkspaceEdit> {
    switch (command) {
      case 'story-linter.refactor.extractCharacterProfile':
        return this.extractCharacterProfile(args[0], args[1])
        
      case 'story-linter.refactor.extractScene':
        return this.extractScene(args[0], args[1])
        
      case 'story-linter.refactor.renameCharacter':
        return this.renameCharacter(args[0], args[1])
        
      default:
        throw new Error(`Unknown refactoring command: ${command}`)
    }
  }
  
  private async extractCharacterProfile(
    uri: string,
    characterName: string
  ): Promise<WorkspaceEdit> {
    const document = this.documents.get(uri)
    const schema = this.schemaCache.get(uri)
    
    // Gather all information about the character
    const profile = await this.gatherCharacterInfo(document, schema, characterName)
    
    // Create new document for character profile
    const profileUri = uri.replace(/\.md$/, `-characters/${characterName}.md`)
    const profileContent = this.generateCharacterProfile(profile)
    
    // Create workspace edit
    const edit: WorkspaceEdit = {
      documentChanges: [
        {
          kind: 'create',
          uri: profileUri
        },
        {
          textDocument: { uri: profileUri, version: null },
          edits: [{
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            newText: profileContent
          }]
        }
      ]
    }
    
    return edit
  }
}
```

### Workspace Features

```typescript
// lsp/workspace-features.ts
export class WorkspaceFeatures {
  private workspace: Map<string, TextDocument> = new Map()
  private projectSchema: ProjectSchema
  
  async provideWorkspaceSymbols(query: string): Promise<SymbolInformation[]> {
    const symbols: SymbolInformation[] = []
    
    for (const [uri, document] of this.workspace) {
      const schema = await this.extractSchema(document)
      
      // Search characters
      for (const [name, character] of schema.characters) {
        if (name.toLowerCase().includes(query.toLowerCase())) {
          symbols.push({
            name,
            kind: SymbolKind.Class,
            location: {
              uri,
              range: character.declarationRange
            },
            containerName: 'Characters'
          })
        }
      }
      
      // Search locations
      for (const [name, location] of schema.locations) {
        if (name.toLowerCase().includes(query.toLowerCase())) {
          symbols.push({
            name,
            kind: SymbolKind.Namespace,
            location: {
              uri,
              range: location.declarationRange
            },
            containerName: 'Locations'
          })
        }
      }
      
      // Search events
      for (const [name, event] of schema.events) {
        if (name.toLowerCase().includes(query.toLowerCase())) {
          symbols.push({
            name,
            kind: SymbolKind.Event,
            location: {
              uri,
              range: event.declarationRange
            },
            containerName: 'Events'
          })
        }
      }
    }
    
    return symbols
  }
  
  async findReferences(
    uri: string,
    position: Position
  ): Promise<Location[]> {
    const document = this.workspace.get(uri)
    if (!document) return []
    
    const word = this.getWordAtPosition(document, position)
    const references: Location[] = []
    
    // Search all documents
    for (const [docUri, doc] of this.workspace) {
      const text = doc.getText()
      const regex = new RegExp(`\\b${word}\\b`, 'g')
      let match
      
      while ((match = regex.exec(text)) !== null) {
        const start = doc.positionAt(match.index)
        const end = doc.positionAt(match.index + word.length)
        
        references.push({
          uri: docUri,
          range: { start, end }
        })
      }
    }
    
    return references
  }
  
  async renameSymbol(
    uri: string,
    position: Position,
    newName: string
  ): Promise<WorkspaceEdit> {
    const references = await this.findReferences(uri, position)
    const edit: WorkspaceEdit = { changes: {} }
    
    for (const ref of references) {
      if (!edit.changes[ref.uri]) {
        edit.changes[ref.uri] = []
      }
      
      edit.changes[ref.uri].push({
        range: ref.range,
        newText: newName
      })
    }
    
    return edit
  }
}
```

## Custom Protocol Extensions

### Story-Specific Requests

```typescript
// lsp/custom-requests.ts
export namespace StoryLinterRequests {
  export const GetStoryStructure = 'story-linter/getStoryStructure'
  export const ValidateConsistency = 'story-linter/validateConsistency'
  export const GenerateOutline = 'story-linter/generateOutline'
  export const AnalyzeCharacterArc = 'story-linter/analyzeCharacterArc'
  export const VisualizeRelationships = 'story-linter/visualizeRelationships'
  export const GetTimelineEvents = 'story-linter/getTimelineEvents'
  export const SuggestPlotPoints = 'story-linter/suggestPlotPoints'
}

// Request handlers
export class CustomRequestHandlers {
  async handleGetStoryStructure(params: { uri: string }): Promise<StoryStructure> {
    const document = this.documents.get(params.uri)
    const schema = this.schemaCache.get(params.uri)
    
    return {
      acts: this.identifyActs(document),
      chapters: this.extractChapters(document),
      scenes: this.extractScenes(document),
      plotPoints: this.identifyPlotPoints(document, schema),
      characterArcs: this.analyzeCharacterArcs(schema),
      themes: this.extractThemes(document, schema)
    }
  }
  
  async handleAnalyzeCharacterArc(
    params: { uri: string; character: string }
  ): Promise<CharacterArc> {
    const schema = this.projectSchema
    const character = schema.characters.get(params.character)
    
    if (!character) {
      throw new Error(`Character ${params.character} not found`)
    }
    
    const appearances = await this.findCharacterAppearances(character)
    const developments = this.analyzeCharacterDevelopment(appearances)
    const relationships = this.analyzeRelationshipChanges(character, appearances)
    
    return {
      character: params.character,
      introduction: appearances[0],
      keyMoments: developments.keyMoments,
      emotionalJourney: developments.emotions,
      relationshipEvolution: relationships,
      conclusion: appearances[appearances.length - 1],
      arcType: this.classifyArcType(developments)
    }
  }
  
  async handleVisualizeRelationships(
    params: { uri: string; format: 'mermaid' | 'graphviz' | 'json' }
  ): Promise<string> {
    const schema = this.schemaCache.get(params.uri)
    
    switch (params.format) {
      case 'mermaid':
        return this.generateMermaidDiagram(schema)
      case 'graphviz':
        return this.generateGraphvizDiagram(schema)
      case 'json':
        return JSON.stringify(this.generateRelationshipGraph(schema), null, 2)
    }
  }
}
```

### Streaming Validation

```typescript
// lsp/streaming-validation.ts
export class StreamingValidation {
  private activeStreams = new Map<string, ValidationStream>()
  
  async startStreamingValidation(
    uri: string,
    options: StreamingOptions
  ): Promise<void> {
    const stream = new ValidationStream(uri, options)
    this.activeStreams.set(uri, stream)
    
    stream.on('issue', (issue) => {
      this.connection.sendNotification('story-linter/validationIssue', {
        uri,
        issue
      })
    })
    
    stream.on('complete', (result) => {
      this.connection.sendNotification('story-linter/validationComplete', {
        uri,
        result
      })
      this.activeStreams.delete(uri)
    })
    
    stream.start()
  }
  
  cancelStreamingValidation(uri: string): void {
    const stream = this.activeStreams.get(uri)
    if (stream) {
      stream.cancel()
      this.activeStreams.delete(uri)
    }
  }
}

class ValidationStream extends EventEmitter {
  private cancelled = false
  private document: TextDocument
  
  constructor(
    private uri: string,
    private options: StreamingOptions
  ) {
    super()
  }
  
  async start(): Promise<void> {
    const chunks = this.splitIntoChunks(this.document)
    
    for (const [index, chunk] of chunks.entries()) {
      if (this.cancelled) break
      
      // Validate chunk
      const issues = await this.validateChunk(chunk, index)
      
      // Emit issues as they're found
      for (const issue of issues) {
        this.emit('issue', issue)
      }
      
      // Update progress
      this.emit('progress', {
        current: index + 1,
        total: chunks.length,
        percentage: ((index + 1) / chunks.length) * 100
      })
      
      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    if (!this.cancelled) {
      this.emit('complete', this.aggregateResults())
    }
  }
}
```

## Editor Integration Examples

### VS Code Extension

```typescript
// vscode/extension.ts
import * as vscode from 'vscode'
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node'

export function activate(context: vscode.ExtensionContext) {
  const serverModule = context.asAbsolutePath('out/server.js')
  
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ['--nolazy', '--inspect=6009'] }
    }
  }
  
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'markdown' },
      { scheme: 'file', pattern: '**/*.story' }
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.story-linter.json')
    },
    initializationOptions: {
      storyLinter: {
        schemaVisualization: {
          supportedFormats: ['mermaid', 'json']
        },
        interactiveValidation: {
          enabled: true,
          debounceMs: 500
        },
        aiAssistance: {
          enabled: true,
          features: ['suggestions', 'completion']
        },
        customViews: {
          timeline: true,
          characterGraph: true,
          plotStructure: true
        }
      }
    }
  }
  
  const client = new LanguageClient(
    'storyLinter',
    'Story Linter',
    serverOptions,
    clientOptions
  )
  
  // Register custom commands
  context.subscriptions.push(
    vscode.commands.registerCommand('story-linter.showCharacterGraph', async () => {
      const result = await client.sendRequest('story-linter/visualizeRelationships', {
        uri: vscode.window.activeTextEditor?.document.uri.toString(),
        format: 'mermaid'
      })
      
      // Show in webview
      const panel = vscode.window.createWebviewPanel(
        'characterGraph',
        'Character Relationships',
        vscode.ViewColumn.Two,
        { enableScripts: true }
      )
      
      panel.webview.html = generateGraphHTML(result)
    })
  )
  
  client.start()
}
```

### Neovim Integration

```lua
-- nvim/story-linter.lua
local lspconfig = require('lspconfig')
local configs = require('lspconfig.configs')

-- Define the Story Linter LSP configuration
configs.story_linter = {
  default_config = {
    cmd = {'story-linter-lsp', '--stdio'},
    filetypes = {'markdown', 'story'},
    root_dir = lspconfig.util.root_pattern('.story-linter.json', '.git'),
    settings = {
      storyLinter = {
        validation = {
          onType = true,
          debounce = 500
        },
        completion = {
          enabled = true,
          aiAssisted = true
        }
      }
    },
    init_options = {
      storyLinter = {
        schemaVisualization = {
          supportedFormats = {'json'}
        },
        interactiveValidation = {
          enabled = true,
          debounceMs = 500
        }
      }
    }
  }
}

-- Setup with enhanced capabilities
lspconfig.story_linter.setup{
  on_attach = function(client, bufnr)
    -- Enable completion
    vim.api.nvim_buf_set_option(bufnr, 'omnifunc', 'v:lua.vim.lsp.omnifunc')
    
    -- Keybindings
    local opts = { noremap=true, silent=true }
    vim.api.nvim_buf_set_keymap(bufnr, 'n', 'gd', '<cmd>lua vim.lsp.buf.definition()<CR>', opts)
    vim.api.nvim_buf_set_keymap(bufnr, 'n', 'K', '<cmd>lua vim.lsp.buf.hover()<CR>', opts)
    vim.api.nvim_buf_set_keymap(bufnr, 'n', '<leader>ca', '<cmd>lua vim.lsp.buf.code_action()<CR>', opts)
    vim.api.nvim_buf_set_keymap(bufnr, 'n', '<leader>rn', '<cmd>lua vim.lsp.buf.rename()<CR>', opts)
    
    -- Custom Story Linter commands
    vim.api.nvim_buf_set_keymap(bufnr, 'n', '<leader>sc', 
      '<cmd>lua require("story-linter").show_character_info()<CR>', opts)
    vim.api.nvim_buf_set_keymap(bufnr, 'n', '<leader>st', 
      '<cmd>lua require("story-linter").show_timeline()<CR>', opts)
  end,
  capabilities = require('cmp_nvim_lsp').update_capabilities(
    vim.lsp.protocol.make_client_capabilities()
  )
}
```

## Testing LSP Implementation

### LSP Test Framework

```typescript
// test/lsp-test-framework.ts
export class LSPTestFramework {
  private client: TestLanguageClient
  private server: StoryLinterLanguageServer
  
  async initialize(): Promise<void> {
    const [clientTransport, serverTransport] = createMessageTransports()
    
    this.server = new StoryLinterLanguageServer(serverTransport)
    this.client = new TestLanguageClient(clientTransport)
    
    await this.client.initialize({
      rootUri: 'file:///test',
      capabilities: {
        textDocument: {
          completion: { completionItem: { snippetSupport: true } },
          hover: { contentFormat: ['markdown'] },
          codeAction: { codeActionLiteralSupport: { codeActionKind: { valueSet: ['quickfix', 'refactor'] } } }
        }
      }
    })
  }
  
  async testCompletion(): Promise<void> {
    const doc = await this.client.openTextDocument({
      uri: 'file:///test/story.md',
      languageId: 'markdown',
      version: 1,
      text: '# Chapter 1\n\nAlice met [@'
    })
    
    const completions = await this.client.completion({
      textDocument: { uri: doc.uri },
      position: { line: 2, character: 12 }
    })
    
    assert(completions.items.length > 0)
    assert(completions.items.some(item => item.label === 'Bob'))
  }
  
  async testDiagnostics(): Promise<void> {
    const doc = await this.client.openTextDocument({
      uri: 'file:///test/story.md',
      languageId: 'markdown',
      version: 1,
      text: '# Chapter 1\n\nAlice met Bob.\nAlise came back.' // Typo
    })
    
    const diagnostics = await this.client.waitForDiagnostics(doc.uri)
    
    assert(diagnostics.length > 0)
    assert(diagnostics[0].message.includes('Character name inconsistency'))
    assert(diagnostics[0].severity === DiagnosticSeverity.Warning)
  }
}
```

## Future Enhancements

1. **Advanced LSP Features**
   - Inline hints and parameter hints
   - Call hierarchy for story elements
   - Type hierarchy for character relationships
   - Semantic selection and folding

2. **AI-Powered Features**
   - Context-aware autocompletion
   - Style consistency checking
   - Plot hole detection
   - Character voice analysis

3. **Collaborative Features**
   - Multi-cursor support
   - Real-time collaboration
   - Shared workspace state
   - Conflict resolution

4. **Performance Optimizations**
   - Incremental parsing
   - Lazy loading of large documents
   - Distributed validation
   - Caching strategies
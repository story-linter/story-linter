# Output Formatters

## Overview

Output formatters transform validation results and analysis data into various formats for different consumers. This document covers the architecture for creating custom formatters that can produce human-readable reports, machine-readable data, and integration-specific outputs.

## Formatter Architecture

### Core Formatter Interface

```typescript
interface OutputFormatter<TOptions = any> {
  // Metadata
  id: string
  name: string
  description: string
  version: string
  
  // Format information
  format: OutputFormat
  mimeType: string
  fileExtension: string
  
  // Configuration
  defaultOptions?: TOptions
  optionsSchema?: JSONSchema
  
  // Formatting methods
  format(
    results: ValidationResults,
    options: FormatterContext<TOptions>
  ): Promise<FormattedOutput>
  
  formatStream?(
    results: AsyncIterable<ValidationResult>,
    options: FormatterContext<TOptions>
  ): AsyncIterable<string>
  
  // Capabilities
  capabilities?: FormatterCapabilities
}

interface FormatterCapabilities {
  streaming: boolean
  incremental: boolean
  interactive: boolean
  multiFile: boolean
  customizable: boolean
}

interface FormattedOutput {
  content: string | Buffer
  mimeType: string
  encoding?: string
  metadata?: OutputMetadata
}
```

### Formatter Context

```typescript
interface FormatterContext<TOptions = any> {
  // Configuration
  options: TOptions
  config: Configuration
  
  // Output settings
  colorize: boolean
  verbose: boolean
  quiet: boolean
  
  // Environment
  terminal: TerminalInfo
  locale: string
  timezone: string
  
  // Utilities
  theme: Theme
  i18n: Internationalization
  icons: IconSet
}
```

## Text Formatters

### Console Formatter

```typescript
class ConsoleFormatter implements OutputFormatter {
  id = 'console'
  name = 'Console Formatter'
  description = 'Formats output for terminal display'
  version = '1.0.0'
  
  format = OutputFormat.TEXT
  mimeType = 'text/plain'
  fileExtension = '.txt'
  
  defaultOptions = {
    groupBy: 'file',
    showSummary: true,
    showSuggestions: true,
    maxIssuesPerFile: 10
  }
  
  async format(
    results: ValidationResults,
    context: FormatterContext
  ): Promise<FormattedOutput> {
    const output: string[] = []
    
    // Header
    output.push(this.formatHeader(results, context))
    
    // Group and sort issues
    const grouped = this.groupIssues(results.issues, context.options.groupBy)
    
    // Format each group
    for (const [group, issues] of grouped) {
      output.push(this.formatGroup(group, issues, context))
    }
    
    // Summary
    if (context.options.showSummary) {
      output.push(this.formatSummary(results, context))
    }
    
    return {
      content: output.join('\n'),
      mimeType: this.mimeType
    }
  }
  
  private formatGroup(
    group: string,
    issues: ValidationIssue[],
    context: FormatterContext
  ): string {
    const lines: string[] = []
    
    // Group header
    lines.push(this.formatGroupHeader(group, issues.length, context))
    
    // Sort issues by severity and line
    const sorted = this.sortIssues(issues)
    
    // Format each issue
    const limit = context.options.maxIssuesPerFile
    const displayed = sorted.slice(0, limit)
    
    for (const issue of displayed) {
      lines.push(this.formatIssue(issue, context))
    }
    
    // Show truncation message if needed
    if (sorted.length > limit) {
      lines.push(
        context.theme.dim(
          `  ... and ${sorted.length - limit} more issues`
        )
      )
    }
    
    return lines.join('\n')
  }
  
  private formatIssue(
    issue: ValidationIssue,
    context: FormatterContext
  ): string {
    const parts: string[] = []
    
    // Location
    const location = `${issue.file}:${issue.line}:${issue.column}`
    parts.push(context.theme.dim(location))
    
    // Severity icon and color
    const { icon, color } = this.getSeverityStyle(issue.severity, context)
    parts.push(color(`${icon} ${issue.severity}`))
    
    // Message
    parts.push(issue.message)
    
    // Type
    parts.push(context.theme.dim(`(${issue.type})`))
    
    const mainLine = parts.join(' ')
    
    // Add suggestion if available
    if (issue.suggestion && context.options.showSuggestions) {
      return mainLine + '\n' + 
        context.theme.blue(`    💡 ${issue.suggestion}`)
    }
    
    return mainLine
  }
  
  private getSeverityStyle(
    severity: Severity,
    context: FormatterContext
  ): { icon: string; color: (text: string) => string } {
    const styles = {
      error: {
        icon: context.icons.error || '✗',
        color: context.theme.red
      },
      warning: {
        icon: context.icons.warning || '⚠',
        color: context.theme.yellow
      },
      info: {
        icon: context.icons.info || 'ℹ',
        color: context.theme.blue
      }
    }
    
    return styles[severity] || styles.info
  }
}
```

### Markdown Formatter

```typescript
class MarkdownFormatter implements OutputFormatter {
  id = 'markdown'
  name = 'Markdown Formatter'
  description = 'Formats output as Markdown document'
  version = '1.0.0'
  
  format = OutputFormat.MARKDOWN
  mimeType = 'text/markdown'
  fileExtension = '.md'
  
  async format(
    results: ValidationResults,
    context: FormatterContext
  ): Promise<FormattedOutput> {
    const md: string[] = []
    
    // Title and metadata
    md.push('# Validation Report')
    md.push('')
    md.push(this.formatMetadata(results))
    md.push('')
    
    // Executive summary
    md.push('## Summary')
    md.push('')
    md.push(this.formatExecutiveSummary(results))
    md.push('')
    
    // Issues by severity
    md.push('## Issues')
    md.push('')
    
    for (const severity of ['error', 'warning', 'info']) {
      const issues = results.issues.filter(i => i.severity === severity)
      if (issues.length > 0) {
        md.push(`### ${this.capitalize(severity)}s (${issues.length})`)
        md.push('')
        md.push(this.formatIssueTable(issues))
        md.push('')
      }
    }
    
    // Detailed findings
    if (context.options.detailed) {
      md.push('## Detailed Findings')
      md.push('')
      md.push(this.formatDetailedFindings(results))
    }
    
    return {
      content: md.join('\n'),
      mimeType: this.mimeType
    }
  }
  
  private formatIssueTable(issues: ValidationIssue[]): string {
    const rows: string[] = []
    
    // Header
    rows.push('| File | Line | Type | Message |')
    rows.push('|------|------|------|---------|')
    
    // Rows
    for (const issue of issues) {
      rows.push(
        `| ${this.escapeMarkdown(issue.file)} ` +
        `| ${issue.line}:${issue.column} ` +
        `| \`${issue.type}\` ` +
        `| ${this.escapeMarkdown(issue.message)} |`
      )
    }
    
    return rows.join('\n')
  }
  
  private formatExecutiveSummary(results: ValidationResults): string {
    const stats = this.calculateStatistics(results)
    
    return [
      `- **Total Issues**: ${stats.total}`,
      `- **Errors**: ${stats.errors}`,
      `- **Warnings**: ${stats.warnings}`,
      `- **Info**: ${stats.info}`,
      `- **Files Analyzed**: ${stats.filesAnalyzed}`,
      `- **Files with Issues**: ${stats.filesWithIssues}`,
      '',
      this.generateStatusBadge(stats)
    ].join('\n')
  }
  
  private generateStatusBadge(stats: Statistics): string {
    const status = stats.errors > 0 ? 'failing' : 
                  stats.warnings > 0 ? 'warning' : 'passing'
    
    const color = {
      failing: 'red',
      warning: 'yellow',
      passing: 'green'
    }[status]
    
    return `![Validation Status](https://img.shields.io/badge/validation-${status}-${color})`
  }
}
```

## Structured Data Formatters

### JSON Formatter

```typescript
class JSONFormatter implements OutputFormatter {
  id = 'json'
  name = 'JSON Formatter'
  description = 'Formats output as JSON'
  version = '1.0.0'
  
  format = OutputFormat.JSON
  mimeType = 'application/json'
  fileExtension = '.json'
  
  defaultOptions = {
    pretty: true,
    includeMetadata: true,
    includeSchema: false
  }
  
  async format(
    results: ValidationResults,
    context: FormatterContext
  ): Promise<FormattedOutput> {
    const output: any = {
      version: '1.0',
      timestamp: new Date().toISOString()
    }
    
    // Include metadata if requested
    if (context.options.includeMetadata) {
      output.metadata = {
        tool: 'story-linter',
        toolVersion: this.getToolVersion(),
        formatter: this.id,
        formatterVersion: this.version
      }
    }
    
    // Main results
    output.results = {
      summary: this.generateSummary(results),
      issues: results.issues.map(issue => this.serializeIssue(issue)),
      schemas: context.options.includeSchema 
        ? this.serializeSchemas(results.schemas)
        : undefined
    }
    
    // Statistics
    output.statistics = this.calculateStatistics(results)
    
    const json = context.options.pretty
      ? JSON.stringify(output, null, 2)
      : JSON.stringify(output)
    
    return {
      content: json,
      mimeType: this.mimeType
    }
  }
  
  private serializeIssue(issue: ValidationIssue): any {
    return {
      type: issue.type,
      severity: issue.severity,
      message: issue.message,
      file: issue.file,
      location: {
        line: issue.line,
        column: issue.column,
        endLine: issue.endLine,
        endColumn: issue.endColumn
      },
      suggestion: issue.suggestion,
      context: issue.context,
      relatedInformation: issue.relatedFiles?.map(f => ({
        file: f.file,
        line: f.line,
        message: f.message
      }))
    }
  }
}
```

### XML Formatter

```typescript
class XMLFormatter implements OutputFormatter {
  id = 'xml'
  name = 'XML Formatter'
  description = 'Formats output as XML'
  version = '1.0.0'
  
  format = OutputFormat.XML
  mimeType = 'application/xml'
  fileExtension = '.xml'
  
  async format(
    results: ValidationResults,
    context: FormatterContext
  ): Promise<FormattedOutput> {
    const xml = new XMLBuilder({
      declaration: { encoding: 'UTF-8' },
      format: context.options.pretty
    })
    
    const root = xml.element('validationReport', {
      version: '1.0',
      timestamp: new Date().toISOString()
    })
    
    // Summary
    const summary = root.element('summary')
    summary.element('totalIssues').text(results.issues.length.toString())
    summary.element('errors').text(this.countBySeverity(results, 'error').toString())
    summary.element('warnings').text(this.countBySeverity(results, 'warning').toString())
    
    // Issues
    const issues = root.element('issues')
    for (const issue of results.issues) {
      this.serializeIssueXML(issues, issue)
    }
    
    return {
      content: xml.toString(),
      mimeType: this.mimeType
    }
  }
  
  private serializeIssueXML(parent: XMLElement, issue: ValidationIssue): void {
    const elem = parent.element('issue', {
      type: issue.type,
      severity: issue.severity
    })
    
    elem.element('message').text(issue.message)
    elem.element('file').text(issue.file)
    
    const location = elem.element('location')
    location.element('line').text(issue.line.toString())
    location.element('column').text(issue.column.toString())
    
    if (issue.suggestion) {
      elem.element('suggestion').text(issue.suggestion)
    }
  }
}
```

## Integration Formatters

### GitHub Actions Formatter

```typescript
class GitHubActionsFormatter implements OutputFormatter {
  id = 'github-actions'
  name = 'GitHub Actions Formatter'
  description = 'Formats output for GitHub Actions annotations'
  version = '1.0.0'
  
  format = OutputFormat.TEXT
  mimeType = 'text/plain'
  fileExtension = '.txt'
  
  async format(
    results: ValidationResults,
    context: FormatterContext
  ): Promise<FormattedOutput> {
    const lines: string[] = []
    
    for (const issue of results.issues) {
      lines.push(this.formatAnnotation(issue))
    }
    
    // Set output variables
    lines.push(`::set-output name=total-issues::${results.issues.length}`)
    lines.push(`::set-output name=errors::${this.countErrors(results)}`)
    lines.push(`::set-output name=warnings::${this.countWarnings(results)}`)
    
    return {
      content: lines.join('\n'),
      mimeType: this.mimeType
    }
  }
  
  private formatAnnotation(issue: ValidationIssue): string {
    const level = this.mapSeverityToLevel(issue.severity)
    const params: string[] = [
      `file=${issue.file}`,
      `line=${issue.line}`,
      `col=${issue.column}`
    ]
    
    if (issue.endLine) {
      params.push(`endLine=${issue.endLine}`)
    }
    
    if (issue.endColumn) {
      params.push(`endColumn=${issue.endColumn}`)
    }
    
    const annotation = `::{level} ${params.join(',')}::${issue.message}`
    
    return annotation
  }
  
  private mapSeverityToLevel(severity: Severity): string {
    const mapping = {
      error: 'error',
      warning: 'warning',
      info: 'notice'
    }
    
    return mapping[severity] || 'notice'
  }
}
```

### VS Code Problem Matcher Formatter

```typescript
class VSCodeFormatter implements OutputFormatter {
  id = 'vscode'
  name = 'VS Code Problem Matcher Formatter'
  description = 'Formats output for VS Code problem matching'
  version = '1.0.0'
  
  format = OutputFormat.TEXT
  mimeType = 'text/plain'
  fileExtension = '.txt'
  
  async format(
    results: ValidationResults,
    context: FormatterContext
  ): Promise<FormattedOutput> {
    const lines: string[] = []
    
    // Format issues in VS Code expected format
    for (const issue of results.issues) {
      lines.push(
        `${issue.file}:${issue.line}:${issue.column}: ` +
        `${issue.severity}: ${issue.message} [${issue.type}]`
      )
    }
    
    return {
      content: lines.join('\n'),
      mimeType: this.mimeType
    }
  }
}

// Corresponding problem matcher configuration
const vscodeProblemmatcher = {
  "problemMatcher": {
    "owner": "story-linter",
    "fileLocation": ["relative", "${workspaceFolder}"],
    "pattern": {
      "regexp": "^(.*):(\\d+):(\\d+): (error|warning|info): (.*) \\[(.*)\\]$",
      "file": 1,
      "line": 2,
      "column": 3,
      "severity": 4,
      "message": 5,
      "code": 6
    }
  }
}
```

## Report Formatters

### HTML Report Formatter

```typescript
class HTMLReportFormatter implements OutputFormatter {
  id = 'html-report'
  name = 'HTML Report Formatter'
  description = 'Generates interactive HTML reports'
  version = '2.0.0'
  
  format = OutputFormat.HTML
  mimeType = 'text/html'
  fileExtension = '.html'
  
  capabilities = {
    streaming: false,
    incremental: false,
    interactive: true,
    multiFile: true,
    customizable: true
  }
  
  async format(
    results: ValidationResults,
    context: FormatterContext
  ): Promise<FormattedOutput> {
    const template = await this.loadTemplate(context.options.template)
    
    const data = {
      title: 'Story Linter Report',
      timestamp: new Date().toISOString(),
      results: this.prepareResultsData(results),
      charts: this.generateChartData(results),
      config: context.options
    }
    
    const html = await this.renderTemplate(template, data)
    
    return {
      content: html,
      mimeType: this.mimeType
    }
  }
  
  private generateChartData(results: ValidationResults): ChartData {
    return {
      severityDistribution: {
        type: 'pie',
        data: {
          labels: ['Errors', 'Warnings', 'Info'],
          datasets: [{
            data: [
              this.countBySeverity(results, 'error'),
              this.countBySeverity(results, 'warning'),
              this.countBySeverity(results, 'info')
            ],
            backgroundColor: ['#ff6384', '#ffce56', '#36a2eb']
          }]
        }
      },
      issuesByFile: {
        type: 'bar',
        data: this.generateFileDistribution(results)
      },
      issuesByType: {
        type: 'horizontal-bar',
        data: this.generateTypeDistribution(results)
      }
    }
  }
  
  private async renderTemplate(
    template: string,
    data: any
  ): Promise<string> {
    // Use template engine
    const engine = new TemplateEngine({
      helpers: {
        formatDate: (date: string) => new Date(date).toLocaleString(),
        severity: (sev: string) => `<span class="severity-${sev}">${sev}</span>`,
        fileLink: (file: string) => `<a href="#file-${this.hash(file)}">${file}</a>`
      }
    })
    
    return engine.render(template, data)
  }
}
```

### PDF Report Formatter

```typescript
class PDFReportFormatter implements OutputFormatter {
  id = 'pdf-report'
  name = 'PDF Report Formatter'
  description = 'Generates PDF reports'
  version = '1.0.0'
  
  format = OutputFormat.PDF
  mimeType = 'application/pdf'
  fileExtension = '.pdf'
  
  async format(
    results: ValidationResults,
    context: FormatterContext
  ): Promise<FormattedOutput> {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    })
    
    // Title page
    this.renderTitlePage(doc, results)
    
    // Executive summary
    doc.addPage()
    this.renderExecutiveSummary(doc, results)
    
    // Detailed findings
    doc.addPage()
    this.renderDetailedFindings(doc, results)
    
    // Appendices
    if (context.options.includeAppendices) {
      this.renderAppendices(doc, results)
    }
    
    const buffer = await this.finalizePDF(doc)
    
    return {
      content: buffer,
      mimeType: this.mimeType
    }
  }
  
  private renderDetailedFindings(
    doc: PDFDocument,
    results: ValidationResults
  ): void {
    doc.fontSize(16).text('Detailed Findings', { underline: true })
    doc.moveDown()
    
    // Group by file
    const byFile = this.groupByFile(results.issues)
    
    for (const [file, issues] of byFile) {
      // File header
      doc.fontSize(12).fillColor('blue').text(file)
      doc.fontSize(10).fillColor('black')
      
      // Issues table
      const table = {
        headers: ['Line', 'Severity', 'Type', 'Message'],
        rows: issues.map(i => [
          i.line.toString(),
          i.severity,
          i.type,
          this.truncate(i.message, 50)
        ])
      }
      
      this.renderTable(doc, table)
      doc.moveDown()
    }
  }
}
```

## Streaming Formatters

### NDJSON Streaming Formatter

```typescript
class NDJSONStreamFormatter implements OutputFormatter {
  id = 'ndjson-stream'
  name = 'NDJSON Streaming Formatter'
  description = 'Streams results as newline-delimited JSON'
  version = '1.0.0'
  
  format = OutputFormat.NDJSON
  mimeType = 'application/x-ndjson'
  fileExtension = '.ndjson'
  
  capabilities = {
    streaming: true,
    incremental: true,
    interactive: false,
    multiFile: true,
    customizable: false
  }
  
  async *formatStream(
    results: AsyncIterable<ValidationResult>,
    context: FormatterContext
  ): AsyncIterable<string> {
    // Emit header
    yield JSON.stringify({
      type: 'header',
      version: '1.0',
      timestamp: new Date().toISOString()
    }) + '\n'
    
    // Stream results
    for await (const result of results) {
      yield JSON.stringify({
        type: 'result',
        file: result.file,
        issues: result.issues
      }) + '\n'
      
      // Emit progress if verbose
      if (context.verbose) {
        yield JSON.stringify({
          type: 'progress',
          file: result.file,
          processed: true
        }) + '\n'
      }
    }
    
    // Emit footer
    yield JSON.stringify({
      type: 'footer',
      complete: true
    }) + '\n'
  }
}
```

## Custom Formatter Development

### Formatter Builder

```typescript
class FormatterBuilder<T = any> {
  private formatter: Partial<OutputFormatter<T>> = {}
  
  id(id: string): this {
    this.formatter.id = id
    return this
  }
  
  name(name: string): this {
    this.formatter.name = name
    return this
  }
  
  format(format: OutputFormat, mimeType: string, extension: string): this {
    this.formatter.format = format
    this.formatter.mimeType = mimeType
    this.formatter.fileExtension = extension
    return this
  }
  
  options(defaultOptions: T, schema?: JSONSchema): this {
    this.formatter.defaultOptions = defaultOptions
    this.formatter.optionsSchema = schema
    return this
  }
  
  onFormat(handler: FormatHandler<T>): this {
    this.formatter.format = handler
    return this
  }
  
  build(): OutputFormatter<T> {
    this.validate()
    return this.formatter as OutputFormatter<T>
  }
}

// Usage
const customFormatter = new FormatterBuilder()
  .id('custom-csv')
  .name('Custom CSV Formatter')
  .format(OutputFormat.CSV, 'text/csv', '.csv')
  .options({
    delimiter: ',',
    includeHeaders: true
  })
  .onFormat(async (results, context) => {
    const csv = new CSVBuilder(context.options)
    
    if (context.options.includeHeaders) {
      csv.addRow(['File', 'Line', 'Severity', 'Message'])
    }
    
    for (const issue of results.issues) {
      csv.addRow([
        issue.file,
        issue.line,
        issue.severity,
        issue.message
      ])
    }
    
    return {
      content: csv.toString(),
      mimeType: 'text/csv'
    }
  })
  .build()
```

### Formatter Testing

```typescript
class FormatterTester {
  async test(
    formatter: OutputFormatter,
    testCases: FormatterTestCase[]
  ): Promise<TestResults> {
    const results: TestResult[] = []
    
    for (const testCase of testCases) {
      const result = await this.runTestCase(formatter, testCase)
      results.push(result)
    }
    
    return {
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results
    }
  }
  
  private async runTestCase(
    formatter: OutputFormatter,
    testCase: FormatterTestCase
  ): Promise<TestResult> {
    try {
      const output = await formatter.format(
        testCase.input,
        testCase.context
      )
      
      const passed = this.validateOutput(
        output,
        testCase.expected
      )
      
      return {
        name: testCase.name,
        passed,
        output,
        expected: testCase.expected
      }
    } catch (error) {
      return {
        name: testCase.name,
        passed: false,
        error: error.message
      }
    }
  }
}
```

## Formatter Composition

### Composite Formatter

```typescript
class CompositeFormatter implements OutputFormatter {
  constructor(
    private formatters: OutputFormatter[],
    private strategy: CompositionStrategy = 'all'
  ) {}
  
  async format(
    results: ValidationResults,
    context: FormatterContext
  ): Promise<FormattedOutput[]> {
    switch (this.strategy) {
      case 'all':
        return Promise.all(
          this.formatters.map(f => f.format(results, context))
        )
        
      case 'first-success':
        for (const formatter of this.formatters) {
          try {
            return [await formatter.format(results, context)]
          } catch {
            continue
          }
        }
        throw new Error('All formatters failed')
        
      case 'conditional':
        const applicable = this.formatters.filter(f =>
          this.isApplicable(f, context)
        )
        return Promise.all(
          applicable.map(f => f.format(results, context))
        )
    }
  }
}
```

## Performance Optimization

### Lazy Formatting

```typescript
class LazyFormatter implements OutputFormatter {
  async format(
    results: ValidationResults,
    context: FormatterContext
  ): Promise<FormattedOutput> {
    return {
      content: new LazyString(() => this.generateContent(results, context)),
      mimeType: this.mimeType
    }
  }
  
  private *generateContent(
    results: ValidationResults,
    context: FormatterContext
  ): Generator<string> {
    // Generate header
    yield this.generateHeader(results)
    
    // Generate issues lazily
    for (const chunk of this.chunkIssues(results.issues)) {
      yield this.formatChunk(chunk, context)
    }
    
    // Generate footer
    yield this.generateFooter(results)
  }
}

class LazyString {
  constructor(private generator: () => Generator<string>) {}
  
  toString(): string {
    const parts: string[] = []
    for (const part of this.generator()) {
      parts.push(part)
    }
    return parts.join('')
  }
  
  async toStream(): Promise<Readable> {
    const generator = this.generator()
    
    return new Readable({
      read() {
        const { value, done } = generator.next()
        if (done) {
          this.push(null)
        } else {
          this.push(value)
        }
      }
    })
  }
}
```

## Best Practices

### Formatter Guidelines

1. **Consistent Output**
   ```typescript
   // Good: Predictable output
   class ConsistentFormatter {
     format(results: ValidationResults): FormattedOutput {
       // Always sort issues for consistent output
       const sorted = this.sortIssues(results.issues)
       return this.formatSorted(sorted)
     }
   }
   ```

2. **Error Handling**
   ```typescript
   // Good: Graceful error handling
   class RobustFormatter {
     async format(results: ValidationResults): Promise<FormattedOutput> {
       try {
         return await this.doFormat(results)
       } catch (error) {
         // Fallback to simple format
         return this.fallbackFormat(results, error)
       }
     }
   }
   ```

3. **Performance**
   ```typescript
   // Good: Efficient formatting
   class EfficientFormatter {
     private cache = new Map<string, string>()
     
     formatIssue(issue: ValidationIssue): string {
       const key = this.getCacheKey(issue)
       
       if (this.cache.has(key)) {
         return this.cache.get(key)!
       }
       
       const formatted = this.doFormat(issue)
       this.cache.set(key, formatted)
       return formatted
     }
   }
   ```

## Future Enhancements

1. **AI-Powered Formatting**
   - Natural language summaries
   - Intelligent grouping
   - Contextual recommendations

2. **Interactive Formats**
   - Web-based dashboards
   - Real-time updates
   - Collaborative annotations

3. **Format Conversion**
   - Universal format converter
   - Format migration tools
   - Legacy format support

4. **Accessibility**
   - Screen reader optimization
   - High contrast modes
   - Internationalization support
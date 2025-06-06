# End-to-End Testing

## Overview

End-to-end (E2E) testing validates the complete Story Linter system from the user's perspective, ensuring all components work together seamlessly in real-world scenarios. This document outlines comprehensive E2E testing strategies.

## E2E Test Architecture

### Test Framework Setup

```typescript
interface E2ETestFramework {
  // Environment management
  environment: TestEnvironment
  
  // Test runners
  cli: CLITestRunner
  api: APITestRunner
  ui: UITestRunner
  
  // Utilities
  fixtures: E2EFixtures
  assertions: E2EAssertions
  snapshots: SnapshotManager
}

class E2ETestEnvironment {
  private services: Map<string, Service> = new Map()
  private processes: Map<string, ChildProcess> = new Map()
  
  async setup(): Promise<void> {
    // Start database
    await this.startDatabase()
    
    // Start API server
    await this.startAPIServer()
    
    // Initialize file system
    await this.initializeFileSystem()
    
    // Wait for all services to be ready
    await this.waitForServices()
  }
  
  async teardown(): Promise<void> {
    // Stop all processes
    for (const [name, process] of this.processes) {
      await this.stopProcess(name, process)
    }
    
    // Clean up resources
    await this.cleanup()
  }
  
  private async waitForServices(): Promise<void> {
    const checks = [
      () => this.checkDatabase(),
      () => this.checkAPI(),
      () => this.checkFileSystem()
    ]
    
    await Promise.all(checks.map(check => 
      this.retryUntilReady(check, 30000)
    ))
  }
}
```

### CLI Test Runner

```typescript
class CLITestRunner {
  private executable: string
  
  constructor(config: CLIConfig) {
    this.executable = config.executable || 'story-linter'
  }
  
  async run(
    args: string[],
    options: RunOptions = {}
  ): Promise<CLIResult> {
    const { cwd = process.cwd(), env = {} } = options
    
    return new Promise((resolve, reject) => {
      const child = spawn(this.executable, args, {
        cwd,
        env: { ...process.env, ...env }
      })
      
      let stdout = ''
      let stderr = ''
      
      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })
      
      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })
      
      child.on('close', (code) => {
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
          duration: process.hrtime(start)[0] * 1000
        })
      })
      
      child.on('error', reject)
      
      const start = process.hrtime()
    })
  }
  
  async runInteractive(
    args: string[],
    interactions: Interaction[]
  ): Promise<CLIResult> {
    const child = spawn(this.executable, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    const output = new CLIOutput()
    
    child.stdout.on('data', (data) => {
      output.addStdout(data.toString())
      this.checkInteractions(output, interactions, child)
    })
    
    child.stderr.on('data', (data) => {
      output.addStderr(data.toString())
    })
    
    return new Promise((resolve) => {
      child.on('close', (code) => {
        resolve({
          exitCode: code || 0,
          stdout: output.stdout,
          stderr: output.stderr,
          interactions: output.interactions
        })
      })
    })
  }
}
```

## CLI End-to-End Tests

### Basic CLI Operations

```typescript
describe('CLI E2E Tests', () => {
  let runner: CLITestRunner
  let fixtures: E2EFixtures
  
  beforeAll(async () => {
    runner = new CLITestRunner({ executable: './bin/story-linter' })
    fixtures = new E2EFixtures()
  })
  
  describe('Basic Commands', () => {
    it('should show help information', async () => {
      const result = await runner.run(['--help'])
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Usage: story-linter [options]')
      expect(result.stdout).toContain('Commands:')
      expect(result.stdout).toContain('validate')
      expect(result.stdout).toContain('init')
    })
    
    it('should show version', async () => {
      const result = await runner.run(['--version'])
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/)
    })
  })
  
  describe('Validation Command', () => {
    it('should validate a story project', async () => {
      const projectDir = await fixtures.createStoryProject({
        name: 'test-story',
        chapters: [
          { title: 'Beginning', content: 'Alice started her journey.' },
          { title: 'Middle', content: 'She met Bob along the way.' },
          { title: 'End', content: 'They reached their destination.' }
        ]
      })
      
      const result = await runner.run(['validate', projectDir])
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Validation complete')
      expect(result.stdout).toContain('3 files analyzed')
      expect(result.stdout).toContain('0 issues found')
    })
    
    it('should report validation issues', async () => {
      const projectDir = await fixtures.createStoryProject({
        name: 'problematic-story',
        chapters: [
          { 
            title: 'Chapter 1', 
            content: 'Alice met Bob.\n\n' +
                    'Later, Alise talked to Bob.' // Typo
          }
        ]
      })
      
      const result = await runner.run([
        'validate', 
        projectDir,
        '--validator', 'character-consistency'
      ])
      
      expect(result.exitCode).toBe(1)
      expect(result.stdout).toContain('1 issue found')
      expect(result.stdout).toContain('Character name inconsistency')
      expect(result.stdout).toContain('Alice/Alise')
    })
    
    it('should support different output formats', async () => {
      const projectDir = await fixtures.createStoryProject({
        name: 'format-test'
      })
      
      // JSON output
      const jsonResult = await runner.run([
        'validate',
        projectDir,
        '--format', 'json'
      ])
      
      const json = JSON.parse(jsonResult.stdout)
      expect(json).toHaveProperty('results')
      expect(json).toHaveProperty('summary')
      
      // Markdown output
      const mdResult = await runner.run([
        'validate',
        projectDir,
        '--format', 'markdown'
      ])
      
      expect(mdResult.stdout).toContain('# Validation Report')
      expect(mdResult.stdout).toContain('## Summary')
    })
  })
  
  describe('Init Command', () => {
    it('should initialize a new project interactively', async () => {
      const projectDir = await fixtures.createEmptyDirectory()
      
      const result = await runner.runInteractive(
        ['init', projectDir],
        [
          { waitFor: 'Project name:', input: 'My Story\n' },
          { waitFor: 'Author:', input: 'Test Author\n' },
          { waitFor: 'Enable TypeScript?', input: 'y\n' },
          { waitFor: 'validators to enable:', input: '\n' } // Default
        ]
      )
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Project initialized successfully')
      
      // Verify created files
      const configPath = path.join(projectDir, '.story-linter.json')
      const config = await fixtures.readJSON(configPath)
      
      expect(config.project.name).toBe('My Story')
      expect(config.project.author).toBe('Test Author')
      expect(config.typescript).toBe(true)
    })
  })
})
```

### Advanced CLI Scenarios

```typescript
describe('Advanced CLI Scenarios', () => {
  describe('Watch Mode', () => {
    it('should validate on file changes', async () => {
      const projectDir = await fixtures.createStoryProject({
        name: 'watch-test'
      })
      
      // Start watch mode
      const watchProcess = runner.spawn([
        'validate',
        projectDir,
        '--watch'
      ])
      
      // Wait for initial validation
      await watchProcess.waitForOutput('Watching for changes')
      
      // Modify a file
      await fixtures.modifyFile(
        path.join(projectDir, 'chapter1.md'),
        '# Updated Chapter\nNew content here'
      )
      
      // Wait for re-validation
      await watchProcess.waitForOutput('File changed: chapter1.md')
      await watchProcess.waitForOutput('Validation complete')
      
      // Stop watch mode
      await watchProcess.stop()
    })
  })
  
  describe('Fix Mode', () => {
    it('should automatically fix issues', async () => {
      const projectDir = await fixtures.createStoryProject({
        name: 'fix-test',
        chapters: [{
          title: 'Chapter 1',
          content: 'Alice  met   Bob.' // Extra spaces
        }]
      })
      
      // Run with fix
      const result = await runner.run([
        'validate',
        projectDir,
        '--fix'
      ])
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Fixed 1 issue')
      
      // Verify file was fixed
      const content = await fixtures.readFile(
        path.join(projectDir, 'chapter1.md')
      )
      expect(content).toContain('Alice met Bob.')
      expect(content).not.toContain('  ')
    })
  })
})
```

## API End-to-End Tests

### REST API E2E Tests

```typescript
describe('REST API E2E Tests', () => {
  let api: APITestClient
  let auth: AuthHelper
  
  beforeAll(async () => {
    api = new APITestClient({
      baseURL: process.env.API_URL || 'http://localhost:3000'
    })
    auth = new AuthHelper(api)
  })
  
  describe('Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      // Register new user
      const user = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      }
      
      const registerResponse = await api.post('/auth/register', user)
      expect(registerResponse.status).toBe(201)
      
      // Verify email (simulate)
      const verifyToken = await auth.getVerificationToken(user.email)
      const verifyResponse = await api.post('/auth/verify', {
        token: verifyToken
      })
      expect(verifyResponse.status).toBe(200)
      
      // Login
      const loginResponse = await api.post('/auth/login', {
        email: user.email,
        password: user.password
      })
      expect(loginResponse.status).toBe(200)
      expect(loginResponse.data).toHaveProperty('token')
      
      // Use token for authenticated request
      api.setAuthToken(loginResponse.data.token)
      
      const profileResponse = await api.get('/user/profile')
      expect(profileResponse.status).toBe(200)
      expect(profileResponse.data.email).toBe(user.email)
    })
  })
  
  describe('Project Management', () => {
    beforeAll(async () => {
      await auth.loginAsTestUser()
    })
    
    it('should manage project lifecycle', async () => {
      // Create project
      const createResponse = await api.post('/projects', {
        name: 'E2E Test Story',
        description: 'Testing project management'
      })
      expect(createResponse.status).toBe(201)
      
      const projectId = createResponse.data.id
      
      // Upload files
      const files = [
        {
          path: 'chapter1.md',
          content: '# Chapter 1\nContent here'
        },
        {
          path: 'chapter2.md',
          content: '# Chapter 2\nMore content'
        }
      ]
      
      for (const file of files) {
        const uploadResponse = await api.post(
          `/projects/${projectId}/files`,
          file
        )
        expect(uploadResponse.status).toBe(201)
      }
      
      // Run validation
      const validateResponse = await api.post(
        `/projects/${projectId}/validate`
      )
      expect(validateResponse.status).toBe(202) // Accepted
      
      // Poll for results
      let validationComplete = false
      let attempts = 0
      
      while (!validationComplete && attempts < 30) {
        const statusResponse = await api.get(
          `/projects/${projectId}/validation-status`
        )
        
        if (statusResponse.data.status === 'completed') {
          validationComplete = true
          expect(statusResponse.data.results).toBeDefined()
        }
        
        attempts++
        await wait(1000)
      }
      
      expect(validationComplete).toBe(true)
      
      // Delete project
      const deleteResponse = await api.delete(`/projects/${projectId}`)
      expect(deleteResponse.status).toBe(204)
    })
  })
})
```

### WebSocket E2E Tests

```typescript
describe('WebSocket E2E Tests', () => {
  let ws: WebSocketTestClient
  let api: APITestClient
  
  beforeAll(async () => {
    api = new APITestClient()
    await auth.loginAsTestUser()
    
    ws = new WebSocketTestClient({
      url: 'ws://localhost:3000',
      token: api.getAuthToken()
    })
    
    await ws.connect()
  })
  
  afterAll(async () => {
    await ws.disconnect()
  })
  
  it('should receive real-time validation updates', async () => {
    const projectId = await createTestProject()
    
    // Subscribe to project updates
    await ws.send({
      type: 'subscribe',
      channel: `project:${projectId}`
    })
    
    // Start validation via API
    await api.post(`/projects/${projectId}/validate`)
    
    // Collect WebSocket messages
    const messages: any[] = []
    const messageHandler = (msg: any) => messages.push(msg)
    
    ws.on('message', messageHandler)
    
    // Wait for validation to complete
    await waitFor(() => 
      messages.some(m => m.type === 'validation:complete'),
      10000
    )
    
    // Verify message sequence
    const messageTypes = messages.map(m => m.type)
    expect(messageTypes).toContain('validation:started')
    expect(messageTypes).toContain('validation:progress')
    expect(messageTypes).toContain('validation:complete')
    
    // Verify progress updates
    const progressMessages = messages.filter(
      m => m.type === 'validation:progress'
    )
    expect(progressMessages.length).toBeGreaterThan(0)
    
    const lastProgress = progressMessages[progressMessages.length - 1]
    expect(lastProgress.data.progress).toBe(100)
  })
})
```

## UI End-to-End Tests

### Browser-Based E2E Tests

```typescript
describe('Web UI E2E Tests', () => {
  let browser: Browser
  let page: Page
  
  beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false'
    })
  })
  
  afterAll(async () => {
    await browser.close()
  })
  
  beforeEach(async () => {
    page = await browser.newPage()
    await page.goto('http://localhost:3000')
  })
  
  afterEach(async () => {
    await page.close()
  })
  
  describe('Dashboard', () => {
    it('should display project list and allow validation', async () => {
      // Login
      await page.click('[data-testid="login-button"]')
      await page.fill('[name="email"]', 'test@example.com')
      await page.fill('[name="password"]', 'password')
      await page.click('[type="submit"]')
      
      // Wait for dashboard
      await page.waitForSelector('[data-testid="dashboard"]')
      
      // Create new project
      await page.click('[data-testid="new-project-button"]')
      await page.fill('[name="projectName"]', 'UI Test Project')
      await page.click('[data-testid="create-project-submit"]')
      
      // Upload file
      const fileInput = await page.$('[data-testid="file-upload"]')
      await fileInput?.setInputFiles({
        name: 'test.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Test Chapter\nContent here')
      })
      
      // Start validation
      await page.click('[data-testid="validate-button"]')
      
      // Wait for results
      await page.waitForSelector('[data-testid="validation-results"]', {
        timeout: 30000
      })
      
      // Verify results displayed
      const resultsText = await page.textContent(
        '[data-testid="validation-summary"]'
      )
      expect(resultsText).toContain('Validation Complete')
      expect(resultsText).toContain('0 issues')
    })
  })
  
  describe('Editor Integration', () => {
    it('should provide real-time validation feedback', async () => {
      await loginAndNavigateToEditor(page)
      
      // Type content with error
      await page.click('[data-testid="editor"]')
      await page.keyboard.type('# Chapter 1\n\nAlice met Bob.')
      await page.keyboard.press('Enter')
      await page.keyboard.type('Alise said hello.') // Typo
      
      // Wait for validation indicator
      await page.waitForSelector('[data-testid="validation-indicator"]')
      
      // Hover over error
      await page.hover('[data-decoration-type="error"]')
      
      // Verify error tooltip
      const tooltip = await page.waitForSelector('[role="tooltip"]')
      const tooltipText = await tooltip.textContent()
      expect(tooltipText).toContain('Character name inconsistency')
      
      // Apply quick fix
      await page.click('[data-testid="quick-fix-button"]')
      await page.click('[data-action="fix-character-name"]')
      
      // Verify fix applied
      const editorContent = await page.textContent('[data-testid="editor"]')
      expect(editorContent).toContain('Alice said hello.')
      expect(editorContent).not.toContain('Alise')
    })
  })
})
```

### VS Code Extension E2E Tests

```typescript
describe('VS Code Extension E2E Tests', () => {
  let tester: VSCodeExtensionTester
  
  beforeAll(async () => {
    tester = new VSCodeExtensionTester({
      extensionPath: './vscode-extension',
      workspacePath: './test-workspace'
    })
    
    await tester.setup()
  })
  
  afterAll(async () => {
    await tester.cleanup()
  })
  
  it('should provide inline validation', async () => {
    // Open test file
    await tester.openFile('story.md')
    
    // Type content
    await tester.type('# My Story\n\nAlice met Bob.')
    await tester.type('\nAlise came back.') // Typo
    
    // Wait for diagnostics
    await tester.waitForDiagnostics()
    
    // Verify error squiggle
    const diagnostics = await tester.getDiagnostics('story.md')
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]).toMatchObject({
      message: expect.stringContaining('Character name inconsistency'),
      severity: 'Error',
      range: expect.objectContaining({
        start: { line: 3, character: 0 }
      })
    })
    
    // Test code action
    await tester.moveCursor(3, 0)
    const codeActions = await tester.getCodeActions()
    
    const fixAction = codeActions.find(
      a => a.title === 'Fix character name'
    )
    expect(fixAction).toBeDefined()
    
    // Apply fix
    await tester.applyCodeAction(fixAction!)
    
    // Verify fix
    const content = await tester.getDocumentText()
    expect(content).toContain('Alice came back.')
  })
  
  it('should support command palette commands', async () => {
    await tester.openFile('chapter1.md')
    
    // Run validation command
    await tester.executeCommand('storyLinter.validate')
    
    // Wait for output
    const output = await tester.waitForOutput('Story Linter')
    expect(output).toContain('Validation complete')
    
    // Run schema extraction
    await tester.executeCommand('storyLinter.extractSchema')
    
    // Verify schema view opens
    await tester.waitForView('Story Schema')
    const schemaContent = await tester.getViewContent('Story Schema')
    expect(schemaContent).toContain('Characters')
    expect(schemaContent).toContain('Locations')
  })
})
```

## Performance E2E Tests

### Load and Stress Testing

```typescript
describe('Performance E2E Tests', () => {
  let loadTester: LoadTester
  
  beforeAll(() => {
    loadTester = new LoadTester({
      baseURL: 'http://localhost:3000',
      scenarios: loadScenarios
    })
  })
  
  it('should handle concurrent validations', async () => {
    const scenario = {
      name: 'Concurrent Validations',
      vus: 50, // Virtual users
      duration: '30s',
      exec: async (vu: VirtualUser) => {
        // Each user validates their own project
        const project = await vu.createProject()
        await vu.uploadStoryFiles(project.id, 10) // 10 files each
        
        const start = Date.now()
        await vu.runValidation(project.id)
        const duration = Date.now() - start
        
        vu.recordMetric('validation_duration', duration)
      }
    }
    
    const results = await loadTester.run(scenario)
    
    expect(results.metrics.validation_duration.p95).toBeLessThan(5000)
    expect(results.metrics.http_req_failed.rate).toBeLessThan(0.01)
    expect(results.metrics.http_req_duration.p99).toBeLessThan(1000)
  })
  
  it('should maintain performance under sustained load', async () => {
    const scenario = {
      name: 'Sustained Load',
      stages: [
        { duration: '2m', target: 10 },  // Ramp up
        { duration: '5m', target: 100 }, // Stay at 100 users
        { duration: '2m', target: 0 }    // Ramp down
      ],
      exec: async (vu: VirtualUser) => {
        await vu.performMixedOperations()
      }
    }
    
    const results = await loadTester.run(scenario)
    
    // Performance should not degrade over time
    const timeWindows = results.getTimeWindows('1m')
    const responseTimes = timeWindows.map(w => w.metrics.http_req_duration.median)
    
    const maxDegradation = Math.max(...responseTimes) / Math.min(...responseTimes)
    expect(maxDegradation).toBeLessThan(1.5) // Max 50% degradation
  })
})
```

## Security E2E Tests

### Security Scenario Testing

```typescript
describe('Security E2E Tests', () => {
  let securityTester: SecurityTester
  
  beforeAll(() => {
    securityTester = new SecurityTester({
      target: 'http://localhost:3000'
    })
  })
  
  it('should prevent common security vulnerabilities', async () => {
    const vulnerabilities = await securityTester.scan({
      checks: [
        'sql-injection',
        'xss',
        'csrf',
        'path-traversal',
        'xxe',
        'command-injection'
      ]
    })
    
    expect(vulnerabilities).toHaveLength(0)
  })
  
  it('should enforce authentication and authorization', async () => {
    const api = new APITestClient()
    
    // Attempt unauthorized access
    const responses = await Promise.all([
      api.get('/api/projects'),
      api.post('/api/validate', {}),
      api.delete('/api/projects/123')
    ])
    
    responses.forEach(response => {
      expect(response.status).toBe(401)
    })
    
    // Test authorization with wrong user
    const user1Token = await createUserAndGetToken('user1@test.com')
    const user2Token = await createUserAndGetToken('user2@test.com')
    
    api.setAuthToken(user1Token)
    const project = await api.post('/api/projects', {
      name: 'User 1 Project'
    })
    
    api.setAuthToken(user2Token)
    const accessResponse = await api.get(`/api/projects/${project.data.id}`)
    expect(accessResponse.status).toBe(403)
  })
})
```

## Cross-Platform E2E Tests

### Multi-Environment Testing

```typescript
describe('Cross-Platform E2E Tests', () => {
  const platforms = ['windows', 'macos', 'linux']
  
  platforms.forEach(platform => {
    describe(`${platform} Platform`, () => {
      let runner: CLITestRunner
      
      beforeAll(async () => {
        runner = new CLITestRunner({
          platform,
          executable: getPlatformExecutable(platform)
        })
      })
      
      it('should handle platform-specific paths', async () => {
        const testPath = platform === 'windows'
          ? 'C:\\Users\\Test\\story'
          : '/home/test/story'
        
        const result = await runner.run(['validate', testPath])
        
        expect(result.exitCode).toBeDefined()
        expect(result.stderr).not.toContain('Invalid path')
      })
      
      it('should handle line endings correctly', async () => {
        const content = platform === 'windows'
          ? 'Line 1\r\nLine 2\r\n'
          : 'Line 1\nLine 2\n'
        
        const projectDir = await createProjectWithContent(content)
        const result = await runner.run(['validate', projectDir])
        
        expect(result.exitCode).toBe(0)
      })
    })
  })
})
```

## Test Utilities

### E2E Test Helpers

```typescript
class E2ETestHelpers {
  static async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeout = 30000,
    interval = 100
  ): Promise<void> {
    const start = Date.now()
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return
      }
      await new Promise(resolve => setTimeout(resolve, interval))
    }
    
    throw new Error('Timeout waiting for condition')
  }
  
  static async retryOnFailure<T>(
    fn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
    
    throw lastError!
  }
  
  static async captureMetrics<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; metrics: Metrics }> {
    const startTime = Date.now()
    const startMemory = process.memoryUsage()
    
    const result = await fn()
    
    const endTime = Date.now()
    const endMemory = process.memoryUsage()
    
    return {
      result,
      metrics: {
        duration: endTime - startTime,
        memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
        timestamp: new Date()
      }
    }
  }
}
```

### Test Data Management

```typescript
class E2ETestData {
  private static instances: Map<string, any> = new Map()
  
  static async setupTestData(): Promise<void> {
    // Create test users
    const users = await this.createTestUsers()
    this.instances.set('users', users)
    
    // Create test projects
    const projects = await this.createTestProjects(users)
    this.instances.set('projects', projects)
    
    // Create test stories
    const stories = await this.createTestStories(projects)
    this.instances.set('stories', stories)
  }
  
  static async cleanupTestData(): Promise<void> {
    // Clean up in reverse order
    await this.deleteTestStories()
    await this.deleteTestProjects()
    await this.deleteTestUsers()
    
    this.instances.clear()
  }
  
  static get<T>(key: string): T {
    return this.instances.get(key) as T
  }
}
```

## Best Practices

### E2E Test Design

```typescript
// Good: Test complete user journeys
describe('User Story: First-Time User', () => {
  it('should complete onboarding flow', async () => {
    // 1. Visit landing page
    await page.goto('/')
    
    // 2. Sign up
    await page.click('[data-testid="signup"]')
    await fillSignupForm(page)
    
    // 3. Verify email
    await verifyEmail()
    
    // 4. Complete profile
    await completeProfile(page)
    
    // 5. Create first project
    await createFirstProject(page)
    
    // 6. Run first validation
    await runFirstValidation(page)
    
    // Verify success
    expect(await page.textContent('h1')).toBe('Welcome to Story Linter!')
  })
})
```

### Test Stability

```typescript
// Good: Robust selectors and waits
class StablePage {
  async clickButton(label: string): Promise<void> {
    const button = await this.page.waitForSelector(
      `button:has-text("${label}")`,
      { state: 'visible', timeout: 10000 }
    )
    
    await button.scrollIntoViewIfNeeded()
    await button.click()
  }
  
  async fillForm(data: Record<string, string>): Promise<void> {
    for (const [field, value] of Object.entries(data)) {
      const input = await this.page.waitForSelector(
        `[name="${field}"], [aria-label="${field}"]`
      )
      await input.fill(value)
    }
  }
}
```

## Future Enhancements

1. **AI-Powered Testing**
   - Automated test generation
   - Visual regression detection
   - Intelligent test selection

2. **Distributed Testing**
   - Parallel test execution
   - Cross-region testing
   - Device farm integration

3. **Continuous Testing**
   - Test in production
   - Canary deployments
   - Feature flag testing

4. **Advanced Monitoring**
   - Real user monitoring
   - Synthetic monitoring
   - Performance budgets
# Plugin Sandboxing

## Overview

Plugin sandboxing is a critical security feature that isolates third-party plugins from the core Story Linter system and each other. This document outlines the comprehensive sandboxing architecture that ensures plugins operate safely without compromising system integrity or user data.

## Sandboxing Architecture

### Core Sandbox Components

```typescript
interface PluginSandbox {
  // Isolation boundaries
  process: SandboxProcess
  filesystem: SandboxFilesystem
  network: SandboxNetwork
  memory: SandboxMemory
  
  // Security policies
  permissions: PermissionSet
  capabilities: CapabilitySet
  
  // Resource limits
  limits: ResourceLimits
  
  // Monitoring
  monitor: SandboxMonitor
  auditor: SecurityAuditor
}

interface SandboxProcess {
  pid: number
  isolated: boolean
  namespace: ProcessNamespace
  seccomp: SeccompProfile
  capabilities: ProcessCapabilities
}

interface ResourceLimits {
  cpu: CpuLimit
  memory: MemoryLimit
  disk: DiskLimit
  network: NetworkLimit
  handles: HandleLimit
}
```

### Isolation Levels

```typescript
enum IsolationLevel {
  MINIMAL = 'minimal',       // Basic JS isolation
  STANDARD = 'standard',     // Process isolation
  STRICT = 'strict',         // Full container isolation
  PARANOID = 'paranoid'      // Hardware-level isolation
}

class SandboxFactory {
  create(
    plugin: Plugin,
    level: IsolationLevel = IsolationLevel.STANDARD
  ): PluginSandbox {
    switch (level) {
      case IsolationLevel.MINIMAL:
        return this.createMinimalSandbox(plugin)
      
      case IsolationLevel.STANDARD:
        return this.createStandardSandbox(plugin)
      
      case IsolationLevel.STRICT:
        return this.createStrictSandbox(plugin)
      
      case IsolationLevel.PARANOID:
        return this.createParanoidSandbox(plugin)
    }
  }
  
  private createStandardSandbox(plugin: Plugin): PluginSandbox {
    return {
      process: this.createIsolatedProcess(plugin),
      filesystem: this.createRestrictedFilesystem(plugin),
      network: this.createNetworkSandbox(plugin),
      memory: this.createMemorySandbox(plugin),
      permissions: this.parsePermissions(plugin.manifest.permissions),
      capabilities: this.restrictCapabilities(plugin),
      limits: this.calculateResourceLimits(plugin),
      monitor: new SandboxMonitor(plugin.id),
      auditor: new SecurityAuditor(plugin.id)
    }
  }
}
```

## Process Isolation

### Worker Thread Sandboxing

```typescript
class WorkerSandbox implements SandboxProcess {
  private worker: Worker
  private context: SandboxContext
  
  constructor(plugin: Plugin) {
    this.context = this.createSecureContext(plugin)
    
    this.worker = new Worker(SANDBOX_WORKER_PATH, {
      workerData: {
        pluginId: plugin.id,
        sandbox: this.context
      },
      resourceLimits: {
        maxOldGenerationSizeMb: 50,
        maxYoungGenerationSizeMb: 10,
        codeRangeSizeMb: 10,
        stackSizeMb: 4
      }
    })
    
    this.setupSecurityHandlers()
  }
  
  private createSecureContext(plugin: Plugin): SandboxContext {
    const context = {
      // Restricted globals
      global: this.createRestrictedGlobal(),
      
      // Sandboxed APIs
      require: this.createSandboxedRequire(plugin),
      
      // Plugin-specific storage
      __dirname: plugin.sandboxPath,
      __filename: path.join(plugin.sandboxPath, 'index.js'),
      
      // Security tokens
      securityToken: this.generateSecurityToken()
    }
    
    // Freeze to prevent modification
    return Object.freeze(context)
  }
  
  private createRestrictedGlobal(): any {
    return {
      // Safe globals only
      console: this.createSandboxedConsole(),
      setTimeout: this.createSandboxedTimer('setTimeout'),
      setInterval: this.createSandboxedTimer('setInterval'),
      Promise,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Map,
      Set,
      // Explicitly blocked
      process: undefined,
      require: undefined,
      __dirname: undefined,
      __filename: undefined,
      module: undefined,
      exports: undefined,
      eval: undefined,
      Function: undefined
    }
  }
}
```

### VM2 Sandboxing

```typescript
class VM2Sandbox {
  private vm: NodeVM
  
  constructor(plugin: Plugin, permissions: PermissionSet) {
    this.vm = new NodeVM({
      sandbox: this.createSandbox(plugin),
      require: {
        external: this.getAllowedModules(permissions),
        builtin: this.getAllowedBuiltins(permissions),
        root: plugin.sandboxPath,
        mock: this.createMocks(permissions)
      },
      wrapper: 'commonjs',
      sourceExtensions: ['js', 'ts'],
      timeout: permissions.executionTimeout || 30000,
      fixAsync: true,
      eval: false,
      wasm: false
    })
  }
  
  async execute(code: string): Promise<any> {
    try {
      // Add security wrapper
      const wrappedCode = this.wrapCode(code)
      
      // Execute in sandbox
      const result = await this.vm.run(wrappedCode, 'plugin.js')
      
      // Validate result
      this.validateResult(result)
      
      return result
    } catch (error) {
      throw new SandboxExecutionError(
        'Plugin execution failed in sandbox',
        error
      )
    }
  }
  
  private getAllowedModules(permissions: PermissionSet): string[] {
    const allowed: string[] = []
    
    if (permissions.has('npm:lodash')) {
      allowed.push('lodash')
    }
    
    if (permissions.has('npm:*')) {
      // Still restrict dangerous modules
      return ['*', '!child_process', '!fs', '!net', '!cluster']
    }
    
    return allowed
  }
}
```

## Filesystem Sandboxing

### Virtual Filesystem

```typescript
class SandboxFilesystem {
  private vfs: VirtualFileSystem
  private permissions: FilePermissions
  
  constructor(plugin: Plugin) {
    this.vfs = new VirtualFileSystem({
      root: plugin.sandboxPath,
      readonly: plugin.permissions.readonly
    })
    
    this.permissions = new FilePermissions(plugin.permissions)
    this.mountAllowedPaths()
  }
  
  async readFile(path: string): Promise<Buffer> {
    // Check permissions
    if (!this.permissions.canRead(path)) {
      throw new PermissionDeniedError(`Cannot read ${path}`)
    }
    
    // Resolve to sandbox path
    const sandboxPath = this.resolvePath(path)
    
    // Check path traversal
    if (!this.isWithinSandbox(sandboxPath)) {
      throw new SecurityError('Path traversal detected')
    }
    
    // Read from VFS
    return this.vfs.readFile(sandboxPath)
  }
  
  async writeFile(path: string, data: Buffer): Promise<void> {
    // Check permissions
    if (!this.permissions.canWrite(path)) {
      throw new PermissionDeniedError(`Cannot write to ${path}`)
    }
    
    // Check file size limit
    if (data.length > this.permissions.maxFileSize) {
      throw new ResourceLimitError('File size exceeds limit')
    }
    
    // Write to VFS
    const sandboxPath = this.resolvePath(path)
    await this.vfs.writeFile(sandboxPath, data)
    
    // Audit write operation
    this.audit.logWrite(path, data.length)
  }
  
  private isWithinSandbox(resolvedPath: string): boolean {
    const normalized = path.normalize(resolvedPath)
    return normalized.startsWith(this.vfs.root)
  }
}

class FilePermissions {
  private rules: PermissionRule[]
  
  canRead(path: string): boolean {
    return this.checkPermission(path, 'read')
  }
  
  canWrite(path: string): boolean {
    return this.checkPermission(path, 'write')
  }
  
  private checkPermission(path: string, action: string): boolean {
    // Check against rules in order
    for (const rule of this.rules) {
      if (this.matchesRule(path, rule)) {
        return rule.actions.includes(action)
      }
    }
    
    // Default deny
    return false
  }
}
```

### Path Restrictions

```typescript
class PathRestrictor {
  private allowedPaths: Set<string>
  private deniedPaths: Set<string>
  private patterns: PathPattern[]
  
  constructor(config: PathRestrictionConfig) {
    this.allowedPaths = new Set(config.allowed)
    this.deniedPaths = new Set(config.denied)
    this.patterns = config.patterns.map(p => new PathPattern(p))
  }
  
  validate(requestedPath: string): ValidationResult {
    const normalized = path.normalize(requestedPath)
    
    // Check denied paths first
    if (this.isDenied(normalized)) {
      return {
        allowed: false,
        reason: 'Path is explicitly denied'
      }
    }
    
    // Check if in allowed paths
    if (this.isAllowed(normalized)) {
      return { allowed: true }
    }
    
    // Check patterns
    for (const pattern of this.patterns) {
      if (pattern.matches(normalized)) {
        return {
          allowed: pattern.allow,
          reason: pattern.reason
        }
      }
    }
    
    // Default deny
    return {
      allowed: false,
      reason: 'Path not in allowed list'
    }
  }
  
  private isDenied(path: string): boolean {
    // Check exact match
    if (this.deniedPaths.has(path)) return true
    
    // Check if any parent is denied
    let current = path
    while (current !== '/') {
      current = path.dirname(current)
      if (this.deniedPaths.has(current)) return true
    }
    
    return false
  }
}
```

## Network Sandboxing

### Network Isolation

```typescript
class NetworkSandbox {
  private proxy: NetworkProxy
  private firewall: NetworkFirewall
  
  constructor(permissions: NetworkPermissions) {
    this.proxy = new NetworkProxy(permissions)
    this.firewall = new NetworkFirewall(permissions)
  }
  
  async request(options: RequestOptions): Promise<Response> {
    // Check permissions
    const permission = await this.firewall.checkRequest(options)
    
    if (!permission.allowed) {
      throw new NetworkPermissionError(
        `Network request blocked: ${permission.reason}`
      )
    }
    
    // Route through proxy
    const proxiedOptions = this.proxy.rewrite(options)
    
    // Add security headers
    proxiedOptions.headers = {
      ...proxiedOptions.headers,
      'X-Sandbox-Plugin': this.pluginId,
      'X-Sandbox-Request-Id': generateRequestId()
    }
    
    // Make request with monitoring
    return this.monitoredRequest(proxiedOptions)
  }
  
  private async monitoredRequest(
    options: RequestOptions
  ): Promise<Response> {
    const start = Date.now()
    
    try {
      // Check rate limits
      await this.rateLimiter.check(options.url)
      
      // Make request
      const response = await fetch(options)
      
      // Log request
      this.audit.logRequest({
        url: options.url,
        method: options.method,
        duration: Date.now() - start,
        status: response.status
      })
      
      return response
    } catch (error) {
      this.audit.logRequestError({
        url: options.url,
        error: error.message
      })
      
      throw error
    }
  }
}

class NetworkFirewall {
  private rules: FirewallRule[]
  
  async checkRequest(options: RequestOptions): Promise<Permission> {
    const url = new URL(options.url)
    
    // Check protocol
    if (!this.allowedProtocols.has(url.protocol)) {
      return {
        allowed: false,
        reason: `Protocol ${url.protocol} not allowed`
      }
    }
    
    // Check host
    if (!this.isHostAllowed(url.hostname)) {
      return {
        allowed: false,
        reason: `Host ${url.hostname} not allowed`
      }
    }
    
    // Check port
    if (!this.isPortAllowed(url.port || this.getDefaultPort(url))) {
      return {
        allowed: false,
        reason: `Port ${url.port} not allowed`
      }
    }
    
    // Apply custom rules
    for (const rule of this.rules) {
      const result = await rule.evaluate(options)
      if (!result.allowed) return result
    }
    
    return { allowed: true }
  }
}
```

## Memory Sandboxing

### Memory Isolation

```typescript
class MemorySandbox {
  private heap: SandboxedHeap
  private monitor: MemoryMonitor
  
  constructor(limits: MemoryLimits) {
    this.heap = new SandboxedHeap(limits.maxHeap)
    this.monitor = new MemoryMonitor(limits)
    
    this.setupMemoryWatching()
  }
  
  allocate(size: number): MemoryAllocation {
    // Check limits
    if (!this.monitor.canAllocate(size)) {
      throw new MemoryLimitError(
        `Cannot allocate ${size} bytes: limit exceeded`
      )
    }
    
    // Allocate from sandboxed heap
    const allocation = this.heap.allocate(size)
    
    // Track allocation
    this.monitor.track(allocation)
    
    return allocation
  }
  
  private setupMemoryWatching(): void {
    setInterval(() => {
      const usage = this.heap.getUsage()
      
      // Check thresholds
      if (usage.percent > 0.9) {
        this.handleHighMemoryUsage(usage)
      }
      
      // Update metrics
      this.metrics.update(usage)
    }, 1000)
  }
  
  private handleHighMemoryUsage(usage: MemoryUsage): void {
    // Try garbage collection
    if (this.heap.gc) {
      this.heap.gc()
    }
    
    // If still high, start limiting allocations
    if (usage.percent > 0.95) {
      this.monitor.enableStrictMode()
    }
  }
}

class MemoryMonitor {
  private allocations: Map<string, AllocationInfo>
  private totalAllocated: number = 0
  
  canAllocate(size: number): boolean {
    return this.totalAllocated + size <= this.limits.maxHeap
  }
  
  track(allocation: MemoryAllocation): void {
    this.allocations.set(allocation.id, {
      size: allocation.size,
      timestamp: Date.now(),
      stack: this.captureStack()
    })
    
    this.totalAllocated += allocation.size
  }
  
  detectLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = []
    const now = Date.now()
    
    for (const [id, info] of this.allocations) {
      const age = now - info.timestamp
      
      // Old allocations might be leaks
      if (age > this.limits.leakThreshold) {
        leaks.push({
          id,
          size: info.size,
          age,
          stack: info.stack
        })
      }
    }
    
    return leaks
  }
}
```

## Permission System

### Fine-Grained Permissions

```typescript
interface PermissionSet {
  // File system permissions
  'fs:read': PathPattern[]
  'fs:write': PathPattern[]
  'fs:delete': PathPattern[]
  
  // Network permissions
  'net:http': HostPattern[]
  'net:https': HostPattern[]
  'net:websocket': HostPattern[]
  
  // Process permissions
  'process:spawn': string[]
  'process:signal': Signal[]
  
  // System permissions
  'system:env': string[]
  'system:time': boolean
  'system:random': boolean
  
  // API permissions
  'api:validation': boolean
  'api:schema': boolean
  'api:events': EventPattern[]
}

class PermissionManager {
  private permissions: Map<string, Permission>
  
  check(
    plugin: string,
    permission: string,
    context?: any
  ): boolean {
    const perm = this.permissions.get(`${plugin}:${permission}`)
    
    if (!perm) return false
    
    // Check basic permission
    if (!perm.granted) return false
    
    // Check context-specific rules
    if (perm.rules && context) {
      return perm.rules.every(rule => rule.evaluate(context))
    }
    
    return true
  }
  
  grant(plugin: string, permission: string, rules?: Rule[]): void {
    this.permissions.set(`${plugin}:${permission}`, {
      granted: true,
      rules,
      grantedAt: Date.now(),
      grantedBy: this.currentUser
    })
    
    this.audit.logGrant(plugin, permission)
  }
  
  revoke(plugin: string, permission: string): void {
    this.permissions.delete(`${plugin}:${permission}`)
    this.audit.logRevoke(plugin, permission)
  }
}
```

### Capability-Based Security

```typescript
interface Capability {
  id: string
  permissions: string[]
  constraints: Constraint[]
  expiry?: number
}

class CapabilityManager {
  private capabilities: Map<string, Capability>
  
  createCapability(
    permissions: string[],
    constraints?: Constraint[]
  ): Capability {
    const capability: Capability = {
      id: generateCapabilityId(),
      permissions,
      constraints: constraints || [],
      expiry: Date.now() + this.defaultExpiry
    }
    
    this.capabilities.set(capability.id, capability)
    
    return capability
  }
  
  delegate(
    capability: Capability,
    permissions: string[]
  ): Capability {
    // Check if delegation is allowed
    if (!this.canDelegate(capability, permissions)) {
      throw new SecurityError('Cannot delegate permissions')
    }
    
    // Create delegated capability
    return this.createCapability(
      permissions,
      [...capability.constraints, new DelegationConstraint(capability.id)]
    )
  }
  
  verify(capabilityId: string, permission: string): boolean {
    const capability = this.capabilities.get(capabilityId)
    
    if (!capability) return false
    
    // Check expiry
    if (capability.expiry && Date.now() > capability.expiry) {
      this.revoke(capabilityId)
      return false
    }
    
    // Check permission
    if (!capability.permissions.includes(permission)) {
      return false
    }
    
    // Check constraints
    return capability.constraints.every(c => c.satisfied())
  }
}
```

## Resource Limiting

### CPU Limiting

```typescript
class CPULimiter {
  private usage: CPUUsage
  private limits: CPULimits
  
  async enforceLimit(
    task: () => Promise<any>
  ): Promise<any> {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
    }, this.limits.maxExecutionTime)
    
    try {
      // Monitor CPU usage during execution
      const monitor = this.startMonitoring()
      
      const result = await Promise.race([
        task(),
        this.cpuLimitExceeded(monitor, controller.signal)
      ])
      
      clearTimeout(timeout)
      monitor.stop()
      
      return result
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new CPULimitError('CPU limit exceeded')
      }
      throw error
    }
  }
  
  private async cpuLimitExceeded(
    monitor: CPUMonitor,
    signal: AbortSignal
  ): Promise<never> {
    return new Promise((_, reject) => {
      const interval = setInterval(() => {
        const usage = monitor.getCurrentUsage()
        
        if (usage > this.limits.maxCPUPercent) {
          clearInterval(interval)
          reject(new Error('CPU limit exceeded'))
        }
      }, 100)
      
      signal.addEventListener('abort', () => {
        clearInterval(interval)
      })
    })
  }
}
```

### Handle Limiting

```typescript
class HandleLimiter {
  private handles: Map<string, Handle>
  private limits: HandleLimits
  
  acquire(type: HandleType): Handle {
    const count = this.getHandleCount(type)
    
    if (count >= this.limits[type]) {
      throw new ResourceLimitError(
        `Handle limit exceeded for ${type}: ${count}/${this.limits[type]}`
      )
    }
    
    const handle = new Handle(type)
    this.handles.set(handle.id, handle)
    
    return handle
  }
  
  release(handleId: string): void {
    const handle = this.handles.get(handleId)
    
    if (handle) {
      handle.close()
      this.handles.delete(handleId)
    }
  }
  
  private enforceGlobalLimit(): void {
    if (this.handles.size >= this.limits.total) {
      // Force close oldest handles
      const sorted = Array.from(this.handles.values())
        .sort((a, b) => a.created - b.created)
      
      const toClose = sorted.slice(0, 10)
      toClose.forEach(h => this.release(h.id))
    }
  }
}
```

## Security Monitoring

### Sandbox Auditing

```typescript
class SecurityAuditor {
  private events: SecurityEvent[] = []
  private alerts: SecurityAlert[] = []
  
  log(event: SecurityEvent): void {
    this.events.push(event)
    
    // Check for security patterns
    const alert = this.detectSecurityPattern(event)
    if (alert) {
      this.raiseAlert(alert)
    }
    
    // Persist event
    this.persistEvent(event)
  }
  
  private detectSecurityPattern(event: SecurityEvent): SecurityAlert | null {
    // Check for suspicious patterns
    const patterns = [
      this.detectPathTraversal,
      this.detectPrivilegeEscalation,
      this.detectResourceExhaustion,
      this.detectDataExfiltration
    ]
    
    for (const pattern of patterns) {
      const alert = pattern.call(this, event)
      if (alert) return alert
    }
    
    return null
  }
  
  private detectPathTraversal(event: SecurityEvent): SecurityAlert | null {
    if (event.type === 'file:access' && event.path.includes('..')) {
      return {
        severity: 'high',
        type: 'path-traversal',
        message: `Potential path traversal attempt: ${event.path}`,
        plugin: event.plugin,
        timestamp: Date.now()
      }
    }
    
    return null
  }
}
```

### Behavioral Analysis

```typescript
class BehavioralAnalyzer {
  private baseline: PluginBehavior
  private monitor: BehaviorMonitor
  
  async analyze(plugin: string): Promise<BehaviorAnalysis> {
    const current = await this.monitor.getCurrentBehavior(plugin)
    const anomalies = this.detectAnomalies(current)
    
    return {
      behavior: current,
      anomalies,
      risk: this.calculateRisk(anomalies),
      recommendations: this.generateRecommendations(anomalies)
    }
  }
  
  private detectAnomalies(behavior: PluginBehavior): Anomaly[] {
    const anomalies: Anomaly[] = []
    
    // Check file access patterns
    if (behavior.fileAccess.rate > this.baseline.fileAccess.rate * 10) {
      anomalies.push({
        type: 'excessive-file-access',
        severity: 'medium',
        details: {
          current: behavior.fileAccess.rate,
          baseline: this.baseline.fileAccess.rate
        }
      })
    }
    
    // Check network patterns
    if (this.hasNewNetworkDestinations(behavior)) {
      anomalies.push({
        type: 'new-network-destinations',
        severity: 'high',
        details: {
          destinations: behavior.network.destinations
        }
      })
    }
    
    return anomalies
  }
}
```

## Best Practices

### Sandbox Configuration

```typescript
// Good: Strict sandbox with minimal permissions
const sandbox = new PluginSandbox({
  isolation: IsolationLevel.STRICT,
  permissions: {
    'fs:read': ['./data/**/*.json'],
    'fs:write': ['./output/**'],
    'net:https': ['api.example.com']
  },
  limits: {
    memory: 50 * 1024 * 1024, // 50MB
    cpu: 0.5, // 50% of one core
    executionTime: 30000 // 30 seconds
  }
})

// Good: Defense in depth
const securedPlugin = new SecuredPlugin({
  sandbox: sandbox,
  encryption: true,
  signing: true,
  audit: {
    level: 'verbose',
    retention: 30 // days
  }
})
```

### Security Policies

1. **Principle of Least Privilege**
   - Grant minimal required permissions
   - Regular permission audits
   - Time-bound permissions

2. **Defense in Depth**
   - Multiple isolation layers
   - Redundant security checks
   - Fail-secure defaults

3. **Zero Trust**
   - Verify all operations
   - Continuous validation
   - No implicit trust

## Future Enhancements

1. **Advanced Isolation**
   - Hardware-based isolation (Intel SGX)
   - Unikernel plugins
   - WebAssembly System Interface (WASI)

2. **AI-Powered Security**
   - Behavioral prediction
   - Anomaly detection
   - Automated response

3. **Distributed Sandboxing**
   - Remote plugin execution
   - Federated security policies
   - Cross-node coordination

4. **Formal Verification**
   - Security property proofs
   - Model checking
   - Verified sandbox implementation
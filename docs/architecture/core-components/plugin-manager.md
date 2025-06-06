# Plugin Manager

## Overview

The Plugin Manager is a core component responsible for discovering, loading, validating, and managing plugins throughout their lifecycle. It provides a secure and extensible plugin system that allows third-party developers to extend the Story Linter's functionality.

## Responsibilities

1. **Plugin Discovery**
   - Scanning plugin directories
   - Reading plugin manifests
   - Validating plugin metadata
   - Resolving plugin dependencies

2. **Plugin Loading**
   - Dynamic plugin loading
   - Dependency injection
   - Plugin initialization
   - Resource allocation

3. **Plugin Lifecycle Management**
   - Activation/deactivation
   - Hot reloading
   - Version management
   - Update handling

4. **Plugin Security**
   - Sandboxing plugin execution
   - Permission management
   - Resource limits
   - API access control

5. **Plugin Communication**
   - Inter-plugin messaging
   - Event propagation
   - Shared resource management
   - Plugin isolation

## Architecture

### Class Structure

```typescript
interface PluginManager {
  // Discovery
  discover(paths: string[]): Promise<PluginManifest[]>
  scan(directory: string): Promise<PluginManifest[]>
  
  // Loading
  load(pluginId: string): Promise<Plugin>
  unload(pluginId: string): Promise<void>
  reload(pluginId: string): Promise<void>
  
  // Lifecycle
  activate(pluginId: string): Promise<void>
  deactivate(pluginId: string): Promise<void>
  
  // Registry
  getPlugin(pluginId: string): Plugin | undefined
  getAllPlugins(): Plugin[]
  getActivePlugins(): Plugin[]
  
  // Dependencies
  resolveDependencies(plugin: Plugin): Promise<void>
  checkCompatibility(plugin: Plugin): boolean
}
```

### Plugin Structure

```typescript
interface Plugin {
  manifest: PluginManifest
  instance: PluginInstance
  status: PluginStatus
  sandbox: PluginSandbox
  permissions: PluginPermissions
}

interface PluginManifest {
  id: string
  name: string
  version: string
  author: string
  description: string
  main: string
  dependencies?: PluginDependency[]
  permissions?: string[]
  configuration?: PluginConfigSchema
}

interface PluginInstance {
  activate(context: PluginContext): Promise<void>
  deactivate(): Promise<void>
  execute(command: string, ...args: any[]): Promise<any>
}
```

## Implementation Details

### Plugin Discovery Process

1. **Directory Scanning**
   ```typescript
   private async scanDirectory(dir: string): Promise<PluginManifest[]> {
     const manifests: PluginManifest[] = []
     const entries = await fs.readdir(dir)
     
     for (const entry of entries) {
       const manifestPath = path.join(dir, entry, 'plugin.json')
       if (await fs.exists(manifestPath)) {
         const manifest = await this.loadManifest(manifestPath)
         if (this.validateManifest(manifest)) {
           manifests.push(manifest)
         }
       }
     }
     
     return manifests
   }
   ```

2. **Manifest Validation**
   ```typescript
   private validateManifest(manifest: any): manifest is PluginManifest {
     return (
       typeof manifest.id === 'string' &&
       typeof manifest.name === 'string' &&
       typeof manifest.version === 'string' &&
       typeof manifest.main === 'string' &&
       semver.valid(manifest.version) !== null
     )
   }
   ```

### Plugin Loading Mechanism

1. **Dynamic Import**
   ```typescript
   private async loadPlugin(manifest: PluginManifest): Promise<Plugin> {
     const pluginPath = path.resolve(manifest.main)
     const sandbox = this.createSandbox(manifest)
     
     try {
       const module = await sandbox.import(pluginPath)
       const instance = new module.default()
       
       return {
         manifest,
         instance,
         status: PluginStatus.Loaded,
         sandbox,
         permissions: this.parsePermissions(manifest.permissions)
       }
     } catch (error) {
       throw new PluginLoadError(`Failed to load plugin ${manifest.id}`, error)
     }
   }
   ```

2. **Dependency Resolution**
   ```typescript
   private async resolveDependencies(plugin: Plugin): Promise<void> {
     if (!plugin.manifest.dependencies) return
     
     for (const dep of plugin.manifest.dependencies) {
       const dependency = this.getPlugin(dep.id)
       
       if (!dependency) {
         throw new DependencyError(`Missing dependency: ${dep.id}`)
       }
       
       if (!semver.satisfies(dependency.manifest.version, dep.version)) {
         throw new DependencyError(
           `Incompatible version for ${dep.id}: ` +
           `required ${dep.version}, found ${dependency.manifest.version}`
         )
       }
     }
   }
   ```

### Plugin Sandboxing

1. **Sandbox Creation**
   ```typescript
   private createSandbox(manifest: PluginManifest): PluginSandbox {
     return new PluginSandbox({
       permissions: manifest.permissions || [],
       resourceLimits: {
         memory: 50 * 1024 * 1024, // 50MB
         cpu: 0.5, // 50% CPU
         timeout: 30000 // 30 seconds
       },
       allowedAPIs: this.getAllowedAPIs(manifest.permissions)
     })
   }
   ```

2. **Permission Checking**
   ```typescript
   private checkPermission(
     plugin: Plugin,
     permission: string
   ): boolean {
     return plugin.permissions.has(permission)
   }
   ```

## Integration Points

### With Configuration Manager

```typescript
class PluginManager {
  constructor(private config: ConfigurationManager) {
    this.pluginPaths = config.get('plugins.paths', [])
    this.autoLoad = config.get('plugins.autoLoad', true)
  }
  
  private async loadPluginConfig(plugin: Plugin): Promise<void> {
    const configKey = `plugins.${plugin.manifest.id}`
    const pluginConfig = this.config.get(configKey, {})
    
    await plugin.instance.configure(pluginConfig)
  }
}
```

### With Event Manager

```typescript
class PluginManager {
  constructor(
    private config: ConfigurationManager,
    private events: EventManager
  ) {
    this.setupEventHandlers()
  }
  
  private setupEventHandlers(): void {
    this.events.on('plugin:install', this.handleInstall.bind(this))
    this.events.on('plugin:uninstall', this.handleUninstall.bind(this))
    this.events.on('plugin:update', this.handleUpdate.bind(this))
  }
  
  private async activatePlugin(plugin: Plugin): Promise<void> {
    await plugin.instance.activate(this.createContext(plugin))
    this.events.emit('plugin:activated', { pluginId: plugin.manifest.id })
  }
}
```

### With Validation Engine

```typescript
class PluginManager {
  registerValidators(plugin: Plugin): void {
    const validators = plugin.instance.getValidators()
    
    for (const validator of validators) {
      this.validationEngine.register(
        `${plugin.manifest.id}:${validator.name}`,
        validator
      )
    }
  }
}
```

## Error Handling

### Plugin Errors

```typescript
class PluginError extends Error {
  constructor(
    message: string,
    public pluginId: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'PluginError'
  }
}

class PluginLoadError extends PluginError {}
class PluginActivationError extends PluginError {}
class DependencyError extends PluginError {}
class PermissionError extends PluginError {}
```

### Error Recovery

```typescript
private async handlePluginError(
  plugin: Plugin,
  error: Error
): Promise<void> {
  logger.error(`Plugin ${plugin.manifest.id} error:`, error)
  
  try {
    await this.deactivatePlugin(plugin)
    plugin.status = PluginStatus.Error
    
    this.events.emit('plugin:error', {
      pluginId: plugin.manifest.id,
      error
    })
  } catch (deactivationError) {
    logger.error('Failed to deactivate errored plugin:', deactivationError)
  }
}
```

## Performance Considerations

### Lazy Loading

```typescript
class PluginManager {
  private lazyLoadQueue = new Map<string, Promise<Plugin>>()
  
  async getPlugin(pluginId: string): Promise<Plugin> {
    if (this.plugins.has(pluginId)) {
      return this.plugins.get(pluginId)!
    }
    
    if (this.lazyLoadQueue.has(pluginId)) {
      return this.lazyLoadQueue.get(pluginId)!
    }
    
    const loadPromise = this.loadPlugin(pluginId)
    this.lazyLoadQueue.set(pluginId, loadPromise)
    
    try {
      const plugin = await loadPromise
      this.plugins.set(pluginId, plugin)
      return plugin
    } finally {
      this.lazyLoadQueue.delete(pluginId)
    }
  }
}
```

### Plugin Caching

```typescript
interface PluginCache {
  manifest: PluginManifest
  lastModified: number
  checksum: string
}

class PluginManager {
  private cache = new Map<string, PluginCache>()
  
  private async shouldReload(
    pluginId: string,
    manifestPath: string
  ): Promise<boolean> {
    const cached = this.cache.get(pluginId)
    if (!cached) return true
    
    const stats = await fs.stat(manifestPath)
    const checksum = await this.calculateChecksum(manifestPath)
    
    return (
      stats.mtime.getTime() !== cached.lastModified ||
      checksum !== cached.checksum
    )
  }
}
```

## Security Measures

### API Access Control

```typescript
class PluginSandbox {
  private createRestrictedAPI(): any {
    return {
      fs: this.createRestrictedFS(),
      process: this.createRestrictedProcess(),
      network: this.createRestrictedNetwork()
    }
  }
  
  private createRestrictedFS(): any {
    const allowedPaths = this.getAllowedPaths()
    
    return {
      readFile: async (path: string) => {
        if (!this.isPathAllowed(path, allowedPaths)) {
          throw new PermissionError(`Access denied: ${path}`)
        }
        return fs.readFile(path)
      }
    }
  }
}
```

### Resource Monitoring

```typescript
class PluginSandbox {
  private monitor = new ResourceMonitor()
  
  async execute<T>(
    fn: () => Promise<T>,
    limits: ResourceLimits
  ): Promise<T> {
    const execution = this.monitor.track(fn, limits)
    
    return Promise.race([
      execution,
      this.timeout(limits.timeout)
    ])
  }
  
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(`Execution timeout: ${ms}ms`))
      }, ms)
    })
  }
}
```

## Testing Strategies

### Unit Tests

```typescript
describe('PluginManager', () => {
  let manager: PluginManager
  let mockConfig: ConfigurationManager
  let mockEvents: EventManager
  
  beforeEach(() => {
    mockConfig = createMockConfig()
    mockEvents = createMockEventManager()
    manager = new PluginManager(mockConfig, mockEvents)
  })
  
  describe('discover', () => {
    it('should discover valid plugins', async () => {
      const manifests = await manager.discover(['./test-plugins'])
      expect(manifests).toHaveLength(2)
      expect(manifests[0].id).toBe('test-plugin-1')
    })
    
    it('should skip invalid manifests', async () => {
      const manifests = await manager.discover(['./invalid-plugins'])
      expect(manifests).toHaveLength(0)
    })
  })
  
  describe('load', () => {
    it('should load plugin with dependencies', async () => {
      await manager.load('plugin-with-deps')
      const plugin = manager.getPlugin('plugin-with-deps')
      
      expect(plugin).toBeDefined()
      expect(plugin!.status).toBe(PluginStatus.Loaded)
    })
  })
})
```

### Integration Tests

```typescript
describe('PluginManager Integration', () => {
  it('should handle plugin lifecycle', async () => {
    const manager = new PluginManager(config, events)
    
    // Discovery
    await manager.discover(['./plugins'])
    
    // Loading
    await manager.load('example-plugin')
    
    // Activation
    await manager.activate('example-plugin')
    
    // Execution
    const plugin = manager.getPlugin('example-plugin')
    const result = await plugin!.instance.execute('validate', {})
    
    expect(result).toBeDefined()
    
    // Deactivation
    await manager.deactivate('example-plugin')
  })
})
```

## Future Enhancements

1. **Plugin Marketplace Integration**
   - Plugin discovery from remote repositories
   - Automatic updates
   - Rating and review system

2. **Advanced Sandboxing**
   - WebAssembly plugin support
   - Process isolation
   - Network policy enforcement

3. **Plugin Development Tools**
   - Plugin scaffolding
   - Development server
   - Hot module replacement

4. **Performance Optimizations**
   - Plugin bundling
   - Shared dependency loading
   - Memory pooling
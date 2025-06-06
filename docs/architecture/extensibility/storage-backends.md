# Storage Backends

## Overview

Storage backends provide flexible data persistence options for the Story Linter, supporting various storage solutions from local file systems to cloud databases. This document outlines the architecture for creating custom storage backends that handle schemas, validation results, and configuration data.

## Storage Backend Architecture

### Core Storage Interface

```typescript
interface StorageBackend {
  // Metadata
  id: string
  name: string
  description: string
  version: string
  
  // Connection management
  connect(config: ConnectionConfig): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  
  // Basic operations
  get(key: string): Promise<Buffer | null>
  put(key: string, value: Buffer, metadata?: Metadata): Promise<void>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  
  // Batch operations
  getBatch(keys: string[]): Promise<Map<string, Buffer>>
  putBatch(entries: Map<string, Buffer>): Promise<void>
  deleteBatch(keys: string[]): Promise<void>
  
  // Query operations
  list(prefix?: string, options?: ListOptions): Promise<StorageEntry[]>
  query(filter: QueryFilter): Promise<StorageEntry[]>
  
  // Advanced features
  capabilities: StorageCapabilities
}

interface StorageCapabilities {
  atomic: boolean
  transactions: boolean
  versioning: boolean
  encryption: boolean
  compression: boolean
  streaming: boolean
  queryable: boolean
  distributed: boolean
}

interface StorageEntry {
  key: string
  size: number
  modified: Date
  metadata?: Metadata
  version?: string
}
```

### Storage Context

```typescript
interface StorageContext {
  // Configuration
  config: StorageConfig
  
  // Security
  encryption?: EncryptionProvider
  authentication?: AuthProvider
  
  // Performance
  cache?: CacheProvider
  compression?: CompressionProvider
  
  // Monitoring
  metrics: MetricsCollector
  logger: Logger
}

interface StorageConfig {
  backend: string
  connection: ConnectionConfig
  options?: BackendOptions
  retry?: RetryConfig
  timeout?: TimeoutConfig
}
```

## File System Backend

### Local File Storage

```typescript
class FileSystemBackend implements StorageBackend {
  id = 'filesystem'
  name = 'File System Backend'
  description = 'Stores data on local file system'
  version = '1.0.0'
  
  capabilities = {
    atomic: true,
    transactions: false,
    versioning: false,
    encryption: false,
    compression: false,
    streaming: true,
    queryable: true,
    distributed: false
  }
  
  private basePath: string
  private options: FileSystemOptions
  
  async connect(config: ConnectionConfig): Promise<void> {
    this.basePath = path.resolve(config.path || './storage')
    
    // Ensure directory exists
    await fs.mkdir(this.basePath, { recursive: true })
    
    // Verify permissions
    await this.verifyPermissions()
  }
  
  async get(key: string): Promise<Buffer | null> {
    const filePath = this.getFilePath(key)
    
    try {
      return await fs.readFile(filePath)
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null
      }
      throw error
    }
  }
  
  async put(
    key: string,
    value: Buffer,
    metadata?: Metadata
  ): Promise<void> {
    const filePath = this.getFilePath(key)
    const dir = path.dirname(filePath)
    
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true })
    
    // Write atomically
    const tempPath = `${filePath}.tmp`
    await fs.writeFile(tempPath, value)
    
    // Store metadata if provided
    if (metadata) {
      await this.putMetadata(key, metadata)
    }
    
    // Atomic rename
    await fs.rename(tempPath, filePath)
  }
  
  async list(
    prefix?: string,
    options: ListOptions = {}
  ): Promise<StorageEntry[]> {
    const entries: StorageEntry[] = []
    
    const walkDir = async (dir: string, currentPrefix: string) => {
      const files = await fs.readdir(dir, { withFileTypes: true })
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name)
        const key = path.join(currentPrefix, file.name)
        
        if (file.isDirectory()) {
          if (options.recursive !== false) {
            await walkDir(fullPath, key)
          }
        } else {
          if (!prefix || key.startsWith(prefix)) {
            const stats = await fs.stat(fullPath)
            entries.push({
              key,
              size: stats.size,
              modified: stats.mtime,
              metadata: await this.getMetadata(key)
            })
          }
        }
      }
    }
    
    await walkDir(this.basePath, '')
    
    // Apply sorting
    if (options.sort) {
      entries.sort((a, b) => {
        switch (options.sort) {
          case 'key':
            return a.key.localeCompare(b.key)
          case 'size':
            return a.size - b.size
          case 'modified':
            return a.modified.getTime() - b.modified.getTime()
          default:
            return 0
        }
      })
    }
    
    // Apply limit
    if (options.limit) {
      return entries.slice(0, options.limit)
    }
    
    return entries
  }
  
  private getFilePath(key: string): string {
    // Sanitize key to prevent path traversal
    const sanitized = key.replace(/\.\./g, '').replace(/^\//, '')
    return path.join(this.basePath, sanitized)
  }
}
```

### Versioned File Storage

```typescript
class VersionedFileBackend extends FileSystemBackend {
  id = 'versioned-filesystem'
  name = 'Versioned File System Backend'
  version = '1.0.0'
  
  capabilities = {
    ...super.capabilities,
    versioning: true
  }
  
  async put(
    key: string,
    value: Buffer,
    metadata?: Metadata
  ): Promise<void> {
    // Get current version if exists
    const currentVersion = await this.getCurrentVersion(key)
    const newVersion = this.incrementVersion(currentVersion)
    
    // Store new version
    const versionKey = this.getVersionKey(key, newVersion)
    await super.put(versionKey, value, metadata)
    
    // Update current pointer
    await this.updateCurrentVersion(key, newVersion)
    
    // Cleanup old versions if needed
    await this.cleanupOldVersions(key)
  }
  
  async get(
    key: string,
    version?: string
  ): Promise<Buffer | null> {
    if (version) {
      // Get specific version
      const versionKey = this.getVersionKey(key, version)
      return super.get(versionKey)
    }
    
    // Get current version
    const currentVersion = await this.getCurrentVersion(key)
    if (!currentVersion) return null
    
    return this.get(key, currentVersion)
  }
  
  async getVersions(key: string): Promise<Version[]> {
    const prefix = `${key}.v`
    const entries = await this.list(prefix)
    
    return entries.map(entry => ({
      version: this.extractVersion(entry.key),
      size: entry.size,
      modified: entry.modified,
      metadata: entry.metadata
    }))
  }
  
  private async cleanupOldVersions(key: string): Promise<void> {
    const versions = await this.getVersions(key)
    const maxVersions = this.options.maxVersions || 10
    
    if (versions.length > maxVersions) {
      // Sort by version (newest first)
      versions.sort((a, b) => b.version.localeCompare(a.version))
      
      // Delete old versions
      const toDelete = versions.slice(maxVersions)
      for (const version of toDelete) {
        const versionKey = this.getVersionKey(key, version.version)
        await super.delete(versionKey)
      }
    }
  }
}
```

## Database Backends

### SQL Database Backend

```typescript
class SQLBackend implements StorageBackend {
  id = 'sql'
  name = 'SQL Database Backend'
  description = 'Stores data in SQL database'
  version = '1.0.0'
  
  capabilities = {
    atomic: true,
    transactions: true,
    versioning: true,
    encryption: true,
    compression: true,
    streaming: false,
    queryable: true,
    distributed: true
  }
  
  private db: Database
  private tableName: string
  
  async connect(config: ConnectionConfig): Promise<void> {
    this.db = await this.createConnection(config)
    this.tableName = config.table || 'storage'
    
    // Ensure table exists
    await this.ensureTable()
  }
  
  private async ensureTable(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        key VARCHAR(255) PRIMARY KEY,
        value BLOB NOT NULL,
        metadata JSON,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_created (created_at),
        INDEX idx_updated (updated_at)
      )
    `)
  }
  
  async get(key: string): Promise<Buffer | null> {
    const result = await this.db.query(
      `SELECT value FROM ${this.tableName} WHERE key = ?`,
      [key]
    )
    
    if (result.length === 0) return null
    
    return result[0].value
  }
  
  async put(
    key: string,
    value: Buffer,
    metadata?: Metadata
  ): Promise<void> {
    await this.db.query(`
      INSERT INTO ${this.tableName} (key, value, metadata)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        value = VALUES(value),
        metadata = VALUES(metadata),
        version = version + 1,
        updated_at = CURRENT_TIMESTAMP
    `, [key, value, JSON.stringify(metadata || {})])
  }
  
  async query(filter: QueryFilter): Promise<StorageEntry[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`
    const params: any[] = []
    
    // Build WHERE clause
    if (filter.prefix) {
      sql += ` AND key LIKE ?`
      params.push(`${filter.prefix}%`)
    }
    
    if (filter.metadata) {
      for (const [field, value] of Object.entries(filter.metadata)) {
        sql += ` AND JSON_EXTRACT(metadata, '$.${field}') = ?`
        params.push(value)
      }
    }
    
    if (filter.createdAfter) {
      sql += ` AND created_at > ?`
      params.push(filter.createdAfter)
    }
    
    if (filter.updatedAfter) {
      sql += ` AND updated_at > ?`
      params.push(filter.updatedAfter)
    }
    
    // Add ORDER BY
    if (filter.orderBy) {
      sql += ` ORDER BY ${filter.orderBy} ${filter.orderDir || 'ASC'}`
    }
    
    // Add LIMIT
    if (filter.limit) {
      sql += ` LIMIT ?`
      params.push(filter.limit)
    }
    
    const results = await this.db.query(sql, params)
    
    return results.map(row => ({
      key: row.key,
      size: row.value.length,
      modified: row.updated_at,
      metadata: JSON.parse(row.metadata || '{}'),
      version: row.version.toString()
    }))
  }
  
  async beginTransaction(): Promise<Transaction> {
    const tx = await this.db.beginTransaction()
    
    return {
      get: (key) => this.get(key),
      put: (key, value, metadata) => this.put(key, value, metadata),
      delete: (key) => this.delete(key),
      commit: () => tx.commit(),
      rollback: () => tx.rollback()
    }
  }
}
```

### NoSQL Database Backend

```typescript
class MongoDBBackend implements StorageBackend {
  id = 'mongodb'
  name = 'MongoDB Backend'
  description = 'Stores data in MongoDB'
  version = '1.0.0'
  
  capabilities = {
    atomic: true,
    transactions: true,
    versioning: true,
    encryption: true,
    compression: true,
    streaming: true,
    queryable: true,
    distributed: true
  }
  
  private client: MongoClient
  private db: Db
  private collection: Collection
  
  async connect(config: ConnectionConfig): Promise<void> {
    this.client = new MongoClient(config.uri, config.options)
    await this.client.connect()
    
    this.db = this.client.db(config.database)
    this.collection = this.db.collection(config.collection || 'storage')
    
    // Create indexes
    await this.createIndexes()
  }
  
  private async createIndexes(): Promise<void> {
    await this.collection.createIndexes([
      { key: { key: 1 }, unique: true },
      { key: { 'metadata.type': 1 } },
      { key: { updatedAt: -1 } },
      { key: { 'metadata.tags': 1 } }
    ])
  }
  
  async get(key: string): Promise<Buffer | null> {
    const doc = await this.collection.findOne({ key })
    
    if (!doc) return null
    
    // Handle GridFS for large values
    if (doc.gridfsId) {
      return this.getFromGridFS(doc.gridfsId)
    }
    
    return Buffer.from(doc.value.buffer)
  }
  
  async put(
    key: string,
    value: Buffer,
    metadata?: Metadata
  ): Promise<void> {
    const doc: any = {
      key,
      metadata: metadata || {},
      updatedAt: new Date(),
      version: 1
    }
    
    // Use GridFS for large values
    if (value.length > 16 * 1024 * 1024) { // 16MB
      doc.gridfsId = await this.putToGridFS(key, value)
    } else {
      doc.value = value
    }
    
    await this.collection.replaceOne(
      { key },
      { $set: doc, $inc: { version: 1 } },
      { upsert: true }
    )
  }
  
  async query(filter: QueryFilter): Promise<StorageEntry[]> {
    const mongoFilter: any = {}
    
    if (filter.prefix) {
      mongoFilter.key = { $regex: `^${filter.prefix}` }
    }
    
    if (filter.metadata) {
      for (const [field, value] of Object.entries(filter.metadata)) {
        mongoFilter[`metadata.${field}`] = value
      }
    }
    
    if (filter.tags) {
      mongoFilter['metadata.tags'] = { $in: filter.tags }
    }
    
    const cursor = this.collection.find(mongoFilter)
    
    if (filter.orderBy) {
      cursor.sort({ [filter.orderBy]: filter.orderDir === 'DESC' ? -1 : 1 })
    }
    
    if (filter.limit) {
      cursor.limit(filter.limit)
    }
    
    const docs = await cursor.toArray()
    
    return docs.map(doc => ({
      key: doc.key,
      size: doc.value?.length || doc.gridfsSize || 0,
      modified: doc.updatedAt,
      metadata: doc.metadata,
      version: doc.version.toString()
    }))
  }
}
```

## Cloud Storage Backends

### S3 Backend

```typescript
class S3Backend implements StorageBackend {
  id = 's3'
  name = 'Amazon S3 Backend'
  description = 'Stores data in Amazon S3'
  version = '1.0.0'
  
  capabilities = {
    atomic: true,
    transactions: false,
    versioning: true,
    encryption: true,
    compression: false,
    streaming: true,
    queryable: true,
    distributed: true
  }
  
  private s3: S3Client
  private bucket: string
  
  async connect(config: ConnectionConfig): Promise<void> {
    this.s3 = new S3Client({
      region: config.region,
      credentials: config.credentials
    })
    
    this.bucket = config.bucket
    
    // Verify bucket access
    await this.verifyBucketAccess()
  }
  
  async get(key: string): Promise<Buffer | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: this.sanitizeKey(key)
      })
      
      const response = await this.s3.send(command)
      return Buffer.from(await response.Body!.transformToByteArray())
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return null
      }
      throw error
    }
  }
  
  async put(
    key: string,
    value: Buffer,
    metadata?: Metadata
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: this.sanitizeKey(key),
      Body: value,
      Metadata: this.serializeMetadata(metadata),
      ServerSideEncryption: 'AES256'
    })
    
    await this.s3.send(command)
  }
  
  async list(
    prefix?: string,
    options: ListOptions = {}
  ): Promise<StorageEntry[]> {
    const entries: StorageEntry[] = []
    let continuationToken: string | undefined
    
    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix ? this.sanitizeKey(prefix) : undefined,
        MaxKeys: options.limit || 1000,
        ContinuationToken: continuationToken
      })
      
      const response = await this.s3.send(command)
      
      if (response.Contents) {
        for (const object of response.Contents) {
          entries.push({
            key: object.Key!,
            size: object.Size!,
            modified: object.LastModified!,
            metadata: await this.getObjectMetadata(object.Key!)
          })
        }
      }
      
      continuationToken = response.NextContinuationToken
    } while (continuationToken && (!options.limit || entries.length < options.limit))
    
    return entries
  }
  
  async getStream(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: this.sanitizeKey(key)
    })
    
    const response = await this.s3.send(command)
    return response.Body as Readable
  }
  
  async putStream(
    key: string,
    stream: Readable,
    metadata?: Metadata
  ): Promise<void> {
    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.bucket,
        Key: this.sanitizeKey(key),
        Body: stream,
        Metadata: this.serializeMetadata(metadata)
      },
      partSize: 5 * 1024 * 1024, // 5MB parts
      queueSize: 4
    })
    
    await upload.done()
  }
}
```

### Multi-Cloud Backend

```typescript
class MultiCloudBackend implements StorageBackend {
  id = 'multi-cloud'
  name = 'Multi-Cloud Backend'
  description = 'Distributes data across multiple cloud providers'
  version = '1.0.0'
  
  private backends: Map<string, StorageBackend> = new Map()
  private strategy: DistributionStrategy
  
  async connect(config: ConnectionConfig): Promise<void> {
    // Initialize cloud backends
    for (const provider of config.providers) {
      const backend = await this.createBackend(provider)
      await backend.connect(provider.config)
      this.backends.set(provider.id, backend)
    }
    
    // Initialize distribution strategy
    this.strategy = this.createStrategy(config.strategy)
  }
  
  async put(
    key: string,
    value: Buffer,
    metadata?: Metadata
  ): Promise<void> {
    const targets = this.strategy.selectTargets(key, this.backends)
    
    // Write to multiple backends
    const promises = targets.map(backend =>
      backend.put(key, value, metadata)
    )
    
    await Promise.all(promises)
  }
  
  async get(key: string): Promise<Buffer | null> {
    const sources = this.strategy.selectSources(key, this.backends)
    
    // Try each source in order
    for (const backend of sources) {
      try {
        const value = await backend.get(key)
        if (value) return value
      } catch (error) {
        // Try next backend
        continue
      }
    }
    
    return null
  }
}

interface DistributionStrategy {
  selectTargets(key: string, backends: Map<string, StorageBackend>): StorageBackend[]
  selectSources(key: string, backends: Map<string, StorageBackend>): StorageBackend[]
}

class RedundantStrategy implements DistributionStrategy {
  constructor(private replicas: number = 2) {}
  
  selectTargets(key: string, backends: Map<string, StorageBackend>): StorageBackend[] {
    const all = Array.from(backends.values())
    return all.slice(0, this.replicas)
  }
  
  selectSources(key: string, backends: Map<string, StorageBackend>): StorageBackend[] {
    // Return all backends, sorted by latency
    return Array.from(backends.values())
  }
}
```

## Specialized Backends

### Encrypted Storage Backend

```typescript
class EncryptedBackend implements StorageBackend {
  constructor(
    private backend: StorageBackend,
    private encryption: EncryptionProvider
  ) {}
  
  async get(key: string): Promise<Buffer | null> {
    const encrypted = await this.backend.get(key)
    if (!encrypted) return null
    
    return this.encryption.decrypt(encrypted)
  }
  
  async put(
    key: string,
    value: Buffer,
    metadata?: Metadata
  ): Promise<void> {
    const encrypted = await this.encryption.encrypt(value)
    
    // Add encryption metadata
    const enrichedMetadata = {
      ...metadata,
      encrypted: true,
      algorithm: this.encryption.algorithm,
      keyId: this.encryption.keyId
    }
    
    await this.backend.put(key, encrypted, enrichedMetadata)
  }
}
```

### Cached Storage Backend

```typescript
class CachedBackend implements StorageBackend {
  private cache: LRUCache<string, Buffer>
  
  constructor(
    private backend: StorageBackend,
    private options: CacheOptions = {}
  ) {
    this.cache = new LRUCache({
      max: options.maxSize || 100 * 1024 * 1024, // 100MB
      length: (value) => value.length,
      maxAge: options.ttl || 3600000 // 1 hour
    })
  }
  
  async get(key: string): Promise<Buffer | null> {
    // Check cache first
    const cached = this.cache.get(key)
    if (cached) {
      this.metrics.increment('cache.hits')
      return cached
    }
    
    this.metrics.increment('cache.misses')
    
    // Get from backend
    const value = await this.backend.get(key)
    
    if (value) {
      this.cache.set(key, value)
    }
    
    return value
  }
  
  async put(
    key: string,
    value: Buffer,
    metadata?: Metadata
  ): Promise<void> {
    // Update cache
    this.cache.set(key, value)
    
    // Write through to backend
    await this.backend.put(key, value, metadata)
  }
  
  async delete(key: string): Promise<void> {
    // Remove from cache
    this.cache.del(key)
    
    // Delete from backend
    await this.backend.delete(key)
  }
}
```

## Backend Testing

### Storage Backend Test Suite

```typescript
abstract class StorageBackendTestSuite {
  abstract createBackend(): Promise<StorageBackend>
  
  async runTests(): Promise<TestResults> {
    const backend = await this.createBackend()
    const results: TestResult[] = []
    
    // Basic operations
    results.push(await this.testBasicOperations(backend))
    results.push(await this.testBatchOperations(backend))
    results.push(await this.testQueryOperations(backend))
    
    // Advanced features
    if (backend.capabilities.transactions) {
      results.push(await this.testTransactions(backend))
    }
    
    if (backend.capabilities.streaming) {
      results.push(await this.testStreaming(backend))
    }
    
    // Performance tests
    results.push(await this.testPerformance(backend))
    
    return {
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results
    }
  }
  
  private async testBasicOperations(
    backend: StorageBackend
  ): Promise<TestResult> {
    const key = 'test-key'
    const value = Buffer.from('test-value')
    
    try {
      // Test put
      await backend.put(key, value)
      
      // Test get
      const retrieved = await backend.get(key)
      if (!retrieved || !retrieved.equals(value)) {
        throw new Error('Retrieved value does not match')
      }
      
      // Test exists
      const exists = await backend.exists(key)
      if (!exists) {
        throw new Error('Key should exist')
      }
      
      // Test delete
      await backend.delete(key)
      
      // Verify deletion
      const deleted = await backend.get(key)
      if (deleted !== null) {
        throw new Error('Key should be deleted')
      }
      
      return { name: 'Basic Operations', passed: true }
    } catch (error) {
      return {
        name: 'Basic Operations',
        passed: false,
        error: error.message
      }
    }
  }
}
```

## Best Practices

### Backend Implementation Guidelines

1. **Error Handling**
   ```typescript
   class ResilientBackend {
     async get(key: string): Promise<Buffer | null> {
       try {
         return await this.doGet(key)
       } catch (error) {
         if (this.isRetryable(error)) {
           return this.retryWithBackoff(() => this.doGet(key))
         }
         throw new StorageError(`Failed to get ${key}`, error)
       }
     }
   }
   ```

2. **Resource Management**
   ```typescript
   class ResourceAwareBackend {
     private pool: ConnectionPool
     
     async get(key: string): Promise<Buffer | null> {
       const connection = await this.pool.acquire()
       try {
         return await this.doGet(key, connection)
       } finally {
         this.pool.release(connection)
       }
     }
   }
   ```

3. **Monitoring**
   ```typescript
   class MonitoredBackend {
     async put(key: string, value: Buffer): Promise<void> {
       const start = Date.now()
       
       try {
         await this.doPut(key, value)
         this.metrics.timing('put.duration', Date.now() - start)
         this.metrics.increment('put.success')
       } catch (error) {
         this.metrics.increment('put.error')
         throw error
       }
     }
   }
   ```

## Future Enhancements

1. **Blockchain Storage**
   - Immutable storage backend
   - Distributed ledger integration
   - Smart contract validation

2. **AI-Optimized Storage**
   - Intelligent data placement
   - Predictive caching
   - Automatic tiering

3. **Edge Storage**
   - CDN integration
   - Geo-distributed storage
   - Local-first sync

4. **Quantum-Safe Storage**
   - Post-quantum encryption
   - Quantum key distribution
   - Future-proof security
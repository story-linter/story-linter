# NPM Packages

## Overview

This document outlines the NPM package structure, publishing strategy, and best practices for distributing the Story Linter and its ecosystem components through the NPM registry.

## Package Structure

### Core Package Organization

```typescript
// Package structure
story-linter/
├── packages/
│   ├── core/                    // @story-linter/core
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── cli/                     // @story-linter/cli
│   │   ├── src/
│   │   ├── bin/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── validators/              // @story-linter/validators
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── schemas/                 // @story-linter/schemas
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── plugin-api/              // @story-linter/plugin-api
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── lerna.json
├── package.json
└── tsconfig.base.json
```

### Package Definitions

```json
// packages/core/package.json
{
  "name": "@story-linter/core",
  "version": "1.0.0",
  "description": "Core validation engine for Story Linter",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "require": "./dist/index.js",
      "import": "./dist/index.esm.js",
      "types": "./dist/index.d.ts"
    },
    "./validators": {
      "require": "./dist/validators.js",
      "import": "./dist/validators.esm.js",
      "types": "./dist/validators.d.ts"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=14.0.0"
  },
  "peerDependencies": {
    "typescript": ">=4.0.0"
  },
  "peerDependenciesMeta": {
    "typescript": {
      "optional": true
    }
  },
  "dependencies": {
    "unified": "^10.0.0",
    "remark-parse": "^10.0.0",
    "ajv": "^8.0.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "typescript": "^5.0.0",
    "rollup": "^3.0.0"
  },
  "scripts": {
    "build": "rollup -c",
    "test": "jest",
    "prepublishOnly": "npm run build && npm test"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/story-linter/story-linter.git",
    "directory": "packages/core"
  },
  "keywords": [
    "story",
    "linter",
    "validation",
    "narrative"
  ],
  "license": "MIT"
}
```

## Build Configuration

### Rollup Configuration

```typescript
// rollup.config.js
import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { terser } from 'rollup-plugin-terser'
import dts from 'rollup-plugin-dts'

const external = [
  'fs',
  'path',
  'util',
  'stream',
  'crypto',
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {})
]

export default [
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    external,
    plugins: [
      resolve({ preferBuiltins: true }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
      terser({
        compress: {
          drop_console: process.env.NODE_ENV === 'production'
        }
      })
    ]
  },
  
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true
    },
    external,
    plugins: [
      resolve({ preferBuiltins: true }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      })
    ]
  },
  
  // TypeScript declarations
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    external,
    plugins: [dts()]
  }
]
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts"]
}

// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

## Publishing Strategy

### Version Management

```typescript
// scripts/version.ts
import { exec } from 'child_process'
import { promisify } from 'util'
import * as semver from 'semver'

const execAsync = promisify(exec)

interface VersionOptions {
  type: 'major' | 'minor' | 'patch' | 'prerelease'
  preid?: string
  packages?: string[]
}

export async function versionPackages(options: VersionOptions): Promise<void> {
  const { type, preid, packages } = options
  
  // Determine version bump
  const versionArgs = preid 
    ? `${type} --preid ${preid}`
    : type
  
  // Version specific packages or all
  const scope = packages
    ? `--scope ${packages.map(p => `@story-linter/${p}`).join(' --scope ')}`
    : ''
  
  // Run lerna version
  await execAsync(
    `lerna version ${versionArgs} ${scope} --no-push --yes`
  )
  
  // Generate changelog
  await generateChangelog()
  
  // Create git tag
  await createVersionTag()
}

async function generateChangelog(): Promise<void> {
  await execAsync('conventional-changelog -p angular -i CHANGELOG.md -s')
}
```

### Publishing Workflow

```typescript
// scripts/publish.ts
interface PublishOptions {
  tag?: 'latest' | 'next' | 'beta'
  dryRun?: boolean
  otp?: string
}

export async function publishPackages(options: PublishOptions): Promise<void> {
  const { tag = 'latest', dryRun = false, otp } = options
  
  // Ensure clean working directory
  await ensureCleanWorkingDirectory()
  
  // Run tests
  await runTests()
  
  // Build all packages
  await buildPackages()
  
  // Publish to NPM
  const publishArgs = [
    'lerna publish from-package',
    `--dist-tag ${tag}`,
    dryRun ? '--dry-run' : '',
    otp ? `--otp ${otp}` : ''
  ].filter(Boolean).join(' ')
  
  await execAsync(publishArgs)
  
  // Push tags to git
  if (!dryRun) {
    await execAsync('git push --follow-tags')
  }
}

async function ensureCleanWorkingDirectory(): Promise<void> {
  const { stdout } = await execAsync('git status --porcelain')
  
  if (stdout.trim()) {
    throw new Error('Working directory is not clean')
  }
}

async function runTests(): Promise<void> {
  await execAsync('npm test')
  await execAsync('npm run lint')
  await execAsync('npm run type-check')
}

async function buildPackages(): Promise<void> {
  await execAsync('lerna run build --stream')
}
```

## Package Configuration

### CLI Package

```json
// packages/cli/package.json
{
  "name": "@story-linter/cli",
  "version": "1.0.0",
  "description": "Command-line interface for Story Linter",
  "bin": {
    "story-linter": "./bin/story-linter.js"
  },
  "files": [
    "bin",
    "dist",
    "templates"
  ],
  "dependencies": {
    "@story-linter/core": "^1.0.0",
    "@story-linter/validators": "^1.0.0",
    "commander": "^9.0.0",
    "chalk": "^5.0.0",
    "ora": "^6.0.0",
    "inquirer": "^9.0.0"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
```

### Plugin API Package

```json
// packages/plugin-api/package.json
{
  "name": "@story-linter/plugin-api",
  "version": "1.0.0",
  "description": "Plugin API for Story Linter",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "require": "./dist/index.js",
      "import": "./dist/index.esm.js"
    },
    "./testing": {
      "types": "./dist/testing.d.ts",
      "require": "./dist/testing.js",
      "import": "./dist/testing.esm.js"
    }
  },
  "peerDependencies": {
    "@story-linter/core": "^1.0.0"
  }
}
```

## Distribution Strategies

### Bundle Optimization

```typescript
// build/optimize.ts
import { analyzeBundle } from './bundle-analyzer'
import { optimizeDependencies } from './dependency-optimizer'

export async function optimizePackages(): Promise<void> {
  // Analyze bundle sizes
  const analysis = await analyzeBundle({
    packages: ['core', 'cli', 'validators'],
    format: 'json'
  })
  
  // Identify optimization opportunities
  const optimizations = identifyOptimizations(analysis)
  
  // Apply optimizations
  for (const optimization of optimizations) {
    switch (optimization.type) {
      case 'tree-shake':
        await treeShakePackage(optimization.package)
        break
        
      case 'code-split':
        await codeSplitPackage(optimization.package)
        break
        
      case 'lazy-load':
        await implementLazyLoading(optimization.package)
        break
    }
  }
}

function identifyOptimizations(analysis: BundleAnalysis): Optimization[] {
  const optimizations: Optimization[] = []
  
  for (const pkg of analysis.packages) {
    // Check for large dependencies
    const largeDeps = pkg.dependencies.filter(d => d.size > 100000)
    
    if (largeDeps.length > 0) {
      optimizations.push({
        type: 'tree-shake',
        package: pkg.name,
        targets: largeDeps
      })
    }
    
    // Check for code splitting opportunities
    if (pkg.totalSize > 500000) {
      optimizations.push({
        type: 'code-split',
        package: pkg.name
      })
    }
  }
  
  return optimizations
}
```

### Platform-Specific Builds

```typescript
// build/platform-builds.ts
interface PlatformBuild {
  platform: 'node' | 'browser' | 'deno'
  config: RollupConfig
}

export function createPlatformBuilds(): PlatformBuild[] {
  return [
    // Node.js build
    {
      platform: 'node',
      config: {
        input: 'src/index.ts',
        output: {
          file: 'dist/index.node.js',
          format: 'cjs'
        },
        external: ['fs', 'path', 'crypto'],
        plugins: [nodeBuiltins()]
      }
    },
    
    // Browser build
    {
      platform: 'browser',
      config: {
        input: 'src/browser.ts',
        output: {
          file: 'dist/index.browser.js',
          format: 'umd',
          name: 'StoryLinter'
        },
        plugins: [
          nodePolyfills(),
          replace({
            'process.env.NODE_ENV': JSON.stringify('production')
          })
        ]
      }
    },
    
    // Deno build
    {
      platform: 'deno',
      config: {
        input: 'src/deno.ts',
        output: {
          file: 'dist/index.deno.js',
          format: 'es'
        },
        external: (id) => id.startsWith('https://')
      }
    }
  ]
}
```

## Package Testing

### Integration Testing

```typescript
// test/package-integration.test.ts
describe('Package Integration', () => {
  it('should install and work correctly', async () => {
    // Create test project
    const testDir = await createTestProject()
    
    // Install packages
    await exec(`npm install @story-linter/cli`, { cwd: testDir })
    
    // Run CLI
    const result = await exec('npx story-linter --version', { cwd: testDir })
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/)
    
    // Test basic functionality
    await writeFile(
      path.join(testDir, 'story.md'),
      '# Test Story\nContent here'
    )
    
    const validation = await exec('npx story-linter validate story.md', {
      cwd: testDir
    })
    
    expect(validation.code).toBe(0)
  })
  
  it('should work with different package managers', async () => {
    const packageManagers = ['npm', 'yarn', 'pnpm']
    
    for (const pm of packageManagers) {
      const testDir = await createTestProject()
      
      // Install with specific package manager
      const installCmd = pm === 'npm' 
        ? 'npm install'
        : pm === 'yarn'
        ? 'yarn add'
        : 'pnpm add'
      
      await exec(`${installCmd} @story-linter/core`, { cwd: testDir })
      
      // Verify installation
      const pkg = await readJSON(path.join(testDir, 'package.json'))
      expect(pkg.dependencies).toHaveProperty('@story-linter/core')
    }
  })
})
```

### Package Size Testing

```typescript
// test/package-size.test.ts
describe('Package Size', () => {
  const MAX_SIZES = {
    '@story-linter/core': 500 * 1024,      // 500KB
    '@story-linter/cli': 1000 * 1024,      // 1MB
    '@story-linter/validators': 300 * 1024,  // 300KB
    '@story-linter/plugin-api': 50 * 1024   // 50KB
  }
  
  for (const [pkg, maxSize] of Object.entries(MAX_SIZES)) {
    it(`${pkg} should be under ${maxSize / 1024}KB`, async () => {
      const stats = await getPackageStats(pkg)
      
      expect(stats.publishSize).toBeLessThan(maxSize)
      expect(stats.installSize).toBeLessThan(maxSize * 3)
    })
  }
})
```

## Documentation

### Package README Template

```markdown
# @story-linter/[package-name]

> [Package description]

## Installation

```bash
npm install @story-linter/[package-name]
```

## Usage

```typescript
import { [export] } from '@story-linter/[package-name]'

// Usage example
```

## API Reference

### [API Documentation]

## Configuration

[Configuration options]

## Examples

[Code examples]

## Contributing

See the [contributing guide](../../CONTRIBUTING.md) for details.

## License

MIT © Story Linter Team
```

### API Documentation Generation

```typescript
// scripts/generate-docs.ts
import { Application } from 'typedoc'

export async function generateAPIDocs(): Promise<void> {
  const packages = ['core', 'cli', 'validators', 'plugin-api']
  
  for (const pkg of packages) {
    const app = new Application()
    
    app.options.addReader(new TypeDocReader())
    app.options.addReader(new TSConfigReader())
    
    app.bootstrap({
      entryPoints: [`packages/${pkg}/src/index.ts`],
      out: `docs/api/${pkg}`,
      plugin: ['typedoc-plugin-markdown'],
      theme: 'markdown',
      excludePrivate: true,
      excludeProtected: true,
      excludeInternal: true,
      readme: `packages/${pkg}/README.md`
    })
    
    const project = app.convert()
    
    if (project) {
      await app.generateDocs(project, `docs/api/${pkg}`)
    }
  }
}
```

## Security Considerations

### Package Security

```typescript
// scripts/security-check.ts
export async function checkPackageSecurity(): Promise<void> {
  // Check for vulnerabilities
  await exec('npm audit --production')
  
  // Verify package integrity
  await verifyPackageIntegrity()
  
  // Check for sensitive data
  await checkForSensitiveData()
  
  // Verify dependencies
  await verifyDependencies()
}

async function verifyPackageIntegrity(): Promise<void> {
  const packages = await getPackages()
  
  for (const pkg of packages) {
    // Check package.json
    const packageJson = await readJSON(`packages/${pkg}/package.json`)
    
    // Verify required fields
    const required = ['name', 'version', 'license', 'repository']
    for (const field of required) {
      if (!packageJson[field]) {
        throw new Error(`Missing required field: ${field} in ${pkg}`)
      }
    }
    
    // Check for private packages
    if (packageJson.private) {
      throw new Error(`Package ${pkg} is marked as private`)
    }
  }
}

async function checkForSensitiveData(): Promise<void> {
  const patterns = [
    /api[_-]?key/i,
    /secret/i,
    /password/i,
    /token/i,
    /private[_-]?key/i
  ]
  
  const files = await glob('packages/**/dist/**/*.js')
  
  for (const file of files) {
    const content = await readFile(file, 'utf8')
    
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        throw new Error(
          `Potential sensitive data found in ${file}: ${pattern}`
        )
      }
    }
  }
}
```

### NPM Authentication

```yaml
# .github/workflows/publish.yml
name: Publish Packages

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build packages
        run: npm run build
      
      - name: Run tests
        run: npm test
      
      - name: Security audit
        run: npm audit --production
      
      - name: Publish packages
        run: npm run publish:ci
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Monitoring and Analytics

### Package Analytics

```typescript
// scripts/analytics.ts
export async function trackPackageMetrics(): Promise<void> {
  const packages = await getPublishedPackages()
  
  for (const pkg of packages) {
    const stats = await getNPMStats(pkg)
    
    console.log(`${pkg}:`)
    console.log(`  Weekly downloads: ${stats.downloads.weekly}`)
    console.log(`  Monthly downloads: ${stats.downloads.monthly}`)
    console.log(`  Total downloads: ${stats.downloads.total}`)
    console.log(`  Version adoption:`)
    
    for (const [version, count of Object.entries(stats.versions)]) {
      console.log(`    ${version}: ${count} (${(count / stats.downloads.total * 100).toFixed(1)}%)`)
    }
  }
}

async function getNPMStats(packageName: string): Promise<PackageStats> {
  const [downloads, versions] = await Promise.all([
    fetch(`https://api.npmjs.org/downloads/point/last-week/${packageName}`),
    fetch(`https://registry.npmjs.org/${packageName}`)
  ])
  
  return {
    downloads: await downloads.json(),
    versions: await versions.json()
  }
}
```

## Future Enhancements

1. **Automated Publishing**
   - Continuous deployment
   - Canary releases
   - Automated changelog generation

2. **Package Federation**
   - Module federation support
   - Dynamic package loading
   - Micro-frontend architecture

3. **Advanced Distribution**
   - CDN distribution
   - Private registry support
   - Offline package bundles

4. **Package Intelligence**
   - Dependency analysis
   - Breaking change detection
   - Upgrade path suggestions
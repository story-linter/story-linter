# Docker Support

## Overview

This document outlines the Docker containerization strategy for the Story Linter, including container images, orchestration, and deployment patterns for various use cases.

## Container Architecture

### Base Image Strategy

```dockerfile
# base.Dockerfile - Shared base image
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    bash \
    curl

# Set up non-root user
RUN addgroup -g 1001 -S story-linter && \
    adduser -S story-linter -u 1001 -G story-linter

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY lerna.json ./
COPY packages/*/package*.json ./packages/

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Switch to non-root user
USER story-linter
```

### Application Images

```dockerfile
# cli.Dockerfile - CLI Image
FROM story-linter/base:latest AS cli-base

# Copy built application
COPY --chown=story-linter:story-linter packages /app/packages
COPY --chown=story-linter:story-linter bin /app/bin

# Create volumes for input/output
VOLUME ["/input", "/output"]

# Set environment
ENV NODE_ENV=production
ENV STORY_LINTER_HOME=/app

# Default command
ENTRYPOINT ["node", "/app/bin/story-linter.js"]
CMD ["--help"]

# api.Dockerfile - API Server Image
FROM story-linter/base:latest AS api-base

# Copy application
COPY --chown=story-linter:story-linter packages /app/packages
COPY --chown=story-linter:story-linter server /app/server

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start server
CMD ["node", "/app/server/index.js"]
```

### Multi-Stage Build

```dockerfile
# production.Dockerfile - Optimized production build
FROM node:18-alpine AS builder

WORKDIR /build

# Copy source
COPY . .

# Install all dependencies
RUN npm ci

# Build packages
RUN npm run build

# Run tests
RUN npm test

# Prune dev dependencies
RUN npm prune --production

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies only
RUN apk add --no-cache tini

# Create user
RUN addgroup -g 1001 -S story-linter && \
    adduser -S story-linter -u 1001 -G story-linter

WORKDIR /app

# Copy built application
COPY --from=builder --chown=story-linter:story-linter /build/packages ./packages
COPY --from=builder --chown=story-linter:story-linter /build/node_modules ./node_modules
COPY --from=builder --chown=story-linter:story-linter /build/bin ./bin

# Switch to non-root user
USER story-linter

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "/app/bin/story-linter.js"]
```

## Docker Compose Configuration

### Development Environment

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  story-linter:
    build:
      context: .
      dockerfile: dev.Dockerfile
    volumes:
      - .:/app
      - /app/node_modules
      - /app/packages/*/node_modules
    environment:
      - NODE_ENV=development
      - DEBUG=story-linter:*
    command: npm run dev
    
  api:
    build:
      context: .
      dockerfile: api.Dockerfile
      target: development
    ports:
      - "3000:3000"
    volumes:
      - ./server:/app/server
      - ./packages:/app/packages
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://user:pass@db:5432/story_linter
      - REDIS_URL=redis://cache:6379
    depends_on:
      - db
      - cache
    
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=story_linter
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  cache:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    
  worker:
    build:
      context: .
      dockerfile: worker.Dockerfile
    environment:
      - NODE_ENV=development
      - REDIS_URL=redis://cache:6379
      - WORKER_CONCURRENCY=4
    depends_on:
      - cache
    
volumes:
  postgres_data:
  redis_data:
```

### Production Environment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    image: story-linter/api:${VERSION:-latest}
    restart: unless-stopped
    ports:
      - "80:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
  worker:
    image: story-linter/worker:${VERSION:-latest}
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - REDIS_URL=${REDIS_URL}
      - WORKER_CONCURRENCY=8
    deploy:
      replicas: 2
    
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - api
```

## Container Optimization

### Image Size Optimization

```dockerfile
# optimized.Dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
COPY lerna.json ./
COPY packages/*/package*.json ./packages/
RUN npm ci --only=production

# Stage 2: Build
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY lerna.json ./
COPY packages ./packages
COPY tsconfig*.json ./
RUN npm ci
RUN npm run build

# Stage 3: Production
FROM gcr.io/distroless/nodejs18-debian11
WORKDIR /app

# Copy only necessary files
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/packages/*/dist ./packages
COPY --from=build /app/bin ./bin

# Distroless doesn't have a shell, use array syntax
ENTRYPOINT ["node", "/app/bin/story-linter.js"]
```

### Build Cache Optimization

```dockerfile
# cache-optimized.Dockerfile
FROM node:18-alpine AS base

# Install dependencies in separate layer
FROM base AS deps
WORKDIR /cache
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Build application
FROM base AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Final image
FROM base AS runtime
WORKDIR /app
COPY --from=deps /cache/node_modules ./node_modules
COPY --from=build /build/dist ./dist
```

## Kubernetes Deployment

### Deployment Manifests

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: story-linter-api
  labels:
    app: story-linter
    component: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: story-linter
      component: api
  template:
    metadata:
      labels:
        app: story-linter
        component: api
    spec:
      containers:
      - name: api
        image: story-linter/api:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: story-linter-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: story-linter-api
spec:
  selector:
    app: story-linter
    component: api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Helm Chart

```yaml
# helm/story-linter/values.yaml
replicaCount: 3

image:
  repository: story-linter/api
  pullPolicy: IfNotPresent
  tag: "1.0.0"

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.story-linter.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: story-linter-tls
      hosts:
        - api.story-linter.com

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 80

postgresql:
  enabled: true
  auth:
    postgresPassword: secretpassword
    database: story_linter

redis:
  enabled: true
  auth:
    enabled: true
    password: secretpassword
```

## CI/CD Integration

### Build Pipeline

```yaml
# .github/workflows/docker.yml
name: Docker Build and Push

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
    
    - name: Setup Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}
          type=sha
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        platforms: linux/amd64,linux/arm64
        push: ${{ github.event_name != 'pull_request' }}
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

### Security Scanning

```yaml
# security-scan.yml
name: Security Scan

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0' # Weekly

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: 'story-linter/api:latest'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'
    
    - name: Run Snyk scan
      uses: snyk/actions/docker@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        image: story-linter/api:latest
        args: --severity-threshold=high
```

## Runtime Configuration

### Environment Configuration

```typescript
// config/docker.ts
export const dockerConfig = {
  development: {
    api: {
      port: process.env.PORT || 3000,
      host: '0.0.0.0',
      cors: {
        origin: '*',
        credentials: true
      }
    },
    database: {
      host: process.env.DB_HOST || 'db',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'story_linter_dev',
      user: process.env.DB_USER || 'user',
      password: process.env.DB_PASSWORD || 'pass'
    },
    redis: {
      host: process.env.REDIS_HOST || 'cache',
      port: parseInt(process.env.REDIS_PORT || '6379')
    }
  },
  
  production: {
    api: {
      port: process.env.PORT || 3000,
      host: '0.0.0.0',
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || [],
        credentials: true
      }
    },
    database: {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    },
    redis: {
      url: process.env.REDIS_URL,
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined
    }
  }
}
```

### Health Checks

```typescript
// health/docker-health.ts
export class DockerHealthCheck {
  async check(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkDiskSpace(),
      this.checkMemory()
    ])
    
    const healthy = checks.every(c => c.status === 'fulfilled')
    
    return {
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      checks: {
        database: this.getCheckResult(checks[0]),
        redis: this.getCheckResult(checks[1]),
        disk: this.getCheckResult(checks[2]),
        memory: this.getCheckResult(checks[3])
      }
    }
  }
  
  private async checkDiskSpace(): Promise<void> {
    const stats = await checkDiskSpace('/')
    
    if (stats.free < 100 * 1024 * 1024) { // 100MB
      throw new Error('Low disk space')
    }
  }
  
  private async checkMemory(): Promise<void> {
    const usage = process.memoryUsage()
    const limit = process.env.MEMORY_LIMIT || 512 * 1024 * 1024
    
    if (usage.heapUsed > limit * 0.9) {
      throw new Error('High memory usage')
    }
  }
}
```

## Monitoring and Logging

### Container Logging

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    ports:
      - "9090:9090"
    
  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    ports:
      - "3001:3000"
    
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
    command: -config.file=/etc/loki/local-config.yaml
    
  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - ./promtail-config.yaml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml

volumes:
  prometheus_data:
  grafana_data:
```

### Metrics Collection

```typescript
// metrics/docker-metrics.ts
import { register, collectDefaultMetrics, Counter, Histogram } from 'prom-client'

// Collect default metrics
collectDefaultMetrics({ prefix: 'story_linter_' })

// Custom metrics
export const httpRequestDuration = new Histogram({
  name: 'story_linter_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
})

export const validationCounter = new Counter({
  name: 'story_linter_validations_total',
  help: 'Total number of validations performed',
  labelNames: ['status', 'validator']
})

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})
```

## Development Workflow

### Local Development

```bash
#!/bin/bash
# scripts/docker-dev.sh

# Build development image
docker-compose -f docker-compose.dev.yml build

# Start services
docker-compose -f docker-compose.dev.yml up -d

# Watch logs
docker-compose -f docker-compose.dev.yml logs -f api worker

# Run tests in container
docker-compose -f docker-compose.dev.yml exec api npm test

# Access shell
docker-compose -f docker-compose.dev.yml exec api sh
```

### Hot Reload Setup

```dockerfile
# dev.Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install nodemon globally
RUN npm install -g nodemon

# Copy package files
COPY package*.json ./
RUN npm install

# Volume mount for source code
VOLUME ["/app/src"]

# Use nodemon for hot reload
CMD ["nodemon", "--watch", "src", "--exec", "node", "src/index.js"]
```

## Best Practices

### Security Best Practices

1. **Use minimal base images**
   ```dockerfile
   # Good: Minimal Alpine image
   FROM node:18-alpine
   
   # Better: Distroless for production
   FROM gcr.io/distroless/nodejs18-debian11
   ```

2. **Run as non-root user**
   ```dockerfile
   RUN addgroup -g 1001 -S appuser && \
       adduser -S appuser -u 1001 -G appuser
   USER appuser
   ```

3. **Scan for vulnerabilities**
   ```bash
   docker scan story-linter:latest
   trivy image story-linter:latest
   ```

### Performance Best Practices

1. **Multi-stage builds**
   - Separate build and runtime dependencies
   - Minimize final image size
   - Cache dependencies effectively

2. **Layer caching**
   - Order Dockerfile commands by change frequency
   - Copy dependency files before source code
   - Use .dockerignore effectively

## Future Enhancements

1. **Container Orchestration**
   - Kubernetes operators
   - Service mesh integration
   - Advanced deployment strategies

2. **Image Optimization**
   - Nix-based builds
   - BuildKit advanced features
   - WASM containers

3. **Development Experience**
   - Dev containers
   - Cloud development environments
   - Instant development environments

4. **Monitoring and Observability**
   - Distributed tracing
   - Advanced metrics
   - Log aggregation
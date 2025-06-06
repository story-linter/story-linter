# Development Dockerfile for Story Linter
FROM node:20-alpine AS base

# Install basic tools
RUN apk add --no-cache git bash

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY lerna.json ./
COPY packages/*/package*.json ./packages/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build all packages
RUN npm run build

# Development stage
FROM base AS development
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

# Production stage
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

# Copy built packages and dependencies
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/package*.json ./

# Install only production dependencies
RUN npm ci --production

CMD ["node", "packages/cli/dist/cli.js"]
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
# Use npm install for initial setup (creates package-lock.json)
# In production builds, you'd copy package-lock.json and use npm ci
RUN npm install

# Copy source code
COPY . .

# Build all packages
# Temporarily commented out to allow testing during refactoring
# RUN npm run build

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
# Note: In real production, you'd have package-lock.json
RUN npm install --production

CMD ["node", "packages/cli/dist/cli.js"]
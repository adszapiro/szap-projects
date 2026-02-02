# =============================================================================
# Quant Agent Dockerfile
# Multi-stage build for production deployment
# =============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S quantagent -u 1001

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy SQL files for reference (migrations run externally)
COPY schema.sql ./
COPY migrations/ ./migrations/

# Set ownership
RUN chown -R quantagent:nodejs /app

# Switch to non-root user
USER quantagent

# Health check (logs to stdout)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Environment variables (override at runtime)
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Labels for container metadata
LABEL org.opencontainers.image.title="Quant Agent"
LABEL org.opencontainers.image.description="Autonomous trading agent with dual-model AI (GPT-4 + Claude)"
LABEL org.opencontainers.image.authors="Alex Szapiro"

# Run the agent
CMD ["node", "dist/index.js"]

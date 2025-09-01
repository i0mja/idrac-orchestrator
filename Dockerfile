# Multi-stage build for production deployment
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    curl \
    postgresql-client \
    dumb-init \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy configuration files
COPY ecosystem.config.js ./
COPY init.sql ./

# Create directories with proper permissions
RUN mkdir -p /app/logs /app/tmp /opt/firmware && \
    chown -R appuser:appgroup /app /opt/firmware

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server/index.js"]

# Labels for better organization
LABEL maintainer="Enterprise Infrastructure Team"
LABEL description="iDRAC Updater Orchestrator - Enterprise firmware management"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/your-org/idrac-updater-orchestrator"
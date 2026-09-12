# ==============================================================================
# Multi-stage Dockerfile for AppAssets / Goldie Studio Production Deployment
# Supports Google Cloud Run, Railway, Render, Fly.io, and self-hosted VPS
# ==============================================================================

# Stage 1: Build Studio & CLI
FROM oven/bun:1-debian AS builder

WORKDIR /app

# Install build dependencies for native node-canvas bindings if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package.json bun.lock* ./
COPY studio/package.json ./studio/
RUN bun install
RUN cd studio && bun install

# Copy source code and build production artifacts
COPY . .
RUN bun run build:studio
RUN bun run build:cli

# Stage 2: Production Runner
FROM oven/bun:1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4321

# Install runtime libraries required by @napi-rs/canvas
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

# Copy built application and required assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/studio/dist ./studio/dist
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy default/example configuration if not provided via volume mount
COPY --from=builder /app/appassets.config.example.ts ./appassets.config.ts
COPY --from=builder /app/appassets.config.example.ts ./goldie.config.ts

# Set up volume for persistent project output (screenshots, designs, exports)
VOLUME ["/app/out"]

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

EXPOSE 4321

# Start the Studio server (no browser auto-open in container)
CMD ["bun", "run", "dist/cli.js", "studio", "--no-open", "--port", "4321"]

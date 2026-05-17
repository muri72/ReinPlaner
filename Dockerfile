# ==============================================
# ReinPlaner - Production Dockerfile
# ==============================================
# Multi-stage build for minimal image size

# ---- Stage 1: Dependencies ----
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Install pnpm globally using npm
RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile || pnpm install

# ---- Stage 2: Builder ----
FROM node:22-alpine AS builder
WORKDIR /app

# Copy pnpm binary and node_modules from deps stage
COPY --from=deps /usr/local/lib/node_modules/pnpm /usr/local/lib/node_modules/pnpm
RUN ln -sf /usr/local/lib/node_modules/pnpm/bin/pnpm.cjs /usr/local/bin/pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build flags
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
ENV NODE_ENV=production
ENV PATH="/usr/local/bin:/usr/local/lib/node_modules/.bin:$PATH"

# Build the application (standalone output)
RUN pnpm build

# ---- Stage 3: Runner ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set permissions for .next standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/.env.production.template ./.env.production.template

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose port
EXPOSE 3000

# Start the standalone server
CMD ["node", "server.js"]
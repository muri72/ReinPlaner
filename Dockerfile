# ==============================================
# ReinPlaner - Production Dockerfile
# ==============================================
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY . .

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Expose port
EXPOSE 3000

# Start standalone server
CMD ["node", ".next/standalone/server.js"]
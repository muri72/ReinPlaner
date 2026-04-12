# Deployment Guide - ARIS Dashboard

## Quick Reference

| Platform | Command | URL |
|----------|---------|-----|
| Vercel | `git push` (automatic) | `https://*.vercel.app` |
| Docker | `docker build -t aris . && docker run` | `http://localhost:3000` |
| Local Dev | `docker-compose up` | `http://localhost:3000` |

---

## Local Development with Docker

### Using Docker Compose (Recommended)

```bash
# Start the full stack (Next.js + Supabase Local)
docker-compose up

# Start only the app (requires external Supabase)
docker-compose up app

# Rebuild after dependency changes
docker-compose up --build
```

**Services:**
- App: http://localhost:3000
- Supabase Studio: http://localhost:3001
- Supabase API: http://localhost:54321

### Manual Docker Build

```bash
# Build production image
DOCKER_BUILD=true NODE_ENV=production pnpm build

# Build Docker image
docker build -t aris-dashboard .

# Run container
docker run -p 3000:3000 \
  --env-file .env.production \
  aris-dashboard
```

---

## Own Server Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose v2+
- Domain pointing to server (optional)
- SSL certificate (recommended)

### Deployment Steps

#### 1. Prepare Server

```bash
# SSH into your server
ssh user@your-server.com

# Create project directory
mkdir -p /opt/aris-dashboard
cd /opt/aris-dashboard

# Clone repository
git clone https://github.com/your-org/aris-dashboard.git .
git checkout production
```

#### 2. Configure Environment

```bash
# Copy production template
cp .env.production.template .env

# Edit with your values
nano .env
```

**Required Variables:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# URLs
NEXT_PUBLIC_BASE_URL=https://your-production-domain.com
```

**Optional Variables:**

```env
# Sentry (Error Tracking)
SENTRY_AUTH_TOKEN=your_sentry_token
SENTRY_ORG=your_org
SENTRY_PROJECT=aris-dashboard-prod

# Email (Resend)
RESEND_API_KEY=re_your_api_key

# Cron
CRON_API_KEY=sk_cron_your_secure_key
```

#### 3. Build and Start

```bash
# Pull latest code
git pull origin production

# Build with Docker
docker build -t aris-dashboard .

# Stop old container (if running)
docker-compose down

# Start new container
docker run -d \
  --name aris-dashboard \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  aris-dashboard
```

#### 4. Setup with Docker Compose (Recommended for Production)

Create `docker-compose.production.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - aris_network

networks:
  aris_network:
    driver: bridge
```

```bash
# Deploy
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Update
docker-compose -f docker-compose.production.yml pull && docker-compose -f docker-compose.production.yml up -d
```

#### 5. Nginx Reverse Proxy (Optional)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable SSL with Let's Encrypt
sudo certbot --nginx -d your-domain.com
```

---

## Vercel Deployment

### Automatic Deployments

Vercel automatically deploys on every push to `main` and `dev` branches.

**Branches:**
- `production` → Production URL
- `dev` → Preview URL

### Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

| Name | Value | Environments |
|------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJxxx` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJxxx` | Production, Preview, Development |
| `NEXT_PUBLIC_BASE_URL` | `https://your-domain.com` | Production |
| `SENTRY_AUTH_TOKEN` | `eyJxxx` | Build Time |
| `SENTRY_ORG` | `your-org` | Build Time |
| `SENTRY_PROJECT` | `aris-dashboard-prod` | Build Time |
| `SENTRY_DSN` | `https://xxx@sentry.io/xxx` | Production, Preview, Development |
| `RESEND_API_KEY` | `re_xxx` | Production, Preview |
| `CRON_API_KEY` | `sk_xxx` | Production, Preview |

### Vercel Configuration (vercel.json)

The project automatically uses Vercel if pushing to GitHub. No manual `vercel.json` needed.

**Project Settings (vercel.json is auto-generated):**
- Framework: Next.js
- Build Command: `pnpm build`
- Output Directory: `.next`
- Install Command: `pnpm install`

### Troubleshooting Vercel

**Build Failures:**
```bash
# Local build test
pnpm build

# Check for TypeScript errors
pnpm lint
```

**Environment Variables not loading:**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Check variables are set for correct environment
3. Redeploy after adding new variables

---

## Health Check

The app exposes a health endpoint:

```bash
# Check if container is healthy
curl http://localhost:3000/health

# Expected response
{ "status": "ok" }
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs aris-dashboard

# Common issues:
# - Port 3000 already in use
# - Missing environment variables
# - Build failed
```

### Database connection errors

1. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
2. Check Supabase project is not paused
3. For local: `docker-compose up supabase-db`

### Build fails on server

```bash
# Check available disk space
df -h

# Check memory
free -m

# Next.js build requires ~1GB RAM minimum
```

### Sentry source maps not uploading

1. Verify `SENTRY_AUTH_TOKEN` is set
2. Check `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry dashboard
3. Token needs `org:write` scope

---

## Security Checklist

Before going live:

- [ ] All secrets in `.env`, not committed to git
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never exposed to client
- [ ] HTTPS enforced (redirect HTTP to HTTPS)
- [ ] Security headers enabled (see next.config.ts)
- [ ] Sentry `hideSourceMaps: true` in production
- [ ] `NODE_ENV=production` set
- [ ] `NEXT_TELEMETRY_DISABLED=1` set
- [ ] Docker running as non-root user
- [ ] Regular `docker pull` for security updates

---

## Quick Reference: Common Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Production build
pnpm lint                   # Lint code

# Docker
docker-compose up           # Start local stack
docker-compose down         # Stop local stack
docker build -t aris .       # Build image
docker run -p 3000:3000 aris # Run container

# Git
git checkout production     # Switch to production branch
git pull origin production # Update production
git push origin production # Deploy to production
```
# Dev Build Trigger Sun Apr 12 04:08:34 CEST 2026
# Build Trigger Sun Apr 12 13:50:09 CEST 2026

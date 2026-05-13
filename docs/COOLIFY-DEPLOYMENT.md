# Coolify Deployment Guide — ReinPlaner

Self-hosted GitOps deployment on a Hetzner server with multi-environment setup.

---

## Prerequisites

- Hetzner server (Ubuntu 22.04, 48 GB RAM)
- Domain configured with DNS A records pointing to server IP
- GitHub account with access to `muri72/ReinPlaner`

---

## 1. Install Coolify on Ubuntu 22.04

SSH into your server and run the official one-liner install script:

```bash
ssh root@<YOUR_SERVER_IP>
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

The script will:
- Install Docker & Docker Compose
- Configure a non-root user (`coolify`)
- Set up Nginx as a reverse proxy
- Install Coolify on port 8000 (default)

### First-Run Configuration

After installation completes:

1. Open Coolify in your browser: `http://<YOUR_SERVER_IP>:8000`
2. You will be prompted to create an **admin password** on first access
3. Configure your **public domain** (e.g. `coolify.reinplaner.de`) — or use the server IP temporarily
4. Generate or upload your **SSH key** for Git access
5. Coolify dashboard is ready

> **Tip:** Point a DNS A record (e.g. `coolify.yourdomain.com`) to your server IP and add it as a public domain in Coolify settings for HTTPS access.

---

## 2. Connect GitHub Repository via GitHub App

### Option A — GitHub App (Recommended for organizations)

1. In Coolify sidebar, go to **Sources → Add Source → GitHub**
2. Click **Install GitHub App**
3. You are redirected to GitHub → authorize the app on your account/org
4. Select which repositories to allow (`muri72/ReinPlaner` or entire org)
5. Back in Coolify, the source appears — select it

### Option B — GitHub Personal Access Token (simpler)

1. Go to GitHub → **Settings → Developer Settings → Personal Access Tokens → Tokens (classic)**
2. Generate a new token with `repo` scope
3. In Coolify: **Sources → Add Source → GitHub → Use PAT**
4. Paste the token

The repository `muri72/ReinPlaner` will now be available when creating new projects.

---

## 3. Create Environments in Coolify

Coolify uses **Environments** to isolate deployment targets. Create two:

### Environment 1: `production`

| Field | Value |
|-------|-------|
| Name | `production` |
| Default Domain | `reinplaner.de` |
| SSL | Enabled (Let's Encrypt) |

### Environment 2: `development`

| Field | Value |
|-------|-------|
| Name | `development` |
| Default Domain | `dev.reinplaner.de` |
| SSL | Enabled (Let's Encrypt) |

> DNS must already have A records for `reinplaner.de` and `dev.reinplaner.de` pointing to your server IP before proceeding.

---

## 4. Create the Production Application (master branch)

### New Project

1. **Projects → New Project → Create Project**
2. Name: `ReinPlaner`

### Add Application — Production

1. **Add New Resource → Application**
2. **GitHub**: Select `muri72/ReinPlaner`
3. **Branch**: `master`
4. **Build Pack**: `Nixpacks` (auto-detects Next.js) or select `Dockerfile`
5. **Environment**: `production`
6. **Port**: `3000`

#### Deployment Settings

- **Autodeploy**: ✅ On push to `master`
- **Build Command** (if not using Dockerfile): `pnpm install --frozen-lockfile && pnpm build`
- **Start Command**: `pnpm start`

### Environment Variables — Production

Add the following in the **Environment Variables** section:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-instance.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_BASE_URL=https://reinplaner.de
RESEND_API_KEY=your_resend_api_key_here
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

> For Supabase, you can use the hosted [Supabase](https://supabase.com) cloud plan or your own self-hosted instance. Replace `NEXT_PUBLIC_SUPABASE_URL` accordingly.

#### Database Connection (External Postgres)

If using an external self-hosted Postgres, add:

```
DATABASE_URL=postgresql://user:password@your-postgres-host:5432/reinplaner
```

Or if Coolify should manage the database as a linked container, add a **Postgres resource** in Coolify and reference it via the `CONNECTION_STRING` variable.

---

## 5. Create the Development Application (dev branch)

1. **Add New Resource → Application**
2. **GitHub**: Select `muri72/ReinPlaner`
3. **Branch**: `dev`
4. **Build Pack**: `Nixpacks` / `Dockerfile` (same as production)
5. **Environment**: `development`
6. **Port**: `3000`

### Environment Variables — Development

```
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-instance.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_BASE_URL=https://dev.reinplaner.de
RESEND_API_KEY=your_resend_api_key_here
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

- **Autodeploy**: ✅ On push to `dev`
- **Domain**: `dev.reinplaner.de`

### Initial Deploy

Click **Deploy** to trigger the first build. Coolify will:
1. Clone the repo
2. Detect Next.js and run the build
3. Start the container on port 3000
4. Provision a Let's Encrypt SSL certificate
5. Point `dev.reinplaner.de` to the running container

---

## 6. DNS Configuration

Ensure the following DNS A records exist **before** deploying:

| Hostname | A Record Target |
|----------|-----------------|
| `reinplaner.de` | `<YOUR_SERVER_IP>` |
| `dev.reinplaner.de` | `<YOUR_SERVER_IP>` |
| `coolify` (optional) | `<YOUR_SERVER_IP>` |

Coolify automatically handles SSL via Let's Encrypt once the DNS resolves.

---

## 7. GitHub Actions Auto-Deploy (Optional)

Coolify can also be triggered by GitHub Actions webhooks. To enable:

1. In Coolify, go to your **Application → Deployments → Webhook**
2. Copy the **Deployment Webhook URL**
3. Add this to your GitHub repository:

**.github/workflows/deploy.yml**

```yaml
name: Deploy to Coolify

on:
  push:
    branches:
      - dev
      - master

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Coolify Webhook
        run: |
          curl -X POST ${{ secrets.COOLIFY_WEBHOOK_URL }}
```

In GitHub: **Settings → Secrets → Actions**, add `COOLIFY_WEBHOOK_URL`.

### Branch-to-Environment Mapping

| GitHub Push | Coolify Action |
|-------------|----------------|
| Push to `dev` | Auto-deploys dev environment |
| Push to `master` | Auto-deploys production environment |

---

## 8. Rollback Strategy

### Instant Rollback via Coolify

1. Go to **Application → Deployments**
2. Find the last working deployment
3. Click the **Rollback** button (↩️)

Coolify will instantly switch back to the previous Docker image — no rebuild needed.

### Manual Rollback via Git

```bash
# On the server, pull the previous commit
git checkout <previous-commit-hash>
git pull origin master
# Coolify detects the change and redeploys
```

### Pre-Production Smoke Test

For the `master` branch, disable **Autodeploy** and use **Manual Deploy** with a smoke test:

1. Push to `master` → Coolify builds but does **not** switch live traffic
2. Verify the new deployment in Coolify's built-in preview URL
3. Click **Redeploy** to make it live

---

## 9. Resource Sizing (48 GB RAM Server)

For a Next.js app on a 48 GB server:

| Resource | Recommended |
|----------|-------------|
| **Memory limit (per container)** | 2 GB |
| **CPU** | 2 cores |
| **Health check path** | `/` or `/api/health` |
| **Health check interval** | 30s |

Set these in **Application → Resource Settings** if Coolify allows custom limits.

---

## 10. Useful Coolify Commands (Server CLI)

```bash
# Check Coolify service status
sudo systemctl status coolify

# View logs
sudo journalctl -u coolify -f

# Restart Coolify
sudo systemctl restart coolify

# Update Coolify
cd ~/coolify && docker compose pull && docker compose up -d
```

---

## Checklist Summary

- [ ] Server provisioned (Ubuntu 22.04, DNS configured)
- [ ] Coolify installed via official script
- [ ] GitHub App connected to `muri72/ReinPlaner`
- [ ] Two environments created: `production`, `development`
- [ ] DNS A records for `reinplaner.de` and `dev.reinplaner.de`
- [ ] Production app → `master` branch → `reinplaner.de`
- [ ] Development app → `dev` branch → `dev.reinplaner.de`
- [ ] All environment variables configured
- [ ] Database linked (external Postgres or Coolify-managed container)
- [ ] Auto-deploy enabled on both branches
- [ ] First deployment successful
- [ ] Rollback tested

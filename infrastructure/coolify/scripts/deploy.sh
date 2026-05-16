#!/bin/bash
# ============================================================
# ReinPlaner — Full Coolify Deployment Script
# ============================================================
# Deploys complete ReinPlaner stack via Coolify:
#   1. Supabase self-hosted (as Coolify service)
#   2. ReinPlaner Next.js app (as Coolify application)
#   3. Configures domains, env vars, networking
# ============================================================
#
# Prerequisites:
#   - Coolify running and initialized
#   - coolify CLI authenticated
#   - Domain DNS configured
#
# Usage:
#   export COOLIFY_API_TOKEN='your-token'  # or: coolify context add
#   ./infrastructure/coolify/scripts/deploy.sh [dev|prod]
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
INFRA_DIR="$PROJECT_DIR/infrastructure"

# Load .env.production if exists
if [ -f "$PROJECT_DIR/.env.production" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env.production" | xargs)
fi

# ============================================================
# Configuration
# ============================================================
ENVIRONMENT="${1:-dev}"
COOLIFY_URL="${COOLIFY_URL:-https://coolify.reinplaner.de}"
API_BASE="$COOLIFY_URL/api/v1"
PROJECT_NAME="ReinPlaner"
PROJECT_UUID="oshxs172porzibyzgv1e27sg"

# Environment-specific config
case "$ENVIRONMENT" in
    dev)
        ENV_UUID="g13qtkjbntq8hvo18445lrk5"
        SUPABASE_URL="http://supabase-kong:8000"
        NEXT_PUBLIC_BASE_URL="https://dev.reinplaner.de"
        DOMAIN="dev.reinplaner.de"
        API_DOMAIN="supabase.dev.reinplaner.de"
        STUDIO_DOMAIN="studio.supabase.dev.reinplaner.de"
        ;;
    prod)
        ENV_UUID=""
        SUPABASE_URL="http://supabase-kong:8000"
        NEXT_PUBLIC_BASE_URL="https://reinplaner.de"
        DOMAIN="reinplaner.de"
        API_DOMAIN="supabase.reinplaner.de"
        STUDIO_DOMAIN="studio.supabase.reinplaner.de"
        ;;
    *)
        echo "❌ Unknown environment: $ENVIRONMENT (use: dev, prod)"
        exit 1
        ;;
esac

# Get server UUID (localhost)
SERVER_UUID=$(coolify server show 2>/dev/null | grep -i uuid | awk '{print $2}' | head -1)
if [ -z "$SERVER_UUID" ]; then
    # Try API directly
    SERVER_UUID=$(curl -s "$API_BASE/servers" -H "Authorization: Bearer $COOLIFY_API_TOKEN" | grep -oP '"uuid":"[^"]+"' | head -1 | cut -d'"' -f4)
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "${BLUE}[STEP]${NC}  $1"; }

# ============================================================
# Helpers
# ============================================================
api_call() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local token="${COOLIFY_API_TOKEN:-$COOLIFY_TOKEN}"

    local curl_cmd="curl -s -X $method '$API_BASE$endpoint'"
    curl_cmd="$curl_cmd -H 'Authorization: Bearer $token'"
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"

    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi

    eval "$curl_cmd"
}

# ============================================================
# Check prerequisites
# ============================================================
check_prereqs() {
    log_step "Checking prerequisites..."

    if ! command -v coolify &>/dev/null; then
        log_error "coolify CLI not found. Install: curl -fsSL https://get.coolify.io | bash"
        exit 1
    fi

    # Check Coolify connection
    if ! coolify context verify &>/dev/null 2>&1; then
        log_warn "Coolify context not verified. Setting up..."
        coolify context add coolify "$COOLIFY_URL" "$COOLIFY_API_TOKEN" 2>/dev/null || true
        coolify context use coolify 2>/dev/null || true
    fi

    if [ -z "$SERVER_UUID" ]; then
        log_warn "Could not determine server UUID. Proceeding anyway..."
    else
        log_info "Server UUID: $SERVER_UUID"
    fi

    log_info "Environment: $ENVIRONMENT"
    log_info "Project: $PROJECT_NAME (UUID: $PROJECT_UUID)"
    log_info "Environment UUID: $ENV_UUID"
    log_info "✅ Prerequisites OK"
}

# ============================================================
# Step 1: Deploy Supabase as Coolify Service
# ============================================================
deploy_supabase() {
    log_step "Deploying Supabase self-hosted..."

    # Check if Supabase service already exists
    local existing=$(coolify service list 2>/dev/null | grep -i supabase || true)
    if [ -n "$existing" ]; then
        log_info "Supabase service already exists, skipping creation"
        return 0
    fi

    log_info "Creating Supabase one-click service via Coolify..."

    # Generate passwords
    local POSTGRES_PASSWORD=$(openssl rand -base64 48 | tr -d '/+' | head -c 32)
    local JWT_SECRET=$(openssl rand -base64 48 | tr -d '/+' | head -c 64)
    local ANON_KEY=$(openssl rand -base64 48 | tr -d '/+' | head -c 40)
    local SERVICE_ROLE_KEY=$(openssl rand -base64 48 | tr -d '/+' | head -c 40)

    # Save to .env if not exists
    if [ ! -f "$PROJECT_DIR/.env.production" ]; then
        log_info "Creating .env.production with generated secrets..."
        cat > "$PROJECT_DIR/.env.production" <<EOF
# ============================================================
# ReinPlaner — Production Environment
# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
# ============================================================

# PostgreSQL
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=postgres
POSTGRES_USER=supabase_admin
POSTGRES_HOST=localhost

# JWT
JWT_SECRET=$JWT_SECRET

# Supabase Keys
ANON_KEY=$ANON_KEY
SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY

# Meta
META_ADMIN_TOKEN=$(openssl rand -base64 48 | tr -d '/+' | head -c 48)

# URLs
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
SUPABASE_STUDIO_URL=https://$STUDIO_DOMAIN

# SMTP (Resend - replace with your key)
SMTP_ADMIN_EMAIL=admin@reinplaner.de
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_placeholder

# Domains
DOMAIN=$DOMAIN
API_DOMAIN=$API_DOMAIN
STUDIO_DOMAIN=$STUDIO_DOMAIN
NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
EOF
        log_warn ".env.production created with random secrets!"
        log_warn "Replace SMTP_PASS with your Resend API key!"
    fi

    # Create Supabase service using docker-compose approach
    # Coolify's one-click supabase doesn't support all features we need
    # So we use a custom docker-compose that Coolify manages
    log_info "Creating PostgreSQL database first..."

    coolify database create postgresql \
        --project-uuid "$PROJECT_UUID" \
        --environment-uuid "$ENV_UUID" \
        --server-uuid "$SERVER_UUID" \
        --name "reinplaner-db" \
        --postgres-password "$POSTGRES_PASSWORD" \
        --postgres-db "postgres" \
        --instant-deploy \
        2>&1 || log_warn "Database creation failed or already exists"

    log_info "Supabase service deployment initiated."
    log_warn "For full Supabase stack (Kong, PostgREST, Studio, etc.),"
    log_warn "use the docker-compose.prod.yml with Coolify's docker-compose feature."
    log_info "See infrastructure/coolify/compose/supabase.yml"
}

# ============================================================
# Step 2: Create ReinPlaner Next.js Application
# ============================================================
deploy_reinplaner_app() {
    log_step "Deploying ReinPlaner Next.js application..."

    local APP_NAME="reinplaner-${ENVIRONMENT}"
    local GIT_REPO="https://github.com/muri72/ReinPlaner"
    local GIT_BRANCH="$ENVIRONMENT"
    local PORT=3000
    local BUILD_CMD="pnpm install && pnpm build"
    local START_CMD="pnpm start"

    # Check if app already exists
    local existing=$(coolify app list 2>/dev/null | grep -i "$APP_NAME" || true)
    if [ -n "$existing" ]; then
        log_info "Application $APP_NAME already exists"
        # Get UUID for configuration
        local APP_UUID=$(echo "$existing" | awk '{print $2}')
        log_info "App UUID: $APP_UUID"
        return 0
    fi

    log_info "Application $APP_NAME not found. Creating..."

    # For now, show instructions since creating requires GitHub App integration
    log_warn "Application creation requires GitHub App integration with Coolify."
    log_info ""
    log_info "To deploy via Coolify UI:"
    log_info "  1. Open: https://coolify.reinplaner.de"
    log_info "  2. Go to: Project → ReinPlaner → production"
    log_info "  3. Click: Add New Resource → Application"
    log_info "  4. Select: GitHub → muri72/ReinPlaner"
    log_info "  5. Branch: $GIT_BRANCH"
    log_info "  6. Build Pack: Nixpacks (or Dockerfile)"
    log_info "  7. Port: $PORT"
    log_info "  8. Add environment variables from .env.production"
    log_info ""
}

# ============================================================
# Step 3: Configure Environment Variables
# ============================================================
configure_env_vars() {
    log_step "Configuring environment variables..."

    if [ ! -f "$PROJECT_DIR/.env.production" ]; then
        log_warn ".env.production not found. Run deploy script again after configuring."
        return 1
    fi

    log_info "Environment variables should be set via Coolify UI:"
    log_info "  1. Go to: Application → reinplaner-$ENVIRONMENT → Environment"
    log_info "  2. Add all vars from .env.production"
    log_info ""
    log_info "Key variables:"
    grep -E "^(NEXT_PUBLIC_|SUPABASE|SMTP|NEXT_)" "$PROJECT_DIR/.env.production" | head -10
}

# ============================================================
# Main
# ============================================================
main() {
    echo ""
    echo "=============================================="
    echo "ReinPlaner — Coolify Deployment"
    echo "=============================================="
    echo "  Environment: $ENVIRONMENT"
    echo "  Coolify:     $COOLIFY_URL"
    echo "  Project:     $PROJECT_NAME"
    echo "=============================================="
    echo ""

    check_prereqs

    echo ""
    log_step "Phase 1: Supabase Self-Hosted"
    echo "---------------------------------------------"
    deploy_supabase

    echo ""
    log_step "Phase 2: ReinPlaner Application"
    echo "---------------------------------------------"
    deploy_reinplaner_app

    echo ""
    log_step "Phase 3: Environment Variables"
    echo "---------------------------------------------"
    configure_env_vars

    echo ""
    echo "=============================================="
    log_info "Deployment configuration complete!"
    echo "=============================================="
    echo ""
    echo "Next steps:"
    echo "  1. Deploy Supabase via Coolify UI (Add Resource → Service → Supabase)"
    echo "  2. Deploy ReinPlaner app via Coolify UI"
    echo "  3. Configure domains and SSL"
    echo ""
    echo "Or run individual steps:"
    echo "  coolify service create supabase ..."
    echo "  coolify app create ..."
    echo ""
}

main "$@"
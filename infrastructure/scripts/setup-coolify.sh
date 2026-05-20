#!/bin/bash
# ============================================================
# ReinPlaner — Coolify Full Setup & Deployment Script
# ============================================================
# Installs Coolify on a fresh server and deploys the complete
# ReinPlaner stack (Supabase + Next.js) via Coolify.
#
# Run on a fresh Ubuntu/Debian server as root:
#   curl -sL https://raw.githubusercontent.com/muri72/ReinPlaner/dev/infrastructure/scripts/setup-coolify.sh | bash
#
# Or after Coolify is installed:
#   cd ~/ReinPlaner && ./infrastructure/scripts/setup-coolify.sh deploy
# ============================================================

set -e

# ============================================================
# Detect if running as root
# ============================================================
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root: sudo $0"
    exit 1
fi

# ============================================================
# Colors
# ============================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "${BLUE}[STEP]${NC}  $1"; }
log_done()  { echo -e "${GREEN}[DONE]${NC}  $1"; }

# ============================================================
# Configuration
# ============================================================
COOLIFY_URL="${COOLIFY_URL:-https://coolify.reinplaner.de}"
INSTALL_URL="https://get.coolify.io"
PROJECT_DIR="/home/ubuntu/ReinPlaner"
ENV_FILE="$PROJECT_DIR/.env.production"

# ============================================================
# Check command argument
# ============================================================
COMMAND="${1:-install}"

# ============================================================
# Detect OS
# ============================================================
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    else
        log_error "Cannot detect OS"
        exit 1
    fi
    log_info "Detected: $OS $VER"
}

# ============================================================
# Install Docker (if missing)
# ============================================================
install_docker() {
    log_step "Checking Docker..."

    if command -v docker &>/dev/null; then
        log_done "Docker already installed: $(docker --version | cut -d' ' -f3 | tr -d ',')"
        return 0
    fi

    log_info "Installing Docker..."

    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt-get update
        apt-get install -y ca-certificates curl gnupg lsb-release

        # Docker GPG key
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg

        # Docker repo
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

        apt-get update
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

        systemctl enable docker
        systemctl start docker

        log_done "Docker installed"
    else
        log_error "Unsupported OS: $OS"
        exit 1
    fi
}

# ============================================================
# Install Coolify
# ============================================================
install_coolify() {
    log_step "Installing Coolify..."

    if docker ps --format '{{.Names}}' | grep -q "^coolify$"; then
        log_done "Coolify already running"
        log_info "  URL: $COOLIFY_URL"
        log_info "  Run '$0 deploy' to deploy ReinPlaner"
        return 0
    fi

    log_info "Running Coolify installer..."
    log_info "  This may take a few minutes..."

    # Coolify installation command
    curl -fsSL $INSTALL_URL | bash

    log_done "Coolify installed"
    log_info "  Open: $COOLIFY_URL"
    log_info "  Complete the setup wizard in the UI"
    log_info "  Then run: $0 deploy"
}

# ============================================================
# Install Coolify CLI
# ============================================================
install_coolify_cli() {
    log_step "Installing Coolify CLI..."

    if command -v coolify &>/dev/null; then
        log_done "Coolify CLI already installed: $(coolify version 2>/dev/null || echo 'unknown')"
        return 0
    fi

    # Download latest coolify CLI
    local latest
    latest=$(curl -fsSL https://api.github.com/repos/coollabsio/coolify/releases/latest 2>/dev/null | grep -oP '"tag_name":\s*"\K[^"]+' | head -1)

    curl -fsSL "https://github.com/coollabsio/coolify/releases/download/$latest/coolify" -o /usr/local/bin/coolify
    chmod +x /usr/local/bin/coolify

    log_done "Coolify CLI installed: $latest"
}

# ============================================================
# Configure Coolify API token
# ============================================================
configure_coolify_token() {
    log_step "Configuring Coolify API access..."

    if [ -z "$COOLIFY_API_TOKEN" ]; then
        log_warn "COOLIFY_API_TOKEN not set"
        log_info "To get your token:"
        log_info "  1. Open: $COOLIFY_URL"
        log_info "  2. Go to: Keys & Tokens → API Tokens"
        log_info "  3. Create token with '*' permissions"
        log_info "  4. Run: export COOLIFY_API_TOKEN='your-token'"
        return 1
    fi

    # Add/update context
    coolify context add coolify "$COOLIFY_URL" "$COOLIFY_API_TOKEN" 2>/dev/null || true
    coolify context use coolify 2>/dev/null || true

    if coolify context verify &>/dev/null 2>&1; then
        log_done "Coolify API connection verified"
    else
        log_error "Failed to verify Coolify connection"
        return 1
    fi
}

# ============================================================
# Deploy Supabase via Docker Compose in Coolify
# ============================================================
deploy_supabase() {
    log_step "Deploying Supabase self-hosted..."

    # Check if we have the compose file
    local compose_file="$PROJECT_DIR/infrastructure/coolify/compose/supabase.yml"
    if [ ! -f "$compose_file" ]; then
        log_error "Compose file not found: $compose_file"
        return 1
    fi

    # Check .env.production
    if [ ! -f "$ENV_FILE" ]; then
        log_warn ".env.production not found at $ENV_FILE"
        log_info "Creating with random secrets..."
        generate_env_file
    fi

    log_info "Supabase should be deployed via Coolify UI:"
    log_info "  1. Open: $COOLIFY_URL"
    log_info "  2. Go to: Project → ReinPlaner → production"
    log_info "  3. Click: Add New Resource → Docker Compose"
    log_info "  4. Paste content from: infrastructure/coolify/compose/supabase.yml"
    log_info "  5. Add environment variables from .env.production"
    log_info "  6. Click Deploy"

    log_info ""
    log_info "Or use the Coolify API to create a service."
}

# ============================================================
# Deploy ReinPlaner Next.js app
# ============================================================
deploy_reinplaner_app() {
    log_step "Deploying ReinPlaner Next.js application..."

    log_info "Application should be deployed via Coolify UI:"
    log_info "  1. Open: $COOLIFY_URL"
    log_info "  2. Go to: Project → ReinPlaner → production"
    log_info "  3. Click: Add New Resource → Application"
    log_info "  4. Select: GitHub → muri72/ReinPlaner"
    log_info "  5. Branch: dev (or prod)"
    log_info "  6. Build Pack: Nixpacks or Dockerfile"
    log_info "  7. Port: 3000"
    log_info "  8. Add environment variables from .env.production"
    log_info "  9. Click Deploy"
}

# ============================================================
# Generate .env.production with random secrets
# ============================================================
generate_env_file() {
    log_step "Generating .env.production..."

    local POSTGRES_PASSWORD=$(openssl rand -base64 48 | tr -d '/+' | head -c 32)
    local JWT_SECRET=$(openssl rand -base64 48 | tr -d '/+' | head -c 64)
    local ANON_KEY=$(openssl rand -base64 48 | tr -d '/+' | head -c 40)
    local SERVICE_ROLE_KEY=$(openssl rand -base64 48 | tr -d '/+' | head -c 40)
    local META_ADMIN_TOKEN=$(openssl rand -base64 48 | tr -d '/+' | head -c 48)

    cat > "$ENV_FILE" <<EOF
# ============================================================
# ReinPlaner — Production Environment
# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
# ============================================================
# IMPORTANT: Replace placeholder values marked with 'replace_with'
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

# Meta Admin Token
META_ADMIN_TOKEN=$META_ADMIN_TOKEN

# URLs
NEXT_PUBLIC_SUPABASE_URL=http://kong:8000
SUPABASE_STUDIO_URL=http://studio:3000
NEXT_PUBLIC_BASE_URL=https://dev.reinplaner.de

# SMTP (Resend - replace with your real key)
SMTP_ADMIN_EMAIL=admin@reinplaner.de
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_placeholder_replace_with_real_key

# Domains
DOMAIN=dev.reinplaner.de
API_DOMAIN=supabase.dev.reinplaner.de
STUDIO_DOMAIN=studio.supabase.dev.reinplaner.de
EOF

    log_done ".env.production created at $ENV_FILE"
    log_warn "Replace SMTP_PASS with your Resend API key!"
}

# ============================================================
# Show status
# ============================================================
show_status() {
    echo ""
    echo "=============================================="
    echo "ReinPlaner — Coolify Deployment Status"
    echo "=============================================="

    # Coolify status
    echo ""
    log_step "Coolify"
    if docker ps --format '{{.Names}}' | grep -q "^coolify$"; then
        log_done "Coolify is running at $COOLIFY_URL"
    else
        log_error "Coolify is not running"
        log_info "Run: $0 install"
    fi

    # Docker status
    echo ""
    log_step "Docker"
    if command -v docker &>/dev/null; then
        log_done "Docker installed: $(docker --version | cut -d' ' -f3 | tr -d ',')"
    else
        log_error "Docker not installed"
    fi

    # Project
    echo ""
    log_step "Project"
    if [ -d "$PROJECT_DIR" ]; then
        log_done "ReinPlaner at $PROJECT_DIR"
        echo "  Branch: $(cd $PROJECT_DIR && git branch --show-current)"
        echo "  Commit: $(cd $PROJECT_DIR && git rev-parse --short HEAD)"
    else
        log_warn "ReinPlaner not found at $PROJECT_DIR"
    fi

    echo ""
    echo "=============================================="
    echo ""
    echo "Available commands:"
    echo "  $0 install    - Install Docker + Coolify"
    echo "  $0 deploy     - Deploy ReinPlaner stack"
    echo "  $0 status     - Show current status"
    echo ""
}

# ============================================================
# Main
# ============================================================
main() {
    echo ""
    echo "=============================================="
    echo "ReinPlaner — Coolify Setup"
    echo "=============================================="
    echo "  URL:     $COOLIFY_URL"
    echo "  Project: $PROJECT_DIR"
    echo "  Command: $COMMAND"
    echo "=============================================="
    echo ""

    case "$COMMAND" in
        install)
            detect_os
            install_docker
            install_coolify
            install_coolify_cli
            configure_coolify_token
            ;;
        deploy)
            install_coolify_cli
            configure_coolify_token || true
            generate_env_file
            deploy_supabase
            deploy_reinplaner_app
            ;;
        status)
            show_status
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            echo ""
            echo "Usage: $0 [install|deploy|status]"
            exit 1
            ;;
    esac
}

main
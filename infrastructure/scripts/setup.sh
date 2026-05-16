#!/bin/bash
# ============================================================
# ReinPlaner — Server Bootstrap Script
# ============================================================
# First-time setup for a fresh Ubuntu/Debian server
# Run: curl -s https://raw.githubusercontent.com/muri72/ReinPlaner/dev/infrastructure/scripts/setup.sh | bash
# ============================================================

set -e

echo "=============================================="
echo "ReinPlaner — Server Bootstrap"
echo "=============================================="
echo ""

# ============================================================
# Check if running as root
# ============================================================
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root: sudo $0"
    exit 1
fi

# ============================================================
# Detect OS
# ============================================================
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "❌ Cannot detect OS"
    exit 1
fi

echo "  OS: $OS $VERSION_ID"

# ============================================================
# Check prerequisites
# ============================================================
echo ""
echo "📋 Checking prerequisites..."

check_command() {
    if command -v "$1" &> /dev/null; then
        echo "  ✅ $1"
    else
        echo "  ❌ $1 - not found, will install"
        MISSING="$MISSING $1"
    fi
}

check_command docker
check_command docker-compose

# ============================================================
# Install Docker if missing
# ============================================================
if echo "$MISSING" | grep -q "docker"; then
    echo ""
    echo "🔧 Installing Docker..."

    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt-get update
        apt-get install -y ca-certificates curl gnupg lsb-release

        # Add Docker GPG key
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg

        # Add Docker repo
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

        apt-get update
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

        # Enable and start Docker
        systemctl enable docker
        systemctl start docker

        echo "  ✅ Docker installed"
    else
        echo "❌ Unsupported OS for auto-install. Please install Docker manually."
        exit 1
    fi
fi

if echo "$MISSING" | grep -q "docker-compose"; then
    echo ""
    echo "🔧 Installing Docker Compose..."
    # Docker Compose v2 is included in docker-compose-plugin
    echo "  ✅ Docker Compose (as plugin) installed"
fi

# ============================================================
# Create directory structure
# ============================================================
echo ""
echo "📁 Creating directory structure..."

mkdir -p /var/www/coming-soon
mkdir -p /var/log/caddy
mkdir -p /etc/caddy
mkdir -p /opt/reinplaner
mkdir -p /opt/reinplaner/infrastructure/supabase/backups

echo "  ✅ Directories created"

# ============================================================
# Detect project directory
# ============================================================
if [ -d "/app" ]; then
    PROJECT_DIR="/app"
elif [ -d "/home/ubuntu/ReinPlaner" ]; then
    PROJECT_DIR="/home/ubuntu/ReinPlaner"
elif [ -d "/opt/reinplaner" ]; then
    PROJECT_DIR="/opt/reinplaner"
else
    echo "  ⚠️  Project directory not found. Please clone the repo first."
    PROJECT_DIR="/opt/reinplaner"
fi

echo "  Project: $PROJECT_DIR"

# ============================================================
# Check for .env.production
# ============================================================
ENV_FILE="$PROJECT_DIR/.env.production"
if [ -f "$ENV_FILE" ]; then
    echo ""
    echo "✅ .env.production found at $ENV_FILE"
else
    echo ""
    echo "⚠️  .env.production not found at $ENV_FILE"
    echo "   Copy infrastructure/.env.production.template to .env.production and fill in values."
fi

# ============================================================
# Stop existing containers (dirty state)
# ============================================================
echo ""
echo "🧹 Checking for existing containers..."

if docker ps --format "{{.Names}}" | grep -q "^supabase_prod"; then
    echo "  ⚠️  Found existing supabase_prod_* containers"
    echo "  → Stopping supabase_prod_* containers..."
    docker ps --filter "name=supabase_prod" --format "{{.Names}}" | xargs -r docker stop 2>/dev/null || true
    docker ps --filter "name=supabase_prod" --format "{{.Names}}" | xargs -r docker rm 2>/dev/null || true
    echo "  ✅ Existing containers stopped and removed"
else
    echo "  ✅ No conflicting containers found"
fi

# ============================================================
# Initialize auth schemas
# ============================================================
if [ -f "$PROJECT_DIR/infrastructure/supabase/scripts/init-auth-schemas.sh" ]; then
    echo ""
    echo "🔧 Initializing auth schemas..."
    chmod +x "$PROJECT_DIR/infrastructure/supabase/scripts/init-auth-schemas.sh"
    # Note: This script requires the postgres container to be running
    # It will be run again after containers start
fi

# ============================================================
# UFW Firewall
# ============================================================
echo ""
echo "🔒 Configuring firewall..."

if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 8000/tcp
    ufw allow 9443/tcp
    echo "  ✅ Firewall configured (22, 80, 443, 8000, 9443)"
else
    echo "  ⚠️  UFW not installed, skipping firewall"
fi

# ============================================================
# Docker daemon config (for production)
# ============================================================
echo ""
echo "⚙️  Configuring Docker daemon..."

mkdir -p /etc/docker
if [ ! -f /etc/docker/daemon.json ]; then
    cat > /etc/docker/daemon.json << 'EOF'
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "storage-driver": "overlay2",
    "live-restore": true
}
EOF
    echo "  ✅ Docker daemon configured"
    echo "  ⚠️  Restart Docker to apply: systemctl restart docker"
fi

# ============================================================
# Done
# ============================================================
echo ""
echo "=============================================="
echo "✅ Bootstrap complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Copy infrastructure/.env.production.template to .env.production"
echo "  2. Fill in your secrets in .env.production"
echo "  3. Run: make init-auth && make start"
echo "  4. Run: make start-caddy"
echo ""
echo "Or use Coolify for GitHub-based deployment."
echo "=============================================="
# ============================================================
# ReinPlaner — Makefile for Self-Hosted Infrastructure
# ============================================================
# Usage: make <target>
# ============================================================

.PHONY: help start stop restart logs ps logs-postgres logs-kong logs-studio
.PHONY: status health backup clean init-auth restart-studio restart-kong
.PHONY: coolify-install coolify-deploy coolify-status coolify-supabase coolify-app
.PHONY: dev-start dev-stop dev-logs

# ============================================================
# Variables
# ============================================================

COMPOSE_FILE=infrastructure/docker-compose.prod.yml
CADDY_COMPOSE=infrastructure/caddy/docker-compose.yml
ENV_FILE=.env.production
PROJECT=reinplaner

# Colors
GREEN:=\033[0;32m
YELLOW:=\033[0;33m
RED:=\033[0;31m
NC:=\033[0m # No Color

# ============================================================
# Help
# ============================================================

help: ## Show this help
	@echo ""
	@echo "ReinPlaner Self-Hosted Infrastructure"
	@echo "======================================"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ============================================================
# Infrastructure (Supabase Stack)
# ============================================================

start: ## Start Supabase stack
	@echo "🔄 Starting Supabase stack..."
	@if [ ! -f $(ENV_FILE) ]; then echo "$(RED)Error: $(ENV_FILE) not found! Copy .env.production.template to .env.production and fill in values.$(NC)"; exit 1; fi
	docker compose -f $(COMPOSE_FILE) up -d
	@echo "✅ Supabase stack started"

stop: ## Stop Supabase stack
	@echo "⏹️  Stopping Supabase stack..."
	docker compose -f $(COMPOSE_FILE) down
	@echo "✅ Supabase stack stopped"

restart: ## Restart Supabase stack
	$(MAKE) stop && $(MAKE) start

restart-studio: ## Restart only Studio container
	@echo "🔄 Restarting Studio..."
	docker compose -f $(COMPOSE_FILE) restart studio
	@echo "✅ Studio restarted"

restart-kong: ## Restart only Kong container
	@echo "🔄 Restarting Kong..."
	docker compose -f $(COMPOSE_FILE) restart kong
	@echo "✅ Kong restarted"

logs: ## Show logs from all containers
	docker compose -f $(COMPOSE_FILE) logs --tail=50 -f

logs-postgres: ## Show Postgres logs
	docker compose -f $(COMPOSE_FILE) logs --tail=50 -f postgres

logs-kong: ## Show Kong logs
	docker compose -f $(COMPOSE_FILE) logs --tail=50 -f kong

logs-studio: ## Show Studio logs
	docker compose -f $(COMPOSE_FILE) logs --tail=50 -f studio

logs-functions: ## Show Edge Functions logs
	docker compose -f $(COMPOSE_FILE) logs --tail=50 -f functions

ps: ## Show running containers
	docker compose -f $(COMPOSE_FILE) ps

status: ## Show stack status
	@echo "=== ReinPlaner Stack Status ==="
	@docker compose -f $(COMPOSE_FILE) ps
	@echo ""
	@echo "=== Health Checks ==="
	@curl -s --connect-timeout 3 http://localhost:5432 || echo "Postgres: ❌"; curl -s --connect-timeout 3 http://localhost:8000 && echo "Kong: ✅" || echo "Kong: ❌"
	@curl -s --connect-timeout 3 http://localhost:3001 && echo "Studio: ✅" || echo "Studio: ❌"

health: ## Run full health check
	@echo "=== Health Check ==="
	@echo -n "Postgres: "; docker exec reinplaner_postgres pg_isready -U supabase_admin -d postgres > /dev/null 2>&1 && echo "✅" || echo "❌"
	@echo -n "Kong: "; curl -s --connect-timeout 3 http://localhost:8000 > /dev/null 2>&1 && echo "✅" || echo "❌"
	@echo -n "Studio: "; curl -s --connect-timeout 3 http://localhost:3001/api/health > /dev/null 2>&1 && echo "✅" || echo "❌"
	@echo -n "PostgREST: "; curl -s --connect-timeout 3 http://localhost:3000/ > /dev/null 2>&1 && echo "✅" || echo "❌"
	@echo -n "Storage: "; curl -s --connect-timeout 3 http://localhost:5000/status > /dev/null 2>&1 && echo "✅" || echo "❌"
	@echo -n "Functions: "; curl -s --connect-timeout 3 http://localhost:9000/status > /dev/null 2>&1 && echo "✅" || echo "❌"
	@echo -n "Meta: "; curl -s --connect-timeout 3 http://localhost:54381/health > /dev/null 2>&1 && echo "✅" || echo "❌"
	@echo -n "Realtime: "; curl -s --connect-timeout 3 http://localhost:4000/api/health > /dev/null 2>&1 && echo "✅" || echo "❌"

# ============================================================
# Caddy (Reverse Proxy)
# ============================================================

start-caddy: ## Start Caddy reverse proxy
	@echo "🔄 Starting Caddy..."
	docker compose -f $(CADDY_COMPOSE) up -d
	@echo "✅ Caddy started"

stop-caddy: ## Stop Caddy reverse proxy
	@echo "⏹️  Stopping Caddy..."
	docker compose -f $(CADDY_COMPOSE) down
	@echo "✅ Caddy stopped"

restart-caddy: ## Restart Caddy
	$(MAKE) stop-caddy && $(MAKE) start-caddy

logs-caddy: ## Show Caddy logs
	docker compose -f $(CADDY_COMPOSE) logs --tail=50 -f

# ============================================================
# Backup
# ============================================================

backup: ## Backup database
	@echo "📦 Creating database backup..."
	@mkdir -p infrastructure/supabase/backups/$$(date +%Y%m%d-%H%M%S)
	docker exec reinplaner_postgres pg_dump -U supabase_admin -d postgres > infrastructure/supabase/backups/$$(date +%Y%m%d-%H%M%S)/backup.sql
	@echo "✅ Backup saved to infrastructure/supabase/backups/$$(date +%Y%m%d-%H%M%S)/backup.sql"

# ============================================================
# Init & Setup
# ============================================================

init-auth: ## Initialize auth schemas (run once before first start)
	@echo "🔧 Initializing auth schemas..."
	bash infrastructure/supabase/scripts/init-auth-schemas.sh
	@echo "✅ Auth schemas initialized"

clean: ## Remove all containers and volumes (DANGER!)
	@echo "🗑️  WARNING: This will delete ALL data!"
	@read -p "Type 'yes' to confirm: " confirm; [ "$$confirm" = "yes" ] || exit 1
	docker compose -f $(COMPOSE_FILE) down -v
	@echo "✅ All containers and volumes removed"

# ============================================================
# Development
# ============================================================

dev-start: ## Start local dev stack (docker-compose.yml)
	docker compose up -d

dev-stop: ## Stop local dev stack
	docker compose down

dev-logs: ## Show local dev logs
	docker compose logs --tail=50 -f

# ============================================================
# Coolify Deployment (Self-Hosting)
# ============================================================

coolify-install: ## Install Docker + Coolify on a fresh server
	@echo "🔄 Installing Docker + Coolify..."
	@bash infrastructure/scripts/setup-coolify.sh install

coolify-deploy: ## Deploy full ReinPlaner stack via Coolify
	@echo "🔄 Deploying ReinPlaner stack via Coolify..."
	@bash infrastructure/scripts/setup-coolify.sh deploy

coolify-status: ## Show Coolify deployment status
	@bash infrastructure/scripts/setup-coolify.sh status

coolify-supabase: ## Deploy Supabase self-hosted via Coolify
	@echo "🔄 Deploying Supabase via Coolify..."
	@coolify service create supabase \
		--project-uuid oshxs172porzibyzgv1e27sg \
		--environment-uuid g13qtkjbntq8hvo18445lrk5 \
		--name "reinplaner-supabase" \
		--instant-deploy 2>&1 || echo "Use Coolify UI to deploy Supabase"

coolify-app: ## Deploy ReinPlaner Next.js app via Coolify
	@echo "🔄 Deploying ReinPlaner app via Coolify..."
	@echo "Open https://coolify.reinplaner.de → Project → ReinPlaner → Add New Resource → Application"
	@coolify app list 2>&1 | grep -i reinplaner || echo "No ReinPlaner app found"
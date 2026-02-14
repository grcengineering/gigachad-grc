# ============================================================================
# GigaChad GRC - Makefile
# ============================================================================
#
# Quick reference for common commands. Run 'make help' to see all options.
#
# QUICK START:
#   make init       # First-time setup (interactive)
#   make demo       # One-click demo mode
#   make dev        # Local development mode
#
# ============================================================================

.PHONY: help init demo dev docker up down logs clean reset \
        install build test lint \
        db-shell redis-cli \
        frontend backend services \
        secrets-ui secrets-seed \
        backup restore

.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
BOLD := \033[1m
NC := \033[0m

# ─────────────────────────────────────────────────────────────────────────────
# Help
# ─────────────────────────────────────────────────────────────────────────────

help: ## Show this help message
	@echo ""
	@echo "$(BOLD)GigaChad GRC - Available Commands$(NC)"
	@echo ""
	@echo "$(CYAN)Getting Started:$(NC)"
	@grep -E '^(init|demo|dev|docker):.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  $(GREEN)%-14s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(CYAN)Docker Commands:$(NC)"
	@grep -E '^(up|down|logs|ps|restart):.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  $(GREEN)%-14s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(CYAN)Secrets Management:$(NC)"
	@grep -E '^(secrets-ui|secrets-seed):.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  $(GREEN)%-14s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(CYAN)Development:$(NC)"
	@grep -E '^(install|build|test|lint|frontend|backend):.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  $(GREEN)%-14s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(CYAN)Database:$(NC)"
	@grep -E '^(db-shell|db-migrate|db-seed|redis-cli):.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  $(GREEN)%-14s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(CYAN)Maintenance:$(NC)"
	@grep -E '^(clean|reset|backup|restore):.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  $(GREEN)%-14s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Getting Started
# ─────────────────────────────────────────────────────────────────────────────

init: ## Interactive first-time setup (asks what you want)
	@./init.sh

demo: ## Start demo mode (Docker + frontend, one command to explore)
	@./init.sh demo

dev: ## Set up local development (install deps, start infra)
	@./init.sh dev

docker: ## Start all services via Docker only
	@./init.sh docker

# ─────────────────────────────────────────────────────────────────────────────
# Docker Commands
# ─────────────────────────────────────────────────────────────────────────────

up: ## Start all Docker containers
	docker compose up -d

down: ## Stop all Docker containers
	docker compose down

logs: ## View Docker logs (use: make logs s=controls)
	@if [ -n "$(s)" ]; then \
		docker compose logs -f $(s); \
	else \
		docker compose logs -f; \
	fi

ps: ## Show running containers
	docker compose ps

restart: ## Restart containers (use: make restart s=controls)
	@if [ -n "$(s)" ]; then \
		docker compose restart $(s); \
	else \
		docker compose restart; \
	fi

infra: ## Start infrastructure only (postgres, redis, keycloak, rustfs)
	docker compose up -d postgres redis keycloak rustfs

services: ## Start application services only (requires infra running)
	docker compose up -d controls frameworks policies tprm trust audit

secrets-ui: ## Open Infisical secrets UI (requires SECRETS_PROVIDER=infisical)
	@if [ "$$(grep -s '^SECRETS_PROVIDER=' .env | cut -d= -f2)" != "infisical" ]; then echo "SECRETS_PROVIDER is not set to 'infisical'. Set it in .env first."; exit 1; fi
	@open http://localhost:8443 2>/dev/null || xdg-open http://localhost:8443 2>/dev/null || echo "Visit http://localhost:8443"

secrets-seed: ## Seed secrets into Infisical (requires SECRETS_PROVIDER=infisical)
	@if [ "$$(grep -s '^SECRETS_PROVIDER=' .env | cut -d= -f2)" != "infisical" ]; then echo "SECRETS_PROVIDER is not set to 'infisical'. Set it in .env first."; exit 1; fi
	@bash scripts/seed-infisical.sh

rebuild: ## Rebuild and restart a service (use: make rebuild s=controls)
	@if [ -n "$(s)" ]; then \
		docker compose up -d --build $(s); \
	else \
		docker compose up -d --build; \
	fi

# ─────────────────────────────────────────────────────────────────────────────
# Development
# ─────────────────────────────────────────────────────────────────────────────

install: ## Install all dependencies
	npm install
	cd services/shared && npm install && npm run build
	cd services/controls && npm install && npx prisma generate
	cd services/frameworks && npm install && npx prisma generate
	cd services/policies && npm install && npx prisma generate
	cd services/tprm && npm install && npx prisma generate
	cd services/trust && npm install && npx prisma generate
	cd services/audit && npm install && npx prisma generate
	cd frontend && npm install
	cd scripts && npm install

build: ## Build all services
	cd services/shared && npm run build
	cd services/controls && npm run build
	cd services/frameworks && npm run build
	cd services/policies && npm run build
	cd services/tprm && npm run build
	cd services/trust && npm run build
	cd services/audit && npm run build
	cd frontend && npm run build

test: ## Run tests
	cd services/controls && npm test
	cd services/frameworks && npm test
	cd frontend && npm test

lint: ## Run linters
	cd services/controls && npm run lint
	cd services/frameworks && npm run lint
	cd frontend && npm run lint

frontend: ## Start frontend development server
	cd frontend && VITE_ENABLE_DEV_AUTH=true npm run dev

backend: ## Start controls service in dev mode (primary backend)
	cd services/controls && npm run start:dev

# ─────────────────────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────────────────────

db-shell: ## Open PostgreSQL shell
	docker compose exec postgres psql -U grc -d gigachad_grc

db-migrate: ## Run database migrations
	cd services/controls && npx prisma migrate deploy

db-seed: ## Seed database with sample data
	cd scripts && npx ts-node seed-database.ts

redis-cli: ## Open Redis CLI
	docker compose exec redis redis-cli -a redis_secret

# ─────────────────────────────────────────────────────────────────────────────
# Maintenance
# ─────────────────────────────────────────────────────────────────────────────

clean: ## Stop containers and remove volumes
	docker compose down -v
	@echo "Containers and volumes removed. Run 'make up' to restart."

reset: ## Full reset (containers, volumes, node_modules, .env)
	@./init.sh reset

backup: ## Create a backup
	./deploy/backup.sh

restore: ## Restore from backup (use: make restore f=path/to/backup.tar.gz)
	@if [ -n "$(f)" ]; then \
		./deploy/restore.sh $(f); \
	else \
		@echo "Usage: make restore f=path/to/backup.tar.gz"; \
	fi

# ─────────────────────────────────────────────────────────────────────────────
# Utility
# ─────────────────────────────────────────────────────────────────────────────

env: ## Generate .env file with secure secrets
	@./scripts/setup-dev-env.sh

status: ## Check service health
	@echo "$(BOLD)Container Status:$(NC)"
	@docker compose ps
	@echo ""
	@echo "$(BOLD)API Health:$(NC)"
	@curl -sf http://localhost:3001/health && echo " ✓ Controls API healthy" || echo " ✗ Controls API not responding"
	@curl -sf http://localhost:3002/health && echo " ✓ Frameworks API healthy" || echo " ✗ Frameworks API not responding"

validate: ## Validate production configuration
	npm run validate:production

shell-%: ## Open shell in container (e.g., make shell-controls)
	docker compose exec $* sh


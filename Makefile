.PHONY: start stop restart scheduler sync-tle logs status

# ── Docker ────────────────────────────────────────────────────────

start: ## Démarre tous les containers (inclut le scheduler)
	docker compose up -d --build
	@echo "✅ Stack démarrée — scheduler TLE actif en arrière-plan."

stop: ## Arrête tous les containers
	docker compose down

restart: ## Redémarre la stack complète
	docker compose down
	docker compose up -d --build

# ── Scheduler ─────────────────────────────────────────────────────

scheduler: ## Lance le scheduler manuellement (si besoin de le relancer à chaud)
	docker compose up -d scheduler
	@echo "✅ Scheduler démarré (toutes les 2h, env=prod)."

scheduler-stop: ## Arrête uniquement le scheduler
	docker compose stop scheduler

# ── TLE ───────────────────────────────────────────────────────────

sync-spacetrack: ## Sync débris + corps de fusées depuis Space-Track.org (1x/24h)
	@echo "🛰  Space-Track sync — $(shell date '+%Y-%m-%d %H:%M:%S')"
	docker compose exec php php -d memory_limit=256M bin/console orbitview:fetch-spacetrack --env=prod
	@echo "✅ Space-Track sync terminée."

sync-tle: ## Force une synchronisation TLE immédiate (tous les groupes CelesTrak)
	@echo "🛰  Sync TLE manuelle — $(shell date '+%Y-%m-%d %H:%M:%S')"
	docker compose exec php php -d memory_limit=256M bin/console orbitview:fetch-tle --env=prod
	@echo "✅ Sync terminée."

cache-warmup: ## Régénère le cache Symfony prod (utile après déploiement)
	docker compose exec php php bin/console cache:warmup --env=prod --no-debug
	@echo "✅ Cache prod régénéré."

# ── Logs ──────────────────────────────────────────────────────────

logs: ## Affiche les logs du scheduler en temps réel
	docker compose logs -f scheduler

logs-all: ## Affiche les logs de tous les services
	docker compose logs -f

# ── Statut ────────────────────────────────────────────────────────

status: ## Affiche l'état de tous les containers
	docker compose ps

# ── Aide ──────────────────────────────────────────────────────────

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help

# Makefile NutrionApp — raccourcis de commandes (cf socle §Makefile).
# `make <cible>`. Toujours présent à la racine.
.DEFAULT_GOAL := help
.PHONY: help install up down dev web mobile mobile-build mobile-submit mobile-ota backend cron db-migrate db-generate seed \
        test e2e storybook visual visual-update db-dbml load-test lint format build clean

help: ## Liste les commandes
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Installe les dépendances
	pnpm install

up: ## Démarre l'infra docker (db, redis, s3, mailpit : e-mails sur http://localhost:8025)
	docker compose up -d

down: ## Arrête l'infra docker
	docker compose down

dev: ## Lance toutes les apps (turbo)
	pnpm dev

web: ## Lance le site web (Next.js)
	pnpm --filter @nutrion/web dev

mobile: ## Lance l'app mobile (Expo)
	pnpm --filter @nutrion/mobile dev

# Build mobile : toujours en LOCAL avec la CLI EAS (`eas build --local`), jamais sur le cloud
# d'Expo ni par une CI Expo. Identifiants (certificats, keystore, clé App Store Connect) hors du
# dépôt. Un profil par réseau et par environnement dans apps/mobile/eas.json : <tenant>-preprod,
# <tenant>-production. Jamais deux builds --local en même temps sur le même dépôt.
TENANT ?= nutrion-app
ENV ?= preprod
PLATFORM ?= ios
PROFILE = $(TENANT)-$(ENV)
ART_EXT = $(if $(filter android,$(PLATFORM)),aab,ipa)

mobile-build: ## Build store en local (EAS --local). TENANT= ENV=preprod|production PLATFORM=ios|android
	@command -v eas >/dev/null 2>&1 || { echo "eas introuvable : pnpm add -g eas-cli"; exit 1; }
	cd apps/mobile && eas build --local --profile $(PROFILE) --platform $(PLATFORM) \
		--output builds/$(TENANT)-$(PLATFORM)-$$(date +%Y%m%d-%H%M).$(ART_EXT)

mobile-submit: ## Envoie au store le dernier build local. TENANT= ENV= PLATFORM=
	@f=$$(ls -t apps/mobile/builds/$(TENANT)-$(PLATFORM)-*.$(ART_EXT) 2>/dev/null | head -1); \
	[ -n "$$f" ] || { echo "Aucun build : make mobile-build TENANT=$(TENANT) PLATFORM=$(PLATFORM)"; exit 1; }; \
	cd apps/mobile && eas submit --path "../../$$f" --profile $(PROFILE) --platform $(PLATFORM) --non-interactive

# ota:publish et le module backend `ota` : brique techniques/build-mobile-ota, posés à l'init.
mobile-ota: ## Publie une mise à jour JS sur NOTRE serveur OTA (jamais EAS Update). TENANT= ENV=
	pnpm --filter @nutrion/mobile ota:publish -- --channel $(PROFILE) --profile $(PROFILE)

backend: ## Lance l'API backend (NestJS)
	pnpm --filter @nutrion/backend dev

cron: ## Lance le process cron (séparé)
	pnpm --filter @nutrion/backend start:cron

db-generate: ## Génère une migration depuis le schéma
	pnpm db:generate

db-migrate: ## Applique les migrations
	pnpm db:migrate

seed: ## Charge les données de démarrage réalistes
	pnpm seed

test: ## Tests unitaires + intégration (Vitest)
	pnpm test

e2e: ## Tests end-to-end (Playwright)
	pnpm test:e2e

storybook: ## Lance les deux Storybook : web (:6006) et mobile (:6007)
	pnpm storybook

# Régression visuelle : dans l'image Playwright (même version que @playwright/test du catalog),
# en amd64 comme le runner. Le rendu des polices change d'un système à l'autre : une
# référence produite sur le poste ne vaudrait rien en CI. Le premier passage écrit les
# références absentes (à relire, puis commiter) ; visual-update remplace celles qui changent.
VISUAL_IMAGE = mcr.microsoft.com/playwright:v1.64.1-noble@sha256:2f05f8a734509a7b3f26a912639488ee08f58a7b292d14d62271bcff9038768f
VISUAL_RUN = docker run --rm --platform linux/amd64 --ipc=host -v "$(CURDIR)":"$(CURDIR)" $(VISUAL_IMAGE) sh -c

visual: ## Régression visuelle des stories (captures comparées aux références)
	pnpm build-storybook
	$(VISUAL_RUN) 's=0; for a in storybook-web storybook-app; do (cd "$(CURDIR)/apps/$$a" && node_modules/.bin/playwright test) || s=1; done; exit $$s'

visual-update: ## Remplace les références visuelles qui ont changé (à relire avant commit)
	pnpm build-storybook
	$(VISUAL_RUN) 's=0; for a in storybook-web storybook-app; do (cd "$(CURDIR)/apps/$$a" && node_modules/.bin/playwright test --update-snapshots=changed) || s=1; done; exit $$s'

db-dbml: ## Régénère l'ERD (docs/architecture/schema.dbml) depuis le schéma
	pnpm db:dbml

load-test: ## Tests de charge k6 contre le backend démarré (THROTTLE_LIMIT relevé, cf .env.example)
	pnpm load-test

lint: ## Lint
	pnpm lint

format: ## Formate le code
	pnpm format

build: ## Build de production
	pnpm build

clean: ## Nettoie les artefacts
	pnpm -r exec rm -rf dist .next .turbo coverage

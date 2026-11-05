# NutrionApp

> Squelette généré par `init-project` à partir de `bullify-documentation/starter/`.
> Tous les `placeholders` sont remplacés à l'instanciation (cf `skills/init-project/variables.md`).

NutrionApp — NutrionApp (projet personnel).

## Stack

- Front : Next.js + Expo/React Native
- Backend : NestJS dédié (`apps/backend`)
- Auth : better-auth · ORM : drizzle · DB : postgresql
- Mailer : brevo (Mailpit en dev) · Cache : redis · Queue : bullmq · Stockage : scaleway-s3 (s3mock en dev)
- Observabilité : Sentry + PostHog + Pino (toujours)
- Monorepo : pnpm + Turborepo

## Premier lancement (macOS)

Prérequis : Node 24, pnpm (`corepack enable`), Docker Desktop, Xcode pour l'iPhone.

```bash
cp .env.example .env
make install && make up && make db-migrate && make seed
make backend         # :3001  · docs http://localhost:3001/docs
make web             # :3000  · http://localhost:3000 (vitrine, /boutique, /admin)
# Mobile : renseigner l'IP du Mac pour un téléphone physique
echo "EXPO_PUBLIC_API_URL=http://$(ipconfig getifaddr en0):3001" > apps/mobile/.env.local
make mobile          # Expo ; Face ID avec son texte : `npx expo run:ios` (build de dev)
```

Back-office : `admin@nutrion.local` / `Nutrion-Admin-2026`, puis activer la 2FA (QR code à scanner
avec une app d'authentification). E-mails de dev : http://localhost:8025 (Mailpit).

Design validé : [ADR-002](docs/architecture/ADR-002-design-system.md) · contrat d'API :
[api-contract](docs/architecture/api-contract.md).

## Démarrer en local

Via le **Makefile** (raccourcis homogènes — `make help` pour tout voir) :

```bash
make install        # pnpm install
cp .env.example .env # renseigner les valeurs (jamais de secret prod)
make up             # docker : db (postgresql), redis, s3 (s3mock)
make db-migrate     # migrations
make seed           # données de démarrage RÉALISTES
make dev            # toutes les apps
# ou ciblé :
make web            # site web (Next.js :3000)
make mobile         # app mobile (Expo)
make backend        # API NestJS (:3001)
```

## Tests

```bash
pnpm test            # unitaires + intégration (Vitest)
pnpm test:e2e        # E2E (Playwright)
pnpm storybook       # catalogues de composants : web :6006, mobile :6007
make visual          # régression visuelle des stories (Docker, image Playwright de la CI)
pnpm load-test       # montée en charge (k6), backend démarré
```

## Backend (API NestJS)

Contrat : [`docs/architecture/api-contract.md`](docs/architecture/api-contract.md). Référence générée :
http://localhost:3001/docs (Scalar), `/swagger`, `/openapi.json`. Santé : `/v1/health`, `/v1/health/ready`.

```bash
make up              # db, redis, s3 (s3mock), mailpit
make db-migrate      # migrations Drizzle
make seed            # comptes, catalogue, paniers de démonstration (idempotent)
make backend         # API sur :3001 (construit d'abord les paquets du workspace)
open http://localhost:8025   # Mailpit : e-mails de vérification et de réinitialisation
```

Comptes de démonstration (seed) :

| Compte                      | Mot de passe         | Rôle                                                    |
| --------------------------- | -------------------- | ------------------------------------------------------- |
| `admin@nutrion.local`       | `Nutrion-Admin-2026` | admin : la 2FA s'active au premier accès au back-office |
| `camille.martin@exemple.fr` | `Nutrion-Demo-2026`  | usager, avec adresses et panier                         |

Les autres usagers du seed (`*@exemple.fr`) ont le mot de passe `Nutrion-Demo-2026`.

- **Auth** : Better Auth sous `/v1/auth/*` (e-mail + mot de passe, vérification obligatoire, 12
  caractères dont un chiffre, verrouillage 15 min après 5 échecs, 2FA TOTP exigée au
  back-office, plugin Expo). Rôle `user` ou `admin` sur la table `user`.
- **Web** : passe par le proxy du site (`/api/*` → backend), même origine : cookies
  `nutrion.session_token` et `nutrion_cart` en `httpOnly`. Les liens des e-mails pointent sur
  `WEB_URL/api/v1/auth/...`.
- **Mobile** : appelle l'API directement ; panier invité par l'en-tête `X-Cart-Token`.
- **Tests** : `pnpm --filter @nutrion/backend test` (unitaires) et `pnpm --filter
@nutrion/backend test:e2e` (intégration : vraie base `nutrion-app-e2e`, créée, migrée et
  vidée à chaque passage ; e-mails et stockage en mémoire). Vitest compile par SWC pour les
  métadonnées de décorateurs, comme `nest build`.
- **Sans Docker** : PostgreSQL 16+ et `redis-server` locaux sur 5432 / 6379 conviennent
  (même `DATABASE_URL` / `REDIS_URL`) ; sans s3mock, `/health/ready` signale `storage` en
  panne et seuls les envois d'images échouent ; sans Mailpit, inscription et
  réinitialisation échouent à l'envoi de l'e-mail.

## Structure

```
apps/
  backend/           NestJS — modules autonomes (controllers/services/repositories/dto/tokens)
  web/   Next.js (front only)
  mobile/ Expo / React Native
  storybook-web/     catalogue des composants web, références visuelles (visual/)
  storybook-app/     catalogue des composants mobile (react-native-web), références visuelles
  load-tests/        scénarios k6 (smoke, lecture publique)
packages/            ui, ui-tokens, i18n, types, config, db, db-schema…
tools/               storybook-visual (régression visuelle), sonar, gatus
.github/workflows/   docker.yml : contrôle, images GHCR, déploiement (cf CI/CD)
```

## CI/CD

Un seul workflow, [`.github/workflows/docker.yml`](.github/workflows/docker.yml), sur `main`, les tags `v*` et à la demande :

1. **check** : `pnpm install` puis `pnpm turbo run lint typecheck test`.
2. **images** : construit `apps/backend` et `apps/web` et les pousse sur `ghcr.io/<owner>/nutrion-backend|web`, avec les tags `sha-<7>`, `latest` (sur main) et `vX.Y.Z` (sur tag).
3. **deploy** : ne tourne que si la variable de dépôt `DEPLOY_HOST` (`user@hôte`) existe. Il se connecte en SSH avec le secret `SSH_DEPLOY_KEY` et lance `docker compose -f docker-compose.prod.yml pull && up -d` dans `DEPLOY_DIR` (`/opt/nutrion` par défaut).
4. **Sur l'hôte** : placer `docker-compose.prod.yml` et un `.env` (section « Déploiement » de `.env.example`), puis `docker login ghcr.io`. Variables facultatives : `SITE_URL` (URL publique du web, figée au build) et `POSTHOG_KEY`.
5. **En local** :
   - `docker build -f apps/backend/Dockerfile -t nutrion-backend .` (au démarrage, le conteneur joue ses migrations puis lance l'API) ;
   - `docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3000 -t nutrion-web .`.

## Conventions & socle

Ce projet suit `bullify-documentation` : socle technique obligatoire, conventions de code, baseline sécurité, architecture de référence. Toute spec passe par le skill `spec-writer`.

## Conformité (selon le projet)

- Pages légales (CGU/CGV/confidentialité/mentions/cookies) en place.
- Export self-service des données perso dans l'espace utilisateur.
- Crons RGPD : anonymisation comptes inactifs (2 ans), purge factures (10 ans), audit (5 ans).

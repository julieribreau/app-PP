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
.github/workflows/   CI (template Bullify)
```

## Conventions & socle

Ce projet suit `bullify-documentation` : socle technique obligatoire, conventions de code, baseline sécurité, architecture de référence. Toute spec passe par le skill `spec-writer`.

## Conformité (selon le projet)

- Pages légales (CGU/CGV/confidentialité/mentions/cookies) en place.
- Export self-service des données perso dans l'espace utilisateur.
- Crons RGPD : anonymisation comptes inactifs (2 ans), purge factures (10 ans), audit (5 ans).

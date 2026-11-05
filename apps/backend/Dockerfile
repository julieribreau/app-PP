# Backend NutrionApp — image multi-stage (tout dockerisé, cf socle).
# Même image pour trois commandes :
#   node dist/main.js                API (CMD par défaut)
#   node dist/modules/cron/main.js   process cron (planifications, workers BullMQ)
#   node dist/migrate.js             migrations, lancées par migrer() de bullify-deploy
#                                    avant `compose up` (jamais au démarrage de l'API)
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

# Les seuls package.json des packages : la couche d'installation ne se reconstruit que
# lorsqu'une dépendance change, pas à chaque modification de code.
FROM base AS manifests
COPY packages ./packages
RUN find packages -mindepth 2 -type f ! -name package.json -delete

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/
COPY --from=manifests /repo/packages ./packages
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile --filter "@nutrion/backend..."

FROM deps AS build
COPY tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY apps/backend ./apps/backend
ENV TURBO_TELEMETRY_DISABLED=1
RUN pnpm turbo run build --filter=@nutrion/backend
# Dépendances de production seules, packages du workspace compris.
RUN pnpm --filter @nutrion/backend deploy --prod --legacy /prod

FROM node:24-alpine AS runtime
WORKDIR /app
# NODE_ENV=production en préprod comme en prod : ce qui diffère se lit dans APP_ENV (.env).
ENV NODE_ENV=production
# Le tag déployé (sha-<hexa>), passé par cd.yml : release Sentry de l'API et du cron.
ARG RELEASE=local
ENV RELEASE=$RELEASE
COPY --from=build --chown=node:node /prod ./
COPY --from=build --chown=node:node /repo/apps/backend/dist ./dist
# Migrations versionnées, lues par dist/migrate.js (migrateur de drizzle-orm, sans drizzle-kit).
COPY --from=build --chown=node:node /repo/packages/db-schema/migrations ./migrations
USER node
EXPOSE 3001
# Celui de l'API ; le service cron le remplace par le sien (docker-compose.preprod.yml).
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3001/v1/health || exit 1
CMD ["node", "dist/main.js"]

# Backend NutrionApp — image multi-stage (tout dockerisé, cf socle).
# Même image pour deux commandes :
#   (défaut)                         migrations (dist/migrate.js) puis API (dist/main.js)
#   node dist/modules/cron/main.js   process cron (planifications, workers BullMQ)
# Migrations au démarrage : un seul réplica d'API, le migrateur Drizzle prend un verrou.
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
# Better Auth et son plugin Expo déclarent next, expo et react-native en peer deps : pnpm les
# installe d'office (1 Go) alors que l'API n'en charge aucun (entrées better-auth/next-js et
# @better-auth/expo/client, jamais importées ici). On les retire de l'image d'exécution.
RUN cd /prod/node_modules/.pnpm && rm -rf next@* @next+* react-native@* @react-native+* \
  expo@* expo-* @expo+* hermes-* metro* react-devtools-core@* playwright* @playwright+* \
  @img+sharp* sharp@* @babel+* babel-* typescript@* @types+* react-native-* react-dom@* \
  esbuild@* @esbuild+* drizzle-kit@* lightningcss* @noxcturnal+* fb-dotslash@* \
  && find /prod/node_modules -type l ! -exec test -e {} \; -delete

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
CMD ["sh", "-c", "node dist/migrate.js && exec node dist/main.js"]

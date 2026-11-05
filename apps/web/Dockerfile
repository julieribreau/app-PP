# Web NutrionApp — Next.js standalone (tout dockerisé, cf socle). Présent si true.
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

# Les seuls package.json des packages : la couche d'installation ne se reconstruit que
# lorsqu'une dépendance change.
FROM base AS manifests
COPY packages ./packages
RUN find packages -mindepth 2 -type f ! -name package.json -delete

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY --from=manifests /repo/packages ./packages
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile --filter "@nutrion/web..."

FROM deps AS build
# Les NEXT_PUBLIC_* sont figés dans le bundle au build : cd.yml les passe en build-args.
# NEXT_PUBLIC_APP_ENV (preprod | production) : environnement Sentry, bandeau de préprod.
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_ENV
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_POSTHOG_KEY
# Release Sentry (tag de l'image) et projet où envoyer les sourcemaps.
ARG RELEASE
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
  NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
  NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY RELEASE=$RELEASE \
  SENTRY_ORG=$SENTRY_ORG SENTRY_PROJECT=$SENTRY_PROJECT
COPY tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY apps/web ./apps/web
ENV TURBO_TELEMETRY_DISABLED=1 NEXT_TELEMETRY_DISABLED=1 CI=true
# Le jeton d'envoi des sourcemaps arrive par un secret monté pour cette seule commande
# (cd.yml, `secrets:`) : ni ARG ni ENV, il ne reste dans aucune couche ni dans le cache.
RUN --mount=type=secret,id=sentry_auth_token,env=SENTRY_AUTH_TOKEN \
  pnpm turbo run build --filter=@nutrion/web

FROM node:24-alpine AS runtime
WORKDIR /app
ARG RELEASE
# NODE_ENV=production en préprod comme en prod : ce qui diffère est figé au build
# (NEXT_PUBLIC_APP_ENV). RELEASE : release Sentry du serveur Next.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
  RELEASE=$RELEASE
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
# 127.0.0.1 et non localhost : dans l'image, localhost se résout d'abord en ::1, où le
# serveur (HOSTNAME=0.0.0.0, IPv4) n'écoute pas ; la sonde échouait à chaque passage.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/fr || exit 1
CMD ["node", "apps/web/server.js"]

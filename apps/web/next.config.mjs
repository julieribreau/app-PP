import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs/config";
import createNextIntlPlugin from "next-intl/plugin";

// Front Next.js — App Router. i18n via next-intl (fr,en). Pas d'API ici (backend NestJS dédié).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Image Docker : serveur autonome (.next/standalone) ; la racine du monorepo pour que le
  // traçage embarque les packages du workspace.
  output: "standalone",
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  transpilePackages: [
    "@nutrion/ui",
    "@nutrion/ui-tokens",
    "@nutrion/sentry",
    "@nutrion/cmp",
    "@nutrion/analytics",
  ],
  // Appels API → backend NestJS par @nutrion/api-port uniquement, jamais de logique métier ici.
};

// Sourcemaps envoyées à Sentry pendant `next build`, seulement si SENTRY_AUTH_TOKEN est là :
// en CI, un secret de build monté pour la seule commande (cd.yml, Dockerfile), jamais un
// build-arg, qui resterait lisible dans l'image. Supprimées après envoi : jamais servies.
export default withSentryConfig(withNextIntl(nextConfig), {
  ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
  ...(process.env.SENTRY_AUTH_TOKEN ? { authToken: process.env.SENTRY_AUTH_TOKEN } : {}),
  // Release = tag de l'image déployée, la même que celle du serveur et de l'API.
  release: { name: process.env.RELEASE || undefined },
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
  widenClientFileUpload: true,
  // Le plugin n'envoie rien de lui-même à Sentry (statistiques d'usage).
  telemetry: false,
  silent: !process.env.CI,
});

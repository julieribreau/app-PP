# ADR-001 — Stack & socle du projet

> Statut : Accepté
> Date : 2026-11-05

## Contexte

NutrionApp démarre. On fige la stack et le socle, conformes à `bullify-documentation`.

## Décision

- **Surfaces** : web (Next.js) mobile (Expo/RN) + backend NestJS dédié.
- **Stack cible** : Auth better-auth, ORM drizzle, DB postgresql, Mailer brevo (Mailpit en dev), Cache Redis, Queue BullMQ, Stockage Scaleway S3, CMS aucun (si applicable).
- **Socle obligatoire** appliqué : Sentry + PostHog + Pino, Docker partout, CI GitHub (template), seed réaliste, pyramide de tests (Vitest/Playwright/Storybook/k6), migrations réversibles, OpenAPI+Scalar, Gatus + health/ready, RGAA, i18n (fr,en), secrets SOPS+age, hardening backend (exception filter, throttler, /v1).
- **Multi-tenant** : none (exception : un seul client, cf ci-dessous).
- **Briques actives** : comptes-auth (authentification, gestion-comptes-backoffice, roles-permissions, double-authentification), conformite-rgpd, facturation-paiement (catalogue et panier seulement).

## Alternatives envisagées

- Back dans Next (tRPC) : écarté → backend NestJS dédié (cf architecture-reference).

<!-- Exception au défaut d'une variable de stack (auth autre que better-auth, ORM autre que
drizzle…) : la décrire ici avec sa raison, sinon supprimer ce commentaire. -->

## Conséquences

- Tout nouveau module suit le découpage controllers/services/repositories/dto/tokens.
- Toute déviation ultérieure de cette stack = un nouvel ADR.

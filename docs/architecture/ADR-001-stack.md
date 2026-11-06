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

## Exceptions

- **Multi-tenant : `none`.** Le socle pose `tenant_id` + RLS par défaut, même pour un seul client.
  NutrionApp n'aura qu'un seul client, c'est certain (décision de Dimitri, 05/11/2026) : pas de
  `tenant_id`, pas de RLS, une seule URL. Revenir au multi-tenant = un nouvel ADR et une migration.
- **CI/CD réduite** à `.github/workflows/docker.yml` (contrôle, images GHCR, déploiement SSH
  optionnel) à la demande de Dimitri : les workflows du starter (SAST, OSV, licences, a11y,
  Sonar, montées nocturnes, charge) ne sont pas branchés. Leurs contrôles se lancent à la main
  (cf `docs/qa/matrice-tests.md`).

## Socle à poser (base saine)

Lot 1 = « base saine » choisie par Dimitri : RBAC admin/usager, 2FA des admins, verrouillage,
journal d'audit, tableaux triables et filtrables, export RGPD et suppression de compte, thème
clair/sombre, i18n FR/EN, Sentry + PostHog + Pino, CI courte. Volontairement reporté :

- crons RGPD (anonymisation des comptes inactifs à 2 ans, purge des paniers invités, rétention de
  l'audit) et écran « Tâches planifiées » du back-office ;
- générateur d'exports (brique export-builder) ;
- cloche de notifications in-app (usager et back-office) ;
- espace Templates des messages et écran Configuration ▸ Messagerie (gabarits e-mail en code) ;
- permissions fines : les tables `role` / `permission` existent, le contrôle se fait sur
  `user.role` (`user` | `admin`) ;
- supervision Gatus (les routes `/v1/health` et `/v1/health/ready` sont prêtes) ;
- secrets SOPS + age (aucun environnement déployé) ;
- montée en charge k6 au-delà du smoke ;
- paiement (PSP), commandes, factures, « Mes commandes » : hors lot 1, le bouton reste
  « Paiement bientôt disponible ».

## Conséquences

- Tout nouveau module suit le découpage controllers/services/repositories/dto/tokens.
- Toute déviation ultérieure de cette stack = un nouvel ADR.

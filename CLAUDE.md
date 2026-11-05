# NutrionApp — instructions projet (agents IA)

> Fichier d'amorçage pour les agents (Claude). `AGENTS.md` en est la copie pour les autres outils.

## Le projet en 3 lignes

NutrionApp pour NutrionApp (projet personnel). Surfaces : web mobile backend.
Briques actives : comptes-auth (authentification, gestion-comptes-backoffice, roles-permissions, double-authentification), conformite-rgpd, facturation-paiement (catalogue et panier seulement).

## Charger la base AVANT toute action

Ce projet suit **`bullify-documentation`**. Lire le skill **`brique-library`** (stack-canonique, socle-technique-obligatoire, architecture-reference, conventions-code, securite-baseline) avant de spécifier ou coder. **Toute spec passe par le skill `spec-writer`.**

## Stack

- Front : Next.js · Expo/React Native
- Backend : NestJS dédié (modules autonomes : controllers/services/repositories/dto/tokens)
- Auth : better-auth · ORM : drizzle · DB : postgresql · Mailer : brevo (Mailpit en dev)
- Cache : Redis · Queue : BullMQ · Stockage : Scaleway S3
- Observabilité : Sentry + PostHog + Pino · Doc API : OpenAPI + Scalar
- Monorepo pnpm + Turborepo · Tout dockerisé · CI GitHub · Gatus + health/ready
- i18n : fr,en · Multi-tenant : none

## Règles cardinales (memories Bullify)

- **Commit autorisé, `git push` seulement sur GO explicite**, à chaque fois (le push déclenche souvent un déploiement) : annoncer le commit, laisser relire, pousser sur GO.
- **Aucune action destructrice sans preview + validation**.
- **Avant de dire une fonctionnalité terminée, et avant toute PR : auto-revue `code-review` §5, sans exception.** `/security-review` sur le diff, chaque parcours touché déroulé rôle par rôle, un test unitaire pour tout code écrit, un Playwright pour tout parcours touché, tous lancés, et la recette `tests/manuel/` des lots touchés jouée et tracée dans son fichier ; puis l'attestation (sécurité, parcours, tableau code ↔ test, commandes lancées et leurs résultats) dans la réponse et dans la PR. Ce qui n'a pas tourné se dit.
- **`console.log` interdit** → logger Pino.
- Secrets via SOPS+age, jamais en clair. Pas de chemin privé `/Users/...` dans les docs/skills publiés.
- Migrations versionnées et réversibles ; `tenant_id` + RLS forcée sur toute table (brique multi-tenant §RLS).
- Back-office → 2FA + audit log + tables triables/filtrables/exportables + cloche in-app des actions à traiter (rien d'autre).
- E-mail et SMS → Brevo ; push → Expo. Avec un back-office, chaque message est modifiable dans Communication ▸ Templates, et expéditeurs, clé Brevo et envoi de test se règlent dans Configuration ▸ Messagerie.
- Back-office + comptes usagers → campagnes à tous ou à un segment, canaux au choix (e-mail, SMS, push, in-app).
- Compte usager → notification in-app pour ce qu'il doit savoir ou faire (justificatif d'achat, statut SAV, statut d'une pièce, pièce à renvoyer), jamais pour ce qu'il vient de faire lui-même.
- Achat → catalogue de produits et variantes au back-office (prix HT ⇄ TTC, TVA en liste) ; facture complète en PDF envoyée par e-mail, espace « Mes commandes » côté usager, « Commandes » au back-office.
- **Documents légaux** (`docs/legal/`) : mis à jour dans la même PR que le changement qui les rend faux (donnée collectée, sous-traitant, cookie, durée de conservation, fonction visible, paiement). Déclencheurs : `brique-library/modeles-legaux/README.md`.

## Démarrage

Voir `README.md` (cloner → installer → `.env.example` → `docker compose up` → `db:migrate` → `seed` → `dev`).

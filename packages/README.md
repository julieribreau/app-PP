# packages/ — code partagé (à créer selon le projet)

Packages mutualisés du monorepo (cf architecture-reference §packages). Créer ceux dont le projet a besoin :

- `ui` + `ui-tokens` — design system partagé web/mobile (dès qu'il y a ≥ 1 surface UI). Atomic Design, variantes `.web.tsx`/`.native.tsx`.
- `i18n` — dictionnaires par langue/domaine (fr,en).
- `cmp` — consentement aux traceurs, web (`./web`) et mobile (`./native`) : bandeau, gestionnaire par finalité, preuve datée et versionnée. Posé à l'init, toujours.
- `analytics` — catalogue typé des événements PostHog (`events.ts`), instance UE, propriétés communes. Posé à l'init, toujours.
- `types` — types partagés.
- `config` — machinerie env/zod (chaque lib possède sa tranche).
- `db` — connexion postgresql/drizzle (possède `DATABASE_URL`).
- `db-schema` — schéma drizzle + migrations (`db:generate` ici ; `db:migrate` applique par `apps/backend/src/migrate.ts`, le même code que l'image).
- (transport) `api-port` + `adapter-*` + `client-*` si sources externes pluggables.

Règle : si du code est commun à plusieurs surfaces, il vit ici — jamais dupliqué.

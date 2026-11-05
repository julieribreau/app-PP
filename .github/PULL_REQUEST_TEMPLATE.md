## Quoi & pourquoi

<!-- Résumé du changement + lien spec/ADR/ticket (CODE-NN). -->

## Type

- [ ] feat - [ ] fix - [ ] refactor - [ ] chore - [ ] docs - [ ] test - [ ] perf - [ ] ci

## Checklist (cf socle / conventions-code)

- [ ] Format + lint + typecheck + build OK
- [ ] Test unitaire pour tout code ajouté ou modifié · Playwright (ou Maestro) pour tout parcours touché
- [ ] Pas de `console.log` (logger Pino), pas de secret, pas de PII
- [ ] Erreurs → Sentry · événements → PostHog (si pertinent)
- [ ] Migration réversible (si schéma) · `tenant_id` + RLS forcée sur toute nouvelle table
- [ ] Sécurité : `/security-review` lancé sur le diff · rate limit / signature / validation (si endpoint public/webhook)
- [ ] Parcours touchés déroulés pour chaque rôle : entrée, états, sortie, boucle usager ⇄ back-office (code-review §2.9)
- [ ] i18n (pas de string hardcodée) · responsive (si web) · a11y RGAA
- [ ] Doc API OpenAPI à jour (auto) · ADR si décision structurante
- [ ] Documents légaux (`docs/legal/`) à jour si donnée, sous-traitant, cookie, durée, fonction visible ou paiement change

## Vérification de l'auteur

<!-- Obligatoire, humain ou agent (code-review §5). Seulement ce qui a tourné. -->

**Sécurité** : `/security-review` lancé ; RAS, ou constat corrigé dans …
**Parcours** : parcours × rôles déroulés ; trou corrigé, ou écart assumé
**Code ↔ tests** :

| Code ajouté ou modifié | Test qui le couvre | Résultat |
| ---------------------- | ------------------ | -------- |
|                        |                    |          |

**Recette** : `tests/manuel/…` jouée sur le dernier commit : n/n ✅ (x par leur test, y à la main)
**Commandes lancées** : `pnpm test` (n/n), `pnpm test:e2e` (n/n), `pnpm lint`
**Non lancé** : … et pourquoi

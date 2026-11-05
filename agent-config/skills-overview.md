# Skills du projet NutrionApp

> → à copier en `.claude/skills-overview.md`. Index des skills disponibles dans ce repo.

Skills instanciés depuis `bullify-documentation` (génériques → spécialisés pour ce projet). La règle vit dans `brique-library` ; les autres disent comment l'appliquer ou agissent.

| Famille               | Skills                                                                                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Savoir                | `brique-library` (socle, stack, architecture, conventions, sécurité, briques), `spec-writer` (toute spec), `documentation` (documents remis au client)                                         |
| Écrire et vérifier    | `backend-dev`, `frontend-dev`, `mobile-dev-expo`, `web-quality`, `code-style`, `code-review`                                                                                                   |
| Exploiter             | `observability`, `logging`, `error-tracking`, `infra-topology`                                                                                                                                 |
| Briques techniques    | `caching-redis`, `job-queues`, `file-storage`, `email-canonical`, `feature-flags`                                                                                                              |
| Conformité et méthode | `rgpd-compliance`, `security-baseline`, `project-tracker`, `agent-working-agreements`                                                                                                          |
| Agir                  | `tenant-init`, `dev-onboarding`, `deploy-runner`, `rollback-app`, `rotate-secret`, `rdb-restore`, `incident-response`, `seed`, `test-runner`, `load-testing`, `release-changelog`, `cron-jobs` |

`init-project` a servi à créer ce repo ; il reste dans la base.

Chemins : canonique `.agents/skills/<skill>/SKILL.md` ; Claude `.claude/skills/<skill>/` (aligné) ; Codex `.codex/skills` → `../.agents/skills`.

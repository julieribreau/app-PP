# NutrionApp — instructions pour agents IA

Équivalent de [`CLAUDE.md`](./CLAUDE.md) pour les outils qui lisent `AGENTS.md` (Codex, Copilot CLI, Cursor, Gemini CLI…). **Contenu identique — voir `CLAUDE.md`.**

Points cardinaux : projet suivant la base `bullify-documentation` (charger le skill `brique-library`) ; specs via `spec-writer` ; commit autorisé, push seulement sur GO ; avant de dire une fonctionnalité terminée et avant toute PR, auto-revue `code-review` §5 (revue de sécurité du diff, parcours touchés déroulés par rôle, test unitaire pour tout code écrit, Playwright pour tout parcours touché, tous lancés, recette `tests/manuel/` des lots touchés jouée et tracée, attestation dans la réponse et la PR) ; aucune action destructrice sans preview ; `console.log` interdit (Pino) ; secrets SOPS+age ; documents légaux (`docs/legal/`) mis à jour dans la PR qui les rend faux.

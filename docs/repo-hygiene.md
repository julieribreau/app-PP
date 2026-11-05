# Hygiène de repo — NutrionApp

Mise en place à l'init (cf socle §Hygiène).

## Husky + lint-staged + commitlint

```bash
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional
pnpm dlx husky init
```

`.husky/pre-commit` :

```sh
pnpm lint-staged
gitleaks protect --staged --no-banner || { echo "❌ gitleaks: secret détecté"; exit 1; }
```

`.husky/commit-msg` :

```sh
pnpm dlx commitlint --edit "$1"
```

`package.json` (racine) :

```json
"lint-staged": {
  "*.{ts,tsx,js,jsx,mjs}": ["prettier --write", "eslint --fix"],
  "*.{json,md,yml,yaml,css}": ["prettier --write"]
}
```

## Autres garde-fous

- **PR template** : `.github/PULL_REQUEST_TEMPLATE.md`.
- **CODEOWNERS** : `.github/CODEOWNERS` (revue obligatoire des zones sensibles).
- **Dépendances** : `mise-a-jour.yml` monte chaque nuit la dernière version stable des dépendances npm, des actions GitHub, des images Docker et des runtimes (secret `MAJ_WORKFLOWS_TOKEN` requis pour les trois derniers) ; OSV-Scanner tourne en CI. Pas de Dependabot ni de Renovate.
- **Branch protection** : `main` protégée, CI verte obligatoire, pas de push direct.
- **Commits/push** : commit autorisé, push seulement sur GO de l'utilisateur (règle cardinale).

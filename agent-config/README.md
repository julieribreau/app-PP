# agent-config/ — config agents à déposer à l'init

`init-project` copie ces templates aux bons emplacements (dotfiles) dans le repo du projet :

```
agent-config/claude-settings.json   →  .claude/settings.json
agent-config/skills-overview.md     →  .claude/skills-overview.md
```

Et met en place la **structure des skills** :

```
.agents/skills/<skill>/SKILL.md     ← canonique (cross-agent), source de vérité
.claude/skills/                     ← aligné sur .agents/skills (Claude Code)
.codex/skills        → symlink ../.agents/skills   (Codex)
```

Plus, à la racine du projet : `CLAUDE.md` + `AGENTS.md` (cf templates starter).

## Ce que `init-project` instancie comme skills

Les skills **génériques** de `bullify-documentation/skills/` sont copiés dans `.agents/skills/` du projet et **paramétrés** (placeholders → valeurs du projet) : `brique-library`, `spec-writer`, `seed`, `test-runner`, `deploy-runner`, `rollback-app`, `rotate-secret`, `rdb-restore`, `incident-response`, `load-testing`, `release-changelog`, `cron-jobs`.

> Règle : `.claude/settings.json` autorise le commit et demande confirmation pour chaque `git push` (pas de push sans GO). gardez `.agents/skills` et `.claude/skills` **alignés** en cas de modif.

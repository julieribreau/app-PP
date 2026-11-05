# Mission Claude Code : tester toute l'app mobile NutrionApp sur le simulateur iOS

Tu es sur le Mac de Dimitri, dans le monorepo NutrionApp (`~/Documents/Freelances/app-PP`) :
backend NestJS (`apps/backend`), site Next.js (`apps/web`), app Expo SDK 58 (`apps/mobile`).
Lis d'abord `README.md`, `AGENTS.md`, `docs/architecture/api-contract.md`,
`docs/architecture/ADR-001-stack.md`, `docs/architecture/ADR-002-design-system.md`.

## État de départ

- `scripts/local/test-ios.sh` a monté la stack : Docker (Postgres publié sur **:5433** car un autre
  Postgres occupe 5432 — n'y touche pas —, Redis, s3mock, Mailpit :8025), migrations, seed,
  API sur :3001, site sur :3000, Metro sur :8081 (dans le terminal de VS Code). Journaux dans
  `.local-test/`.
- L'app est installée et ouverte sur le simulateur « iPhone Duo » (Xcode 27, Device Hub), en anglais.
- Comptes seed : `camille.martin@exemple.fr` / `Nutrion-Demo-2026` (usager avec panier et adresses),
  `admin@nutrion.local` / `Nutrion-Admin-2026` (admin, 2FA à activer au premier accès BO).
- Le dépôt a des modifications non commitées : ce sont des correctifs déjà validés (migrate.ts charge
  le .env, pluriels sans Intl.PluralRules absent de Hermes, ports Postgres/Redis configurables,
  scripts/local/). `apps/mobile/ios/` vient du prebuild : il doit être ignoré par git, pas commité.

## Ce que tu dois faire

1. Crée la branche `qa/ios` et commite ces correctifs (commits conventionnels en français). Vérifie que
   `apps/mobile/ios/` et `apps/mobile/android/` sont dans le .gitignore.
2. Teste TOUT le mobile sur le simulateur, de bout en bout contre l'API locale, avec **Maestro**
   (installe-le s'il manque : `curl -fsSL "https://get.maestro.mobile.dev" | bash`, il faut Java 17+ ;
   demande-moi avant d'installer Java). Écris une suite versionnée dans `apps/mobile/e2e/maestro/`
   (appId `io.bullify.nutrion-app`) et un script `scripts/local/test-ios-e2e.sh` qui la rejoue
   (seed relancé, rapport JUnit et captures dans `.local-test/maestro/`). Couvre au minimum :
   - consentement cookies (refuser puis accepter), boutique (liste, catégories, recherche), fiche
     produit (saveur et format → prix, quantité plafonnée au stock, ajout), produit en Rupture non
     ajoutable, panier invité (+/−, suppression, totaux TTC et TVA, bouton « Paiement bientôt
     disponible » désactivé), panier conservé après fermeture et réouverture de l'app ;
   - inscription (message de vérification ; lis le lien dans Mailpit via son API HTTP
     `http://localhost:8025/api/v1/...`, ouvre-le, puis connexion), mot de passe oublié, erreurs de
     connexion, verrouillage après 5 échecs ;
   - connexion de Camille et fusion du panier invité ; compte : profil modifié et conservé, photo de
     profil (ajoute une image au simulateur avec `xcrun simctl addmedia booted <png>`), adresses
     (ajout, défaut, suppression), langue FR ⇄ EN, thème clair / sombre / système, mot de passe,
     appareils connectés (révoquer une autre session ouverte via l'API), export de données (feuille
     de partage), suppression de compte sur un compte jetable, déconnexion ;
   - Face ID : active le déverrouillage biométrique dans l'app, puis au relancement simule un succès
     et un échec (`xcrun simctl spawn booted notifyutil -s com.apple.BiometricKit.enrollmentChanged 1`
     puis `-p com.apple.BiometricKit.enrollmentChanged`, et
     `notifyutil -p com.apple.BiometricKit_Sim.pearl.match` / `.nomatch`) ;
   - chaque écran en clair ET en sombre, en EN ET en FR : captures dans `.local-test/maestro/`,
     regarde-les toi-même (texte coupé, contraste, clé de traduction brute, texte français en EN).
     Ajoute des `testID` dans l'app là où il en faut (sans casser jest, vitest, lint, typecheck).
3. Rejoue aussi sur un deuxième simulateur au format iPhone standard (le plus récent disponible,
   `xcrun simctl list devices`) pour vérifier la mise en page. Si un émulateur Android est installé,
   fais de même sur Android ; sinon dis-le.
4. Chaque bug trouvé : corrige-le à la source (mobile, backend, i18n), ajoute un test qui le couvre,
   rejoue la suite. Continue jusqu'à ce que tout soit vert. Ne contourne pas un test qui échoue.
5. Lance enfin tous les contrôles du dépôt sur ce Mac et fais-les passer : `pnpm format:check`,
   `pnpm lint`, `pnpm typecheck`, `pnpm test`, e2e backend (`pnpm --filter @nutrion/backend test:e2e`,
   base sur :5433), e2e web réels (`pnpm --filter @nutrion/web test:e2e:real`), intégration mobile
   (`pnpm --filter @nutrion/mobile test:integration`), `npx expo export --platform ios`.
6. Si une branche `finition` apparaît dans le dépôt (Claude dans le cloud y dépose une passe de
   finition : PostHog, tests, accessibilité, sécurité), fusionne-la dans `qa/ios`, résous les conflits
   en gardant les deux correctifs, et rejoue les étapes 2 à 5.
7. Écris `docs/qa/rapport-ios.md` : parcours testés, résultats, bugs trouvés et corrigés (fichier +
   une ligne), captures de référence, ce qui n'a pas pu être testé et pourquoi.

## Règles

- Ne pousse rien (`git push` interdit), ne change pas le remote `origin`.
- N'arrête pas les autres services de ce Mac (l'autre Postgres sur 5432 notamment).
- Pas de secret ni de `.env` commité. Mots de passe de test uniquement ceux du seed ou générés.
- Reste dans le style du dépôt (CONVENTIONS, ADR-002 pour le design, seuils ESLint anti-« god »).

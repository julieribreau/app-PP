# Matrice de tests — exigences de Dimitri → tests → statut

Une ligne par exigence (demande initiale, réponses 1 à 10, retour sur les badges). « Réel » =
contre la stack lancée (backend :3001, Postgres, Redis, s3mock, Mailpit), sans mock.

| Fichier                                     | Où                                         |
| ------------------------------------------- | ------------------------------------------ |
| `apps/web/e2e-real/*.spec.ts`               | Playwright, site réel (`test:e2e:real`)    |
| `apps/web/e2e/*.spec.ts`                    | Playwright 3 navigateurs, API simulée      |
| `apps/backend/test/*.e2e-spec.ts`           | Vitest, API Nest + base e2e réelle         |
| `apps/mobile/src/lib/*.integration.test.ts` | Vitest, client de l'app contre l'API       |
| `apps/mobile/src/**/*.test.tsx`             | jest-expo, écrans et composants            |
| `apps/storybook-*/visual/`                  | captures + axe, chaque story fr/en × thème |

Statut : ✅ couvert et vert · ⚠️ couvert en partie (voir colonne) · ❌ non testable ici.

## Compte et authentification

| Exigence                                        | Tests                                                                                                                | Statut                             |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Inscription e-mail + mot de passe, vérification | web réel `client` « inscription → e-mail… » ; backend `auth` (5 cas) ; mobile intégration « inscription par l'app… » | ✅                                 |
| Règles de mot de passe                          | backend `auth` « refuse un mot de passe sans chiffre » ; web simulé `auth` « trop court refusé »                     | ✅                                 |
| Connexion, verrouillage après 5 échecs          | backend `auth` « verrouille 15 minutes… » ; web réel `finition-client` « verrouillage après 5 échecs »               | ✅                                 |
| Mot de passe oublié                             | web réel `client` ; mobile intégration `backend` « le lien ouvre la page du site »                                   | ✅                                 |
| Changer de mot de passe                         | backend `finition` ; web réel `finition-client` (autre appareil déconnecté) ; mobile intégration                     | ✅                                 |
| Changer d'e-mail (lien à la nouvelle adresse)   | backend `finition` ; web réel `finition-client`                                                                      | ✅                                 |
| Sessions : liste, révocation d'un appareil      | backend `finition` ; web réel `finition-client` ; mobile intégration `account` + `backend`                           | ✅                                 |
| Biométrie (Face ID / empreinte)                 | jest `biometric.test`, `BiometricUnlockScreen.test`, `lock.store.test` ; Maestro iOS `biometric/` (capteur simulé)   | ✅ simulateur iOS (rapport-ios.md) |
| Compte suspendu refusé                          | backend `auth` ; web réel `admin` « suspension (connexion refusée)… »                                                | ✅                                 |

## Espace personnel

| Exigence                                 | Tests                                                                                                                                              | Statut                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Profil (champs validés en réponse 6)     | backend `account` ; web réel `client` « espace personnel… » ; mobile intégration `backend` « profil »                                              | ✅                                            |
| Photo de profil, refus d'un faux fichier | backend `finition` (octets magiques, 415/413) ; web réel `finition-client` (compte + barre du site) ; mobile intégration (Blob) ; Maestro iOS `08` | ✅ photothèque du simulateur (rapport-ios.md) |
| Adresses, une par défaut, PATCH partiel  | backend `account` ; mobile intégration (le pays reste BE)                                                                                          | ✅                                            |
| Export RGPD (ZIP)                        | backend `account` ; web réel `finition-client` (contenu lu par `unzip`) ; mobile intégration                                                       | ✅                                            |
| Suppression du compte                    | backend `account` (anonymisation) ; web réel `finition-client` ; mobile intégration                                                                | ✅                                            |
| Thème clair/sombre/système gardé         | web réel `client` + `finition-site` (posé par le serveur, sans flash ; sombre appliqué) ; Storybook (clair/sombre)                                 | ✅                                            |
| Langue FR/EN gardée                      | web réel `client` ; mobile intégration `backend` « préférences » + `account` « l'API répond en anglais »                                           | ✅                                            |

## Boutique et panier

| Exigence                                                      | Tests                                                                                                                    | Statut |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------ |
| Liste : photo, nom, prix TTC ; fiche avec description         | backend `catalog` (5 cas) ; web simulé `shop` ; web réel `finition-site` « boutique… » ; jest `ProductScreen.test`       | ✅     |
| Catégories, recherche, tri, URL partageable, fiche inconnue   | backend `catalog` ; web réel `finition-site`                                                                             | ✅     |
| Variantes (saveur × format), prix de la variante              | backend `admin` + `catalog` ; web réel `admin` ; jest `ProductScreen.test`                                               | ✅     |
| Stock : Rupture non ajoutable, plafond au stock               | backend `cart` ; web réel `finition-client` « panier : Rupture… »                                                        | ✅     |
| Variante désactivée retirée du panier, et annoncée            | backend `cart` ; web réel `finition-client`                                                                              | ✅     |
| Panier invité gardé (cookie / jeton), fusionné à la connexion | backend `cart` ; web réel `client` + `finition-client` ; web simulé `auth` ; mobile intégration `backend` (X-Cart-Token) | ✅     |
| « Paiement bientôt disponible », pas de paiement              | jest `CartScreen.test` ; Storybook écran panier                                                                          | ✅     |
| Badges : plus de « En stock », « Plus que 3 », « Nouveau »    | web `ProductCard.test` « sans badge de stock », « signale seulement la rupture » ; Storybook ProductCard                 | ✅     |

## Back-office

| Exigence                                                  | Tests                                                                                                   | Statut |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------ |
| Accès réservé aux admins, 2FA imposée                     | backend `admin` (3 cas) ; web simulé `admin` ; web réel `admin`                                         | ✅     |
| Nouvel admin : 2FA à activer, codes de secours une fois   | backend `finition` ; web réel `finition-bo`                                                             | ✅     |
| Liste des usagers : recherche, filtre, tri, pagination    | backend `admin` ; web réel `admin`                                                                      | ✅     |
| Suspendre, réactiver, rôle ; jamais soi-même              | backend `admin` + `finition` ; web réel `admin` + `finition-bo`                                         | ✅     |
| Export CSV des usagers                                    | backend `admin` ; web réel `finition-bo` (en-têtes, une ligne par compte)                               | ✅     |
| Tableau de bord : chiffres de la base                     | web réel `finition-bo`                                                                                  | ✅     |
| Catégories ; non supprimable si elle a des produits       | backend `admin` ; web réel `admin` + `finition-bo`                                                      | ✅     |
| Produit FR/EN, TVA, variantes, mise en vente, archivage   | backend `admin` + `finition` (PATCH partiel garde statut/TVA) ; web réel `admin`                        | ✅     |
| Photo produit : envoi, exposition partout, refus, retrait | backend `finition` ; web réel `finition-bo` (`naturalWidth` 400 boutique et fiche) ; mobile intégration | ✅     |
| Suppression produit ; refusée s'il est dans un panier     | backend `finition` (409) ; web réel `finition-bo`                                                       | ✅     |
| Description riche (TipTap), script injecté neutralisé     | backend `finition` ; web réel `finition-bo` (le script ne s'exécute pas)                                | ✅     |
| Journal d'audit, actions traduites                        | backend `admin` ; web réel `admin` « le journal… » + `finition-site` (/en sans clé brute)               | ✅     |

## Socle (base saine), i18n, conformité

| Exigence                                           | Vérification et chiffres (passe finale)                                                                                                      | Statut     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| FR/EN partout, aucune clé brute ni français en /en | web réel `finition-site` : pages publiques, compte, back-office                                                                              | ✅         |
| Pages légales, consentement avant PostHog          | web réel `finition-site` ; web simulé `consent` (4 cas) ; jest `AnalyticsGate.test`, `PrivacyScreen.test`                                    | ✅         |
| Événements PostHog métier sans donnée perso        | `packages/analytics` : 13 tests (mapper, filtrage des clés personnelles, rien sans consentement)                                             | ✅         |
| Accessibilité RGAA / WCAG 2.2 AA                   | pa11y htmlcs + axe : 80 pages (fr/en × clair/sombre, public, compte, back-office), 0 erreur ; 26 contrastes « à vérifier » mesurés (15,07:1) | ✅         |
| Régression visuelle + axe par story                | Storybook web 124/124, mobile 84/84 (`make visual`) ; règle `label-content-name-mismatch` écartée côté mobile (faux positif du rendu web)    | ✅         |
| Secrets                                            | gitleaks sur tout l'historique : 0 fuite (3 mots de passe de test justifiés dans `.gitleaksignore`)                                          | ✅         |
| SAST                                               | semgrep `--config auto` : 1 constat restant, `scripts/check-outdated.mjs` (RegExp sur une clé de config locale, script copié tel quel)       | ⚠️ accepté |
| Dépendances                                        | `pnpm audit` : 0 high/critical ; 2 moderate (glob, minimatch) + 1 low (deepmerge, sans correctif), outillage Expo/ESLint/Storybook           | ⚠️ accepté |
| Charge                                             | k6 smoke : 120 requêtes, 0 échec, p95 8 ms ; lecture publique 20 VUs : 6 288 requêtes, 0 échec, p95 33 ms                                    | ✅         |
| Image Docker qui build (CI réduite)                | `docker.yml` ; builds web et backend verts                                                                                                   | ✅         |

## Non testable ici, et pourquoi

- **App native sur simulateur (iOS)** : couverte depuis par la suite Maestro
  (`apps/mobile/e2e/maestro/`, `scripts/local/test-ios-e2e.sh`), voir `docs/qa/rapport-ios.md`.
  Android : voir ce rapport.
- **Face ID / empreinte sur un vrai appareil** : capteur simulé seulement (simulateur iOS).
- **Envoi d'e-mails réels** : Mailpit capture les messages (liens vérifiés), aucun SMTP public.

# Rapport QA — app mobile sur simulateur iOS (et Android)

Passe du 5–6 novembre 2026, sur le Mac de développement, contre la stack locale (API :3001,
site :3000, Postgres :5433, Redis, s3mock, Mailpit :8025, Metro :8081). Mission :
[`prompt-claude-code-ios.md`](prompt-claude-code-ios.md).

## Rejouer

```bash
scripts/local/test-ios.sh            # stack + app sur le simulateur (une fois)
scripts/local/test-ios-e2e.sh <udid> # suite Maestro : seed remis, JUnit + captures
```

Sortie : `.local-test/maestro/<appareil>/` (`report-*.xml`, captures, journaux). Suite :
[`apps/mobile/e2e/maestro/`](../../apps/mobile/e2e/maestro/) — 10 parcours, 4 passes de
captures, 3 parcours Face ID (lancés à part : le script tient le capteur simulé sur « reconnu »
ou « non reconnu » avec `notifyutil` pendant qu'ils tournent).

## Résultats

Passe finale (code final, `main` après fusion de `finition`), iPhone 17 · iOS 27.0, une seule
exécution de `scripts/local/test-ios-e2e.sh` :

| Lot                  | Rapport JUnit         | Résultat      |
| -------------------- | --------------------- | ------------- |
| Parcours 01 à 10     | `report-suite.xml`    | 10 / 10 verts |
| Captures (72 écrans) | `report-captures.xml` | vert          |
| Face ID — activation | `report-face-enable`  | vert          |
| Face ID — réussite   | `report-face-match`   | vert          |
| Face ID — échec      | `report-face-nomatch` | vert          |

Contrôles du dépôt sur ce Mac, sur le même code :

| Commande                                                        | Résultat                         |
| --------------------------------------------------------------- | -------------------------------- |
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` | verts                            |
| `pnpm --filter @nutrion/backend test:e2e` (base sur :5433)      | 8 fichiers, 48 tests verts       |
| `pnpm --filter @nutrion/web test:e2e:real`                      | 36 / 36 verts                    |
| `pnpm --filter @nutrion/mobile test:integration`                | 2 fichiers, 19 tests verts       |
| `npx expo export --platform ios`                                | bundle Hermes construit (6,7 Mo) |

Appareils :

- **iPhone 17** (iOS 27.0, format standard) : toute la suite, ci-dessus.
- **iPhone Duo** (iOS 27.1, Xcode 27.1 bêta), le simulateur de départ : la suite ne peut pas y
  être pilotée. XCUITest y rapporte la fenêtre de l'app à x = 80…466 pt alors qu'elle est
  dessinée à 0…386 pt : chaque toucher de Maestro tombe 80 pt à droite (puces, onglets ratés ;
  boutons pleine largeur réussis). Consentement (01) vert dessus ; la boutique y échoue sur ce
  seul décalage. Mise en page contrôlée à part (touchers corrigés du décalage) : bandeau,
  boutique, fiche, panier en clair et en sombre, sans défaut.
- **Android** (émulateur `Medium_Phone_API_36.1`, API 36) : l'app ne se construisait pas (nom de
  paquet, corrigé), puis build, installation et lancement réussis. Maestro ne peut pas y tourner
  sur ce Mac (voir plus bas) : contrôle par `adb` (liens `nutrion://`, captures) de la boutique,
  la fiche, le panier invité, le compte et la connexion, en clair et en sombre, sans défaut.

## Parcours testés

| Parcours                   | Ce qui est vérifié                                                                                                                                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01 Consentement            | Refuser, accepter (app neuve), choix gardé au relancement, « Personnaliser » ouvre Confidentialité                                                                                                                                                  |
| 02 Boutique                | 12 produits, filtre « Barres protéinées » (3), retour à « Tout », recherche « granola » (3) puis sans résultat, fermeture de la recherche                                                                                                           |
| 03 Fiche produit           | Cacao à l'unité 2,90 € → boîte de 12 29,90 €, quantité plafonnée au stock (3 → 89,70 €, + inactif), Noisette × boîte en rupture (annoncée, non ajoutable), ajout Myrtille, produit en rupture                                                       |
| 04 Panier invité           | Panier vide, deux produits, total 17,80 € et TVA non nulle, + / −, paiement « bientôt disponible » inactif, panier conservé après fermeture, suppression par la corbeille                                                                           |
| 05 Inscription             | Erreurs du formulaire, mot de passe trop court, « Vérifiez votre boîte mail », connexion refusée avant confirmation, e-mail **en anglais** lu dans Mailpit, lien ouvert (page du site), connexion                                                   |
| 06 Erreurs de connexion    | E-mail invalide, champ requis, mauvais mot de passe, mot de passe oublié (e-mail reçu, lien vers la page du site), verrouillage après 5 échecs (même le bon mot de passe refusé)                                                                    |
| 07 Connexion et fusion     | Panier invité fusionné dans celui de Camille (note affichée), langue du profil (fr) appliquée, panier retrouvé après fermeture                                                                                                                      |
| 08 Profil, photo, adresses | Prénom et téléphone modifiés puis retrouvés après relancement, photo de la photothèque (`simctl addmedia`) envoyée puis retirée, adresse ajoutée (champs requis), mise par défaut, gardée au relancement, supprimée                                 |
| 09 Langue et thème         | Déconnecté : FR/sombre puis EN/clair gardés au relancement ; connectée : changement gardé sur le profil et rapporté sur un appareil neuf                                                                                                            |
| 10 Sécurité et données     | Autre session (« Windows ») ouverte par l'API puis révoquée depuis l'app (vérifié côté API), mot de passe changé (trop faible refusé), export ZIP (feuille de partage), suppression du compte jetable (confirmée, reconnexion refusée), déconnexion |
| 11 Captures                | 18 écrans × EN/FR × clair/sombre (déconnecté puis connecté)                                                                                                                                                                                         |
| Face ID                    | Activation à la connexion (autorisation iOS, visage reconnu), déverrouillage au relancement, visage non reconnu → reste verrouillée, déverrouillage par mot de passe                                                                                |

## Bugs trouvés et corrigés

Chaque correctif a son test (unitaire, intégration ou e2e) ; la suite Maestro les rejoue.

| Bug                                                                                                                                            | Correctif                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Pluriels : Hermes n'a pas `Intl.PluralRules` (plantage)                                                                                        | `apps/mobile/src/lib/format/format.ts` — règle fr / en de repli                                |
| `make db-migrate` ignorait le `.env`                                                                                                           | `apps/backend/src/migrate.ts` — charge `load-env`                                              |
| Ports Postgres / Redis figés (un autre Postgres occupe 5432)                                                                                   | `docker-compose.yml`, `.env.example` — `DB_PORT`, `REDIS_PORT`                                 |
| Inscription depuis l'app en anglais : e-mails envoyés en français                                                                              | `apps/mobile/src/lib/auth/validation.ts` (`signUpPayload`) — la langue part avec l'inscription |
| « Customise » du bandeau cookies inerte au premier toucher : bandeau d'avertissement du mode dev (`Sentry.wrap` sans `Sentry.init`) par-dessus | `apps/mobile/src/lib/analytics/sentry-root.ts` — pas d'enveloppe sans DSN                      |
| VoiceOver ne disait pas « Rupture » (libellé du groupe prix)                                                                                   | `apps/mobile/src/screens/shop/ProductScreen.tsx`                                               |
| Clavier sur le champ suivant dans les feuilles de connexion / inscription                                                                      | `Screen.tsx` (zone ajustée au clavier), `SignInScreen.tsx`, `SignUpScreen.tsx` (« Suivant »)   |
| Pavés numérique et téléphone sans moyen de fermer le clavier (Enregistrer caché)                                                               | `apps/mobile/src/components/layout/Screen.tsx` — glisser referme                               |
| Suppression du compte sans confirmation (texte prévu mais jamais affiché)                                                                      | `apps/mobile/src/screens/account/DataScreen.tsx`                                               |
| Panier resté dans l'ancienne langue (noms de produits) après changement de langue                                                              | `apps/mobile/src/hooks/cart/useCart.ts` (`useCartFollowsLocale`)                               |
| Note « panier invité ajouté » perdue quand la langue du profil s'applique (course avec la relecture)                                           | `apps/mobile/src/stores/cart-notice.store.ts`                                                  |
| **Photo de profil jamais envoyée** : le `fetch` d'Expo refuse `{ uri, name, type }`                                                            | `apps/mobile/src/lib/api/upload.ts` — `File` d'expo-file-system                                |
| E-mail prérempli de connexion difficile à effacer                                                                                              | `SignInScreen.tsx`, `ForgotPasswordScreen.tsx` — croix d'effacement                            |
| Demandes d'autorisation iOS (Face ID, photos) en français seulement                                                                            | `apps/mobile/app.config.ts` + `apps/mobile/locales/*.json` (effectif au prochain build natif)  |
| Offre Face ID affichée dans l'ancienne langue juste après la connexion                                                                         | `apps/mobile/src/hooks/auth/useBiometricOffer.ts`                                              |
| **Barre d'état illisible** (heure noire sur fond sombre) en thème sombre choisi dans l'app                                                     | `apps/mobile/app/_layout.tsx` (`statusBarStyle` de la pile), `src/theme/useTheme.ts`           |
| **Build Android impossible** : nom de paquet `io.bullify.nutrion-app` (tiret)                                                                  | `apps/mobile/app.config.ts` — `io.bullify.nutrionapp`                                          |
| Cycle d'imports `index` ⇄ `fetch-reporter` (bandeau d'avertissement du mode dev)                                                               | `packages/analytics/src/capture.ts`                                                            |
| Catégorie sans produit en vente montrée en boutique (puce menant à une liste vide)                                                             | `apps/backend/src/modules/catalog/services/catalog.service.ts`                                 |
| Test web PostHog : échouait sur un poste sans clé PostHog                                                                                      | `apps/web/e2e-real/finition-site.spec.ts` — vérifie qu'aucun envoi ne part sans clé            |

## Captures de référence

Toutes dans `.local-test/maestro/iPhone-17/<passe>/Captures…/takeScreenshot/captures/` (non
versionnées). Une sélection est versionnée dans [`captures-ios/`](captures-ios/). Relecture à
l'œil des 72 captures : pas de texte coupé, pas de clé de traduction brute, pas de français
dans l'interface anglaise ni l'inverse ; seul défaut trouvé, la barre d'état en sombre (corrigé).
Les données du seed restent en français (« 3e étage ») : c'est voulu.

## Ce qui n'a pas pu être testé, et pourquoi

- **Suite Maestro sur l'iPhone Duo** : décalage de 80 pt des coordonnées de XCUITest sur ce
  type d'appareil (Xcode 27.1 bêta), voir plus haut. À rejouer quand Xcode corrige le type.
- **Suite Maestro sur Android** : au démarrage, Maestro sonde les ports d'émulateur
  (5555-5585) en IPv4 et attend sans fin une réponse de NTKDaemon (Native Instruments), qui
  écoute sur 5563 ; le contournement utilisé pour iOS (`preferIPv6Addresses`) rend l'émulateur
  injoignable. Le service n'a pas été arrêté (consigne). Les parcours restent à écrire en
  variante Android (`appId` `io.bullify.nutrionapp`) une fois ce point levé.
- **Vrai Face ID et vraie photothèque** : capteur et photothèque du simulateur seulement.
- **Demandes d'autorisation iOS traduites** : la configuration est en place
  (`app.config.ts`, `locales/`), mais elle ne s'applique qu'au prochain build natif ; l'app du
  simulateur n'a pas été reconstruite (le projet `ios/` porte la signature réglée pour l'iPhone
  physique par une autre session).
- **Envoi d'e-mails réels et PostHog réel** : Mailpit capture les messages ; pas de clé PostHog
  sur ce poste (le test web vérifie alors qu'aucun envoi ne part).

## Remarques (non corrigées)

- « Mot de passe oublié » reprend le dernier compte connu, pas l'e-mail que l'on vient de saisir
  sur l'écran de connexion.
- Le bouton retour natif est lu « Back » par VoiceOver quand l'app est en français et l'appareil
  en anglais (libellé du système, dans la langue de l'appareil).
- Le lien de confirmation, ouvert dans un navigateur, y ouvre aussi une session (connexion
  automatique de Better Auth) : elle apparaît dans « Appareils connectés ».
- Le backend accepte une langue quelconque à l'inscription (champ `locale` de Better Auth, déjà
  envoyé par le site) ; les e-mails ne retiennent que `en`, sinon `fr`.
- L'e2e web réel crée une catégorie et un produit qu'il archive sans pouvoir supprimer la
  catégorie (un produit y reste rattaché) ; elle n'est plus montrée en boutique.

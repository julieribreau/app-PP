# Contrat d'API NutrionApp (v1)

Source de vérité partagée par `apps/backend`, `apps/web` et `apps/mobile` pendant le premier
lot. L'OpenAPI généré par le backend (`/docs`, Scalar) prend le relais une fois en place :
tout écart se corrige ici et dans le code en même temps.

## Conventions

- Backend NestJS sur `http://localhost:3001`. Routes métier sous `/v1/...`, Better Auth monté
  sous `/v1/auth/*`.
- **Web** : Next.js réécrit `/api/:path*` vers `${BACKEND_URL}/:path*`. Le navigateur n'appelle
  que `/api/v1/...` (même origine, cookies de session et de panier en `httpOnly`, `SameSite=Lax`).
  Les Server Components appellent `BACKEND_URL` directement en relayant les cookies.
- **Mobile** : appelle `EXPO_PUBLIC_API_URL` (défaut `http://localhost:3001`) ; session par le
  client `@better-auth/expo` (jeton dans `expo-secure-store`, en-tête `Cookie` géré par le plugin).
- Langue : en-tête `Accept-Language: fr|en` (défaut `fr`). Les champs traduits sont rendus dans
  cette langue côté public ; le back-office reçoit et envoie les objets `{ fr, en }`.
- Montants en **centimes TTC** (`priceCents`), TVA en points de base (`vatRateBps`, 550 = 5,5 %).
  Le client formate (`Intl.NumberFormat(locale, { style: "currency", currency: "EUR" })`).
- Dates en ISO 8601 UTC.
- Pagination : `?page=1&pageSize=24` → `{ items, total, page, pageSize }`.
- Erreurs : `{ statusCode, code, message }`, `code` stable en `SCREAMING_SNAKE` (ex.
  `VARIANT_OUT_OF_STOCK`, `TWO_FACTOR_REQUIRED`, `FORBIDDEN`, `VALIDATION_FAILED`,
  `UNAUTHORIZED`, `NOT_FOUND`). Les routes Better Auth (`/v1/auth/*`) répondent dans leur
  propre format `{ code, message }` (ex. `EMAIL_NOT_VERIFIED`, `INVALID_EMAIL_OR_PASSWORD`,
  `PASSWORD_TOO_WEAK`, `ACCOUNT_LOCKED` en 429, `ACCOUNT_SUSPENDED` en 403).
- Santé : `GET /v1/health` (vivant) et `GET /v1/health/ready` (db, redis, storage).
- Cookies : session `nutrion.session_token` (préfixe `__Secure-` hors dev), panier invité
  `nutrion_cart`. Le CORS expose l'en-tête `X-Cart-Token`.
- Images : `imageUrl` absolue (URL S3 signée ou publique), `null` si aucune photo.

## Authentification (Better Auth, `/v1/auth/*`)

E-mail + mot de passe uniquement (pas de SSO pour ce lot), e-mail vérifié obligatoire avant
connexion, mot de passe 12 caractères minimum dont un chiffre, verrouillage 15 min après
5 échecs. Endpoints Better Auth standard : `sign-up/email`, `sign-in/email`, `sign-out`,
`get-session`, `request-password-reset` (`{ email, redirectTo }`), `reset-password`,
`verify-email`, `change-email`, `change-password`, `list-sessions`, `revoke-session`,
`two-factor/enable` (`{ password }` → `totpURI`, `backupCodes`), `two-factor/verify-totp`
(`{ code }`), `two-factor/disable`.

- Les liens des e-mails pointent sur `WEB_URL/api/v1/auth/...` (proxy du site) : le clic sur
  « Confirmer mon adresse » vérifie, ouvre la session (`autoSignInAfterVerification`) puis
  redirige vers le `callbackURL` donné à l'inscription. Le lien de réinitialisation redirige
  vers `redirectTo?token=…`, page du site qui appelle `reset-password`.
- `sign-in/email` d'un admin à 2FA répond `{ twoFactorRedirect: true }` : le client appelle
  ensuite `two-factor/verify-totp`.

- `sign-up/email` accepte en plus `firstName`, `lastName` (champs additionnels du user).
- Rôles : `user` (défaut) ou `admin`. `get-session` renvoie `user.role`.
- **Back-office** : un admin sans 2FA activée reçoit `403 TWO_FACTOR_REQUIRED` sur `/v1/admin/*` ;
  le web lui fait activer la 2FA (`two-factor/enable` → QR + codes de secours → `verify-totp`).
- **Mobile, biométrie** : déverrouillage local (`expo-local-authentication`) de la session déjà
  stockée ; ce n'est pas un facteur serveur. Après une connexion e-mail réussie, l'app propose
  d'activer le déverrouillage biométrique (préférence locale).

## Panier invité et fusion

- Sans session, le premier `POST /v1/cart/items` crée un panier invité et renvoie son jeton :
  cookie `nutrion_cart` (`httpOnly`, 90 jours) **et** en-tête de réponse `X-Cart-Token`.
- Le mobile stocke le jeton (`expo-secure-store`) et le renvoie en en-tête `X-Cart-Token` ; le web
  s'appuie sur le cookie.
- Juste après une connexion, le client appelle `POST /v1/cart/merge` (avec session **et** jeton
  invité) : quantités additionnées par variante, plafonnées au stock, panier invité supprimé,
  cookie effacé. Réponse : le panier du compte, avec `merged: true` si quelque chose a été fusionné.

## Catalogue public

### `GET /v1/catalog/categories`

```json
[{ "id": "uuid", "slug": "barres-cereales", "name": "Barres céréales", "productCount": 4 }]
```

### `GET /v1/catalog/products`

Query : `category` (slug), `q` (recherche nom/résumé), `sort` (`popular` | `price_asc` |
`price_desc` | `new`, défaut `popular` = position), `page`, `pageSize` (défaut 24, max 60).
Seuls les produits `active` d'une catégorie active.

```json
{
  "items": [
    {
      "id": "uuid",
      "slug": "avoine-cacao",
      "name": "Avoine & cacao",
      "summary": "Une barre moelleuse à l'avoine complète et au cacao.",
      "category": { "slug": "barres-cereales", "name": "Barres céréales" },
      "imageUrl": null,
      "priceFromCents": 290,
      "priceVaries": true,
      "variantSummary": "3 saveurs · 2 formats",
      "available": true
    }
  ],
  "total": 12,
  "page": 1,
  "pageSize": 24
}
```

`available` = au moins une variante active avec un stock `null` ou > 0 (sinon l'interface
affiche le badge « Rupture », seul badge de stock retenu au design).

### `GET /v1/catalog/products/:slug`

```json
{
  "id": "uuid",
  "slug": "avoine-cacao",
  "name": "Avoine & cacao",
  "summary": "…",
  "descriptionHtml": "<p>…</p>",
  "category": { "slug": "barres-cereales", "name": "Barres céréales" },
  "imageUrl": null,
  "priceCents": 290,
  "vatRateBps": 550,
  "options": [
    { "id": "opt1", "name": "Saveur", "values": [{ "id": "v1", "label": "Cacao" }] },
    { "id": "opt2", "name": "Format", "values": [{ "id": "v4", "label": "À l'unité" }] }
  ],
  "variants": [
    {
      "id": "uuid",
      "optionValues": { "opt1": "v1", "opt2": "v4" },
      "label": "Cacao · À l'unité",
      "priceCents": 290,
      "stock": 42,
      "available": true
    }
  ]
}
```

`variants` ne contient que les variantes actives ; `priceCents` y est déjà résolu (prix propre ou
celui du produit) ; `stock: null` = illimité. 404 `PRODUCT_NOT_FOUND` si inconnu ou non actif.

## Panier

Toutes les routes acceptent session et/ou jeton invité ; réponse = `Cart`.

```json
{
  "id": "uuid",
  "items": [
    {
      "id": "uuid",
      "variantId": "uuid",
      "productSlug": "avoine-cacao",
      "productName": "Avoine & cacao",
      "variantLabel": "Cacao · À l'unité",
      "imageUrl": null,
      "unitPriceCents": 290,
      "quantity": 2,
      "lineTotalCents": 580,
      "maxQuantity": 42
    }
  ],
  "itemCount": 4,
  "subtotalCents": 4860,
  "vatCents": 253,
  "totalCents": 4860,
  "adjustments": [{ "variantId": "uuid", "kind": "removed" | "quantity_capped" }],
  "merged": false
}
```

- `GET /v1/cart` : panier courant (vide si aucun : `items: []`, `id: null`).
- `POST /v1/cart/items` `{ variantId, quantity }` → 201 : ajoute (cumule si déjà présent). 409
  `VARIANT_OUT_OF_STOCK` si le stock ne suffit pas, 404 `VARIANT_NOT_FOUND` si inactive.
- `PATCH /v1/cart/items/:itemId` `{ quantity }` (≥ 1, plafonné au stock).
- `DELETE /v1/cart/items/:itemId`.
- `POST /v1/cart/merge` (session requise) → 200 ; sans session, 401.
- À chaque lecture, les variantes archivées ou épuisées sont retirées et les quantités
  plafonnées ; `adjustments` le dit au client, qui l'affiche une fois.
- TVA : par ligne, `ttc - round(ttc / (1 + taux))`, sommée.
- Pas de commande ni de paiement dans ce lot : le bouton « Paiement bientôt disponible » est
  désactivé côté client, aucun endpoint de checkout.

## Compte (session requise)

- `GET /v1/account/me` →
  `{ id, email, emailVerified, firstName, lastName, phone, imageUrl, locale, theme, role, twoFactorEnabled, createdAt }`
- `PATCH /v1/account/me` `{ firstName?, lastName?, phone?, locale?, theme? }` (changement
  d'e-mail et de mot de passe : endpoints Better Auth).
- `PUT /v1/account/me/avatar` (multipart `file`, jpg/png/webp, 2 Mo) → `{ imageUrl }` ;
  `DELETE /v1/account/me/avatar`.
- `GET /v1/account/addresses` → `Address[]` ; `POST` ; `PATCH /:id` ; `DELETE /:id` ;
  `POST /:id/default`.
  `Address = { id, label, recipientName, line1, line2, postalCode, city, countryCode, phone, isDefault }`
- `GET /v1/account/export` → `application/zip` (profil, adresses, paniers, sessions,
  consentements, en JSON).
- `DELETE /v1/account` `{ confirm: "SUPPRIMER" | "DELETE" }` → 204 : anonymisation, sessions
  révoquées, panier vidé.

## Back-office (rôle `admin` + 2FA)

Chaque écriture ajoute une ligne au journal d'audit.

### Usagers

- `GET /v1/admin/users` query `q`, `role` (`user`|`admin`), `status`
  (`active`|`suspended`|`unverified`), `sort` (`createdAt`|`lastLoginAt`|`name`|`email`),
  `order` (`asc`|`desc`, défaut `desc`), `page`, `pageSize` (10/25/50) →
  `{ items: AdminUser[], total, page, pageSize, counts: { total, unverified, suspended } }`
  `AdminUser = { id, firstName, lastName, name, email, emailVerified, role, status, createdAt, lastLoginAt, cartTotalCents }`
- `GET /v1/admin/users/:id` → `AdminUser` + `{ phone, addresses, sessions }`.
- `POST /v1/admin/users/:id/suspend` `{ reason }` ; `POST /:id/reactivate` ;
  `PATCH /:id/role` `{ role }` (un admin ne peut ni se suspendre ni se rétrograder).
- `GET /v1/admin/users/export?…mêmes filtres` → `text/csv`.

### Catalogue

- `GET /v1/admin/categories` → `{ id, slug, name: { fr, en }, position, isActive, productCount }[]` ;
  `POST`, `PATCH /:id`, `DELETE /:id` (refusé si des produits y sont rattachés).
- `GET /v1/admin/products` query `q`, `category`, `status`, `page`, `pageSize` →
  `{ items: [{ id, slug, name, category, imageUrl, priceCents, vatRateBps, variantCount, stockTotal, status }], total, page, pageSize }`
  (`name` dans la langue de l'admin, `stockTotal: null` si une variante est illimitée).
- `POST /v1/admin/products`
  `{ slug?, categoryId, name: {fr,en}, summary: {fr,en}, description: {fr,en}, priceCents, vatRateBps, status }`
  → 201, produit complet, avec sa variante unique créée d'office (slug déduit du nom fr).
- `GET /v1/admin/products/:id` → `{ …champs ci-dessus, id, imageUrl, options: [{ id, name: {fr,en}, values: [{ id, label: {fr,en} }] }], variants: [{ id, optionValues, label, sku, priceCents, effectivePriceCents, stock, isActive }] }`
  (`priceCents` de la variante : `null` = hérite ; `effectivePriceCents` : le prix appliqué ;
  `label` en français).
- `PATCH /v1/admin/products/:id` (mêmes champs, partiels). La description passe par
  `sanitize-html` (liste blanche du socle).
- `PUT /v1/admin/products/:id/image` (multipart) ; `DELETE /v1/admin/products/:id/image`.
- `PUT /v1/admin/products/:id/options` `[{ id?, name: {fr,en}, values: [{ id?, label: {fr,en} }] }]`
  → régénère les combinaisons : les variantes existantes sont gardées, les nouvelles créées
  actives, celles qui ne correspondent plus à aucune combinaison supprimées, ou seulement désactivées si un panier les référence encore.
- `PATCH /v1/admin/products/:id/variants` `{ variants: [{ id, isActive?, sku?, priceCents?, stock? }] }`.
- `POST /v1/admin/products/:id/archive`, `DELETE /v1/admin/products/:id` → 204 (409
  `PRODUCT_IN_CART` si une variante est dans un panier : l'archiver).

### Journal d'audit

- `GET /v1/admin/audit` query `targetType`, `targetId`, `actorId`, `page`, `pageSize` →
  `{ items: [{ id, actor: { id, name } | null, action, targetType, targetId, diff, createdAt }], total, page, pageSize }`.

## Comptes de démonstration (seed)

| Compte                      | Mot de passe         | Rôle                                  |
| --------------------------- | -------------------- | ------------------------------------- |
| `admin@nutrion.local`       | `Nutrion-Admin-2026` | admin (2FA à activer au 1er accès BO) |
| `camille.martin@exemple.fr` | `Nutrion-Demo-2026`  | user, e-mail vérifié                  |

Plus ~10 usagers, 5 catégories (barres céréales, barres protéinées, granolas, boissons,
tartinables) et ~12 produits avec variantes (saveur × format), TVA 5,5 %.

/**
 * Catalogue des événements nommés, partagé par le web et le mobile (socle §PostHog) : un nom
 * hors catalogue ne compile pas. Un événement par action métier, succès comme échec, nommé
 * `domaine.action` au passé.
 *
 * Propriétés : identifiants techniques, statuts, quantités, montants en centimes. Jamais un nom,
 * une adresse, un e-mail, un téléphone ni un texte saisi par l'usager (cf `PERSONAL_KEYS`).
 * Rien ne part avant le oui à la mesure d'audience : le client PostHog n'existe pas avant.
 */
export interface EventCatalog {
  // Catalogue et panier
  "product.viewed": { productId: string; slug: string };
  "cart.viewed": { itemCount: number; totalCents: number };
  "cart.item_added": { variantId: string; quantity: number; itemCount: number; totalCents: number };
  "cart.item_updated": { itemId: string; quantity: number; itemCount: number; totalCents: number };
  "cart.item_removed": { itemId: string; itemCount: number; totalCents: number };
  "cart.add_failed": { variantId: string; code: string };
  "cart.merged": { itemCount: number; totalCents: number; merged: boolean };
  // Authentification
  "auth.signed_up": { method: "email" };
  "auth.sign_up_failed": { method: "email"; code: string };
  "auth.logged_in": { method: "email" | "biometric" };
  "auth.login_failed": { method: "email"; code: string };
  "auth.logged_out": Record<string, never>;
  "auth.password_reset_requested": Record<string, never>;
  "auth.two_factor_enabled": Record<string, never>;
  // Espace personnel
  "account.profile_updated": { fields: string[] };
  "account.avatar_updated": { removed: boolean };
  "account.address_added": { isDefault: boolean };
  "account.address_updated": Record<string, never>;
  "account.address_deleted": Record<string, never>;
  "account.data_exported": Record<string, never>;
  "account.deleted": Record<string, never>;
  // Back-office
  "admin.user_suspended": { userId: string };
  "admin.user_reactivated": { userId: string };
  "admin.user_role_changed": { userId: string; role: string };
  "admin.users_exported": Record<string, never>;
  "admin.category_created": { categoryId: string };
  "admin.category_updated": { categoryId: string };
  "admin.category_deleted": { categoryId: string };
  "admin.product_created": { productId: string; status: string };
  "admin.product_updated": { productId: string; status: string };
  "admin.product_image_updated": { productId: string; removed: boolean };
  "admin.product_options_updated": { productId: string; variantCount: number };
  "admin.product_variants_updated": { productId: string; variantCount: number };
  "admin.product_archived": { productId: string };
  "admin.product_deleted": { productId: string };
}

/** Clés de propriété refusées quel que soit l'événement : données personnelles. */
export const PERSONAL_KEYS = [
  "email",
  "name",
  "firstName",
  "lastName",
  "phone",
  "address",
  "line1",
  "line2",
  "city",
  "postalCode",
  "recipientName",
  "password",
  "reason",
] as const;

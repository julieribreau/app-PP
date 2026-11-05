// Types de l'API NutrionApp v1, recopiés du contrat (docs/architecture/api-contract.md).
// Montants en centimes TTC, TVA en points de base, dates ISO 8601.

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Localized {
  fr: string;
  en: string;
}

export type Role = "user" | "admin";
export type Theme = "light" | "dark" | "system";

// ── Catalogue public ──────────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  slug: string;
  name: string;
  productCount: number;
}

export interface CategoryRef {
  slug: string;
  name: string;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  summary: string;
  category: CategoryRef | null;
  imageUrl: string | null;
  priceFromCents: number;
  priceVaries: boolean;
  variantSummary: string;
  available: boolean;
}

export type ProductSort = "popular" | "price_asc" | "price_desc" | "new";

export interface OptionValue {
  id: string;
  label: string;
}

export interface ProductOption {
  id: string;
  name: string;
  values: OptionValue[];
}

export interface Variant {
  id: string;
  optionValues: Record<string, string>;
  label: string;
  priceCents: number;
  stock: number | null;
  available: boolean;
}

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  summary: string;
  descriptionHtml: string;
  category: CategoryRef | null;
  imageUrl: string | null;
  priceCents: number;
  vatRateBps: number;
  options: ProductOption[];
  variants: Variant[];
}

// ── Panier ────────────────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  variantId: string;
  productSlug: string;
  productName: string;
  variantLabel: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  maxQuantity: number | null;
}

export interface CartAdjustment {
  variantId: string;
  kind: "removed" | "quantity_capped";
}

export interface Cart {
  id: string | null;
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  adjustments: CartAdjustment[];
  merged: boolean;
}

// ── Compte ────────────────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  imageUrl: string | null;
  locale: string;
  theme: Theme;
  role: Role;
  twoFactorEnabled: boolean;
  createdAt: string;
}

export type ProfilePatch = Partial<
  Pick<Profile, "firstName" | "lastName" | "phone" | "locale" | "theme">
>;

export interface Address {
  id: string;
  label: string | null;
  recipientName: string;
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  countryCode: string;
  phone: string | null;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, "id" | "isDefault">;

// ── Back-office ───────────────────────────────────────────────────────────────────────────

export type UserStatus = "active" | "suspended" | "unverified";

export interface AdminUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  email: string;
  emailVerified: boolean;
  role: Role;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string | null;
  cartTotalCents: number;
}

export interface AdminUsersPage extends Page<AdminUser> {
  counts: { total: number; unverified: number; suspended: number };
}

export interface AdminUsersQuery {
  q?: string;
  role?: Role;
  status?: UserStatus;
  sort?: "createdAt" | "lastLoginAt" | "name" | "email";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface AdminCategory {
  id: string;
  slug: string;
  name: Localized;
  position: number;
  isActive: boolean;
  productCount: number;
}

export type ProductStatus = "draft" | "active" | "archived";

export interface AdminProductRow {
  id: string;
  slug: string;
  name: string;
  category: CategoryRef | null;
  imageUrl: string | null;
  priceCents: number;
  vatRateBps: number;
  variantCount: number;
  stockTotal: number | null;
  status: ProductStatus;
}

export interface AdminOption {
  id?: string;
  name: Localized;
  values: { id?: string; label: Localized }[];
}

export interface AdminVariant {
  id: string;
  optionValues: Record<string, string>;
  label: string;
  sku: string | null;
  priceCents: number | null;
  stock: number | null;
  isActive: boolean;
}

export interface AdminProductInput {
  slug?: string;
  categoryId: string | null;
  name: Localized;
  summary: Localized;
  description: Localized;
  priceCents: number;
  vatRateBps: number;
  status: ProductStatus;
}

export interface AdminProduct extends AdminProductInput {
  id: string;
  slug: string;
  imageUrl: string | null;
  options: AdminOption[];
  variants: AdminVariant[];
}

export interface AuditEntry {
  id: string;
  actor: { id: string; name: string } | null;
  action: string;
  targetType: string;
  targetId: string | null;
  diff: Record<string, unknown> | null;
  createdAt: string;
}

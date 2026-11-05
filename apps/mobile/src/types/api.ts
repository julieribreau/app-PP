// Types du contrat d'API v1 (docs/architecture/api-contract.md). Montants en centimes TTC.

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

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

export type ProductSort = "popular" | "price_asc" | "price_desc" | "new";

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

export interface ProductOptionValue {
  id: string;
  label: string;
}

export interface ProductOption {
  id: string;
  name: string;
  values: ProductOptionValue[];
}

export interface ProductVariant {
  id: string;
  /** { optionId: valueId } ; {} pour la variante unique. */
  optionValues: Record<string, string>;
  label: string;
  priceCents: number;
  /** null = illimité */
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
  variants: ProductVariant[];
}

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

export type ThemePreference = "system" | "light" | "dark";

export interface Me {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  imageUrl: string | null;
  locale: string;
  theme: ThemePreference;
  role: "user" | "admin";
  twoFactorEnabled: boolean;
  createdAt: string;
}

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

export const EMPTY_CART: Cart = {
  id: null,
  items: [],
  itemCount: 0,
  subtotalCents: 0,
  vatCents: 0,
  totalCents: 0,
  adjustments: [],
  merged: false,
};

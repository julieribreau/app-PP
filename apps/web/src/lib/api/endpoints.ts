import { createHttp, toQuery, type Http } from "./http";
import type {
  Address,
  AddressInput,
  AdminCategory,
  AdminOption,
  AdminProduct,
  AdminProductInput,
  AdminProductRow,
  AdminUser,
  AdminUsersPage,
  AdminUsersQuery,
  AdminVariant,
  AuditEntry,
  Cart,
  Category,
  Localized,
  Page,
  ProductDetail,
  ProductSort,
  ProductStatus,
  ProductSummary,
  Profile,
  ProfilePatch,
  Role,
} from "./types";

// Une fonction par endpoint du contrat (docs/architecture/api-contract.md), rangées par domaine.

export interface CatalogQuery {
  category?: string;
  q?: string;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}

function catalogApi(http: Http) {
  return {
    categories: () => http.get<Category[]>("/v1/catalog/categories"),
    products: (query: CatalogQuery) =>
      http.get<Page<ProductSummary>>(`/v1/catalog/products${toQuery(query)}`),
    product: (slug: string) =>
      http.get<ProductDetail>(`/v1/catalog/products/${encodeURIComponent(slug)}`),
  };
}

function cartApi(http: Http) {
  return {
    get: () => http.get<Cart>("/v1/cart"),
    add: (variantId: string, quantity: number) =>
      http.post<Cart>("/v1/cart/items", { variantId, quantity }),
    update: (itemId: string, quantity: number) =>
      http.patch<Cart>(`/v1/cart/items/${itemId}`, { quantity }),
    remove: (itemId: string) => http.delete<Cart>(`/v1/cart/items/${itemId}`),
    merge: () => http.post<Cart>("/v1/cart/merge"),
  };
}

function accountApi(http: Http) {
  return {
    me: () => http.get<Profile>("/v1/account/me"),
    update: (patch: ProfilePatch) => http.patch<Profile>("/v1/account/me", patch),
    uploadAvatar: (file: File) => http.upload<{ imageUrl: string }>("/v1/account/me/avatar", file),
    removeAvatar: () => http.delete<void>("/v1/account/me/avatar"),
    addresses: () => http.get<Address[]>("/v1/account/addresses"),
    createAddress: (input: AddressInput) => http.post<Address>("/v1/account/addresses", input),
    updateAddress: (id: string, input: Partial<AddressInput>) =>
      http.patch<Address>(`/v1/account/addresses/${id}`, input),
    deleteAddress: (id: string) => http.delete<void>(`/v1/account/addresses/${id}`),
    setDefaultAddress: (id: string) => http.post<Address>(`/v1/account/addresses/${id}/default`),
    exportData: () => http.download("/v1/account/export"),
    deleteAccount: (confirm: string) => http.deleteWith<void>("/v1/account", { confirm }),
  };
}

export interface AdminProductsQuery {
  q?: string;
  category?: string;
  status?: ProductStatus;
  page?: number;
  pageSize?: number;
}

function adminUsersApi(http: Http) {
  return {
    users: (query: AdminUsersQuery) => http.get<AdminUsersPage>(`/v1/admin/users${toQuery(query)}`),
    user: (id: string) => http.get<AdminUser>(`/v1/admin/users/${id}`),
    suspend: (id: string, reason: string) =>
      http.post<AdminUser>(`/v1/admin/users/${id}/suspend`, { reason }),
    reactivate: (id: string) => http.post<AdminUser>(`/v1/admin/users/${id}/reactivate`),
    setRole: (id: string, role: Role) =>
      http.patch<AdminUser>(`/v1/admin/users/${id}/role`, { role }),
    exportUsers: (query: AdminUsersQuery) =>
      http.download(`/v1/admin/users/export${toQuery({ ...query, page: undefined })}`),
    audit: (query: { targetType?: string; targetId?: string; page?: number; pageSize?: number }) =>
      http.get<Page<AuditEntry>>(`/v1/admin/audit${toQuery(query)}`),
  };
}

function adminCatalogApi(http: Http) {
  const base = "/v1/admin/products";
  return {
    categories: () => http.get<AdminCategory[]>("/v1/admin/categories"),
    createCategory: (input: { slug: string; name: Localized; isActive: boolean }) =>
      http.post<AdminCategory>("/v1/admin/categories", input),
    updateCategory: (
      id: string,
      input: Partial<{ slug: string; name: Localized; isActive: boolean; position: number }>,
    ) => http.patch<AdminCategory>(`/v1/admin/categories/${id}`, input),
    deleteCategory: (id: string) => http.delete<void>(`/v1/admin/categories/${id}`),
    products: (query: AdminProductsQuery) =>
      http.get<Page<AdminProductRow>>(`${base}${toQuery(query)}`),
    product: (id: string) => http.get<AdminProduct>(`${base}/${id}`),
    createProduct: (input: AdminProductInput) => http.post<AdminProduct>(base, input),
    updateProduct: (id: string, input: Partial<AdminProductInput>) =>
      http.patch<AdminProduct>(`${base}/${id}`, input),
    uploadImage: (id: string, file: File) => http.upload<AdminProduct>(`${base}/${id}/image`, file),
    removeImage: (id: string) => http.delete<AdminProduct>(`${base}/${id}/image`),
    setOptions: (id: string, options: AdminOption[]) =>
      http.put<AdminProduct>(`${base}/${id}/options`, options),
    updateVariants: (id: string, variants: Partial<AdminVariant>[]) =>
      http.patch<AdminProduct>(`${base}/${id}/variants`, { variants }),
    archive: (id: string) => http.post<AdminProduct>(`${base}/${id}/archive`),
    deleteProduct: (id: string) => http.delete<void>(`${base}/${id}`),
  };
}

export function createApi(locale: string) {
  const http = createHttp(locale);
  return {
    catalog: catalogApi(http),
    cart: cartApi(http),
    account: accountApi(http),
    admin: { ...adminUsersApi(http), ...adminCatalogApi(http) },
  };
}

export type Api = ReturnType<typeof createApi>;

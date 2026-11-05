import { ID, obj, str, variantCount, type Rule } from "./rule-kit";

// Actions du back-office.
export const adminRules: Rule[] = [
  {
    method: "POST",
    pattern: new RegExp(`^/v1/admin/users/${ID}/suspend$`),
    map: (_c, [userId]) => ({ name: "admin.user_suspended", properties: { userId: userId ?? "" } }),
  },
  {
    method: "POST",
    pattern: new RegExp(`^/v1/admin/users/${ID}/reactivate$`),
    map: (_c, [userId]) => ({
      name: "admin.user_reactivated",
      properties: { userId: userId ?? "" },
    }),
  },
  {
    method: "PATCH",
    pattern: new RegExp(`^/v1/admin/users/${ID}/role$`),
    map: ({ requestBody }, [userId]) => ({
      name: "admin.user_role_changed",
      properties: { userId: userId ?? "", role: str(obj(requestBody)["role"]) },
    }),
  },
  {
    method: "GET",
    pattern: /^\/v1\/admin\/users\/export$/,
    map: () => ({ name: "admin.users_exported", properties: {} }),
  },
  {
    method: "POST",
    pattern: /^\/v1\/admin\/categories$/,
    map: ({ responseBody }) => ({
      name: "admin.category_created",
      properties: { categoryId: str(obj(responseBody)["id"]) },
    }),
  },
  {
    method: "PATCH",
    pattern: new RegExp(`^/v1/admin/categories/${ID}$`),
    map: (_c, [categoryId]) => ({
      name: "admin.category_updated",
      properties: { categoryId: categoryId ?? "" },
    }),
  },
  {
    method: "DELETE",
    pattern: new RegExp(`^/v1/admin/categories/${ID}$`),
    map: (_c, [categoryId]) => ({
      name: "admin.category_deleted",
      properties: { categoryId: categoryId ?? "" },
    }),
  },
  {
    method: "POST",
    pattern: /^\/v1\/admin\/products$/,
    map: ({ responseBody }) => {
      const b = obj(responseBody);
      return {
        name: "admin.product_created",
        properties: { productId: str(b["id"]), status: str(b["status"]) },
      };
    },
  },
  {
    method: "PATCH",
    pattern: new RegExp(`^/v1/admin/products/${ID}$`),
    map: ({ responseBody }, [productId]) => ({
      name: "admin.product_updated",
      properties: { productId: productId ?? "", status: str(obj(responseBody)["status"]) },
    }),
  },
  {
    method: "PUT",
    pattern: new RegExp(`^/v1/admin/products/${ID}/image$`),
    map: (_c, [productId]) => ({
      name: "admin.product_image_updated",
      properties: { productId: productId ?? "", removed: false },
    }),
  },
  {
    method: "DELETE",
    pattern: new RegExp(`^/v1/admin/products/${ID}/image$`),
    map: (_c, [productId]) => ({
      name: "admin.product_image_updated",
      properties: { productId: productId ?? "", removed: true },
    }),
  },
  {
    method: "PUT",
    pattern: new RegExp(`^/v1/admin/products/${ID}/options$`),
    map: ({ responseBody }, [productId]) => ({
      name: "admin.product_options_updated",
      properties: { productId: productId ?? "", variantCount: variantCount(responseBody) },
    }),
  },
  {
    method: "PATCH",
    pattern: new RegExp(`^/v1/admin/products/${ID}/variants$`),
    map: ({ responseBody }, [productId]) => ({
      name: "admin.product_variants_updated",
      properties: { productId: productId ?? "", variantCount: variantCount(responseBody) },
    }),
  },
  {
    method: "POST",
    pattern: new RegExp(`^/v1/admin/products/${ID}/archive$`),
    map: (_c, [productId]) => ({
      name: "admin.product_archived",
      properties: { productId: productId ?? "" },
    }),
  },
  {
    method: "DELETE",
    pattern: new RegExp(`^/v1/admin/products/${ID}$`),
    map: (_c, [productId]) => ({
      name: "admin.product_deleted",
      properties: { productId: productId ?? "" },
    }),
  },
];

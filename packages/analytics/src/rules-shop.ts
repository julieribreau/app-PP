import { cartTotals, errorCode, ID, num, obj, str, type Rule } from "./rule-kit";

// Catalogue, panier, authentification et espace personnel.
export const shopRules: Rule[] = [
  {
    method: "GET",
    pattern: new RegExp(`^/v1/catalog/products/${ID}$`),
    map: ({ responseBody }) => {
      const b = obj(responseBody);
      return {
        name: "product.viewed",
        properties: { productId: str(b["id"]), slug: str(b["slug"]) },
      };
    },
  },
  {
    method: "POST",
    pattern: /^\/v1\/cart\/items$/,
    map: ({ requestBody, responseBody }) => {
      const r = obj(requestBody);
      return {
        name: "cart.item_added",
        properties: {
          variantId: str(r["variantId"]),
          quantity: num(r["quantity"]),
          ...cartTotals(responseBody),
        },
      };
    },
    onError: ({ requestBody, responseBody, status }) => ({
      name: "cart.add_failed",
      properties: {
        variantId: str(obj(requestBody)["variantId"]),
        code: errorCode(responseBody, status),
      },
    }),
  },
  {
    method: "PATCH",
    pattern: new RegExp(`^/v1/cart/items/${ID}$`),
    map: ({ requestBody, responseBody }, [itemId]) => ({
      name: "cart.item_updated",
      properties: {
        itemId: itemId ?? "",
        quantity: num(obj(requestBody)["quantity"]),
        ...cartTotals(responseBody),
      },
    }),
  },
  {
    method: "DELETE",
    pattern: new RegExp(`^/v1/cart/items/${ID}$`),
    map: ({ responseBody }, [itemId]) => ({
      name: "cart.item_removed",
      properties: { itemId: itemId ?? "", ...cartTotals(responseBody) },
    }),
  },
  {
    method: "POST",
    pattern: /^\/v1\/cart\/merge$/,
    map: ({ responseBody }) => ({
      name: "cart.merged",
      properties: { ...cartTotals(responseBody), merged: obj(responseBody)["merged"] === true },
    }),
  },
  {
    method: "POST",
    pattern: /^\/v1\/auth\/sign-up\/email$/,
    map: () => ({ name: "auth.signed_up", properties: { method: "email" } }),
    onError: ({ responseBody, status }) => ({
      name: "auth.sign_up_failed",
      properties: { method: "email", code: errorCode(responseBody, status) },
    }),
  },
  {
    method: "POST",
    pattern: /^\/v1\/auth\/sign-in\/email$/,
    map: () => ({ name: "auth.logged_in", properties: { method: "email" } }),
    onError: ({ responseBody, status }) => ({
      name: "auth.login_failed",
      properties: { method: "email", code: errorCode(responseBody, status) },
    }),
  },
  {
    method: "POST",
    pattern: /^\/v1\/auth\/sign-out$/,
    map: () => ({ name: "auth.logged_out", properties: {} }),
  },
  {
    method: "POST",
    pattern: /^\/v1\/auth\/(request-password-reset|forget-password)$/,
    map: () => ({ name: "auth.password_reset_requested", properties: {} }),
  },
  {
    method: "POST",
    pattern: /^\/v1\/auth\/two-factor\/verify-totp$/,
    map: () => ({ name: "auth.two_factor_enabled", properties: {} }),
  },
  {
    method: "PATCH",
    pattern: /^\/v1\/account\/me$/,
    map: ({ requestBody }) => ({
      name: "account.profile_updated",
      properties: { fields: Object.keys(obj(requestBody)).sort() },
    }),
  },
  {
    method: "PUT",
    pattern: /^\/v1\/account\/me\/avatar$/,
    map: () => ({ name: "account.avatar_updated", properties: { removed: false } }),
  },
  {
    method: "DELETE",
    pattern: /^\/v1\/account\/me\/avatar$/,
    map: () => ({ name: "account.avatar_updated", properties: { removed: true } }),
  },
  {
    method: "POST",
    pattern: /^\/v1\/account\/addresses$/,
    map: ({ responseBody }) => ({
      name: "account.address_added",
      properties: { isDefault: obj(responseBody)["isDefault"] === true },
    }),
  },
  {
    method: "PATCH",
    pattern: new RegExp(`^/v1/account/addresses/${ID}$`),
    map: () => ({ name: "account.address_updated", properties: {} }),
  },
  {
    method: "DELETE",
    pattern: new RegExp(`^/v1/account/addresses/${ID}$`),
    map: () => ({ name: "account.address_deleted", properties: {} }),
  },
  {
    method: "GET",
    pattern: /^\/v1\/account\/export$/,
    map: () => ({ name: "account.data_exported", properties: {} }),
  },
  {
    method: "DELETE",
    pattern: /^\/v1\/account$/,
    map: () => ({ name: "account.deleted", properties: {} }),
  },
];

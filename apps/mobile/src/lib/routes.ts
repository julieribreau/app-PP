// Routes expo-router appelées depuis le code (les liens, pas la navigation déclarée par app/).
export const PRIVACY_ROUTE = "/privacy";
export const SIGN_IN_ROUTE = "/auth/sign-in";
export const SIGN_UP_ROUTE = "/auth/sign-up";
export const FORGOT_PASSWORD_ROUTE = "/auth/forgot-password";
export const SHOP_ROUTE = "/";
export const CART_ROUTE = "/cart";
export const ACCOUNT_ROUTE = "/account";

export const ACCOUNT_ROUTES = {
  profile: "/account/profile",
  addresses: "/account/addresses",
  preferences: "/account/preferences",
  security: "/account/security",
  data: "/account/data",
} as const;

export function productRoute(slug: string) {
  return { pathname: "/product/[slug]" as const, params: { slug } };
}

export function addressRoute(id: string | "new") {
  return { pathname: "/account/address/[id]" as const, params: { id } };
}

// Next n'existe pas dans Storybook (Vite) : navigation simulée, sans effet.
const router = {
  push: () => {},
  replace: () => {},
  refresh: () => {},
  back: () => {},
  forward: () => {},
  prefetch: () => {},
};

export function useRouter() {
  return router;
}
export function usePathname() {
  return "/fr/boutique";
}
export function useSearchParams() {
  return new URLSearchParams();
}
export function useParams() {
  return { locale: "fr" };
}
export function notFound(): never {
  throw new Error("notFound");
}
export function redirect(): never {
  throw new Error("redirect");
}

import * as React from "react";

// Remplace apps/web/src/i18n/navigation.ts (next-intl/navigation) dans Storybook.
type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  locale?: string;
};

export function Link({ href, locale: _locale, ...props }: LinkProps) {
  return <a href={href} {...props} />;
}
export { usePathname, useRouter } from "./next-navigation";
export function redirect(): never {
  throw new Error("redirect");
}
export function getPathname({ href }: { href: string }) {
  return href;
}

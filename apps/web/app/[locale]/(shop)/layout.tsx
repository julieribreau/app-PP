import { useTranslations } from "next-intl";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

// Site public : en-tête et pied de page communs à la vitrine, la boutique, le panier, le compte.
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("common");
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenu" className="sr-only-focusable absolute top-2 left-2 z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground">
        {t("skipToContent")}
      </a>
      <SiteHeader />
      <div id="contenu" className="flex-1">
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}

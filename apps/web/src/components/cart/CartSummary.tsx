import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { Cart } from "@/lib/api/types";
import { formatPrice } from "@/lib/format";

/** Totaux TTC et TVA ; le paiement n'existe pas encore : bouton désactivé, expliqué. */
export function CartSummary({ cart }: { readonly cart: Cart }) {
  const t = useTranslations("cart");
  const locale = useLocale();
  return (
    <aside aria-labelledby="cart-summary" className="flex flex-[1_1_320px] flex-col gap-3.5 rounded-[24px] border border-border bg-card p-6">
      <h2 id="cart-summary" className="display m-0 text-2xl leading-[30px]">{t("summary")}</h2>
      <div className="flex justify-between"><span>{t("subtotal")}</span><span className="font-numeric">{formatPrice(cart.subtotalCents, locale)}</span></div>
      <div className="flex justify-between text-sm text-muted-foreground"><span>{t("vat")}</span><span className="font-numeric">{formatPrice(cart.vatCents, locale)}</span></div>
      <div className="flex justify-between text-sm text-muted-foreground"><span>{t("shipping")}</span><span>{t("shippingLater")}</span></div>
      <div className="flex items-baseline justify-between border-t border-border pt-3.5">
        <span className="font-semibold">{t("total")}</span>
        <span className="font-numeric text-2xl leading-8 font-medium">{formatPrice(cart.totalCents, locale)}</span>
      </div>
      <Button size="lg" disabled aria-describedby="pay-note">{t("checkout")}</Button>
      <p id="pay-note" className="m-0 text-sm text-muted-foreground">{t("checkoutNote")}</p>
    </aside>
  );
}

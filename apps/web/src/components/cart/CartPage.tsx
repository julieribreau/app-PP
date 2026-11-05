"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ErrorNote, Loading } from "@/components/ui/spinner";
import { useCart } from "@/hooks/useCart";
import { useSession } from "@/hooks/useSession";
import { Link } from "@/i18n/navigation";

import { CartLine } from "./CartLine";
import { CartSummary } from "./CartSummary";

function GuestNote() {
  const t = useTranslations("cart");
  return (
    <div role="note" className="flex items-start gap-3 rounded-[14px] bg-secondary px-[18px] py-3.5 text-secondary-foreground">
      <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} />
      <p className="m-0">
        {t("guestNote")} <Link href="/connexion?next=/panier" className="font-semibold underline">{t("guestCta")}</Link> {t("guestNoteEnd")}
      </p>
    </div>
  );
}

/** Panier : lignes, récapitulatif, et l'invitation à se connecter pour un invité. */
export function CartPage() {
  const t = useTranslations("cart");
  const { user, isPending: sessionPending } = useSession();
  const { data: cart, isPending, isError, refetch } = useCart();
  if (isPending) return <Loading />;
  if (isError) return <ErrorNote onRetry={() => void refetch()} />;
  const empty = cart.items.length === 0;
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 pt-10 pb-20 md:px-12">
      <div className="flex flex-col gap-2">
        <span className="overline">{t("items", { count: cart.itemCount })}</span>
        <h1 className="display m-0 text-5xl leading-[52px]">{t("title")}</h1>
      </div>
      {!user && !sessionPending ? <GuestNote /> : null}
      <div role="status" aria-live="polite">
        {cart.adjustments.length ? <p className="m-0 rounded-[14px] bg-accent px-4 py-3 text-accent-foreground">{t("adjusted")}</p> : null}
      </div>
      {empty ? (
        <div className="flex flex-col items-center gap-4 rounded-[24px] border border-border bg-card px-6 py-16 text-center">
          <p className="m-0 text-lg">{t("empty")}</p>
          <Button asChild><Link href="/boutique">{t("emptyCta")}</Link></Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-8">
          <ul className="m-0 min-w-0 flex-[999_1_560px] list-none rounded-[24px] border border-border bg-card px-6">
            {cart.items.map((item) => <CartLine key={item.id} item={item} />)}
            <li className="py-4"><Link href="/boutique" className="font-medium text-primary">{t("continue")}</Link></li>
          </ul>
          <CartSummary cart={cart} />
        </div>
      )}
    </main>
  );
}

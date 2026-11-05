import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

/** Prix TTC en chiffres DM Mono ; « dès » quand les variantes n'ont pas toutes le même prix. */
export function PriceTag({
  cents,
  from = false,
  className,
}: {
  readonly cents: number;
  readonly from?: boolean;
  readonly className?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("common");
  const price = formatPrice(cents, locale);
  return (
    <span className={cn("font-numeric text-lg leading-6 font-medium", className)}>
      {from ? t("priceFrom", { price }) : price}
    </span>
  );
}

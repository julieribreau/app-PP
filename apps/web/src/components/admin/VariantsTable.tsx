"use client";

import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { AdminVariant } from "@/lib/api/types";
import { centsToInput, parsePriceInput } from "@/lib/format";

function state(v: AdminVariant): {
  key: "inStock" | "low" | "out" | "disabled";
  tone: "success" | "warning" | "muted";
} {
  if (!v.isActive) return { key: "disabled", tone: "muted" };
  if (v.stock === 0) return { key: "out", tone: "muted" };
  if (v.stock !== null && v.stock <= 5) return { key: "low", tone: "warning" };
  return { key: "inStock", tone: "success" };
}

/** Une ligne par combinaison : active, SKU, prix propre (vide = prix du produit), stock (vide = illimité). */
export function VariantsTable({
  variants,
  onChange,
}: {
  readonly variants: AdminVariant[];
  readonly onChange: (variants: AdminVariant[]) => void;
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const patch = (id: string, p: Partial<AdminVariant>) =>
    onChange(variants.map((v) => (v.id === id ? { ...v, ...p } : v)));
  const th =
    "border-b border-border px-3 py-2.5 text-left font-numeric text-xs font-medium tracking-[.06em] whitespace-nowrap text-muted-foreground uppercase";
  const td = "border-b border-border px-3 py-2.5 align-middle whitespace-nowrap";
  return (
    <div className="border-border overflow-x-auto rounded-[14px] border">
      <table className="w-full min-w-[720px] border-collapse text-[15px]">
        <caption className="sr-only">{t("variants")}</caption>
        <thead>
          <tr>
            {["active", "variant", "sku", "price", "stock", "state"].map((k) => (
              <th key={k} scope="col" className={th}>
                {t(`col.${k}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => {
            const s = state(v);
            return (
              <tr key={v.id}>
                <td className={td}>
                  <Switch
                    checked={v.isActive}
                    onCheckedChange={(isActive) => patch(v.id, { isActive })}
                    aria-label={t("variantActive", { label: v.label })}
                  />
                </td>
                <td className={td}>{v.label || "—"}</td>
                <td className={td}>
                  <Input
                    aria-label={t("variantSku", { label: v.label })}
                    className="font-numeric h-[34px] w-36 text-[13px]"
                    defaultValue={v.sku ?? ""}
                    onBlur={(e) => patch(v.id, { sku: e.target.value.trim() || null })}
                  />
                </td>
                <td className={td}>
                  <Input
                    aria-label={t("variantPrice", { label: v.label })}
                    inputMode="decimal"
                    className="font-numeric h-[34px] w-[110px]"
                    defaultValue={centsToInput(v.priceCents, locale)}
                    onBlur={(e) => patch(v.id, { priceCents: parsePriceInput(e.target.value) })}
                  />
                </td>
                <td className={td}>
                  <Input
                    aria-label={t("variantStock", { label: v.label })}
                    inputMode="numeric"
                    className="font-numeric h-[34px] w-20"
                    defaultValue={v.stock ?? ""}
                    onBlur={(e) =>
                      patch(v.id, {
                        stock:
                          e.target.value.trim() === ""
                            ? null
                            : Math.max(0, Math.floor(Number(e.target.value)) || 0),
                      })
                    }
                  />
                </td>
                <td className={td}>
                  <Badge tone={s.tone}>{t(`variantState.${s.key}`)}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";

import type { ProductDetail } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { isValueOffered, type Selection } from "@/lib/variants";

/** Un groupe de pastilles par axe (saveur, format) ; la valeur choisie est annoncée dans la légende. */
export function VariantPicker({
  product,
  selection,
  onSelect,
}: {
  readonly product: ProductDetail;
  readonly selection: Selection;
  readonly onSelect: (optionId: string, valueId: string) => void;
}) {
  const t = useTranslations("product");
  return (
    <>
      {product.options.map((option) => {
        const chosen = option.values.find((v) => v.id === selection[option.id]);
        return (
          <fieldset key={option.id} className="m-0 flex flex-col gap-2.5 border-0 p-0">
            <legend className="mb-2.5 text-sm font-medium">
              {chosen ? t("option", { name: option.name, value: chosen.label }) : option.name}
            </legend>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const on = value.id === selection[option.id];
                const offered = isValueOffered(product, selection, option.id, value.id);
                return (
                  <button
                    key={value.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onSelect(option.id, value.id)}
                    className={cn(
                      "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-input px-[18px] text-[15px] font-medium",
                      on && "border-foreground bg-foreground text-background",
                      !offered && !on && "text-muted-foreground line-through decoration-1",
                    )}
                  >
                    {value.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </>
  );
}

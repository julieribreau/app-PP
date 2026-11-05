"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";

export interface QuantityStepperProps {
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly max?: number;
  readonly min?: number;
  /** Nom accessible du groupe (« Quantité de Avoine & cacao »). */
  readonly label?: string;
  readonly size?: "md" | "sm";
  readonly disabled?: boolean;
}

/** − quantité + ; bornée entre min et max (stock), la valeur est annoncée à chaque changement. */
export function QuantityStepper({ value, onChange, max = 99, min = 1, label, size = "md", disabled }: QuantityStepperProps) {
  const t = useTranslations("product");
  const btn = cn(
    "inline-flex cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40",
    size === "md" ? "size-11" : "size-10",
  );
  return (
    <div
      role="group"
      aria-label={label ?? t("quantity")}
      className={cn("inline-flex items-center rounded-full border border-input", size === "md" ? "h-12" : "h-10")}
    >
      <button type="button" className={btn} aria-label={t("decrease")} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus aria-hidden="true" className="size-4" strokeWidth={2} />
      </button>
      <output aria-live="polite" className="min-w-8 text-center font-numeric">
        {value}
      </output>
      <button type="button" className={btn} aria-label={t("increase")} disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}

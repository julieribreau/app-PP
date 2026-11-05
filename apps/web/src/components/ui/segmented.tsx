"use client";

import { RadioGroup as R } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/cn";

interface SegmentedProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly options: readonly { value: T; label: string }[];
  readonly onChange: (value: T) => void;
  readonly className?: string;
}

/** Choix exclusif en pastilles (langue, thème) : un groupe de boutons radio au clavier. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedProps<T>) {
  return (
    <R.Root
      aria-label={label}
      value={value}
      onValueChange={(v) => onChange(v as T)}
      orientation="horizontal"
      className={cn("bg-muted inline-flex w-fit gap-1 rounded-full p-1", className)}
    >
      {options.map((option) => (
        <R.Item
          key={option.value}
          value={option.value}
          className="text-foreground data-[state=checked]:bg-card data-[state=checked]:ring-input h-10 cursor-pointer rounded-full px-4 text-sm font-medium data-[state=checked]:shadow-[0_1px_2px_rgba(42,29,22,.12)] data-[state=checked]:ring-1"
        >
          {option.label}
        </R.Item>
      ))}
    </R.Root>
  );
}

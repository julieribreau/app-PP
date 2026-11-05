"use client";

import { Switch as S } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/cn";

/** Interrupteur (variante active ou non) : role="switch", état lu par les lecteurs d'écran. */
export function Switch({ className, ...props }: S.SwitchProps) {
  return (
    <S.Root
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full bg-input transition-colors data-[state=checked]:bg-success",
        className,
      )}
      {...props}
    >
      <S.Thumb className="block size-[18px] translate-x-[3px] rounded-full bg-card transition-transform data-[state=checked]:translate-x-[19px]" />
    </S.Root>
  );
}

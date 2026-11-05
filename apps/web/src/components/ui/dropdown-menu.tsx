"use client";

import { DropdownMenu as M } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/cn";

// Menu déroulant Radix : flèches, Entrée, Échap au clavier (RGAA 7.3).
export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;

export function DropdownMenuContent({ className, ...props }: M.DropdownMenuContentProps) {
  return (
    <M.Portal>
      <M.Content
        sideOffset={6}
        align="end"
        className={cn(
          "z-50 min-w-48 rounded-[14px] border border-border bg-popover p-1 text-popover-foreground shadow-[0_4px_16px_rgba(42,29,22,.12)]",
          className,
        )}
        {...props}
      />
    </M.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: M.DropdownMenuItemProps) {
  return (
    <M.Item
      className={cn(
        "flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] px-3 text-sm outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuRadioGroup(props: M.DropdownMenuRadioGroupProps) {
  return <M.RadioGroup {...props} />;
}

export function DropdownMenuRadioItem({ className, children, ...props }: M.DropdownMenuRadioItemProps) {
  return (
    <M.RadioItem
      className={cn(
        "flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-[10px] px-3 text-sm outline-none select-none data-[highlighted]:bg-muted data-[state=checked]:font-semibold",
        className,
      )}
      {...props}
    >
      {children}
      <M.ItemIndicator aria-hidden="true">•</M.ItemIndicator>
    </M.RadioItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: M.DropdownMenuLabelProps) {
  return <M.Label className={cn("px-3 py-2 eyebrow", className)} {...props} />;
}

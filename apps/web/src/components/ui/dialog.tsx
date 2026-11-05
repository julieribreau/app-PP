"use client";

import { X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { useTranslations } from "next-intl";
import * as React from "react";

import { cn } from "@/lib/cn";

// Fenêtre modale Radix : focus piégé, Échap, retour du focus au déclencheur (RGAA 7.1, 12.8).
export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
}: {
  readonly title: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  const t = useTranslations("common");
  return (
    <D.Portal>
      <D.Overlay className="bg-foreground/40 fixed inset-0 z-40" />
      <D.Content
        className={cn(
          "border-border bg-card text-card-foreground fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-[24px] border p-6",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <D.Title className="display m-0 text-2xl leading-[30px]">{title}</D.Title>
          <D.Close
            aria-label={t("close")}
            className="hover:bg-muted inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full"
          >
            <X aria-hidden="true" className="size-5" />
          </D.Close>
        </div>
        {description ? (
          <D.Description className="text-muted-foreground m-0">{description}</D.Description>
        ) : (
          <D.Description className="sr-only">{title}</D.Description>
        )}
        {children}
      </D.Content>
    </D.Portal>
  );
}

import * as React from "react";

import { cn } from "@/lib/cn";

// Champ : bord `input` (3:1), fond `card`, 44 px. Erreur signalée par aria-invalid.
export const inputClass =
  "h-11 w-full rounded-[14px] border border-input bg-card px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-muted aria-[invalid=true]:border-destructive";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputClass, "pr-8", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "h-auto min-h-24 py-2", className)} {...props} />;
}

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/cn";

// Un ou deux mots d'état ; la couleur porte un sens et le mot reste toujours écrit (RGAA 3.1).
const badgeVariants = cva(
  "inline-flex h-[22px] items-center rounded-[8px] px-2 text-xs leading-5 font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
        muted: "bg-muted text-muted-foreground",
        accent: "bg-accent text-accent-foreground",
        info: "bg-info text-info-foreground",
        danger: "bg-destructive text-destructive-foreground",
        strong: "bg-foreground text-background",
        soft: "bg-secondary text-secondary-foreground",
      },
    },
    defaultVariants: { tone: "muted" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

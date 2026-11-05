import * as React from "react";

import { cn } from "@/lib/cn";

/** Surface `card`, filet `border`, rayon 24 px (des filets, pas des ombres). */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[24px] border border-border bg-card text-card-foreground", className)} {...props} />;
}

export function SectionTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("display m-0 text-2xl leading-[30px]", className)} {...props} />;
}

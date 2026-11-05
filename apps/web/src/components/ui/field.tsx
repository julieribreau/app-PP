import * as React from "react";

import { cn } from "@/lib/cn";

interface FieldProps {
  readonly id: string;
  readonly label: React.ReactNode;
  readonly help?: React.ReactNode;
  readonly error?: React.ReactNode;
  readonly className?: string;
  /** Le contrôle, qui reçoit id, aria-describedby et aria-invalid. */
  readonly children: React.ReactElement<Record<string, unknown>>;
}

/** Libellé toujours visible, aide ou erreur reliées au champ (RGAA 11.1, 11.10). */
export function Field({ id, label, help, error, className, children }: FieldProps) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const control = React.cloneElement(children, {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  });
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm leading-5 font-medium">
        {label}
      </label>
      {control}
      {help ? (
        <span id={helpId} className="text-sm leading-5 text-muted-foreground">
          {help}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="text-sm leading-5 text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}

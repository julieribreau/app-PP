import { useTranslations } from "next-intl";

/** Chargement annoncé aux lecteurs d'écran. */
export function Loading({ className }: { readonly className?: string }) {
  const t = useTranslations("common");
  return (
    <p role="status" className={className ?? "py-12 text-center text-muted-foreground"}>
      {t("loading")}
    </p>
  );
}

export function ErrorNote({ message, onRetry }: { readonly message?: string; readonly onRetry?: () => void }) {
  const t = useTranslations("common");
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="m-0 text-destructive">{message ?? t("error")}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="cursor-pointer font-medium text-primary underline">
          {t("retry")}
        </button>
      ) : null}
    </div>
  );
}

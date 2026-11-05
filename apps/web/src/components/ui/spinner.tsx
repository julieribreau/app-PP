import { useTranslations } from "next-intl";

/** Chargement annoncé aux lecteurs d'écran. */
export function Loading({ className }: { readonly className?: string }) {
  const t = useTranslations("common");
  return (
    <p role="status" className={className ?? "text-muted-foreground py-12 text-center"}>
      {t("loading")}
    </p>
  );
}

export function ErrorNote({
  message,
  onRetry,
}: {
  readonly message?: string;
  readonly onRetry?: () => void;
}) {
  const t = useTranslations("common");
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-destructive m-0">{message ?? t("error")}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-primary cursor-pointer font-medium underline"
        >
          {t("retry")}
        </button>
      ) : null}
    </div>
  );
}

import { useTranslations } from "next-intl";

// Bandeau de préprod : qui teste sait qu'il n'est pas en production. Lu dans APP_ENV
// (NEXT_PUBLIC_APP_ENV, figé au build), jamais dans NODE_ENV, qui vaut `production` dans
// toutes les images. Styles via tokens du design system, jamais de couleur en dur.
export function PreprodBanner({ appEnv }: { appEnv: string | undefined }) {
  const t = useTranslations("env");
  if (appEnv !== "preprod") return null;
  return (
    <div role="note" className="preprod-banner">
      {t("preprod")}
    </div>
  );
}

import { useTranslations } from "next-intl";
import { ExampleCard } from "@/components/example/ExampleCard";

// Page d'accueil — strings via i18n (jamais de texte hardcodé, cf conventions-code).
export default function HomePage() {
  const t = useTranslations("home");
  return (
    <main>
      <h1>{t("title")}</h1>
      <p>{t("welcome")}</p>
      <ExampleCard title={t("card.title")} description={t("card.description")} />
    </main>
  );
}

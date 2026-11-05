import { useTranslations } from "next-intl";

export type LegalDoc = "mentions" | "privacy" | "terms" | "cookies";

interface Section {
  title: string;
  body: string;
}

/** Gabarit d'une page légale : sections tirées du dictionnaire, [À COMPLÉTER] là où l'éditeur doit répondre. */
export function LegalPage({ doc }: { readonly doc: LegalDoc }) {
  const t = useTranslations("legal");
  const sections = t.raw(`${doc}.sections`) as Record<string, Section>;
  return (
    <main className="mx-auto flex max-w-[760px] flex-col gap-8 px-6 pt-12 pb-20">
      <div className="flex flex-col gap-3">
        <span className="eyebrow">{t("updated")}</span>
        <h1 className="display m-0 text-[44px] leading-[48px]">{t(`${doc}.title`)}</h1>
        <p className="bg-accent text-accent-foreground m-0 rounded-[14px] px-4 py-3">
          {t("draftNote")}
        </p>
      </div>
      {Object.entries(sections).map(([id, section]) => (
        <section key={id} aria-labelledby={`legal-${id}`} className="flex flex-col gap-2">
          <h2 id={`legal-${id}`} className="m-0 text-xl leading-7 font-semibold">
            {section.title}
          </h2>
          <p className="text-muted-foreground m-0 whitespace-pre-line">{section.body}</p>
        </section>
      ))}
    </main>
  );
}

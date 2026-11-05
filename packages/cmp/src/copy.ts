/**
 * Les textes du bandeau et du gestionnaire. Ils viennent du dictionnaire de l'app
 * (`packages/i18n`, clé `consent`), qu'un tenant peut surcharger : rien n'est écrit ici.
 * `{date}` est remplacé par la date du choix, dans la langue de la page.
 */
export interface ConsentCopy {
  readonly banner: {
    readonly title: string;
    readonly body: string;
    readonly accept: string;
    readonly reject: string;
    readonly customize: string;
    readonly policy: string;
  };
  readonly manager: {
    readonly title: string;
    readonly intro: string;
    readonly required: string;
    readonly acceptAll: string;
    readonly rejectAll: string;
    readonly save: string;
    /** Annoncé aux lecteurs d'écran une fois le choix enregistré. */
    readonly saved: string;
    readonly close: string;
    readonly savedOn: string;
    readonly acceptedOn: string;
    readonly refusedOn: string;
  };
  readonly purposes: Readonly<
    Record<string, { readonly label: string; readonly description: string }>
  >;
  readonly settingsLink: string;
}

export function purposeText(
  copy: ConsentCopy,
  id: string,
): { readonly label: string; readonly description: string } {
  return copy.purposes[id] ?? { label: id, description: "" };
}

/** `Choix enregistré le {date}.` → `Choix enregistré le 5 octobre 2026 à 14:30.` */
export function withDate(template: string, iso: string, locale: string): string {
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(
    new Date(iso),
  );
  return template.replace("{date}", date);
}

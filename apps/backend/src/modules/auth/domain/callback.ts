/**
 * Destination d'un lien d'e-mail Better Auth quand le client n'en a pas donné.
 *
 * Better Auth renvoie le lien de vérification à chaque connexion refusée faute d'e-mail
 * confirmé (`sendOnSignIn`) ; la connexion ne porte pas de `callbackURL` (il détournerait la
 * redirection après une connexion réussie), le lien retomberait donc sur `/`, l'accueil, sans
 * dire que l'adresse est confirmée. On l'envoie sur la page de confirmation du site, dans la
 * langue de l'usager ; un changement d'e-mail ramène à l'espace personnel.
 */
export function withDefaultCallback(
  url: string,
  webUrl: string,
  locale: string,
  kind: "verifyEmail" | "changeEmail",
): string {
  const parsed = new URL(url);
  const current = parsed.searchParams.get("callbackURL");
  if (current && current !== "/") return url;
  const base = webUrl.replace(/\/$/, "");
  const target =
    kind === "changeEmail" ? `${base}/${locale}/compte` : `${base}/${locale}/verifier-email?ok=1`;
  parsed.searchParams.set("callbackURL", target);
  return parsed.toString();
}

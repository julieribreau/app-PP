/**
 * Destination d'un lien d'e-mail Better Auth quand le client n'en a pas donné.
 *
 * Better Auth renvoie le lien de vérification à chaque connexion refusée faute d'e-mail
 * confirmé (`sendOnSignIn`) ; la connexion ne porte pas de `callbackURL` (il détournerait la
 * redirection après une connexion réussie), le lien retomberait donc sur `/`, l'accueil, sans
 * dire que l'adresse est confirmée. On l'envoie sur la page de confirmation du site, dans la
 * langue de l'usager ; un changement d'e-mail ramène à l'espace personnel. Même règle pour le
 * lien de réinitialisation demandé depuis l'app mobile, qui n'a pas d'écran pour le jeton.
 */
export function withDefaultCallback(
  url: string,
  webUrl: string,
  locale: string,
  kind: "verifyEmail" | "changeEmail" | "resetPassword",
): string {
  const parsed = new URL(url);
  const current = parsed.searchParams.get("callbackURL");
  // Une destination web donnée par le client est gardée ; « / », rien, ou un lien vers l'app
  // (nutrion://, sans écran pour ces étapes) mènent à la page du site.
  if (current && current !== "/" && /^https?:\/\//.test(current)) return url;
  const base = webUrl.replace(/\/$/, "");
  const target = {
    changeEmail: `${base}/${locale}/compte`,
    verifyEmail: `${base}/${locale}/verifier-email?ok=1`,
    resetPassword: `${base}/${locale}/reinitialiser-mot-de-passe`,
  }[kind];
  parsed.searchParams.set("callbackURL", target);
  return parsed.toString();
}

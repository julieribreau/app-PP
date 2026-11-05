import { authClient } from "@/lib/auth/auth-client";

/**
 * Demande de réinitialisation depuis l'app. Pas de `redirectTo` vers l'app : elle n'a pas
 * d'écran pour saisir le nouveau mot de passe (un lien nutrion:// tombait dans le vide). Le
 * backend fait alors pointer le lien de l'e-mail vers la page du site, dans la langue de
 * l'usager, qui marche sur téléphone comme sur ordinateur.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await authClient.requestPasswordReset({ email: email.trim() });
}

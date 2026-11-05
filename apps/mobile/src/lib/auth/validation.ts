// Règles des formulaires d'accès, alignées sur le backend (contrat §Authentification).

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** 12 caractères minimum, dont un chiffre. */
export function isStrongPassword(value: string): boolean {
  return value.length >= 12 && /\d/.test(value);
}

export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

/**
 * Corps de l'inscription Better Auth. La langue de l'app part avec : le backend écrit dans
 * celle-ci l'e-mail de confirmation (et les suivants). Sans elle, un usager de l'app en anglais
 * recevait tout en français (valeur par défaut du champ `locale`).
 */
export function signUpPayload(input: SignUpInput, locale: string) {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  return {
    email: input.email.trim(),
    password: input.password,
    name: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    locale,
  };
}

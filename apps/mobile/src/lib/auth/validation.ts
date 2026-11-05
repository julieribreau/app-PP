// Règles des formulaires d'accès, alignées sur le backend (contrat §Authentification).

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** 12 caractères minimum, dont un chiffre. */
export function isStrongPassword(value: string): boolean {
  return value.length >= 12 && /\d/.test(value);
}

// Session simulée du catalogue mobile : `window.__storySession` (posé par la story) dit si
// l'usager est connecté. Aucune requête vers Better Auth.
type StoryWindow = Window & { __storySession?: { user: { id: string; email: string } } | null };

export type AuthErrorKind = "invalidCredentials" | "locked" | "emailNotVerified" | "generic";

export function useSession() {
  return { data: (window as StoryWindow).__storySession ?? null, isPending: false };
}

export function useAuthActions() {
  const noop = async () => ({ ok: true as const });
  return {
    signIn: noop,
    signUp: noop,
    signOut: async () => undefined,
    requestPasswordReset: async () => undefined,
  };
}

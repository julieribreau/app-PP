import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { mergeGuestCart } from "@/hooks/cart/useCart";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query";
import { authClient } from "@/lib/auth/auth-client";
import { authErrorKind, type AuthErrorKind } from "@/lib/auth/errors";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import { signUpPayload, type SignUpInput } from "@/lib/auth/validation";
import { useCartNoticeStore } from "@/stores/cart-notice.store";
import { usePrefsStore } from "@/stores/prefs.store";

// Session Better Auth et parcours de connexion. Après une connexion réussie : panier invité
// fusionné (contrat §Fusion), compte mémorisé pour l'écran « Bon retour ».

export const useSession = authClient.useSession;
export type { AuthErrorKind };

export interface SignInResult {
  ok: boolean;
  error?: AuthErrorKind;
  merged?: boolean;
}

export function useAuthActions() {
  const client = useQueryClient();
  const rememberAccount = usePrefsStore((s) => s.rememberAccount);
  const forgetAccount = usePrefsStore((s) => s.forgetAccount);

  const afterSignIn = React.useCallback(async (): Promise<boolean> => {
    let merged = false;
    try {
      const cart = await mergeGuestCart();
      merged = cart.merged;
      useCartNoticeStore.getState().setMerged(merged);
      client.setQueryData(queryKeys.cart, cart);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
    }
    await client.invalidateQueries({ queryKey: queryKeys.me });
    return merged;
  }, [client]);

  const signIn = React.useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      const { data, error } = await authClient.signIn.email({ email: email.trim(), password });
      if (error || !data) return { ok: false, error: authErrorKind(error) };
      const user = data.user as { email: string; firstName?: string | null };
      rememberAccount({ firstName: user.firstName ?? null, email: user.email });
      const merged = await afterSignIn();
      return { ok: true, merged };
    },
    [afterSignIn, rememberAccount],
  );

  const signUp = React.useCallback(async (input: SignUpInput) => {
    const { error } = await authClient.signUp.email(
      signUpPayload(input, usePrefsStore.getState().locale),
    );
    return error
      ? { ok: false as const, error: authErrorKind(error), message: error.message }
      : { ok: true as const };
  }, []);

  const signOut = React.useCallback(
    async (opts: { forget?: boolean } = {}) => {
      await authClient.signOut();
      if (opts.forget) forgetAccount();
      useCartNoticeStore.getState().setMerged(false);
      client.removeQueries({ queryKey: queryKeys.me });
      client.removeQueries({ queryKey: queryKeys.addresses });
      client.setQueryData(queryKeys.cart, undefined);
      await client.invalidateQueries({ queryKey: queryKeys.cart });
    },
    [client, forgetAccount],
  );

  return { signIn, signUp, signOut, requestPasswordReset };
}

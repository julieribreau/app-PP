import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, screen } from "@testing-library/react-native";

import { usePrefsStore } from "@/stores/prefs.store";
import type * as mockApi from "@/test/api-mock";
import { renderWithProviders } from "@/test/render";

import { SignInForm } from "./SignInScreen";

jest.mock("expo-router", () => ({
  router: jest.requireActual<typeof mockApi>("@/test/api-mock").routerMock,
}));
jest.mock("@/hooks/auth/useSession", () => ({
  useAuthActions: () => ({ signIn: jest.fn(async () => ({ ok: true })) }),
}));

describe("formulaire de connexion", () => {
  it("passe de l'e-mail au mot de passe par la touche « Suivant »", async () => {
    usePrefsStore.setState({ locale: "fr" });
    await renderWithProviders(<SignInForm onSignedIn={() => undefined} />);
    const email = screen.getByTestId("sign-in-email");
    // Le clavier garde la main (pas de fermeture) et « Suivant » ne soumet pas le formulaire.
    expect(email.props.returnKeyType).toBe("next");
    expect(email.props.submitBehavior).toBe("submit");
    await fireEvent(email, "submitEditing");
    expect(screen.queryByText("Ce champ est obligatoire.")).toBeNull();
    expect(screen.getByTestId("sign-in-password").props.returnKeyType).toBe("go");
  });
});

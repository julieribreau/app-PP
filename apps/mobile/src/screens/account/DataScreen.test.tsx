import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import { usePrefsStore } from "@/stores/prefs.store";
import type * as mockApi from "@/test/api-mock";
import { renderWithProviders } from "@/test/render";

import { DataScreen } from "./DataScreen";

const mockDeleteMyAccount = jest.fn(async (_word: string) => undefined);
const mockSignOut = jest.fn(async () => undefined);

jest.mock("expo-router", () => ({
  router: jest.requireActual<typeof mockApi>("@/test/api-mock").routerMock,
}));
jest.mock("@/hooks/account/useAccount", () => ({
  deleteMyAccount: (word: string) => mockDeleteMyAccount(word),
  exportMyData: jest.fn(),
}));
jest.mock("@/hooks/auth/useSession", () => ({ useAuthActions: () => ({ signOut: mockSignOut }) }));

describe("mes données", () => {
  beforeEach(() => {
    usePrefsStore.setState({ locale: "fr" });
    mockDeleteMyAccount.mockClear();
  });

  it("confirme la suppression du compte une fois faite", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    await renderWithProviders(<DataScreen />);
    expect(screen.getByTestId("data-delete")).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId("data-delete-confirm"), "SUPPRIMER");
    await fireEvent.press(screen.getByTestId("data-delete"));
    await waitFor(() => expect(alert).toHaveBeenCalledWith("Votre compte a été supprimé."));
    expect(mockDeleteMyAccount).toHaveBeenCalledWith("SUPPRIMER");
    expect(mockSignOut).toHaveBeenCalled();
  });
});

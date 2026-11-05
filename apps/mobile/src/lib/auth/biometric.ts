import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

// Déverrouillage biométrique LOCAL (contrat §Authentification) : il protège la session déjà
// gardée dans le trousseau, ce n'est pas un facteur serveur.

export type BiometricKind = "faceId" | "touchId" | "fingerprint";

export interface BiometricSupport {
  available: boolean;
  kind: BiometricKind;
}

/** Type de capteur → libellé : Face ID / Touch ID sur iPhone, empreinte ou visage ailleurs. */
export function biometricKind(
  types: readonly LocalAuthentication.AuthenticationType[],
  os: string = Platform.OS,
): BiometricKind {
  const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  if (os === "ios") return face ? "faceId" : "touchId";
  return face && !types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT) ? "faceId" : "fingerprint";
}

export async function biometricSupport(): Promise<BiometricSupport> {
  const [hardware, enrolled, types] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);
  return { available: hardware && enrolled, kind: biometricKind(types) };
}

export async function authenticate(promptMessage: string, cancelLabel: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel,
    disableDeviceFallback: false,
  });
  return result.success;
}

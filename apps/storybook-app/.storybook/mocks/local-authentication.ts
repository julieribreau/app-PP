// Capteur simulé du catalogue : Face ID présent et configuré, authentification refusée.
export enum AuthenticationType {
  FINGERPRINT = 1,
  FACIAL_RECOGNITION = 2,
  IRIS = 3,
}
export const hasHardwareAsync = async () => true;
export const isEnrolledAsync = async () => true;
export const supportedAuthenticationTypesAsync = async () => [
  AuthenticationType.FACIAL_RECOGNITION,
];
export const authenticateAsync = async () => ({ success: false, error: "user_cancel" });

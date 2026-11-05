import { describe, expect, it } from "@jest/globals";
import { AuthenticationType } from "expo-local-authentication";

import { biometricKind } from "./biometric";

describe("biometricKind", () => {
  it("dit Face ID ou Touch ID sur iPhone", () => {
    expect(biometricKind([AuthenticationType.FACIAL_RECOGNITION], "ios")).toBe("faceId");
    expect(biometricKind([AuthenticationType.FINGERPRINT], "ios")).toBe("touchId");
  });

  it("dit l'empreinte sur Android dès qu'un lecteur existe", () => {
    expect(biometricKind([AuthenticationType.FINGERPRINT, AuthenticationType.FACIAL_RECOGNITION], "android")).toBe("fingerprint");
    expect(biometricKind([AuthenticationType.FACIAL_RECOGNITION], "android")).toBe("faceId");
  });
});

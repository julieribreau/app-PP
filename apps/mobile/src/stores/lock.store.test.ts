import { describe, expect, it } from "vitest";

import { initialLockStatus, useLockStore } from "./lock.store";

describe("verrou biométrique au lancement", () => {
  it("ne verrouille que si une session est gardée et l'option activée", () => {
    expect(initialLockStatus({ biometricEnabled: true, hasStoredSession: true })).toBe("locked");
    expect(initialLockStatus({ biometricEnabled: true, hasStoredSession: false })).toBe("unlocked");
    expect(initialLockStatus({ biometricEnabled: false, hasStoredSession: true })).toBe("unlocked");
  });

  it("part de « checking » puis se déverrouille", () => {
    expect(useLockStore.getState().status).toBe("checking");
    useLockStore.getState().lock();
    expect(useLockStore.getState().status).toBe("locked");
    useLockStore.getState().unlock();
    expect(useLockStore.getState().status).toBe("unlocked");
  });
});

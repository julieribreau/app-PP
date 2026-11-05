import { create } from "zustand";

// Verrou de l'app au lancement : `checking` tant qu'on ne sait pas s'il faut demander la
// biométrie, `locked` si une session est gardée et le déverrouillage activé.
export type LockStatus = "checking" | "locked" | "unlocked";

interface LockState {
  status: LockStatus;
  lock: () => void;
  unlock: () => void;
}

export const useLockStore = create<LockState>((set) => ({
  status: "checking",
  lock: () => set({ status: "locked" }),
  unlock: () => set({ status: "unlocked" }),
}));

/** Décision au lancement, pure : testée sous Vitest. */
export function initialLockStatus(input: { biometricEnabled: boolean; hasStoredSession: boolean }): LockStatus {
  return input.biometricEnabled && input.hasStoredSession ? "locked" : "unlocked";
}

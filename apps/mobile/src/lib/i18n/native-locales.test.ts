import { describe, expect, it } from "vitest";

import en from "../../../locales/en.json";
import fr from "../../../locales/fr.json";

// Textes système d'iOS (demandes d'autorisation) : chaque langue de l'app les traduit tous.
describe("textes natifs d'iOS", () => {
  it("existent en français et en anglais, pour les mêmes clés", () => {
    expect(Object.keys(en.ios).sort()).toEqual(Object.keys(fr.ios).sort());
    expect(en.ios.NSFaceIDUsageDescription).toMatch(/Face ID/);
    expect(en.ios.NSFaceIDUsageDescription).not.toBe(fr.ios.NSFaceIDUsageDescription);
    expect(en.ios.NSPhotoLibraryUsageDescription).not.toBe(fr.ios.NSPhotoLibraryUsageDescription);
  });
});

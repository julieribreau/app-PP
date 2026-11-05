import { describe, expect, it } from "vitest";

import { checkImage } from "./image-check";

const file = (bytes: number[], size = bytes.length) => ({ buffer: Buffer.from(bytes), size });

describe("checkImage", () => {
  it("reconnaît PNG, JPEG et WebP à leur contenu", () => {
    expect(checkImage(file([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]), 100).ext).toBe(
      "png",
    );
    expect(checkImage(file([0xff, 0xd8, 0xff, 0xe0]), 100).type).toBe("image/jpeg");
    const webp = [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBPVP8 ")];
    expect(checkImage(file(webp), 100).ext).toBe("webp");
  });

  it("refuse l'absence de fichier, un contenu qui n'est pas une image et un fichier trop lourd", () => {
    expect(() => checkImage(undefined, 100)).toThrow(/manquant/);
    expect(() => checkImage(file([...Buffer.from("<svg>")]), 100)).toThrow(/JPG, PNG ou WebP/);
    expect(() => checkImage(file([0x89, 0x50], 101), 100)).toThrow(/2 Mo/);
  });
});

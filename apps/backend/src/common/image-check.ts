import { AppError, badRequest } from "./app-error";

/** Signatures (premiers octets) des formats d'image acceptés : on ne croit pas l'en-tête du client. */
const SIGNATURES: { ext: string; type: string; test: (b: Buffer) => boolean }[] = [
  {
    ext: "png",
    type: "image/png",
    test: (b) =>
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  { ext: "jpg", type: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: "webp",
    type: "image/webp",
    test: (b) =>
      b.subarray(0, 4).toString("latin1") === "RIFF" &&
      b.subarray(8, 12).toString("latin1") === "WEBP",
  },
];

/**
 * Vérifie une image envoyée (photo de profil, photo produit) : présente, de taille raisonnable, et
 * réellement un JPG, PNG ou WebP d'après son contenu. Renvoie l'extension et le type à stocker.
 */
export function checkImage(
  file: { buffer: Buffer; size: number } | undefined,
  maxBytes: number,
): { ext: string; type: string } {
  if (!file) throw badRequest("FILE_REQUIRED", "Fichier manquant");
  if (file.size > maxBytes) throw new AppError(413, "PAYLOAD_TOO_LARGE", "2 Mo maximum");
  const match = SIGNATURES.find((s) => s.test(file.buffer));
  if (!match) throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "JPG, PNG ou WebP uniquement");
  return { ext: match.ext, type: match.type };
}

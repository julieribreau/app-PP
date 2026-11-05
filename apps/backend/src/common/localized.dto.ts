import { z } from "zod";

/** Texte traduit saisi au back-office : le français est obligatoire. */
export const localizedTextSchema = z.object({
  fr: z.string().trim().min(1).max(5000),
  en: z.string().trim().max(5000).optional(),
});

export const optionalLocalizedTextSchema = z.object({
  fr: z.string().trim().max(5000),
  en: z.string().trim().max(5000).optional(),
});

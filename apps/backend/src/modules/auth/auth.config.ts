import { z } from "zod";

import { parseEnvSlice } from "../../config/env";

// Tranche d'env de l'authentification (Better Auth).
const AuthEnv = z
  .object({
    APP_ENV: z.enum(["development", "preprod", "production"]).default("development"),
    BETTER_AUTH_SECRET: z.string().min(8),
    // Adresse publique du backend (sans le chemin /v1/auth).
    BETTER_AUTH_URL: z.url().default("http://localhost:3001"),
    // Site web : liens des e-mails, origine de confiance, redirections après vérification.
    WEB_URL: z.url().default("http://localhost:3000"),
    // Origines de confiance supplémentaires, séparées par des virgules (Expo web en dev…).
    TRUSTED_ORIGINS: z.string().default(""),
  })
  .refine((env) => env.APP_ENV === "development" || env.BETTER_AUTH_SECRET.length >= 32, {
    path: ["BETTER_AUTH_SECRET"],
    message: "32 caractères au moins hors développement",
  });

export type AuthConfig = z.infer<typeof AuthEnv>;
export const loadAuthConfig = () => parseEnvSlice("auth", AuthEnv);

/** Chemin de montage de Better Auth dans l'API. */
export const AUTH_BASE_PATH = "/v1/auth";

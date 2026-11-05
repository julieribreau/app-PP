import { z } from "zod";

import { parseEnvSlice } from "../../config/env";

// Tranche d'env du stockage objet : Scaleway Object Storage en préprod/prod, adobe/s3mock
// en dev (style chemin obligatoire, tout identifiant accepté).
const StorageEnv = z.object({
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().default("fr-par"),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("true"),
});

export type StorageConfig = z.infer<typeof StorageEnv>;
export const loadStorageConfig = () => parseEnvSlice("storage", StorageEnv);

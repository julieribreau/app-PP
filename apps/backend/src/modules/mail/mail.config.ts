import { z } from "zod";

import { parseEnvSlice } from "../../config/env";

// Brevo dès que BREVO_API_KEY est une vraie clé ; sinon SMTP (Mailpit en dev, port 1025).
const MailEnv = z.object({
  MAIL_FROM: z.string().default("NutrionApp <bonjour@nutrion.local>"),
  BREVO_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
});

export type MailConfig = z.infer<typeof MailEnv>;
export const loadMailConfig = () => parseEnvSlice("mail", MailEnv);

/** Une clé de démonstration (« placeholder », « e2e ») ne déclenche jamais Brevo. */
export const usesBrevo = (config: MailConfig) =>
  Boolean(config.BREVO_API_KEY) && !/placeholder|e2e|dev/i.test(config.BREVO_API_KEY ?? "");

import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { createDb, DRIZZLE } from "@nutrion/db";
import type { Drizzle } from "@nutrion/db-schema";
import { z } from "zod";

import { parseEnvSlice } from "../../config/env";

export { DRIZZLE };
export type { Drizzle };

// Lib infra `db` : possède DATABASE_URL (tranche d'env isolée, architecture-reference).
const DbEnv = z.object({ DATABASE_URL: z.url() });

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: () => createDb(parseEnvSlice("db", DbEnv).DATABASE_URL),
    },
  ],
  exports: [DRIZZLE],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(DRIZZLE) private readonly db: Drizzle) {}

  async onApplicationShutdown() {
    // drizzle(postgres()) expose le client sous $client, absent du type générique Drizzle.
    await (
      this.db as unknown as { $client: { end(o: { timeout: number }): Promise<void> } }
    ).$client.end({ timeout: 5 });
  }
}
